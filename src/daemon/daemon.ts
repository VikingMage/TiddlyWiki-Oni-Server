import path from "path";
import { readJson } from "../util/fs.js";
import { DaemonConfig, WikiConfig } from "./types.js";
import { WikiRuntime } from "./runtime.js";
import { DaemonAPI } from "./api.js";

function loadConfig(): DaemonConfig {
  const filePath = path.resolve("twos.config.json");
  return readJson<DaemonConfig>(filePath);
}

export function startDaemon() {
  const config = loadConfig();

  const runtimes: Record<string, WikiRuntime> = {};

  for (const [id, cfg] of Object.entries(config.wikis)) {
    (cfg as WikiConfig).id = id;
    runtimes[id] = new WikiRuntime(cfg as WikiConfig);
  }

  const api = new DaemonAPI(runtimes);
  api.listen(7357);
}

if (require.main === module) {
  startDaemon();
}
