# Lights, Fans, Discord — Agent Guide

## Setup

```bash
cp backend/.env.example backend/.env   # fill in real credentials
npm install --prefix backend
npm run dev --prefix backend           # watch mode (node --watch)
```

Required env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server exits without them). `PORT` defaults to `3001`.

## Architecture rules

- **`src/db/`** — thin Supabase client + query functions only. No business logic.
- **`src/devices/`** — the ONLY module that imports `src/db/`. Owns cache + business logic.
  - API, realtime, alerts, and bot must talk to devices **only** through its exported interface (`getAllDevices`, `getDevice`, `setDeviceState`, `subscribe`, `unsubscribe`).
  - `setDeviceState(id, "on"|"off")` awaits a Postgres round-trip before updating the cache — this is intentional for data safety.
- The Discord bot is a **separate process** started via `npm run bot --prefix backend` (not part of `server.js`). It talks to the backend **only** through REST API calls — never imports devices/db directly.

## Fixed device layout (15 total)

| Room | Fans | Lights |
|---|---|---|
| Drawing Room | drawing-fan-{1,2} | drawing-light-{1..3} |
| Work Room 1 | work1-fan-{1,2} | work1-light-{1..3} |
| Work Room 2 | work2-fan-{1,2} | work2-light-{1..3} |

Power when ON: fan = 60W, light = 15W. OFF = 0W.

## Expected Supabase tables

Tables (`devices`, `device_history`, `alerts`) must exist. If `devices` is empty at startup, all 15 devices are generated with random initial state and upserted.

## Simulator

`startSimulator(5000)` runs automatically in `server.js` — toggles 0–2 random devices every 5 s. Remove or configure it for tests.

## Alert engine

`startAlertEngine(onNewAlert)` runs in `server.js` every 60 s. Checks two conditions: after_hours (outside 9AM–5PM) and room_stuck_on (all devices in a room on for >2h). Alerts persist to `alerts` table in Postgres, deduplicated by (type, room). New alerts fire the `onNewAlert` callback which broadcasts via WebSocket and logs to console.

## ESM

The project uses `"type": "module"` — use `import`/`export`, **not** `require`.

## API routes

All under `/api` prefix:
- `GET /api/devices` — all devices grouped by room
- `GET /api/devices/:room` — filter by room slug (`drawing`|`work1`|`work2`)
- `POST /api/devices/:id/toggle` — flip one device's status (body not required)
- `GET /api/power` — `{ totalWatts, byRoom }`
- `GET /api/usage/today` — `{ currentWatts, estimatedKwhToday }`
- `GET /api/alerts` — active (unresolved) alerts

## Discord bot

Commands: `!status` (room-by-room summary), `!room <slug>` (single room), `!usage` (current W + kWh). Proactive alerts poll `GET /api/alerts` every 15 s and post to `DISCORD_ALERT_CHANNEL_ID`.

Optional LLM enhancement behind `USE_LLM=true` + `LLM_API_KEY` + `LLM_API_URL` (supports any OpenAI-compatible API: OpenAI, DeepSeek, OpenRouter, Ollama, etc.). Falls back to templates when disabled or API call fails.
