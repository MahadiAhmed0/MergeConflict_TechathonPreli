#!/usr/bin/env node
/*
 * ── Discord bot (standalone process) ─────────────────────
 *
 * Started via `npm run bot --prefix backend`.
 *
 * Talks to the backend ONLY through its REST API (never
 * imports /src/devices or /src/db directly) so there is one
 * source of truth — the server's in-memory cache + Postgres.
 *
 * Commands:
 *   !status         —  room-by-room summary
 *   !room <slug>    —  single-room status (drawing|work1|work2)
 *   !usage          —  current W + estimated kWh today
 *
 * Proactive alert polling: every N seconds checks
 * GET /api/alerts and posts new unresolved alerts to
 * DISCORD_ALERT_CHANNEL_ID.
 *
 * Optional LLM enhancement (behind USE_LLM flag): calls
 * OpenAI to phrase responses conversationally; falls back
 * to templates if the flag is off or the API call fails.
 */

import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";

/* ── env ───────────────────────────────────────────────── */

const TOKEN            = process.env.DISCORD_BOT_TOKEN;
const ALERT_CHANNEL_ID = process.env.DISCORD_ALERT_CHANNEL_ID;
const API_BASE         = process.env.API_BASE_URL || "http://localhost:3001";
const USE_LLM          = process.env.USE_LLM === "true";
const OPENAI_API_KEY   = process.env.OPENAI_API_KEY;
const ALERT_POLL_MS    = parseInt(process.env.ALERT_POLL_INTERVAL_MS, 10) || 15_000;

if (!TOKEN) {
  console.warn("DISCORD_BOT_TOKEN not set — bot will not start. Set it in .env to enable the Discord bot.");
  process.exit(0);
}

/* ── HTTP helpers ───────────────────────────────────────── */

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${path} returned ${res.status}`);
  return res.json();
}

/* ── natural-language helpers ───────────────────────────── */

function describeRoom(roomName, devices) {
  const fansOn    = devices.filter(d => d.type === "fan"   && d.status === "on").length;
  const lightsOn  = devices.filter(d => d.type === "light" && d.status === "on").length;
  const totalFans   = devices.filter(d => d.type === "fan").length;
  const totalLights = devices.filter(d => d.type === "light").length;

  if (fansOn === 0 && lightsOn === 0) return `**${roomName}**: all off.`;

  if (fansOn === totalFans && lightsOn === totalLights) {
    return `**${roomName}**: all ON — ${totalFans} fan${totalFans > 1 ? "s" : ""}, ${totalLights} light${totalLights > 1 ? "s" : ""}.`;
  }

  const parts = [];
  if (fansOn > 0)   parts.push(`${fansOn} fan${fansOn   > 1 ? "s" : ""} ON`);
  if (lightsOn > 0) parts.push(`${lightsOn} light${lightsOn > 1 ? "s" : ""} ON`);
  return `**${roomName}**: ${parts.join(", ")}.`;
}

function templateStatusResponse(data) {
  return Object.entries(data)
    .map(([room, devices]) => describeRoom(room, devices))
    .join("\n");
}

function templateRoomResponse(devices) {
  if (devices.length === 0) return "No devices found for that room.";
  return describeRoom(devices[0].room, devices);
}

function templateUsageResponse(data) {
  return `Total power right now: **${data.currentWatts}W**. Today's estimated usage: **${data.estimatedKwhToday} kWh**.`;
}

function templateAlertMessage(alert) {
  if (alert.type === "after_hours") {
    return `⚠️ **${alert.room}** — ${alert.message}. Did someone forget to leave?`;
  }
  if (alert.type === "room_stuck_on") {
    return `⚠️ **${alert.room}** — ${alert.message}. Everything has been running for a while — check if it's intentional.`;
  }
  return `⚠️ ${alert.message}`;
}

async function phraseWithLLM(systemPrompt, data) {
  if (!USE_LLM || !OPENAI_API_KEY) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: JSON.stringify(data) },
        ],
        max_tokens: 200,
      }),
    });
    if (!res.ok) throw new Error(`LLM returned ${res.status}`);
    const body = await res.json();
    return body.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.warn("LLM call failed, falling back to template:", err.message);
    return null;
  }
}

/* ── Discord client ────────────────────────────────────── */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`Discord bot logged in as ${client.user.tag}`);
  startAlertPolling();
});

/* ── command handlers ──────────────────────────────────── */

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  try {
    if (msg.content === "!status") {
      const data  = await apiGet("/api/devices");
      const reply = await phraseWithLLM(
        "Given the room-by-room device data, write a short status summary for Discord. Be concise. Use emoji sparingly.",
        data
      ) ?? templateStatusResponse(data);
      await msg.reply(reply);

    } else if (msg.content.startsWith("!room ")) {
      const slug  = msg.content.slice(6).trim().toLowerCase();
      const data  = await apiGet(`/api/devices/${slug}`);
      const reply = await phraseWithLLM(
        "Given the device data for a single room, write a short status for Discord. Be concise.",
        data
      ) ?? templateRoomResponse(data);
      await msg.reply(reply);

    } else if (msg.content === "!usage") {
      const data  = await apiGet("/api/usage/today");
      const reply = await phraseWithLLM(
        "Given the power usage data, write a short sentence for Discord with the current wattage and estimated kWh today.",
        data
      ) ?? templateUsageResponse(data);
      await msg.reply(reply);
    }
  } catch (err) {
    /* don't crash on a single command error */
    console.error("Command error:", err.message);
    if (err.message.includes("returned 404") || err.message.includes("returned 400")) {
      await msg.reply("I couldn't find that. Try `!room drawing`, `!room work1`, or `!room work2`.");
    } else {
      await msg.reply("Something went wrong. Is the backend server running?");
    }
  }
});

/* ── proactive alert polling ───────────────────────────── */

const postedAlertIds = new Set();

function startAlertPolling() {
  /* seed already-active alerts so they aren't re-posted */
  apiGet("/api/alerts").then(alerts => {
    for (const a of alerts) postedAlertIds.add(a.id);
    console.log(`Seeded ${alerts.length} existing alerts (will not re-post).`);
  }).catch(() => {});

  if (!ALERT_CHANNEL_ID) {
    console.warn("DISCORD_ALERT_CHANNEL_ID not set — proactive alerts disabled.");
    return;
  }

  setInterval(async () => {
    try {
      const alerts = await apiGet("/api/alerts");
      for (const alert of alerts) {
        if (postedAlertIds.has(alert.id)) continue;
        postedAlertIds.add(alert.id);

        const channel = await client.channels.fetch(ALERT_CHANNEL_ID).catch(() => null);
        if (!channel) {
          console.error(`Could not fetch channel ${ALERT_CHANNEL_ID}.`);
          continue;
        }

        const message = await phraseWithLLM(
          "You are a helpful building management assistant. Given the alert JSON, write a brief natural warning message for Discord. Keep it under 200 characters. Use emoji sparingly.",
          alert
        ) ?? templateAlertMessage(alert);

        await channel.send(message);
      }
    } catch (err) {
      console.error("Alert polling error:", err.message);
    }
  }, ALERT_POLL_MS);
}

/* ── start ──────────────────────────────────────────────── */

client.login(TOKEN).catch(err => {
  console.error("Discord login failed:", err.message);
  process.exit(1);
});
