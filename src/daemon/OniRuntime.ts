import http from "http";
import { TwosConfig } from "./TwosConfig";
import { WikiRuntime } from "./WikiRuntime";

/* ---------------------------------------------------------
 *  OniServerRuntime — supervisor for all wiki runtimes
 * -------------------------------------------------------- */
export class OniServerRuntime {
  readonly wikiRuntimes = new Map<string, WikiRuntime>();

  constructor(
    readonly config: TwosConfig,
    readonly mode: "dev" | "prod"
  ) {
    this.buildWikiRuntimes();
  }

  private buildWikiRuntimes(): void {
    for (const [id, wikiCfg] of this.config.wikis) {
      this.wikiRuntimes.set(id, new WikiRuntime(wikiCfg));
    }
  }

  listWikis() {
    return Array.from(this.wikiRuntimes.values()).map(rt => rt.getStatus());
  }

  startWiki(id: string) {
    const rt = this.wikiRuntimes.get(id);
    if (!rt) throw new Error(`Unknown wiki: ${id}`);
    rt.requestStart();
  }

  stopWiki(id: string) {
    const rt = this.wikiRuntimes.get(id);
    if (!rt) throw new Error(`Unknown wiki: ${id}`);
    rt.requestStop();
  }

  async startAutoWikis() {
    for (const [id, rt] of this.wikiRuntimes) {
      const cfg = this.config.wikis.get(id);
      if (cfg?.autoStart) {
        rt.requestStart();
      }
    }
  }
}

/* ---------------------------------------------------------
 *  OniServerAPI — thin HTTP façade around the runtime
 * -------------------------------------------------------- */
export class OniServerAPI {
  private server: http.Server;

  constructor(private runtime: OniServerRuntime) {
    this.server = http.createServer((req, res) => {
      if (!req.url) {
        res.writeHead(400);
        return res.end();
      }

      if (req.url === "/api/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ status: "ok" }));
      }

      if (req.url === "/api/wikis") {
        const wikis = Object.fromEntries(
          Array.from(this.runtime.wikiRuntimes.entries()).map(
            ([id, rt]) => [id, rt.getStatus()]
          )
        );

        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ wikis }));
      }

      res.writeHead(404);
      res.end();
    });
  }

  listen(port: number) {
    this.server.listen(port, () => {
      console.log(`Oni daemon API running on http://localhost:${port}`);
    });
  }
}

/* ---------------------------------------------------------
 *  startDaemon — wiring layer
 * -------------------------------------------------------- */
export function startDaemon(mode: "dev" | "prod" = "dev") {
  const config = new TwosConfig("./twos.config.json");

  const serverCfg = config.oniServers.get(mode);
  if (!serverCfg?.enabled) {
    console.warn(`Daemon mode "${mode}" is disabled.`);
    return;
  }

  const runtime = new OniServerRuntime(config, mode);

  const api = new OniServerAPI(runtime);
  api.listen(serverCfg.port ?? 7357);

  // optional autostart
  runtime.startAutoWikis();
}
