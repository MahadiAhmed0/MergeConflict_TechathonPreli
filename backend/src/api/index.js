import { Router } from "express";
import * as devices from "../devices/index.js";

const router = Router();

/* ── GET /api/devices ────────────────────────────────────
 * All devices grouped by room name, from the in-memory cache. */
router.get("/devices", (_req, res, next) => {
  try {
    const all = devices.getAllDevices();
    const grouped = {};
    for (const d of all) {
      if (!grouped[d.room]) grouped[d.room] = [];
      grouped[d.room].push(d);
    }
    res.json(grouped);
  } catch (err) {
    next(err);
  }
});

/* ── GET /api/devices/:room ──────────────────────────────
 * Devices for one room, identified by slug ("drawing"|"work1"|"work2"). */
router.get("/devices/:room", (req, res, next) => {
  try {
    const list = devices.getDevicesByRoomSlug(req.params.room);
    if (list === null) return res.sendStatus(404);
    res.json(list);
  } catch (err) {
    next(err);
  }
});

/* ── POST /api/devices/:id/toggle ────────────────────────
 * Flip a single device's status (the "pulse" endpoint).
 * Calls setDeviceState which persists before updating cache. */
router.post("/devices/:id/toggle", async (req, res, next) => {
  try {
    const device = devices.getDevice(req.params.id);
    if (!device) return res.sendStatus(404);

    const newStatus = device.status === "on" ? "off" : "on";
    const updated = await devices.setDeviceState(req.params.id, newStatus);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/* ── GET /api/power ──────────────────────────────────────
 * Total and per-room power draw from the cache. */
router.get("/power", (_req, res, next) => {
  try {
    const all = devices.getAllDevices();
    let totalWatts = 0;
    const byRoom = {};

    for (const d of all) {
      totalWatts += d.powerWatts;
      byRoom[d.room] = (byRoom[d.room] ?? 0) + d.powerWatts;
    }

    res.json({ totalWatts, byRoom });
  } catch (err) {
    next(err);
  }
});

/* ── GET /api/usage/today ────────────────────────────────
 * Current draw + estimated kWh since 9 AM today.
 * Hits the DB for the history-based kWh estimate. */
router.get("/usage/today", async (_req, res, next) => {
  try {
    const usage = await devices.getUsageToday();
    res.json(usage);
  } catch (err) {
    next(err);
  }
});

/* ── GET /api/alerts ─────────────────────────────────────
 * Active (unresolved) alerts from the database. */
router.get("/alerts", async (_req, res, next) => {
  try {
    const alerts = await devices.getActiveAlerts();
    res.json(alerts);
  } catch (err) {
    next(err);
  }
});

export default router;
