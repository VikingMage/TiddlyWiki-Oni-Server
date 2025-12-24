#!/usr/bin/env node

import { TwosConfig } from "../daemon/TwosConfig";
import { HttpClient } from "../util/httpClient";
import { startOniServer } from "../daemon/OniRuntime";

function usage() {
  console.log("Usage:");
  console.log("  twos <mode>                    Run OniServer daemon (foreground)");
  console.log("  twos <mode> health             Daemon health");
  console.log("  twos <mode> status             Daemon status");
  console.log("  twos <mode> wikis              List wikis");
  console.log("  twos <mode> start-wiki <id>    Request wiki start");
  console.log("  twos <mode> stop-wiki <id>     Request wiki stop");
  console.log("  twos <mode> shutdown           Graceful daemon shutdown");
}

export async function cmdStartOni(mode: "dev" | "prod"): Promise<void> {
  startOniServer(mode);
  // IMPORTANT: do not call process.exit(); this is a foreground daemon run.
}

async function main(argv: string[]) {
  const [, , modeRaw, cmd, ...rest] = argv;

  if (!modeRaw) {
    usage();
    process.exit(1);
  }

  const mode = modeRaw as "dev" | "prod";

  // If no subcommand, run daemon in foreground
  if (!cmd) {
    await cmdStartOni(mode);
    return;
  }

  // Dispatcher commands talk to daemon via config-defined port
  const config = new TwosConfig("./twos.config.json");
  const serverCfg = config.oniServers.get(mode);

  if (!serverCfg?.enabled) {
    console.error(`Mode "${mode}" is disabled or missing.`);
    process.exit(1);
  }

  const client = new HttpClient({
    host: serverCfg.host ?? "localhost",
    port: serverCfg.port!
  });

  try {
    switch (cmd) {
      case "health": {
        const data = await client.getJson("/api/health");
        console.log(JSON.stringify(data, null, 2));
        break;
      }
      case "status": {
        const data = await client.getJson("/api/status");
        console.log(JSON.stringify(data, null, 2));
        break;
      }
      case "wikis": {
        const data = await client.getJson("/api/wikis");
        console.log(JSON.stringify(data, null, 2));
        break;
      }
      case "start-wiki": {
        const id = rest[0];
        if (!id) throw new Error("Missing wiki id");
        const data = await client.postJson(`/api/wiki/start?id=${encodeURIComponent(id)}`);
        console.log(JSON.stringify(data, null, 2));
        break;
      }
      case "stop-wiki": {
        const id = rest[0];
        if (!id) throw new Error("Missing wiki id");
        const data = await client.postJson(`/api/wiki/stop?id=${encodeURIComponent(id)}`);
        console.log(JSON.stringify(data, null, 2));
        break;
      }
      case "shutdown": {
        const data = await client.postJson("/api/shutdown");
        console.log(JSON.stringify(data, null, 2));
        break;
      }
      default:
        usage();
        process.exit(1);
    }
  } catch (err) {
    console.error("Command failed:", err);
    process.exit(1);
  }
}

void main(process.argv);
