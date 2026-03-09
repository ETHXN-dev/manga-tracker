import { Router } from "express";
import { checkForUpdates } from "../notifier.js";

const router = Router();

// GET /api/health — lightweight ping, excluded from API key auth
router.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

// GET /api/test-notifier — manually trigger an update check
router.get("/test-notifier", async (_req, res) => {
  try {
    await checkForUpdates();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
