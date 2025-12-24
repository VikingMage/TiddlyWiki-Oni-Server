import http from "http";
import fs from "node:fs";
import path from "node:path";
import { TwosConfig } from "./TwosConfig";
import { WikiRuntime } from "./WikiRuntime";

type Mode = "dev" | "prod";

export interface Logger {
  debug(msg: string, meta?: unknown): void;
  info(msg: string, meta?: unknown): void;
  warn(msg: string, meta?: unknown): void;
  error(msg: string, meta?: unknown): void;
}

function defaultLogger(mode: string): Logger {
  const prefix = `[oni:${mode}]`;
  return {
    debug: (m, meta) => console.debug(prefix, m, meta ?? ""),
    info: (m, meta) => console.log(prefix, m, meta ?? ""),
    warn: (m, meta) => console.warn(prefix, m, meta ?? ""),
    error: (m, meta) => console.error(prefix, m, meta ?? "")
  };
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function safeUnlink(filePath: string) {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // ignore
  }
}

/* ---------------------------------------------------------
 * OniServerRuntime — per-mode daemon authority
 * -------------------------------------------------------- */
export class OniServerRuntime {
  readonly wikiRuntimes = new Map<string, WikiRuntime>();
  readonly config: TwosConfig;
  readonly serverCfg: ReturnType<TwosConfig["oniServers"]["get"]>;
  readonly startedAt = Date.now();

  private api: OniServerAPI | null = null;
  private shuttingDown = false;

  private pidFilePath: string | null = null;

  constructor(
    readonly mode: Mode,
    configPath = "./twos.config.json",
    readonly log: Logger = defaultLogger(mode)
  ) {
    this.config = new TwosConfig(configPath);

    this.serverCfg = this.config.oniServers.get(mode);
    if (!this.serverCfg?.enabled) {
      throw new Error(`OniServer mode "${mode}" is disabled or missing in config.`);
    }

    this.initPidLock();

    this.buildWikiRuntimes();

    // Start API (this keeps the event loop alive)
    this.api = new OniServerAPI(this, this.log);
    this.api.listen(this.serverCfg.port!, this.serverCfg.host);

    // Optional autostart
    void this.startAutoWikis();

    // Graceful shutdown hooks
    process.on("SIGINT", () => void this.shutdown("SIGINT"));
    process.on("SIGTERM", () => void this.shutdown("SIGTERM"));

    this.log.info(`Started. Listening on ${this.serverCfg.host ?? "localhost"}:${this.serverCfg.port}`);
  }

  private initPidLock() {
    const pidDir = this.serverCfg?.pidPath ?? "./pids";
    ensureDir(pidDir);

    const pidFile = path.resolve(process.cwd(), pidDir, `oni-${this.mode}.pid`);
    this.pidFilePath = pidFile;

    if (fs.existsSync(pidFile)) {
      const raw = fs.readFileSync(pidFile, "utf8").trim();
      const oldPid = Number(raw);

      if (Number.isFinite(oldPid) && oldPid > 0 && isProcessAlive(oldPid)) {
        throw new Error(
          `OniServer(${this.mode}) appears to already be running (pid ${oldPid}). Remove ${pidFile} if this is wrong.`
        );
      }

      // stale pidfile
      safeUnlink(pidFile);
    }

    fs.writeFileSync(pidFile, String(process.pid), "utf8");
  }

  private buildWikiRuntimes() {
    for (const [id, wikiCfg] of this.config.wikis) {
      this.wikiRuntimes.set(id, new WikiRuntime(wikiCfg));
    }
  }

  getStatus() {
    return {
      ok: true,
      mode: this.mode,
      pid: process.pid,
      uptimeMs: Date.now() - this.startedAt,
      host: this.serverCfg?.host ?? "localhost",
      port: this.serverCfg?.port,
      shuttingDown: this.shuttingDown,
      wikis: Object.fromEntries(
        [...this.wikiRuntimes.entries()].map(([id, rt]) => [id, rt.getStatus()])
      )
    };
  }

  listWikis() {
    return Object.fromEntries(
      [...this.wikiRuntimes.entries()].map(([id, rt]) => [id, rt.getStatus()])
    );
  }

