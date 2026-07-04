/*
 * ── Discord bot module ───────────────────────────────────
 *
 * Imported by server.js (not a standalone process anymore).
 * Calls the backend through its REST API so there is one
 * source of truth — the server's in-memory cache + Postgres.
 *
 * Commands:
 *   !status         —  room-by-room summary
 *   !room <slug>    —  single-room status (drawing|work1|work2)
 *   !usage          —  current W + estimated kWh today
 *
 * Alerts are received via the onNewAlert callback from the
 * alert engine, then posted to DISCORD_ALERT_CHANNEL_ID.
 *
 * Optional LLM enhancement (behind USE_LLM flag): calls a
 * configurable OpenAI-compatible API (OpenAI, DeepSeek,
 * OpenRouter, Ollama, etc.) to phrase responses naturally;
 * falls back to templates if the flag is off or the API fails.
 */

import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";

/* ── env ───────────────────────────────────────────────── */

const TOKEN            = process.env.DISCORD_BOT_TOKEN;
const ALERT_CHANNEL_ID = process.env.DISCORD_ALERT_CHANNEL_ID;
const API_BASE         = process.env.API_BASE_URL || "http://localhost:3001";
const USE_LLM          = process.env.USE_LLM === "true";

/* ── multi-LLM config (up to 5 keys, tried in order, up to 3 attempts) ── */

const DEFAULT_URL   = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";

const llmConfigs = [];
for (let i = 1; i <= 5; i++) {
  const key = process.env[`LLM_API_KEY_${i}`];
  if (!key) continue;
  llmConfigs.push({
    key,
    url:   process.env[`LLM_API_URL_${i}`]   || process.env.LLM_API_URL   || DEFAULT_URL,
    model: process.env[`LLM_MODEL_${i}`]     || process.env.LLM_MODEL     || DEFAULT_MODEL,
  });
}
/* backwards compat: single LLM_API_KEY without number */
if (llmConfigs.length === 0 && process.env.LLM_API_KEY) {
  llmConfigs.push({
    key:   process.env.LLM_API_KEY,
    url:   process.env.LLM_API_URL   || DEFAULT_URL,
    model: process.env.LLM_MODEL     || DEFAULT_MODEL,
  });
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
  if (!USE_LLM || llmConfigs.length === 0) return null;

  const maxAttempts = Math.min(3, llmConfigs.length);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const cfg = llmConfigs[attempt];
    try {
      const res = await fetch(cfg.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.key}`,
        },
        body: JSON.stringify({
          model: cfg.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user",   content: JSON.stringify(data) },
          ],
          max_tokens: 200,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      const content = body.choices?.[0]?.message?.content ?? null;
      if (content) return content;
      throw new Error("empty response");
    } catch (err) {
      console.warn(`LLM attempt ${attempt + 1}/${maxAttempts} failed (${cfg.url}): ${err.message}`);
    }
  }

  return null;
}

/* ── state ──────────────────────────────────────────────── */

let client = null;
let botReady = false;
const postedAlertIds = new Set();

/* ── export: post an alert to the Discord channel ───────── */

/**
 * Called by server.js's alert engine callback.
 * Posts the alert to DISCORD_ALERT_CHANNEL_ID if the bot is ready.
 * Deduplicates by alert id so the same alert isn't posted twice.
 */
export async function postAlertToDiscord(alert) {
  if (!botReady || !ALERT_CHANNEL_ID) return;
  if (postedAlertIds.has(alert.id)) return;
  postedAlertIds.add(alert.id);

  try {
    const channel = await client.channels.fetch(ALERT_CHANNEL_ID);
    if (!channel) {
      console.error(`Discord channel ${ALERT_CHANNEL_ID} not found.`);
      return;
    }

    const message = await phraseWithLLM(
      "You are a helpful building management assistant. Given the alert JSON, write a brief natural warning message for Discord. Keep it under 200 characters. Use emoji sparingly.",
      alert
    ) ?? templateAlertMessage(alert);

    await channel.send(message);
  } catch (err) {
    console.error("Discord alert post error:", err.message);
  }
}

/* ── export: start the bot ───────────────────────────────── */

/**
 * Start the Discord bot. Call once from server.js after the
 * Express server is listening.
 *
 * Seeds already-active alerts so they aren't re-posted.
 */
export async function startBot() {
  if (!TOKEN) {
    console.warn("DISCORD_BOT_TOKEN not set — Discord bot disabled.");
    return;
  }

  /* seed existing alerts so they won't be re-posted */
  try {
    const alerts = await apiGet("/api/alerts");
    for (const a of alerts) postedAlertIds.add(a.id);
    console.log(`Discord: seeded ${alerts.length} existing alerts.`);
  } catch (_) { /* server may not be ready yet */ }

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.once("clientReady", () => {
    botReady = true;
    console.log(`Discord bot logged in as ${client.user.tag}`);
  });

  /* ── command handlers ────────────────────────────────── */

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
      console.error("Command error:", err.message);
      if (err.message.includes("returned 404") || err.message.includes("returned 400")) {
        await msg.reply("I couldn't find that. Try `!room drawing`, `!room work1`, or `!room work2`.");
      } else {
        await msg.reply("Something went wrong. Is the backend server running?");
      }
    }
  });

  try {
    await client.login(TOKEN);
  } catch (err) {
    console.error("Discord login failed:", err.message);
  }
}
