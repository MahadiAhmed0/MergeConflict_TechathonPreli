/*
 * ── Alert engine ─────────────────────────────────────────
 *
 * Evaluates device state changes against threshold / anomaly
 * rules and emits alert events.
 * No direct dependency on /src/db.
 */

import * as devices from "../devices/index.js";

/** Start the alert engine. Returns an unsubscribe function. */
export function startAlertEngine(alertCallback) {
  const unsub = devices.subscribe((_action, device) => {
    /* ─ placeholder: evaluate rules here ───────────── */
    if (device.status === "error") {
      alertCallback({
        type: "error",
        deviceId: device.id,
        message: `Device "${device.name}" reported an error.`,
        timestamp: new Date().toISOString(),
      });
    }
  });

  return unsub;
}
