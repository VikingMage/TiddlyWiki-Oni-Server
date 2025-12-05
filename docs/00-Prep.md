## Phase 1 – Nail the contract on paper (no code yet)

 * see [[docs/01-foundation.md]]


## Phase 2 – Build the boring daemon spine + CLI

**Goal:** A working daemon that can read config, list wikis, and start/stop a *single* wiki reliably, exercised via CLI. No TW plugin yet, no HTML UI beyond maybe a health check.

1. **Set up repo + tooling**

   * Node + TypeScript.
   * One entry for daemon: `src/daemon.ts`.
   * One for CLI: `src/cli.ts`.
   * Tests: Vitest / Jest, whatever, but pick one and actually write tests.

2. **Implement config & types first**

   * Define `WikiConfig`, `DaemonConfig`, `Role`, `Scope` as TS types.
   * Implement `loadConfig(path): DaemonConfig` that:

     * Reads JSON.
     * Validates, throws if invalid.
   * Hard-fail on bad config. Don’t be clever here.

3. **Implement daemon HTTP API skeleton**

   * Minimal HTTP server (Fastify/Express or plain `http`).

   * Hard-wire:

     * `GET /api/health` → `{ status: "ok" }`
     * `GET /api/wikis` → return config only (status = `"unknown"` for now).
     * `POST /api/wikis/:id/start` / `stop` → stub: just log “would start/stop”.

   * Write tests that:

     * Spin daemon on a random port.
     * Call these endpoints.
     * Assert responses.

4. **Implement CLI wrapper `twadm`**

   * CLI commands:

     * `twadm health`
     * `twadm wikis list`
     * `twadm wikis start <id>`
     * `twadm wikis stop <id>`
   * CLI only ever talks to the HTTP API, not internal functions.
   * Tests: run daemon on test port, run CLI with that port, assert output.

At the end of Phase 2:
You have a typed config, a tiny API, and a CLI that can poke it. Still no real TiddlyWiki processes, but the scaffolding exists.

---

## Phase 3 – Make it actually manage one real wiki

**Goal:** Replace the “stub start/stop” with real process spawning for one wiki, still driven only by config + CLI.

1. **Implement process supervisor for a single wiki**

   * Add a `WikiRuntime` class with:

     * `state` (`stopped | starting | running | stopping | error`)
     * `start()`, `stop()`, `getStatus()`.
   * `start()` spawns:

     * `npx tiddlywiki@<twCoreVersion> <rootPath> --listen host=<host> port=<port> ...`
   * Handle:

     * `exit` events to update state back to `stopped` or `error`.
     * Maybe a simple “is something listening on port” health check.

2. **Wire supervisor into daemon**

   * Daemon creates a `WikiRuntime` per entry in `config.wikis`.
   * `GET /api/wikis` now returns *config + runtime state*.
   * `POST /api/wikis/:id/start` / `stop` call the runtime methods.

3. **Extend tests**

   * Use a dummy `tiddlywiki` command for tests if you don’t want to spawn real TW; or mark “integration” tests that do.
   * Assert that:

     * Start transitions state, process exists.
     * Stop kills it cleanly.

4. **Very thin HTML status UI (optional but nice)**

   * Static HTML at `/` that:

     * Fetches `/api/wikis`.
     * Shows a table: id, role, state, “start/stop” buttons that call the API.
   * This just reuses the API; no complex UI logic.

At the end of Phase 3:
You have:

* A daemon that really starts/stops TiddlyWiki.
* A CLI that controls it.
* A minimal web status page.
* A config-driven system that matches your spec.

**Only after that** would I let you touch:

* TW plugin.
* Roles/scopes enforcement.
* Any notion of “master” vs “default” beyond simple flags.
* Electron.
* Offline config queue.

---

**Blunt summary:**

1. Write the small foundational spec doc. No code until that exists.
2. Implement daemon config + HTTP API + CLI with *no real TW*, just stubs.
3. Replace stubs with real process supervision for a single wiki.
4. THEN we talk about TW plugin v1 and master-role semantics.

If you follow that sequence, you physically can’t go “too deep, too early” without breaking your own spec—and that’s exactly the guardrail you were asking for.
