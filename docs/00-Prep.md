## Phase 1 – Nail the contract on paper (no code yet)

 * see [[docs/01-foundation.md]]


Next Steps:

## Phase 2 – Concrete dev steps (do these in order)

1. **Lock in the baseline config + scripts**

   * Make sure `tsconfig.json`, `package.json`, `.gitignore`, and `twos.config.json` are all committed and valid.
   * Add npm scripts if missing:

     * `"build": "tsc"`
     * `"dev": "ts-node src/daemon/daemon.ts"`

2. **Get the daemon API actually running and testable**

   * Implement / fix `startDaemon` so:

     * It loads `twos.config.json`.
     * It creates `WikiRuntime` objects.
     * It starts the HTTP server on a fixed port (e.g. 7357).
   * Manually verify with:

     * `npm run dev`
     * `curl http://localhost:7357/api/health`
     * `curl http://localhost:7357/api/wikis`

3. **Define and wire the wiki lifecycle states in code**

   * Ensure `WikiState` union matches the table (`"unknown" | "stopped" | ...`).
   * Add a `setState()` method or simple state transitions in `WikiRuntime` (still stubbed, no child processes yet).
   * For now, keep every wiki in `"unknown"` or `"stopped"`; the point is to have the plumbing in place.

4. **Implement a minimal, real CLI that talks to the daemon**

   * `twos health` → calls `/api/health` and prints status.
   * `twos wikis` → calls `/api/wikis` and prints a simple table/list.
   * CLI *never* reaches into daemon internals; it only uses HTTP.

5. **Add a test harness for the API (start small)**

   * Pick a test runner (I’d suggest Vitest).
   * Write tests that:

     * Start the daemon on a random port.
     * Assert `/api/health` returns `{ status: "ok" }`.
     * Assert `/api/wikis` returns the config values for your sample wiki.

6. **Introduce a logging strategy (minimal but consistent)**

   * Wrap `console.log` behind a tiny logger module (e.g. `src/util/log.ts`).
   * Use it in daemon startup and API requests.
   * This sets you up for later file logging without refactors.

7. **Only then: design the process-launch interface (no implementation yet)**

   * Define an interface like `WikiProcessController` with methods:

     * `start()`, `stop()`, `getState()`.
   * Don’t spawn any real TiddlyWiki yet; just define the contract and a “no-op” implementation that flips the state machine.




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
