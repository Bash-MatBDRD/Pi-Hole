# NEXUS Panel V2.0

A full-stack smart home dashboard built with React + Express + Vite, styled with the NEXUS Panel cyberpunk/glassmorphism aesthetic.

## Architecture

- **Frontend**: React 19 + TypeScript + Tailwind CSS v4 + Vite (served via Express middleware)
- **Backend**: Express + TypeScript (`server.ts`) — runs on port **5000**
- **AI**: Google Gemini (`@google/genai`) — requires `GEMINI_API_KEY` secret (falls back to demo mode)
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
src/
  App.tsx                   # Root: splash → login → lock → router
  main.tsx                  # Entry point
  index.css                 # Global styles + logo effect classes
  lib/theme.ts              # Logo color/style system (localStorage-persisted)
  components/
    Splashscreen.tsx         # Animated boot screen
    LockScreen.tsx           # Lock screen overlay
    Sidebar.tsx              # Collapsible navigation sidebar
    TopBar.tsx               # Header with clock, logo menu, status
    StatusBar.tsx            # Bottom status bar
  pages/
    Dashboard.tsx            # Overview: devices, servers, Discord, media
    Domotique.tsx            # Home Assistant device control
    Spotify.tsx              # Spotify player + FireStick remote
    Discord.tsx              # Discord bot logs terminal
    ZimaOS.tsx               # ZimaOS server diagnostics
    AI.tsx                   # Gemini AI natural language control
    Settings.tsx             # Logo config, profile, boot animation
```

## API endpoints (server.ts)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/system/stats` | ZimaOS + Discord bot stats |
| GET/POST | `/api/discord/logs` | Discord activity logs |
| GET/POST | `/api/home-assistant/config` | HA connection config |
| GET | `/api/home-assistant/devices` | Device list (real HA or mock) |
| POST | `/api/home-assistant/command` | Send HA service command |
| POST | `/api/ai/command` | Gemini AI natural language → HA commands |

## Authentication

Local password-based (stored in localStorage). Defaults:
- Username: `Mathieu`
- Password: `260209`
- Both configurable in Settings → Profil

## Secrets required

- `GEMINI_API_KEY` — for real AI features (optional; demo mode works without it)

## User preferences

- Keep the NEXUS Panel design aesthetic (dark background `#050505`, glassmorphism panels, indigo accent)
- French UI language throughout
- The sidebar is collapsible (hover to expand) and can be pinned
