# TW Oni Server – Code Map

High‑level overview of the current files, what they export, and main methods, so you can annotate and extend as you go.

---

## `./src/cli/cli.ts`

**Role:** Command‑line interface entrypoint for `twos`.

**Exports:**

* No named exports; this is an executable script (shebang at top) that calls `main(process.argv)`.

**Key functions:**

* `parseArgs(argv: string[]): ParsedArgs`

  * Splits `process.argv` into a `command` (e.g. `"health"`, `"wikis"`) and `args` array.
* `cmdHealth(client: HttpClient): Promise<number>`

  * Calls `GET /api/health` via `HttpClient`.
  * Logs daemon status and returns exit code `0` on success, `1` on failure.
* `cmdWikis(client: HttpClient): Promise<number>`

  * Calls `GET /api/wikis`.
  * Logs a formatted table of configured wikis (id, role, state, host, port).
  * Returns `0` on success, `1` on error.
* `main(argv: string[]): Promise<void>`

  * Creates an `HttpClient` targeting `localhost:7357`.
  * Dispatches subcommands:

    * `health` → `cmdHealth`
    * `wikis` → `cmdWikis`
    * `dev` → currently TODO (intended to start daemon in dev mode).
    * `help` / no command → prints usage.
  * Calls `process.exit(exitCode)` at the end.

---

## `./src/daemon/api.ts`

**Role:** Minimal HTTP API for the Oni server daemon.

**Exports:**

* `class DaemonAPI`

**Constructor:**

* `constructor(runtimes: Record<string, WikiRuntime>)`

  * Stores the per‑wiki `WikiRuntime` instances.
  * Creates an `http.Server` that handles:

    * `GET /api/health` → `{ status: "ok" }` JSON.
    * `GET /api/wikis` → `{ wikis: { [id]: runtime.getStatus() } }` JSON.

**Methods:**

* `listen(port: number): void`

  * Starts the HTTP server listening on the given port.
  * Logs `Daemon API running on http://localhost:<port>`.
* `start(mode: "dev" | "prod"): void`

  * Logs `Starting daemon in <mode> mode.`
  * If server is not yet listening, calls `listen(7357)`.
  * If already listening, logs that the API is already running.
  * Marked with TODO comments to eventually handle dev/prod startup; currently a helper, not wired from CLI.

---

## `./src/daemon/daemon.ts`

**Role:** Oni server daemon entry logic – loads config, creates wiki runtimes, and starts the API.

**Exports:**

* `function startDaemon(mode: "dev" | "prod" = "prod"): void`

**Internal functions:**

* `loadConfig(configPath = "twos.config.json"): TwosConfig`

  * Resolves the config path.
  * Uses `readJson<TwosConfig>` to load and parse `twos.config.json`.

**Behaviour of ************`startDaemon`************:**

* Loads daemon config via `loadConfig`.
* Builds a `runtimes: Record<string, WikiRuntime>` map by:

  * Iterating over `config.wikis`.
  * Injecting `id` into each `WikiConfig` before passing into `new WikiRuntime`.
* Reads `const serverConfig = config.oniServers?.[mode]`.

  * If missing, logs a warning and returns (no API started).
* Creates `const api = new DaemonAPI(runtimes)`.
* If `serverConfig.enabled` is truthy:

  * Calls `api.listen(serverConfig.port || 7357)`.
  * Logs daemon start message with mode, port, and `process.pid`.
* Else, logs that the daemon API is disabled for that mode.
* **Note:** There is currently a `require.main === module` block that calls `startDaemon(ServerConfig.mode || "dev")`, but `ServerConfig` is undefined – this should either be removed or replaced later with a proper entrypoint.

---

## `./src/daemon/runtime.ts` --> `./src/daemon/WikiRuntime.ts`

**Role:** Per‑wiki runtime state machine (one instance per wiki).

**Exports:**

* `class WikiRuntime`

**Constructor:**

