import { Router } from "express";
import { getActivityHeatmap, getSystemStatus } from "../db.js";

const router = Router();

// GET /api/activity/heatmap — returns { "2025-01-04": 3, "2025-01-05": 1, ... }
router.get("/heatmap", async (_req, res) => {
  try {
    res.json({ data: await getActivityHeatmap() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch activity." });
  }
});

// GET /api/activity/status — returns when the notifier last ran
router.get("/status", async (_req, res) => {
  try {
    const status = await getSystemStatus("notifier_last_ran");
    res.json({ lastRan: status?.value || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch status." });
  }
});

export default router;
