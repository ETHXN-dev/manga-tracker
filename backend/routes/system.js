import { Router } from "express";
import { checkForUpdates } from "../notifier.js";
import { ping } from "../db.js";
import { sendPushNotification } from "../notifications/push.js";

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

// GET /api/test-push — fire a test push notification to verify ntfy is wired up.
// Useful for confirming NTFY_TOPIC is set and the phone app is subscribed,
// without having to wait for a real chapter update to drop.
router.get("/test-push", async (_req, res) => {
  if (!process.env.NTFY_TOPIC) {
    return res.status(400).json({
      error: "NTFY_TOPIC is not set — add it to your environment variables.",
    });
  }
  try {
    await sendPushNotification([
      {
        title: "MangaLog Test",
        newChapter: 1,
        oldChapter: 0,
        readUrl: "https://mangabolt.com",
      },
    ]);
    res.json({
      ok: true,
      message: `Test push sent to topic "${process.env.NTFY_TOPIC}". Check your phone.`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
