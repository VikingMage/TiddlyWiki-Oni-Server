// todo: fix errors
import http from "http";
import { WikiRuntime } from "./runtime.js";

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
}
