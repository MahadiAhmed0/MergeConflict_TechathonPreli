/*
 * ── Alert engine ─────────────────────────────────────────
 *
 * Runs as a checked interval (every 60 s by default) and
 * evaluates two conditions:
 *
 *   1. "after_hours"   — any device "on" outside 9 AM–5 PM.
 *   2. "room_stuck_on" — a room where every device has been
 *      continuously "on" for more than 2 hours.
 *
 * Alerts are persisted to Postgres via /src/devices wrappers
 * so they survive a backend restart (the Discord bot won't
 * fire twice for the same condition).
 *
 * Deduplication: before inserting, all active alerts are
 * fetched; if an unresolved alert of the same (type, room)
 * already exists, no duplicate is written. When a condition
 * clears, the matching alert is resolved.
 *
 * On a new alert: calls the onNewAlert callback so the
 * realtime layer can broadcast it immediately.
 *
 * No direct dependency on /src/db — alert persistence goes
 * through the /src/devices interface.
 */

import * as devices from "../devices/index.js";

/* ─ constants ──────────────────────────────────────────── */

const OFFICE_HOURS_START = 9;   // 9 AM
const OFFICE_HOURS_END   = 17;  // 5 PM
const STUCK_ON_MS        = 2 * 60 * 60 * 1000;  // 2 hours
const CHECK_INTERVAL_MS  = 60_000;

/* ─ check logic ────────────────────────────────────────── */

async function checkAlerts(onNewAlert) {
  const all       = devices.getAllDevices();
  const active    = await devices.getActiveAlerts();
  const now       = new Date();
  const hour      = now.getHours();
  const isOffHours = hour < OFFICE_HOURS_START || hour >= OFFICE_HOURS_END;

  /* group devices by room */
  const byRoom = {};
  for (const d of all) {
    if (!byRoom[d.room]) byRoom[d.room] = [];
    byRoom[d.room].push(d);
  }

  for (const [room, roomDevices] of Object.entries(byRoom)) {
    const afterHoursAlert = active.find(
      a => a.type === "after_hours" && a.room === room
    );
    const stuckOnAlert = active.find(
      a => a.type === "room_stuck_on" && a.room === room
    );

    /* ── 1. after_hours ── */
    const roomHasDeviceOn = roomDevices.some(d => d.status === "on");

    if (isOffHours && roomHasDeviceOn && !afterHoursAlert) {
      const alert = await devices.insertAlert({
        type:    "after_hours",
        message: `Devices in ${room} are on outside office hours (9 AM–5 PM)`,
        room,
      });
      onNewAlert(alert);
    } else if (!isOffHours && afterHoursAlert) {
      await devices.resolveAlert(afterHoursAlert.id);
    }

    /* ── 2. room_stuck_on ── */
    const allOn = roomDevices.every(d => d.status === "on");

    if (!allOn) {
      if (stuckOnAlert) await devices.resolveAlert(stuckOnAlert.id);
      continue;   /* nothing stuck — move to next room */
    }

    const oldestChange = Math.min(
      ...roomDevices.map(d => new Date(d.lastChanged).getTime())
    );
    const stuckDuration = now.getTime() - oldestChange;

    if (stuckDuration >= STUCK_ON_MS && !stuckOnAlert) {
      const alert = await devices.insertAlert({
        type:    "room_stuck_on",
        message: `${room} has been fully powered for over 2 hours`,
        room,
      });
      onNewAlert(alert);
    }
  }
}

/* ─ export ──────────────────────────────────────────────── */

/**
 * Start the alert engine.
 *
 * @param {Function} onNewAlert  — called with the inserted
 *   alert object whenever a new alert fires. Use this to
 *   broadcast through WebSocket and/or forward to Discord.
 * @returns {Function}           — call to stop the interval.
 */
export function startAlertEngine(onNewAlert = () => {}) {
  /* run immediately, then every CHECK_INTERVAL_MS */
  checkAlerts(onNewAlert).catch(err =>
    console.error("Alert engine (initial check):", err.message)
  );

  const handle = setInterval(() => {
    checkAlerts(onNewAlert).catch(err =>
      console.error("Alert engine:", err.message)
    );
  }, CHECK_INTERVAL_MS);

  return () => {
    clearInterval(handle);
  };
}
