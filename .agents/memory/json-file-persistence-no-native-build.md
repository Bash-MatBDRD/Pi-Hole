---
name: JSON-file persistence instead of native SQLite
description: Why this project's persistent store uses a plain JSON file (server/store.ts) rather than better-sqlite3, and the pattern for durable-vs-cache data.
---

`better-sqlite3` (and any native-addon DB driver requiring node-gyp) fails to install in this environment — no Python toolchain is available for the native build (`gyp ERR! find Python`). Node version here is 20.x, so the built-in `node:sqlite` module (added ~22.5, experimental) is also unavailable.

**Why:** Pure-JS/WASM-free native modules can't compile without build tools present in the container; don't assume `npm install <native-db-driver>` will succeed — verify or default to a build-free approach first.

**How to apply:** For small single-user apps (home dashboards, personal panels) needing durability across restarts, a debounced JSON file on disk (read once into memory, write on a short `setTimeout` debounce) is sufficient and avoids native builds entirely. Split the schema conceptually into "durable" state (settings, config, hosts — never auto-pruned) vs. "cache" (activity/event logs — pruned on a schedule, e.g. weekly) so a periodic cleanup routine can safely free space without ever touching user configuration.
