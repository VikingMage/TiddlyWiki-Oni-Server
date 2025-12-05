export type WikiRole = "master" | "default";

export type WikiState =
  | "unknown"
  | "stopped"
  | "starting"
  | "running"
  | "stopping"
  | "error";

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

export interface DaemonConfig {
  wikis: Record<string, WikiConfig>;
}
