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

/* ─ subscriber registry ────────────────────────────────── */

const subscribers = new Set();

function notifySubscribers(action, device) {
  for (const cb of subscribers) {
    try { cb(action, device); } catch { /* per-subscriber */ }
  }
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
      await db.upsertDevice(d);
      cache.set(d.id, d);
    }
    console.log(`Seeded ${devices.length} devices into Postgres.`);
  } else {
    for (const row of rows) {
      cache.set(row.id, row);
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

  await db.upsertDevice(updated);
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
  const ids = Array.from(cache.keys());
  if (ids.length === 0) return;

  console.log(`Simulator started (interval=${intervalMs}ms, ${ids.length} devices).`);

  const handle = setInterval(() => {
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

  return () => clearInterval(handle);
}
