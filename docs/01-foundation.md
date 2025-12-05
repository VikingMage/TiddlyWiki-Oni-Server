# TW Oni Server – Foundation


This document defines the technical foundation for the TW Oni Server (`twos`) daemon, runtime model, configuration structure, and API surface.

## Overview
TW Oni Server (TWOS) is a local daemon that manages TiddlyWiki instances, their core versions, and some host-level features (backup, git, etc.).

It is:

- Cross-platform (Windows, macOS, Linux).
- Able to run as a background service/daemon.
- Controllable via CLI (`twos`) and a minimal HTTP API (and later a simple HTML UI).

## Core Principles

1. The daemon owns lifecycle and configuration.
2. Wikis run as independent Node processes using native TiddlyWiki CLI.
3. The daemon exposes a clean HTTP API for UI clients and TW plugins.
4. TypeScript enforces all contracts.


## Core concepts

- **Daemon**  
  Single long-running process. Owns:
  - global config
  - wiki lifecycles (start/stop)
  - host-level features (backups, git jobs, etc.).

- **Wiki**  
  One managed TiddlyWiki instance with:
  - `id`
  - `rootPath`
  - `twCoreVersion`
  - `host`, `port`
  - `role`
  - `scopes`

- **Role** (v1)  
  - `master` – allowed to perform global/daemon-level actions.
  - `default` – only allowed to manage itself.

- **Scopes** (v1)  
  Strings that represent capabilities. Initial set:
  - `start:own`
  - `start:any`
  - `status:own`
  - `status:any`
  - `config:read`
  - `config:write`

---

## Data Model

### WikiConfig

- role: `master | default`
- scopes: permission list
- twCoreVersion: version string
- rootPath: filesystem root of the wiki
- twPluginPaths: optional list of plugin root directories
- host, port, https: networking definition
- autoStart: whether daemon launches it at startup

### WikiRuntime

Transient state owned by daemon:

- current process state
- future: PID, logs, crash status, restart policy


## Config schema (v1)

Example daemon config:

```json
{
  "wikis": {
    "TwAdmMaster": {
      "role": "master",
      "scopes": ["start:any", "config:write"],
      "twCoreVersion": "5.3.8",
      "rootPath": "C:/Users/dylan/AppData/Local/twadm/OneWikiToRuleThemAll",
      "twPluginPaths": [
        "C:/Program Files/twadm/assets/tw-v5.3.8/plugins/",
        "C:/mywikis/my-plugins/"
      ],
      "https": false,
      "host": "localhost",
      "port": 5020,
      "autoStart": true
    }
  }
}
```

In v1:

* There is a single config file (e.g. `twos.config.json`).
* If config is invalid, the daemon fails fast and logs a clear error.

## API endpoints (v1)

Minimal HTTP API:

* `GET /api/health`
  Returns daemon health.

* `GET /api/wikis`
  Returns the configured wikis and their current runtime state.

* `POST /api/wikis/:id/start`
  Requests that the daemon start the wiki `:id`.

* `POST /api/wikis/:id/stop`
  Requests that the daemon stop the wiki `:id`.

### `/api/health` response

```json
{
  "status": "ok"
}
```


### `/api/wikis` response schema (v1)

In v1, wikis are returned as an object keyed by wiki id:

```json
{
  "wikis": {
    "twos_master": {
      "id": "twos_master",
      "role": "master",
      "scopes": ["start:any", "config:write"],
      "twCoreVersion": "5.3.8",
      "rootPath": "./wikis/OneWikiToRuleThemAll",
      "https": false,
      "host": "localhost",
      "port": 5020,
      "state": "running"
    }
  }
}
```

The `state` field is defined by the wiki lifecycle state machine below.

## Wiki lifecycle state machine

### States

| **State**  | **Meaning**                                                           | **Allowed Transitions**       | **Triggered By**                           |
| ---------- | --------------------------------------------------------------------- | ----------------------------- | ------------------------------------------ |
| `unknown`  | Daemon has not yet attempted to start or inspect this wiki.           | `stopped`, `starting`         | Daemon boot, config load                   |
| `stopped`  | No process running for this wiki.                                     | `starting`                    | API call `POST /api/wikis/:id/start`       |
| `starting` | Process spawned but not yet confirmed serving on its configured port. | `running`, `error`, `stopped` | Process events, timeout                    |
| `running`  | Process alive **and responding** on its configured host/port.         | `stopping`, `error`           | API call `POST /api/wikis/:id/stop`, crash |
| `stopping` | Daemon has issued a stop/kill but shutdown not yet confirmed.         | `stopped`, `error`            | Process exit                               |
| `error`    | Start failed, or abnormal termination detected.                       | `stopped`, `starting`         | Manual retry, config change                |

### Notes

* `unknown` is the initial state after daemon boot, before any attempt to interact with a wiki.
* The daemon is the sole authority on state; clients (CLI, UI, TW plugin) **never** set state directly, they only request actions.
* State changes are driven by:

  * API calls (`/start`, `/stop`)
  * process lifecycle events
  * timeouts / health checks

---

## Config File

`twos.config.json`

User-controlled. Daemon validates and loads it at startup.

---

## CLI

Namespace: `twos`

Initially a stub. Will later include:

- `twos start`
- `twos stop`
- `twos status`
- `twos reload`

---

## Daemon Goals (v1)

- Load config
- Track wiki runtime states
- Expose API
- Provide foundation for process launcher (v2)