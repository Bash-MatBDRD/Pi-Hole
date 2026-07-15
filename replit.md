# NEXUS Panel V2.0

A full-stack smart home dashboard built with React + Express + Vite, styled with the NEXUS Panel cyberpunk/glassmorphism aesthetic.

## Architecture

- **Frontend**: React 19 + TypeScript + Tailwind CSS v4 + Vite (served via Express middleware)
- **Backend**: Express + TypeScript (`server.ts`) — runs on port **5000**
- **System monitoring**: real CPU/GPU/RAM/disk readings — local host via native commands, remote ZimaOS via SSH (`server/system.ts`, `server/hosts.ts`)
- **Files**: browse/download/upload/delete/share across both ZimaOS boxes — local `fs`, remote SFTP (`server/files.ts`)
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
  hosts.ts                   # Host definitions ("local" = this machine, "remote" = SSH) + SSH exec helper
  system.ts                  # Real CPU/GPU/RAM/disk/uptime readings for both ZimaOS boxes
  files.ts                   # File browsing/download/upload/delete/share (local fs + remote SFTP)
src/
  App.tsx                    # Root: splash → login → lock → router
  main.tsx                   # Entry point
  index.css                  # Global styles + logo effect classes
  lib/theme.ts                # Logo color/style system (localStorage-persisted)
  components/
    Splashscreen.tsx          # Animated boot screen
    LockScreen.tsx            # Lock screen overlay
    Sidebar.tsx                # Collapsible navigation sidebar
    TopBar.tsx                 # Header with clock, logo menu, status
    StatusBar.tsx              # Bottom status bar
  pages/
    Dashboard.tsx              # Overview: devices, servers, Discord, media
    Domotique.tsx              # Home Assistant device control (all devices)
    Spotify.tsx                # Spotify player + FireStick remote
    Discord.tsx                # Discord bot logs terminal
    ZimaOS.tsx                 # Real-time CPU/GPU/RAM/disk diagnostics for both ZimaOS
    Fichiers.tsx                # File browser/transfer/share for both ZimaOS
    Settings.tsx                # Logo config, profile, boot animation
```

## API endpoints (server.ts)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/system/stats` | Real CPU/GPU/RAM/disk stats for both ZimaOS boxes |
| GET/POST | `/api/discord/logs` | Discord activity logs |
| GET/POST | `/api/home-assistant/config` | HA connection config |
| GET | `/api/home-assistant/devices` | Device list (real HA or mock fallback) |
| POST | `/api/home-assistant/command` | Send HA service command |
| GET | `/api/files/:host` | List a directory (`host` = `local` \| `remote`) |
| GET | `/api/files/:host/download` | Download a file |
| POST | `/api/files/:host/upload` | Upload a file (multipart) |
| DELETE | `/api/files/:host` | Delete a file/folder |
| POST | `/api/files/:host/share` | Create a 24h temporary public download link |
| GET | `/api/share/:token` | Download via a share link (no auth) |

## System monitoring & files architecture

- **local** host = whichever machine actually runs this Node process. Its own CPU/RAM/disk/GPU are read directly (no network hop, no credentials): `/proc/stat`, `/proc/uptime`, `free -b`, `df`, `/sys/class/thermal`, `/sys/class/drm` (Intel iGPU) or `nvidia-smi` (dedicated GPU) if present.
- **remote** host = the other ZimaOS box (default IP `192.168.1.25`), reached over SSH using the `ZIMA2_SSH_HOST` / `ZIMA2_SSH_USER` / `ZIMA2_SSH_PASSWORD` secrets. File browsing there uses SFTP.
- If SSH isn't configured or the remote box is unreachable, every affected field reports `available: false` with a French reason string — the UI shows "Non disponible", never a fabricated number.
- GPU stats: dedicated GPU via `nvidia-smi` first, otherwise Intel iGPU frequency via sysfs (`/sys/class/drm/card0/gt_cur_freq_mhz`) — accurate for the Celeron N5105/J4125 platforms these boxes use. Reports unavailable if neither exists.
- Disk temperature/health need `smartctl` with root rights; reported unavailable if not permitted.
- File manager root directories default to `/DATA` (ZimaOS/CasaOS default storage mount) and are configurable via `LOCAL_FILES_ROOT` / `REMOTE_FILES_ROOT`.
- Share links are in-memory tokens valid 24h, meant for local-network "airdrop"-style transfers — no external hosting involved.

## Authentication

Local password-based (stored in localStorage). Defaults:
- Username: `Mathieu`
- Password: `260209`
- Both configurable in Settings → Profil

## Secrets required

- `ZIMA2_SSH_HOST` / `ZIMA2_SSH_USER` / `ZIMA2_SSH_PASSWORD` — SSH access to the remote ZimaOS ("ZimaOS Principal") for real stats + file browsing. Without them, that box's card shows "Inaccessible" instead of fake data.

## User preferences

- Keep the NEXUS Panel design aesthetic (dark background `#050505`, glassmorphism panels, indigo accent)
- French UI language throughout
- The sidebar is collapsible (hover to expand) and can be pinned
- No AI/Gemini features — the "Copilote IA" page was removed at the user's request; the panel runs locally on the user's own ZimaOS network, not as an AI Studio/Replit-branded app
- No mocked ZimaOS/GPU stats — every metric must be a real reading or explicitly "non disponible", never a random/simulated number
