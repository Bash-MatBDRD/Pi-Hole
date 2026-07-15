# NEXUS Panel V2.0

A full-stack smart home dashboard built with React + Express + Vite, styled with the NEXUS Panel cyberpunk/glassmorphism aesthetic.

## Architecture

- **Frontend**: React 19 + TypeScript + Tailwind CSS v4 + Vite (served via Express middleware)
- **Backend**: Express + TypeScript (`server.ts`) — runs on port **5000**
- **Persistence**: a debounced JSON file on disk (`server/store.ts` → `data/nexus-store.json`) — settings, HA/Discord config, device state and the monitored host list all survive restarts. `better-sqlite3`/`node:sqlite` are unavailable in this environment (no Python toolchain, Node 20), so a plain JSON file is used instead.
- **System monitoring**: real CPU/GPU/RAM/disk readings across every monitored host — local via native commands, remote hosts via SSH (`server/system.ts`, `server/hosts.ts`)
- **Files**: browse/download/upload/delete/share across every monitored host — local `fs`, remote SFTP (`server/files.ts`)
- **Styling**: Outfit/Inter (UI), JetBrains Mono (terminal/stats), dark indigo/glassmorphism theme

## How to run

```bash
npm run dev       # dev server (tsx server.ts) — port 5000
npm run build     # build for production
npm start         # run production build
```

## File structure

```
server.ts                   # Express + Vite dev middleware, all API routes
server/
  store.ts                    # Persistent JSON-file store: settings, hosts, HA/Discord config, devices, activity log
  hosts.ts                    # Dynamic host list (backed by store.ts) + SSH exec helper
  system.ts                  # Real CPU/GPU/RAM/disk/uptime readings for every monitored host
  files.ts                   # File browsing/download/upload/delete/share (local fs + remote SFTP)
src/
  App.tsx                    # Root: splash → login (masked identifiant) → lock → router
  main.tsx                   # Entry point
  index.css                  # Global styles + logo effect classes
  lib/theme.ts                # Logo color/style system (localStorage-persisted)
  components/
    Splashscreen.tsx          # Animated boot screen — 23 distinct visual variants, supports preview mode
    LockScreen.tsx            # Lock screen overlay
    Sidebar.tsx                # Collapsible navigation sidebar
    TopBar.tsx                 # Header with clock, logo menu, status
    StatusBar.tsx              # Bottom status bar
  pages/
    Dashboard.tsx              # Overview: devices, servers, Discord, media
    Domotique.tsx              # Home Assistant device control (all devices)
    Spotify.tsx                # Spotify player + FireStick remote
    Discord.tsx                # Discord bot logs terminal
    ZimaOS.tsx                 # Real-time CPU/GPU/RAM/disk diagnostics for every monitored host + add/remove systems
    Fichiers.tsx                # File browser/transfer/share across every monitored host
    Settings.tsx                # Logo config, profile, boot animation gallery + preview, activity log
```

## API endpoints (server.ts)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/system/stats` | Real CPU/GPU/RAM/disk stats for every monitored host |
| GET/POST | `/api/hosts` | List / add a monitored host (up to 3 beyond the built-in local + remote) |
| DELETE | `/api/hosts/:id` | Remove a monitored host (not the built-in local one) |
| GET | `/api/activity` | Recent activity log entries (persistent; the weekly-pruned "cache") |
| POST | `/api/activity` | Record a client-side action (e.g. login) into the activity log |
| GET/POST | `/api/discord/logs` | Discord activity logs |
| GET/POST | `/api/home-assistant/config` | HA connection config |
| GET | `/api/home-assistant/devices` | Device list (real HA or persisted mock fallback) |
| POST | `/api/home-assistant/command` | Send HA service command |
| GET | `/api/files/:host` | List a directory on a given host id |
| GET | `/api/files/:host/download` | Download a file |
| POST | `/api/files/:host/upload` | Upload a file (multipart) |
| DELETE | `/api/files/:host` | Delete a file/folder |
| POST | `/api/files/:host/share` | Create a 24h temporary public download link |
| GET | `/api/share/:token` | Download via a share link (no auth) |

## System monitoring & files architecture

- **local** host = whichever machine actually runs this Node process. Its own CPU/RAM/disk/GPU are read directly (no network hop, no credentials): `/proc/stat`, `/proc/uptime`, `free -b`, `df`, `/sys/class/thermal`, `/sys/class/drm` (Intel iGPU) or `nvidia-smi` (dedicated GPU) if present.
- **remote** host = the "ZimaOS Principal" box (default IP `192.168.1.25`), reached over SSH using the `ZIMA2_SSH_HOST` / `ZIMA2_SSH_USER` / `ZIMA2_SSH_PASSWORD` secrets. File browsing there uses SFTP.
- Additional hosts (up to 3) can be added from the ZimaOS page with their own name/IP/SSH user/password — stored permanently via `server/store.ts`.
- If SSH isn't configured or a remote host is unreachable, every affected field reports `available: false` with a French reason string — the UI shows "Non disponible", never a fabricated number.
- GPU stats: dedicated GPU via `nvidia-smi` first, otherwise Intel iGPU frequency via sysfs (`/sys/class/drm/card0/gt_cur_freq_mhz`) — accurate for the Celeron N5105/J4125 platforms these boxes use. Reports unavailable if neither exists.
- Disk temperature/health need `smartctl` with root rights; reported unavailable if not permitted.
- File manager root directories default to `/DATA` (ZimaOS/CasaOS default storage mount) and are configurable per host (`filesRoot`, or `LOCAL_FILES_ROOT`/`REMOTE_FILES_ROOT` for the built-in two).
- Share links are in-memory tokens valid 24h, meant for local-network "airdrop"-style transfers — no external hosting involved.

## Persistence & the weekly cache cleanup

- Everything that matters — HA/Discord config, device states, the monitored host list, and every meaningful action (login, device commands, settings changes, file operations, host add/remove) — is written to `data/nexus-store.json` via `server/store.ts` and survives restarts.
- Only the activity log and the Discord terminal log are treated as a "cache": `runCacheCleanupIfDue()` prunes entries older than 7 days once a week (checked daily on a timer). Settings, hosts, and config are never touched by this cleanup.
- `data/` is gitignored since host records can include SSH passwords.

## Authentication

Local password-based (stored in localStorage). Defaults:
- Username: `Mathieu`
- Password: `260209`
- Both configurable in Settings → Profil
- The identifiant field on the login screen is masked like a password by default, with an eye icon to reveal it.

## Secrets required

- `ZIMA2_SSH_HOST` / `ZIMA2_SSH_USER` / `ZIMA2_SSH_PASSWORD` — SSH access to the remote ZimaOS ("ZimaOS Principal") for real stats + file browsing. Without them, that box's card shows "Inaccessible" instead of fake data.

## User preferences

- Keep the NEXUS Panel design aesthetic (dark background `#050505`, glassmorphism panels, indigo accent)
- French UI language throughout
- The sidebar is collapsible (hover to expand) and can be pinned
- No AI/Gemini features — the "Copilote IA" page was removed at the user's request; the panel runs locally on the user's own ZimaOS network, not as an AI Studio/Replit-branded app
- No mocked ZimaOS/GPU stats — every metric must be a real reading or explicitly "non disponible", never a random/simulated number
