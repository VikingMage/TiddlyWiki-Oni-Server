import { WikiConfig, WikiState } from "./types";

export class WikiRuntime {
  private _state: WikiState;

  constructor(public config: WikiConfig) {
    // On daemon startup, we know we haven't started any processes yet.
    // So "stopped" is a better initial state than "unknown".
    this._state = "stopped";
  }

  get state(): WikiState {
    return this._state;
  }

  private setState(next: WikiState): void {
    this._state = next;
  }

  // ---- Lifecycle helpers (no real processes yet) ----

  /** Called when someone requests this wiki to start. */
  requestStart(): void {
    if (this._state === "running" || this._state === "starting") {
      return; // idempotent-ish
    }
    this.setState("starting");
    // In Phase 3, this is where we'll actually spawn the process
    // and eventually call `markRunning()` once it's healthy.
  }

  /** Called when someone requests this wiki to stop. */
  requestStop(): void {
    if (this._state === "stopped" || this._state === "stopping") {
      return;
    }
    this.setState("stopping");
    // In Phase 3, we'll actually stop/kill the process,
    // then call `markStopped()` when it's done.
  }

  /** Called by the process supervisor when the wiki is confirmed healthy. */
  markRunning(): void {
    this.setState("running");
  }

  /** Called when the process has fully stopped. */
  markStopped(): void {
    this.setState("stopped");
  }

  /** Called when a start/stop attempt fails or process crashes. */
  markError(): void {
    this.setState("error");
  }

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
      state: this._state
    };
  }
}