* `constructor(config: WikiConfig)`

  * Stores `config` (exposed as `public config`).
  * Initialises internal `_state` to `"stopped"`.

**Properties:**

* `state: WikiState`

  * Getter that returns the current state.

**Internal helpers:**

* `private setState(next: WikiState): void`

  * Centralised state mutation.

**Lifecycle methods (no real processes yet):**

* `requestStart(): void`

  * If currently `running` or `starting`, no-op.
  * Otherwise sets state to `"starting"`.
  * Placeholder for future process spawn logic.
* `requestStop(): void`

  * If currently `stopped` or `stopping`, no-op.
  * Otherwise sets state to `"stopping"`.
  * Placeholder for future process shutdown logic.
* `markRunning(): void`

  * Marks state as `"running"`.
* `markStopped(): void`

  * Marks state as `"stopped"`.
* `markError(): void`

  * Marks state as `"error"`.

**Status:**

* `getStatus()`

  * Returns a snapshot object:

    * `id`, `role`, `scopes`, `twCoreVersion`, `rootPath`, `host`, `port`, `https`, and current `state` from the config + runtime.

---

## `./src/daemon/types.ts`

**Role:** Shared type definitions for daemon and wiki runtime.

**Exports:**

* `type WikiRole = "master" | "default"`
* `type WikiState = "unknown" | "stopped" | "starting" | "running" | "stopping" | "error"`
* `interface WikiConfig`

  * `id: string`
  * `role: WikiRole`
  * `scopes: string[]`
  * `twCoreVersion: string`
  * `rootPath: string`
  * `twPluginPaths?: string[]`
  * `https: boolean`
  * `host: string`
  * `port: number`
  * `autoStart: boolean`
* `interface TwosConfig`

  * `wikis: Record<string, WikiConfig>`
  * `oniServers?: Record<string, { enabled: boolean; host?: string; port?: number }>`
  * **Note:** `TwosConfig` does not yet describe `settings.masterWiki` or `logLevel` / `logsPath` / `pidPath` under `oniServers`, which are present in `twos.config.json`. This mismatch is something to fix later.

---

## `./src/util/httpClient.ts`

**Role:** Simple HTTP JSON client used by the CLI.

**Exports:**

* `interface HttpClientOptions`

  * `host: string`
  * `port: number`
* `class HttpClient`

**Constructor:**

* `constructor(options: HttpClientOptions)`

  * Stores host/port.

**Methods:**

* `getJson<T>(path: string): Promise<T>`

  * Issues an HTTP GET request to `http://host:port<path>`.
  * Expects JSON response.
  * Rejects on non‑2xx status codes or parse errors.
  * Resolves with parsed JSON as `T` on success.

---

## `./src/util/fs.ts`

**Role:** Minimal filesystem helper.

**Exports:**

* `function readJson<T>(filePath: string): T`

  * Reads file synchronously as UTF‑8.
  * Parses JSON and returns `T`.

---

## `twos.config.json`

**Role:** Configuration file for TW Oni Server.

**Top‑level keys:**

* `settings`

  * `masterWiki: string` – id of the master wiki (e.g. `"OneWikiToRuleThemAll"`).
* `oniServers`

  * Profiles for different Oni server modes (`dev`, `prod`, etc.).
  * Each profile currently has:

    * `enabled?: boolean`
    * `port?: number`
    * `logLevel?: string` (e.g. `"info"`)
    * `logsPath?: string`
    * `pidPath?: string`
* `wikis`

  * Map of wiki id → wiki config.
  * Each wiki config matches `WikiConfig` structurally:

    * `role`, `scopes`, `twCoreVersion`, `rootPath`, `twPluginPaths`, `https`, `host`, `port`, `autoStart`.

---

You can annotate this map with questions, refactor ideas, or planned changes (e.g. tightening TwosConfig to include full `oniServers` shape, adjusting entrypoints, or wiring CLI → daemon start behaviour).
