/*
 * ── Devices module ────────────────────────────────────────
 *
 * The ONLY module that talks to /src/db directly.
 * Owns the in-memory cache + all device business logic.
 *
 * Shared interface (consumed by API, realtime, alerts, bot):
 *   initDevices()
 *   getAllDevices()
 *   getDevicesByRoom(room)
 *   getDevice(id)
 *   setDeviceState(id, status)
 *   subscribe(callback)
 *   unsubscribe(callback)
 *   startSimulator(intervalMs)
 *   stopSimulator()
 *   isSimulatorRunning()
 *
 * Trade-off: every toggle costs a Postgres round-trip instead
 * of being instant in-memory. For 15 devices and hackathon-scale
 * traffic this is negligible, but if you needed sub-10ms toggles
 * at high frequency you'd batch/debounce the writes instead of
 * awaiting them inline.
 */

import * as db from "../db/index.js";

/* ─ constants ──────────────────────────────────────────── */

const ROOMS = [
  { name: "Drawing Room", slug: "drawing" },
  { name: "Work Room 1",  slug: "work1"   },
  { name: "Work Room 2",  slug: "work2"   },
];

const FANS_PER_ROOM   = 2;
const LIGHTS_PER_ROOM = 3;

const FAN_POWER   = 60;
const LIGHT_POWER = 15;

/* ─ in-memory cache ────────────────────────────────────── */

const cache = new Map();

/* ─ simulator handle ───────────────────────────────────── */

let simulatorHandle = null;

/* ─ subscriber registry ────────────────────────────────── */

const subscribers = new Set();

function notifySubscribers(action, device) {
  for (const cb of subscribers) {
    try { cb(action, device); } catch { /* per-subscriber */ }
  }
}

/* ─ DB / cache mapping ────────────────────────────────── */

/* DB rows use snake_case; the cache + public interface use camelCase. */
function fromDbRow(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    room: row.room,
    status: row.status,
    powerWatts: row.power_watts,
    lastChanged: row.last_changed,
  };
}

function toDbRow(d) {
  return {
    id: d.id,
    name: d.name,
    type: d.type,
    room: d.room,
    status: d.status,
    power_watts: d.powerWatts,
    last_changed: d.lastChanged,
  };
}

/* ─ helpers ────────────────────────────────────────────── */

function randomStatus() {
  return Math.random() < 0.5 ? "on" : "off";
}

function randomInitialState() {
  const all = [];

  for (const room of ROOMS) {
    for (let i = 1; i <= FANS_PER_ROOM; i++) {
      const status = randomStatus();
      all.push({
        id:          `${room.slug}-fan-${i}`,
        name:        `Fan ${i}`,
        type:        "fan",
        room:        room.name,
        status,
        powerWatts:  status === "on" ? FAN_POWER : 0,
        lastChanged: new Date().toISOString(),
      });
    }

    for (let i = 1; i <= LIGHTS_PER_ROOM; i++) {
      const status = randomStatus();
      all.push({
        id:          `${room.slug}-light-${i}`,
        name:        `Light ${i}`,
        type:        "light",
        room:        room.name,
        status,
        powerWatts:  status === "on" ? LIGHT_POWER : 0,
        lastChanged: new Date().toISOString(),
      });
    }
  }

  return all;
}

/* ─ shared interface ───────────────────────────────────── */

/**
 * Call once at startup. Fetches all devices from Supabase.
 * If the table is empty, generates the 15 fixed devices with
 * randomised initial state, upserts them, and loads the cache.
 * Otherwise loads existing rows into the cache.
 */
export async function initDevices() {
  const rows = await db.fetchAllDevices();

  if (rows.length === 0) {
    const devices = randomInitialState();
    for (const d of devices) {
      await db.upsertDevice(toDbRow(d));
      cache.set(d.id, d);
    }
    console.log(`Seeded ${devices.length} devices into Postgres.`);
  } else {
    for (const row of rows) {
      cache.set(row.id, fromDbRow(row));
    }
    console.log(`Loaded ${rows.length} devices from Postgres into cache.`);
  }
}

/** Return all devices from cache (no DB round-trip). */
export function getAllDevices() {
  return Array.from(cache.values());
}

/** Return devices filtered by room name. */
export function getDevicesByRoom(room) {
  return Array.from(cache.values()).filter(d => d.room === room);
}

/** Return a single device by id, or null. */
export function getDevice(id) {
  return cache.get(id) ?? null;
}

/**
 * Set a device's status ("on" | "off").
 *
 * 1. Computes powerWatts and lastChanged.
 * 2. Persists to Postgres (upsertDevice + insertHistoryRow).
 * 3. Only on DB success: updates cache + notifies subscribers.
 * 4. If DB write fails: throws, cache is unchanged.
 */
export async function setDeviceState(id, status) {
  const prev = cache.get(id);
  if (!prev) throw new Error(`Device "${id}" not found in cache.`);

  if (prev.status === status) return prev;

  const powerWatts = status === "on"
    ? (prev.type === "fan" ? FAN_POWER : LIGHT_POWER)
    : 0;
  const lastChanged = new Date().toISOString();

  const updated = { ...prev, status, powerWatts, lastChanged };

  await db.upsertDevice(toDbRow(updated));
  await db.insertHistoryRow(id, status, powerWatts);

  cache.set(id, updated);
  notifySubscribers("update", updated);
  return updated;
}

