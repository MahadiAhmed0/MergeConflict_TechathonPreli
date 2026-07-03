/*
 * ── WebSocket broadcaster ────────────────────────────────
 *
 * Listens for device changes via /src/devices subscribe() and
 * pushes the update to all connected WebSocket clients.
 * No direct dependency on /src/db.
 */

import { WebSocketServer } from "ws";
import * as devices from "../devices/index.js";

/** Attach a WebSocket server to the provided HTTP server. */
export function attachWebSocket(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });
  console.log("WebSocket server attached.");

  wss.on("connection", (ws) => {
    console.log("WebSocket client connected.");

    ws.on("close", () => {
      console.log("WebSocket client disconnected.");
    });
  });

  /* broadcast device changes to all connected clients */
  const unsub = devices.subscribe((action, device) => {
    const message = JSON.stringify({ event: action, device });
    for (const client of wss.clients) {
      if (client.readyState === WebSocketServer.OPEN) {
        client.send(message);
      }
    }
  });

  /* Tear down the subscription when the server closes. */
  wss.on("close", unsub);
}