  startWiki(id: string) {
    const rt = this.wikiRuntimes.get(id);
    if (!rt) throw new Error(`Unknown wiki: ${id}`);
    rt.requestStart();
    this.log.info(`Wiki start requested: ${id}`);
  }

  stopWiki(id: string) {
    const rt = this.wikiRuntimes.get(id);
    if (!rt) throw new Error(`Unknown wiki: ${id}`);
    rt.requestStop();
    this.log.info(`Wiki stop requested: ${id}`);
  }

  async startAutoWikis() {
    for (const [id, rt] of this.wikiRuntimes) {
      const cfg = this.config.wikis.get(id);
      if (cfg?.autoStart) {
        rt.requestStart();
        this.log.info(`AutoStart wiki requested: ${id}`);
      }
    }
  }

  async shutdown(reason = "api") {
    if (this.shuttingDown) return;
    this.shuttingDown = true;

    this.log.warn(`Shutdown requested (${reason}).`);

    // Request stop for all wikis (best-effort)
    for (const [id] of this.wikiRuntimes) {
      try {
        this.stopWiki(id);
      } catch (err) {
        this.log.warn(`Failed stopping wiki ${id}`, err);
      }
    }

    // Stop HTTP server
    if (this.api) {
      await this.api.close();
      this.api = null;
    }

    // Remove pidfile
    if (this.pidFilePath) {
      safeUnlink(this.pidFilePath);
      this.pidFilePath = null;
    }

    this.log.info("Shutdown complete.");
    process.exit(0);
  }
}

/* ---------------------------------------------------------
 * OniServerAPI — routes
 * -------------------------------------------------------- */
export class OniServerAPI {
  private server: http.Server;

  constructor(private runtime: OniServerRuntime, private log: Logger) {
    this.server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

      const send = (code: number, payload: unknown) => {
        res.writeHead(code, { "Content-Type": "application/json" });
        res.end(JSON.stringify(payload));
      };

      const requireMethod = (m: string) => {
        if ((req.method ?? "GET") !== m) {
          send(405, { ok: false, error: `Method Not Allowed. Use ${m}.` });
          return false;
        }
        return true;
      };

      try {
        // GET /api/health
        if (url.pathname === "/api/health") {
          if (!requireMethod("GET")) return;
          return send(200, { ok: true, status: "ok", mode: this.runtime.mode });
        }

        // GET /api/status
        if (url.pathname === "/api/status") {
          if (!requireMethod("GET")) return;
          return send(200, this.runtime.getStatus());
        }

        // GET /api/wikis
        if (url.pathname === "/api/wikis") {
          if (!requireMethod("GET")) return;
          return send(200, { ok: true, wikis: this.runtime.listWikis() });
        }

        // POST /api/wiki/start?id=WikiId
        if (url.pathname === "/api/wiki/start") {
          if (!requireMethod("POST")) return;
          const id = url.searchParams.get("id");
          if (!id) return send(400, { ok: false, error: "Missing query param: id" });
          this.runtime.startWiki(id);
          return send(200, { ok: true, started: id });
        }

        // POST /api/wiki/stop?id=WikiId
        if (url.pathname === "/api/wiki/stop") {
          if (!requireMethod("POST")) return;
          const id = url.searchParams.get("id");
          if (!id) return send(400, { ok: false, error: "Missing query param: id" });
          this.runtime.stopWiki(id);
          return send(200, { ok: true, stopped: id });
        }

        // POST /api/shutdown
        if (url.pathname === "/api/shutdown") {
          if (!requireMethod("POST")) return;
          send(200, { ok: true, shuttingDown: true });
          void this.runtime.shutdown("api");
          return;
        }

        send(404, { ok: false, error: "Not found" });
      } catch (err: any) {
        this.log.error("API handler error", err);
        send(500, { ok: false, error: err?.message ?? String(err) });
      }
    });
  }

  listen(port: number, host?: string) {
    this.server.listen(port, host ?? "localhost", () => {
      this.log.info(`API listening on http://${host ?? "localhost"}:${port}`);
    });
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => resolve());
    });
  }
}

/* ---------------------------------------------------------
 * startOniServer — starter (per-mode daemon)
 * -------------------------------------------------------- */
export function startOniServer(mode: Mode = "dev") {
  new OniServerRuntime(mode);
}