/** Register a callback for device changes. Returns the same callback for easy unsubscribe(). */
export function subscribe(callback) {
  subscribers.add(callback);
  return callback;
}

/** Remove a previously registered callback. */
export function unsubscribe(callback) {
  subscribers.delete(callback);
}

/** Return active (unresolved) alerts from the DB. */
export async function getActiveAlerts() {
  return db.fetchActiveAlerts();
}

/** Persist a new alert. Returns the inserted row with generated id. */
export async function insertAlert(alertData) {
  return db.insertAlert(alertData);
}

/** Mark an alert as resolved by id. */
export async function resolveAlert(id) {
  return db.resolveAlert(id);
}

/**
 * Compute today's power usage from the history table.
 *
 * Returns { currentWatts, estimatedKwhToday }.
 *
 * currentWatts — sum of all device powerWatts from the
 *   in-memory cache (instant, no DB hit).
 *
 * estimatedKwhToday — computed by integrating power over
 *   time using the persistent history table:
 *
 *   For each device:
 *     1. Fetch all history rows since 9 AM today.
 *     2. Also fetch the last state before 9 AM (to know the
 *        power level at the start of the window).
 *     3. Sort rows by created_at.
 *     4. For consecutive pairs (row_i → row_{i+1}):
 *          Wh += prev.power_watts × (row_{i+1}.created_at
 *                                     - row_i.created_at)
 *                                    / 3_600_000
 *     5. For the last row → now:
 *          Wh += last.power_watts × (now - last.created_at)
 *                                   / 3_600_000
 *
 *   Total Wh ÷ 1000 → kWh (rounded to 2 decimals).
 *
 * This works across restarts because the history table is
 * persistent — it does not rely on uptime counters.
 */
export async function getUsageToday() {
  const now = new Date();
  const today9am = new Date(now);
  today9am.setHours(9, 0, 0, 0);

  // currentWatts from cache (instant, no DB hit)
  const currentWatts = Array.from(cache.values()).reduce(
    (sum, d) => sum + d.powerWatts, 0
  );

  // Fetch history around the 9 AM cutoff
  const historyAfter  = await db.fetchHistorySince(today9am.toISOString());
  const historyBefore = await db.fetchAllHistoryBefore(today9am.toISOString());

  // Latest row per device before 9 AM → initial state at cutoff
  const initState = {};
  for (const row of historyBefore) {
    if (
      !initState[row.device_id] ||
      new Date(row.changed_at) > new Date(initState[row.device_id].changed_at)
    ) {
      initState[row.device_id] = row;
    }
  }

  // Group rows after 9 AM by device_id
  const byDevice = {};
  for (const row of historyAfter) {
    if (!byDevice[row.device_id]) byDevice[row.device_id] = [];
    byDevice[row.device_id].push(row);
  }

  let totalWh = 0;

  for (const [deviceId, rows] of Object.entries(byDevice)) {
    rows.sort((a, b) => new Date(a.changed_at) - new Date(b.changed_at));

    let prev = initState[deviceId] ?? {
      power_watts: cache.get(deviceId)?.powerWatts ?? 0,
      changed_at:  today9am.toISOString(),
    };

    for (const row of rows) {
      const durHours =
        (new Date(row.changed_at) - new Date(prev.changed_at)) / 3_600_000;
      totalWh += prev.power_watts * durHours;
      prev = row;
    }

    const finalHours =
      (now - new Date(prev.changed_at)) / 3_600_000;
    totalWh += prev.power_watts * finalHours;
  }

  return {
    currentWatts,
    estimatedKwhToday: Math.round((totalWh / 1000) * 100) / 100,
  };
}

/** Return devices for a room identified by its slug ("drawing", "work1", "work2"). Returns null for unknown slugs. */
export function getDevicesByRoomSlug(slug) {
  const room = ROOMS.find(r => r.slug === slug);
  if (!room) return null;
  return getDevicesByRoom(room.name);
}

/**
 * Start the device simulator.
 *
 * Every intervalMs, randomly picks 0-2 devices and toggles their
 * state so there is always "something live" happening without
 * user interaction.
 *
 * To tune randomness, adjust the upper bound of the pick count
 * (currently Math.floor(Math.random() * 3) → 0, 1, or 2).
 */
export function startSimulator(intervalMs = 5000) {
  if (simulatorHandle) return; // already running

  const ids = Array.from(cache.keys());
  if (ids.length === 0) return;

  console.log(`Simulator started (interval=${intervalMs}ms, ${ids.length} devices).`);

  simulatorHandle = setInterval(() => {
    const count = Math.floor(Math.random() * 3); // 0–2
    if (count === 0) return;

    const shuffled = [...ids].sort(() => Math.random() - 0.5);
    for (let i = 0; i < count; i++) {
      const id = shuffled[i];
      const device = cache.get(id);
      if (!device) continue;
      const newStatus = device.status === "on" ? "off" : "on";
      setDeviceState(id, newStatus).catch(err =>
        console.error(`Simulator: failed to toggle ${id}:`, err.message)
      );
    }
  }, intervalMs);
}

export function stopSimulator() {
  if (simulatorHandle) {
    clearInterval(simulatorHandle);
    simulatorHandle = null;
    console.log("Simulator stopped.");
  }
}

export function isSimulatorRunning() {
  return simulatorHandle !== null;
}
