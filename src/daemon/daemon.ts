import path from "path";
import { readJson } from "../util/fs";
import { DaemonConfig, WikiConfig } from "./types";
import { WikiRuntime } from "./runtime";
import { DaemonAPI } from "./api";

function loadConfig(configPath="twos.config.json"): DaemonConfig {
  const filePath = path.resolve(configPath);
  return readJson<DaemonConfig>(filePath);
}

export function startDaemon(mode: "dev" | "prod" = "prod") {
  const config = loadConfig();

  const runtimes: Record<string, WikiRuntime> = {};

  for (const [id, cfg] of Object.entries(config.wikis)) {
    (cfg as WikiConfig).id = id;
    runtimes[id] = new WikiRuntime(cfg as WikiConfig);
  }

  // get server config from config.OniServers[mode]
  const serverConfig = config.oniServers?.[mode];

  const api = new DaemonAPI(runtimes);
  // if serverConfig.enabled is true, start the server and log the port and mode and host and pid else output that the server is disabled in the twos.config.json
  if (serverConfig?.enabled){
    api.listen(serverConfig.port || 7357);
    console.log(`Starting Daemon API in ${mode} mode on port ${serverConfig.port || 7357}... (pid: ${process.pid})`);
  } else {
    console.log(`Daemon API is disabled in twos.config.json for ${mode} mode.`);
  }




}

if (require.main === module) {
  startDaemon(ServerConfig.mode || "dev");
}
