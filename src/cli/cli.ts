#!/usr/bin/env node

import { HttpClient } from "../util/httpClient";

interface ParsedArgs {
  command: string | null;
  args: string[];
}

function parseArgs(argv: string[]): ParsedArgs {
  // argv: ["node", "cli.js", ...]
  const [, , ...rest] = argv;
  const command = rest[0] ?? null;
  const args = rest.slice(1);
  return { command, args };
}

async function cmdHealth(client: HttpClient): Promise<number> {
  try {
    const data = await client.getJson<{ status: string }>("/api/health");
    console.log(`Daemon status: ${data.status}`);
    return 0;
  } catch (err) {
    console.error("Failed to query daemon health:", err);
    return 1;
  }
}

async function cmdWikis(client: HttpClient): Promise<number> {
  try {
    const data = await client.getJson<{
      wikis: Record<
        string,
        {
          id: string;
          role: string;
          state: string;
          host: string;
          port: number;
        }
      >;
    }>("/api/wikis");

    const entries = Object.values(data.wikis);

    if (entries.length === 0) {
      console.log("No wikis configured.");
      return 0;
    }

    for (const wiki of entries) {
      console.log(
        `${wiki.id.padEnd(16)}  role=${wiki.role.padEnd(7)}  state=${wiki.state.padEnd(
          8
        )}  ${wiki.host}:${wiki.port}`
      );
    }

    return 0;
  } catch (err) {
    console.error("Failed to query wikis:", err);
    return 1;
  }
}

async function main(argv: string[]): Promise<void> {
  const { command } = parseArgs(argv);

  const client = new HttpClient({
    host: "localhost",
    port: 7357
  });

  let exitCode = 0;

  switch (command) {
    case "health":
      exitCode = await cmdHealth(client);
      break;

    case "wikis":
      exitCode = await cmdWikis(client);
      break;

    case "dev":
       // start daemon in dev mode (TODO create cli to start/stop daemon in dev mode)


    case null:
    case "help":
    default:
      console.log("Usage:");
      console.log("  twos health        Check daemon health");
      console.log("  twos wikis         List configured wikis and their state");
      exitCode = command === null ? 0 : 1;
      break;
  }

  process.exit(exitCode);
}

void main(process.argv);
