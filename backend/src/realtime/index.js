/*
 * ── WebSocket broadcaster ────────────────────────────────
 *
 * Uses the ws package (already a dependency) rather than SSE.
 *
 * WebSocket over SSE because:
 *   - The ws dependency is already installed
 *   - Bidirectional messages are simpler for future features
 *     (dashboard → server control)
 *   - No polyfill needed in the browser
 *
 * Subscribes to /src/devices pub-sub on startup. The subscription
 * fires only after setDeviceState has persisted to Postgres, so
 * everything broadcast here is guaranteed durable.
 *
 * On each device change:
 *   1. { type: "device_update", device: {...} }
 *   2. { type: "power_update", totalWatts, byRoom }
 *
 * On client connect: immediately sends a full device snapshot
 * so late joiners are never out of sync.
 *
 * No direct dependency on /src/db.
 */

import { WebSocketServer } from "ws";
import * as devices from "../devices/index.js";

/* �─ module-level wss ref so broadcastAlert can reach it ── */

let wss = null;

/* ─ helpers ─────────────────────────────────────────────── */

function computePower() {
  const all = devices.getAllDevices();
  let totalWatts = 0;
  const byRoom = {};
  for (const d of all) {
    totalWatts += d.powerWatts;
    byRoom[d.room] = (byRoom[d.room] ?? 0) + d.powerWatts;
  }
  return { totalWatts, byRoom };
}

/* ─ exports ─────────────────────────────────────────────── */

/**
 * Attach a WebSocket server to the provided HTTP server.
 * Clients connect at ws://host:port/ws
 */
export function attachWebSocket(httpServer) {
  wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  console.log("WebSocket server attached at /ws.");

  /* ─ per-connection lifecycle ────────────────────────── */

  wss.on("connection", (ws) => {
    console.log("WebSocket client connected.");

    /* send full snapshot so late joiners are in sync */
    ws.send(JSON.stringify({
      type: "snapshot",
      devices: devices.getAllDevices(),
      power: computePower(),
    }));

    ws.on("error", (err) => {
      console.error("WebSocket client error:", err.message);
    });

    ws.on("close", () => {
      console.log("WebSocket client disconnected.");
    });
  });

  /* ─ subscribe to device changes ─────────────────────── */

  const onChange = (_action, device) => {
    const power = computePower();

    const deviceMsg = JSON.stringify({ type: "device_update", device });
    const powerMsg  = JSON.stringify({ type: "power_update", ...power });

    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(deviceMsg);
        client.send(powerMsg);
      }
    }
  };

  devices.subscribe(onChange);

  /* ─ teardown on server shutdown ─────────────────────── */

  wss.on("close", () => {
    devices.unsubscribe(onChange);
    console.log("WebSocket server torn down.");
  });
}

/**
 * Broadcast an alert to all connected WebSocket clients.
 * Called by the alert engine when a new alert fires.
 */
export function broadcastAlert(alert) {
  if (!wss) return;
  const msg = JSON.stringify({ type: "alert", alert });
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}
