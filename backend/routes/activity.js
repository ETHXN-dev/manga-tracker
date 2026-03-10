import { Router } from "express";
import {
  getActivityHeatmap,
  getSystemStatus,
  getRecentActivity,
  getActivityStats,
  getActivityForDay,
} from "../db.js";

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

// GET /api/activity/recent?limit=15 — returns the most recent read-activity entries
// with each entry's manga title and cover URL included
router.get("/recent", async (req, res) => {
  try {
    const raw = parseInt(req.query.limit);
    const limit = isNaN(raw) ? 15 : Math.min(Math.max(raw, 1), 50);
    res.json({ data: await getRecentActivity(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch recent activity." });
  }
});

// GET /api/activity/stats — returns reading totals (week/month/all-time),
// current day streak, and top-5 manga by chapters read
router.get("/stats", async (_req, res) => {
  try {
    res.json({ data: await getActivityStats() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch activity stats." });
  }
});

// GET /api/activity/day?date=YYYY-MM-DD — returns all chapters read on a specific
// UTC date, joined with manga title and cover, deduplicated on (mangaId, chapter)
router.get("/day", async (req, res) => {
  const { date } = req.query;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "date must be YYYY-MM-DD" });
  }
  try {
    res.json({ data: await getActivityForDay(date) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch day activity." });
  }
});

export default router;
