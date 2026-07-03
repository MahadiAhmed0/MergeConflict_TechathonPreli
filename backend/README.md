# Lights, Fans, Discord — Backend

One backend serving the web dashboard and the Discord bot.

- **Persistence**: Supabase Postgres (via `@supabase/supabase-js`)
- **Cache**: In-memory cache in `/src/devices` for fast reads
- **No real hardware** — all device data is simulated
- **Modules** communicate through the `/src/devices` shared interface only

## Quick start

```bash
cp .env.example .env   # fill in your credentials
npm install
npm run dev
```

## Project structure

```
backend/
├── src/
│   ├── devices/    # data model + cache + business logic (public interface)
│   ├── db/         # Supabase client + raw query helpers
│   ├── api/        # Express REST route handlers
│   ├── realtime/   # WebSocket broadcaster
│   ├── alerts/     # alert engine
│   └── bot/        # Discord bot (standalone process)
├── server.js       # entry point
├── package.json
└── .env.example
```
