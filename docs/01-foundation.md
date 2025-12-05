## Purpose:
     TW Oni Server is a local daemon that manages TiddlyWiki instances, their core versions, and some host-level features (backup, git, etc.)
     It is cross-platform (Windows, macOS, Linux) can run as a background service/daemon, and as a GUI that lets you manage all your TiddlyWiki madness.

## *Out-of-scope for v1*:

     * No offline config queue.
     * No TW-driven GitHub integration.
     * No Electron.
     * No fancy UI beyond a basic HTML page + CLI.

## *Core concepts*: precise, short definitions:

     * **Daemon**: single long-running process, owns config and wiki lifecycles.
     * **Wiki**: one managed TiddlyWiki instance (with id, rootPath, twCoreVersion, port, role, scopes).
     * **Role**: `master` or `default` only in v1.
     * **Scopes**: start/own, start/any, config/read, config/write, etc. (just list them).

## *Config schema v1*:
     A simple JSON example like the one you wrote, but cleaned up:

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

## *API endpoints v1 (read-only + basic control)*:
     For now, define only:

     * `GET /api/wikis` → list wikis + status
     * `POST /api/wikis/:id/start`
     * `POST /api/wikis/:id/stop`
     * `GET /api/health`

### `/api/wikis` response schema:
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


## *State machine for one wiki*:
| **State**  | **Meaning**                                                          | **Allowed Transitions**       | **Triggered By**            |
| ---------- | -------------------------------------------------------------------- | ----------------------------- | --------------------------- |
| `unknown`  | Daemon has not yet attempted to start or inspect this wiki.          | `stopped`, `starting`         | Daemon boot, config load    |
| `stopped`  | No process running for this wiki.                                    | `starting`                    | API call `/start`           |
| `starting` | Daemon has spawned the process but not yet confirmed it is serving.  | `running`, `error`, `stopped` | Process events, timeout     |
| `running`  | The wiki process is alive **and responding on its configured port**. | `stopping`, `error`           | API call `/stop`, crash     |
| `stopping` | Daemon has issued a stop/kill but not yet confirmed shutdown.        | `stopped`, `error`            | Process exit                |
| `error`    | Daemon failed to start a wiki, or detected abnormal termination.     | `stopped`, `starting`         | Manual retry, config change |

