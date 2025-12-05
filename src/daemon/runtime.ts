import { WikiConfig, WikiState } from "./types.js";

export class WikiRuntime {
  public state: WikiState = "unknown";

  constructor(public config: WikiConfig) {}

  getStatus() {
    return {
      id: this.config.id,
      role: this.config.role,
      scopes: this.config.scopes,
      twCoreVersion: this.config.twCoreVersion,
      rootPath: this.config.rootPath,
      host: this.config.host,
      port: this.config.port,
      https: this.config.https,
      state: this.state
    };
  }
}
