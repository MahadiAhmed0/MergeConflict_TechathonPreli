#!/usr/bin/env node

import "dotenv/config";
import express from "express";
import cors from "cors";
import apiRouter from "./src/api/index.js";
import { attachWebSocket, broadcastAlert, broadcastAlertResolution } from "./src/realtime/index.js";
import { startAlertEngine } from "./src/alerts/index.js";
import { initDevices, startSimulator } from "./src/devices/index.js";
import { startBot, postAlertToDiscord } from "./src/bot/index.js";

const PORT = parseInt(process.env.PORT, 10) || 3001;

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", apiRouter);
app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const server = app.listen(PORT);

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Stop the existing process or use a different PORT.`);
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});

server.on("listening", async () => {
  console.log(`Server listening on http://localhost:${PORT}`);

  try {
    await initDevices();
    startSimulator(5000);
    await startBot();
  } catch (err) {
    console.error("Startup failed:", err.message);
    process.exit(1);
  }

  startAlertEngine((msg) => {
    if (msg.type === "alert_resolved") {
      broadcastAlertResolution(msg.alert);
      console.log("Alert resolved:", msg.alert.message);
    } else {
      broadcastAlert(msg.alert ?? msg);
      postAlertToDiscord(msg.alert ?? msg);
      console.log("Alert:", (msg.alert ?? msg).message);
    }
  });
});

attachWebSocket(server);
