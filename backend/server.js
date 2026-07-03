#!/usr/bin/env node

import "dotenv/config";
import express from "express";
import cors from "cors";
import apiRouter from "./src/api/index.js";
import { attachWebSocket, broadcastAlert } from "./src/realtime/index.js";
import { startAlertEngine } from "./src/alerts/index.js";
import { initDevices, startSimulator } from "./src/devices/index.js";

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

const server = app.listen(PORT, async () => {
  console.log(`Server listening on http://localhost:${PORT}`);

  try {
    await initDevices();
    startSimulator(5000);
  } catch (err) {
    console.error("Startup failed:", err.message);
    process.exit(1);
  }
});

attachWebSocket(server);

startAlertEngine((alert) => {
  broadcastAlert(alert);
  console.log("Alert:", alert.message);
});
