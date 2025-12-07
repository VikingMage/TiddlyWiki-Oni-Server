import path from "node:path";
import { readJson } from "../util/fs";
import { ConfigEntries } from "./ConfigEntries";
import {
  SettingsConfig,
  OniServerConfig,
  WikiConfig
} from "./types";

export class TwosConfig {
  readonly settings: SettingsConfig;
  readonly oniServers: ConfigEntries<OniServerConfig>;
  readonly wikis: ConfigEntries<WikiConfig>;

  constructor(configPath: string) {
    const fullPath = path.resolve(process.cwd(), configPath);
    const raw = readJson<Record<string, any>>(fullPath);

    // settings is already a single object — no wrapper
    this.settings = raw.settings;

    // iterable collections via wrappers
    this.oniServers = new ConfigEntries(
      raw.oniServers,
      this.normaliseOniServer
    );

    this.wikis = new ConfigEntries(
      raw.wikis,
      this.normaliseWiki
    );
  }

  // ---- Normalisers: authoritative truth of runtime invariants ----

  private normaliseWiki = (id: string, cfg: any): WikiConfig => ({
    id,
    ...cfg
  });

  private normaliseOniServer = (mode: string, cfg: any): OniServerConfig => ({
    mode,
    ...cfg
  });
}
