# Lights, Fans, Discord — API Reference

Base URL: `http://localhost:3001/api`

---

## REST Endpoints

### `GET /api/devices`

All 15 devices grouped by room name. **Source:** in-memory cache (instant).

**Response:**

```json
{
  "Drawing Room": [
    { "id": "drawing-fan-1",   "name": "Fan 1",   "type": "fan",   "room": "Drawing Room", "status": "on",  "powerWatts": 60, "lastChanged": "2026-07-04T02:30:00.000Z" },
    { "id": "drawing-fan-2",   "name": "Fan 2",   "type": "fan",   "room": "Drawing Room", "status": "off", "powerWatts": 0,  "lastChanged": "2026-07-04T02:25:00.000Z" },
    { "id": "drawing-light-1", "name": "Light 1", "type": "light", "room": "Drawing Room", "status": "on",  "powerWatts": 15, "lastChanged": "2026-07-04T02:28:00.000Z" },
    { "id": "drawing-light-2", "name": "Light 2", "type": "light", "room": "Drawing Room", "status": "off", "powerWatts": 0,  "lastChanged": "2026-07-04T02:20:00.000Z" },
    { "id": "drawing-light-3", "name": "Light 3", "type": "light", "room": "Drawing Room", "status": "on",  "powerWatts": 15, "lastChanged": "2026-07-04T02:22:00.000Z" }
  ],
  "Work Room 1": [
    { "id": "work1-fan-1",     "name": "Fan 1",   "type": "fan",   "room": "Work Room 1",  "status": "off", "powerWatts": 0,  "lastChanged": "…" },
    { "id": "work1-fan-2",     "name": "Fan 2",   "type": "fan",   "room": "Work Room 1",  "status": "on",  "powerWatts": 60, "lastChanged": "…" },
    { "id": "work1-light-1",   "name": "Light 1", "type": "light", "room": "Work Room 1",  "status": "on",  "powerWatts": 15, "lastChanged": "…" },
    { "id": "work1-light-2",   "name": "Light 2", "type": "light", "room": "Work Room 1",  "status": "on",  "powerWatts": 15, "lastChanged": "…" },
    { "id": "work1-light-3",   "name": "Light 3", "type": "light", "room": "Work Room 1",  "status": "off", "powerWatts": 0,  "lastChanged": "…" }
  ],
  "Work Room 2": [
    { "id": "work2-fan-1",     "name": "Fan 1",   "type": "fan",   "room": "Work Room 2",  "status": "off", "powerWatts": 0,  "lastChanged": "…" },
    { "id": "work2-fan-2",     "name": "Fan 2",   "type": "fan",   "room": "Work Room 2",  "status": "off", "powerWatts": 0,  "lastChanged": "…" },
    { "id": "work2-light-1",   "name": "Light 1", "type": "light", "room": "Work Room 2",  "status": "off", "powerWatts": 0,  "lastChanged": "…" },
    { "id": "work2-light-2",   "name": "Light 2", "type": "light", "room": "Work Room 2",  "status": "off", "powerWatts": 0,  "lastChanged": "…" },
    { "id": "work2-light-3",   "name": "Light 3", "type": "light", "room": "Work Room 2",  "status": "off", "powerWatts": 0,  "lastChanged": "…" }
  ]
}
```

---

### `GET /api/devices/:room`

Filter by room slug. **Source:** cache.

| Slug | Room |
|---|---|
| `drawing` | Drawing Room |
| `work1`  | Work Room 1 |
| `work2`  | Work Room 2 |

**Response:** flat array of device objects (same shape as above). Returns `404` for unknown slugs.

---

### `POST /api/devices/:id/toggle`

Flip a single device's status (`"on"` ↔ `"off"`). **Source:** Postgres write (persists before cache update).

- Body **not required**.
- Returns the updated device object.
- Returns `404` for unknown device IDs.

**Example:** `POST /api/devices/drawing-fan-1/toggle`

```json
{
  "id": "drawing-fan-1",
  "name": "Fan 1",
  "type": "fan",
  "room": "Drawing Room",
  "status": "off",
  "powerWatts": 0,
  "lastChanged": "2026-07-04T02:31:00.000Z"
}
```

---

### `GET /api/power`

Total and per-room power draw. **Source:** cache.

```json
{
  "totalWatts": 90,
  "byRoom": {
    "Drawing Room": 30,
    "Work Room 1": 60,
    "Work Room 2": 0
  }
}
```

---

### `GET /api/usage/today`

Current draw + estimated kWh since 9 AM today. **Source:** cache + DB (history table).

```json
{
  "currentWatts": 90,
  "estimatedKwhToday": 0.45
}
```

**Algorithm:** integrates `powerWatts × duration` across consecutive `device_history` rows for each device, then sums and divides by 1000. Accurate across server restarts (not uptime-based).

---

### `GET /api/alerts`

Active (unresolved) alerts. **Source:** DB.

```json
[
  {
    "id": 1,
    "type": "after_hours",
    "message": "Devices in Drawing Room are on outside office hours (9 AM–5 PM)",
    "room": "Drawing Room",
    "timestamp": "2026-07-04T22:05:00.000Z",
    "resolved_at": null,
    "created_at": "2026-07-04T22:05:00.000Z"
  }
]
```

Only alerts where `resolved_at` is `null`. The alert engine checks every 60 seconds.

---

## WebSocket — `ws://localhost:3001/ws`

### On connect (snapshot)

```json
{
  "type": "snapshot",
  "devices": [ /* 15 device objects */ ],
  "power": { "totalWatts": 90, "byRoom": { "Drawing Room": 30, "Work Room 1": 60, "Work Room 2": 0 } }
}
```

### On device change (simulator toggle or POST toggle)

```json
{ "type": "device_update", "device": { /* single device object */ } }
{ "type": "power_update",  "totalWatts": 90, "byRoom": { "Drawing Room": 30, "Work Room 1": 60, "Work Room 2": 0 } }
```

### On new alert

```json
{ "type": "alert", "alert": { /* alert object */ } }
```

---

## Device object shape

| Field | Type | Values |
|---|---|---|
| `id` | string | `"drawing-fan-1"`, `"work1-light-3"`, ... |
| `name` | string | `"Fan 1"`, `"Light 3"` |
| `type` | string | `"fan"` \| `"light"` |
| `room` | string | `"Drawing Room"` \| `"Work Room 1"` \| `"Work Room 2"` |
| `status` | string | `"on"` \| `"off"` |
| `powerWatts` | number | `60` (fan ON), `15` (light ON), `0` (OFF) |
| `lastChanged` | ISO 8601 | `"2026-07-04T02:30:00.000Z"` |

## Room layout (15 devices)

| Room | Fans | Lights |
|---|---|---|
| Drawing Room | `drawing-fan-1`, `drawing-fan-2` | `drawing-light-1` … `drawing-light-3` |
| Work Room 1 | `work1-fan-1`, `work1-fan-2` | `work1-light-1` … `work1-light-3` |
| Work Room 2 | `work2-fan-1`, `work2-fan-2` | `work2-light-1` … `work2-light-3` |
