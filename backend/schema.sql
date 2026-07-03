/* ── Supabase setup for Lights, Fans, Discord ────────────
   Paste this into your Supabase project's SQL Editor.      */

/* devices — one row per fan or light */
create table if not exists devices (
  id          text primary key,
  name        text not null,
  type        text not null check (type in ('fan', 'light')),
  room        text not null,
  status      text not null default 'off' check (status in ('on', 'off')),
  "powerWatts"   integer not null default 0,
  "lastChanged"  timestamptz not null default now()
);

/* device_history — append-only log of state changes */
create table if not exists device_history (
  id          bigint generated always as identity primary key,
  device_id   text not null references devices(id),
  status      text not null,
  power_watts integer not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_history_device_time
  on device_history (device_id, created_at desc);

/* alerts — deduplicated by (type, room) where resolved_at is null */
create table if not exists alerts (
  id          bigint generated always as identity primary key,
  type        text not null,
  message     text not null,
  room        text not null,
  timestamp   timestamptz not null,
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);
