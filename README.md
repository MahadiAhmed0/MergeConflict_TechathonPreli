# Lights, Fans, Discord

A hackathon demo: simulate office lights and fans, control them from a web dashboard or Discord, and get alerts when something's off.

## Architecture

```
Simulated Device Layer  →  Backend API (Express + Supabase Postgres)  →  Web UI + Discord Bot
                              ↑
                      In-memory cache (fast reads)
```

All 15 devices (3 rooms × 2 fans + 3 lights) are simulated — no physical hardware. The backend serves a REST API backed by an in-memory cache for reads and Supabase Postgres for persistence. A WebSocket endpoint (`/ws`) pushes live state changes. The Discord bot is a separate process that talks only to the REST API.

## Setup

### 1. Supabase

Create a project at [supabase.com](https://supabase.com), then open the **SQL Editor** and paste the contents of `backend/schema.sql`. This creates the three tables: `devices`, `device_history`, and `alerts`.

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
```

Fill in these env vars in `.env`:

| Variable | Required | Default | Notes |
|---|---|---|---|
| `SUPABASE_URL` | Yes | — | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | — | Service role key (bypasses RLS) |
| `DISCORD_BOT_TOKEN` | No | — | Required for the bot |
| `DISCORD_ALERT_CHANNEL_ID` | No | — | Channel for proactive alert posts |
| `PORT` | No | `3001` | Backend server port |
| `API_BASE_URL` | No | `http://localhost:3001` | Used by the bot |


Start the backend:

```bash
npm run dev          # watch mode (node --watch)
```

On first start, the backend generates 15 devices with random state and upserts them to Supabase. On subsequent starts it loads existing rows from the DB — state and history survive restarts.

### 3. Discord bot (optional)

In a separate terminal:

```bash
cd backend
npm run bot
```

Responds to `!status`, `!room <slug>`, and `!usage` in any Discord channel the bot can see. Proactively posts unresolved alerts to `DISCORD_ALERT_CHANNEL_ID` every 15 seconds.

### 4. Frontend (optional)

A web dashboard (separate repo or directory) should point `NEXT_PUBLIC_BACKEND_URL` at `http://localhost:3001`.

## API reference

All endpoints are under the `/api` prefix. CORS is enabled for all origins.

| Endpoint | Method | Description | Source |
|---|---|---|---|
| `/api/devices` | GET | All 15 devices grouped by room | Cache |
| `/api/devices/:room` | GET | Devices in one room (`drawing`, `work1`, `work2`) | Cache |
| `/api/devices/:id/toggle` | POST | Flip one device's status (no body needed) | DB write |
| `/api/power` | GET | `{ totalWatts, byRoom }` — total and per-room power | Cache |
| `/api/usage/today` | GET | `{ currentWatts, estimatedKwhToday }` — from history table | DB |
| `/api/alerts` | GET | Active (unresolved) alerts | DB |

A WebSocket endpoint at `/ws` pushes three message types:
- `snapshot` — full device list + power on connect
- `device_update` — single device change
- `power_update` — recomputed totals after a change

## Known limitations

- **Single-instance only.** The in-memory cache lives in one Node.js process. Horizontal scaling would need a shared cache (Redis) or reading directly from Postgres.
- **No auth.** The API is open. A real deployment would add authentication.
- **Simulator always on.** `startSimulator(5000)` toggles 0–2 random devices every 5 seconds. Remove or configure it for deterministic testing.
