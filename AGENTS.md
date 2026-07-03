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
- The Discord bot is a **separate process** started via `npm run bot --prefix backend` (not part of `server.js`).

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

## ESM

The project uses `"type": "module"` — use `import`/`export`, **not** `require`.

## API routes

All under `GET /api/devices` prefix:
- `GET /api/devices` — list all
- `GET /api/devices/room/:room` — filter by room name
- `GET /api/devices/:id` — single device
- `PATCH /api/devices/:id/state` — body: `{ "status": "on"|"off" }`
