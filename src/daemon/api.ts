// todo: fix errors
import http from "http";
import { WikiRuntime } from "./runtime";

export class DaemonAPI {
  private server: http.Server;

  constructor(private runtimes: Record<string, WikiRuntime>) {
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
          Object.entries(this.runtimes).map(([id, rt]) => [id, rt.getStatus()])
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
      console.log(`Daemon API running on http://localhost:${port}`);
    });
  }
  start(mode: "dev" | "prod") {
    console.log(`Starting daemon in ${mode} mode...`);
    // if server is not listening, start it else log that it's already running
    if (!this.server.listening) {
      this.listen(7357);
    } else {
      console.log("Daemon API is already running.");
    }
    // TODO: implement start logic for dev so that we don't have to keep running `ts-node src/daemon/daemon.ts`
    // prod mode will be implemented later

  }
}
