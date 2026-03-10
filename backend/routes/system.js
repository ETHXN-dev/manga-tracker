import { Router } from "express";
import { checkForUpdates } from "../notifier.js";
import { ping } from "../db.js";

const router = Router();

// GET /api/health — verifies DB connectivity; excluded from API key auth
router.get("/health", async (_req, res) => {
  try {
    await ping();
    res.json({ ok: true, ts: Date.now() });
  } catch (err) {
    console.error("[health] DB unreachable:", err.message);
    res.status(503).json({ ok: false, error: "Database unreachable" });
  }
});

// GET /api/test-notifier — manually trigger an update check.
// NOTE: always protected by API key — do NOT call this in production without auth.
router.get("/test-notifier", async (req, res) => {
  if (!process.env.API_KEY) {
    return res
      .status(403)
      .json({ error: "Set API_KEY to enable this endpoint." });
  }
  try {
    await checkForUpdates();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
