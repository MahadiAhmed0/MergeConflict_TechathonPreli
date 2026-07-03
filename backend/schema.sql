-- devices: current state, single durable source of truth
create table devices (
  id text primary key,
  name text not null,
  type text not null check (type in ('fan','light')),
  room text not null check (room in ('Drawing Room','Work Room 1','Work Room 2')),
  status text not null check (status in ('on','off')),
  power_watts integer not null default 0,
  last_changed timestamptz not null default now()
);

-- device_history: append-only log of every state change, used for kWh estimation
create table device_history (
  id bigint generated always as identity primary key,
  device_id text not null references devices(id),
  status text not null,
  power_watts integer not null,
  changed_at timestamptz not null default now()
);

-- alerts: durable, timestamped alert log
create table alerts (
  id bigint generated always as identity primary key,
  type text not null check (type in ('after_hours','room_stuck_on')),
  message text not null,
  room text not null,
  created_at timestamptz not null default now(),
  resolved boolean not null default false
);
