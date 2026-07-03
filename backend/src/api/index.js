import { Router } from "express";
import * as devices from "../devices/index.js";

const router = Router();

router.get("/devices", (_req, res, next) => {
  try {
    res.json(devices.getAllDevices());
  } catch (err) {
    next(err);
  }
});

router.get("/devices/room/:room", (req, res, next) => {
  try {
    const list = devices.getDevicesByRoom(req.params.room);
    res.json(list);
  } catch (err) {
    next(err);
  }
});

router.get("/devices/:id", (req, res, next) => {
  try {
    const device = devices.getDevice(req.params.id);
    if (!device) return res.sendStatus(404);
    res.json(device);
  } catch (err) {
    next(err);
  }
});

router.patch("/devices/:id/state", async (req, res, next) => {
  try {
    const { status } = req.body;
    if (status !== "on" && status !== "off") {
      return res.status(400).json({ error: "status must be 'on' or 'off'" });
    }
    const device = await devices.setDeviceState(req.params.id, status);
    res.json(device);
  } catch (err) {
    if (err.message.includes("not found")) return res.sendStatus(404);
    next(err);
  }
});

export default router;
