export type WikiRole = "master" | "default";

export type WikiState =
  | "unknown"
  | "stopped"
  | "starting"
  | "running"
  | "stopping"
  | "error";

export type OniState =
  | "unknown"
  | "stopped"
  | "starting"
  | "running"
  | "stopping"
  | "error";



export interface ConfigEntries {
  [id: string]: any;

  }

export interface SettingsConfig {
  masterWiki: string;
}

export interface OniServerConfig {
  mode: "dev" | "prod";
  enabled?: boolean;
  host?: string;
  port?: number;
  logLevel?: "debug" | "info" | "warn" | "error";
  logsPath?: string;
  pidPath?: string;
}

export interface WikiConfig {
  id: string;
  role: WikiRole;
  scopes: string[];
  twCoreVersion: string;
  rootPath: string;
  twPluginPaths?: string[];
  https: boolean;
  host: string;
  port: number;
  autoStart: boolean;
}
