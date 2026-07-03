#!/usr/bin/env node
/*
 * ── Discord bot (standalone entry) ───────────────────────
 *
 * Can be started as a separate process via `npm run bot`.
 * Imports the shared devices interface but NOT the db module.
 * Communicates with Supabase only through /src/devices.
 */

import "dotenv/config";
import * as devices from "../devices/index.js";
import { startAlertEngine } from "../alerts/index.js";

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const ALERT_CHANNEL_ID = process.env.DISCORD_ALERT_CHANNEL_ID;

if (!TOKEN || !ALERT_CHANNEL_ID) {
  console.error("Missing DISCORD_BOT_TOKEN or DISCORD_ALERT_CHANNEL_ID");
  process.exit(1);
}

/* ─ placeholder: Discord client setup ──────────────────── */
/* When discord.js is added, instantiate Client and log in   */

console.log("Discord bot skeleton ready. TOKEN and ALERT_CHANNEL_ID loaded.");

/* ─ hook alerts into Discord ───────────────────────────── */
startAlertEngine((alert) => {
  console.log("Alert received (placeholder — send to Discord):", alert.message);
  /* send alert to Discord channel here */
});
