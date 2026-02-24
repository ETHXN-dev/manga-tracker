import "dotenv/config";
import express from "express";
import cors from "cors";
import { searchManga, getLatestChapter } from "./anilist.js";
import {
  getAllTracked,
  addTracked,
  removeTracked,
  isTracked,
  updateProgress,
  updateReadingStatus,
  updateChapterCache,
  isCacheFresh,
  logReadActivity,
  getActivityHeatmap,
  bustAllChapterCaches,
} from "./db.js";
import { startNotifier, checkForUpdates } from "./notifier.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()}  ${req.method}  ${req.path}`);
  next();
});

app.get("/api/manga/search", async (req, res) => {
  const { q } = req.query;
  if (!q?.trim())
    return res.status(400).json({ error: "Query 'q' is required" });
  try {
    res.json({ data: await searchManga(q.trim()) });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Search failed." });
  }
});

// GET /api/manga/:id/latest-chapter
// Serves from DB cache if fresh (< 6hrs), otherwise fetches from APIs and updates cache
app.get("/api/manga/:id/latest-chapter", async (req, res) => {
  try {
    const { id } = req.params;

    // Check if we have a fresh cached value in the DB
    const tracked = await getAllTracked();
    const manga = tracked.find((m) => m.id === id);

    if (manga && isCacheFresh(manga)) {
      // Serve from cache — instant response, no API calls
      console.log(`[cache] HIT for ${manga.title}`);
      return res.json({
        data: {
          chapter: manga.latestChapter,
          readUrl: manga.latestChapterUrl,
          mangaboltSlug: manga.mangaboltSlug,
          fromCache: true,
        },
      });
    }

    // Cache miss — fetch from APIs
    console.log(`[cache] MISS for ${manga?.title || id} — fetching from API`);
    const data = await getLatestChapter(id);

    // Write result back to DB cache so next request is instant
    if (data && manga) {
      await updateChapterCache(id, {
        latestChapter: data.chapter,
        latestChapterUrl: data.readUrl,
        mangaboltSlug: data.mangaboltSlug,
      });
    }

    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Could not fetch chapter data." });
  }
});

app.get("/api/tracked", async (_req, res) => {
  try {
    res.json({ data: await getAllTracked() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not retrieve tracked manga." });
  }
});

app.post("/api/tracked", async (req, res) => {
  const { id, title, coverUrl, status, year } = req.body;
  if (!id || !title)
    return res.status(400).json({ error: "id and title are required" });
  try {
    if (await isTracked(id))
      return res.status(409).json({ error: "Already tracking this manga" });
    res
      .status(201)
      .json({ data: await addTracked({ id, title, coverUrl, status, year }) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not save manga." });
  }
});

app.delete("/api/tracked/:id", async (req, res) => {
  try {
    await removeTracked(req.params.id);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not remove manga." });
  }
});

app.patch("/api/tracked/:id/progress", async (req, res) => {
  const { currentChapter } = req.body;
  if (currentChapter === undefined)
    return res.status(400).json({ error: "currentChapter required" });
  try {
    const updated = await updateProgress(req.params.id, currentChapter);
    // Log to activity heatmap — fire and forget, don't block the response
    logReadActivity(req.params.id, currentChapter).catch(() => {});
    res.json({ data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not update progress." });
  }
});

app.patch("/api/tracked/:id/reading-status", async (req, res) => {
  const { readingStatus } = req.body;
  if (!["reading", "completed"].includes(readingStatus))
    return res
      .status(400)
      .json({ error: "readingStatus must be 'reading' or 'completed'" });
  try {
    res.json({ data: await updateReadingStatus(req.params.id, readingStatus) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not update reading status." });
  }
});

// POST /api/admin/bust-cache — force re-fetch of all chapter data
app.post("/api/admin/bust-cache", async (_req, res) => {
  try {
    await bustAllChapterCaches();
    res.json({
      ok: true,
      message: "All chapter caches cleared — will re-fetch on next load",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/test-notifier", async (_req, res) => {
  try {
    await checkForUpdates();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/activity/heatmap — returns { "2025-01-04": 3, "2025-01-05": 1, ... }
app.get("/api/activity/heatmap", async (_req, res) => {
  try {
    res.json({ data: await getActivityHeatmap() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch activity." });
  }
});

app.use((req, res) =>
  res.status(404).json({ error: `${req.method} ${req.path} not found` }),
);
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong." });
});

app.listen(PORT, () =>
  console.log(`\n🚀 Server running on http://localhost:${PORT}\n`),
);

startNotifier();

// ─── Keep-alive ping ──────────────────────────────────────────────────────────
// Render free tier spins down after 15min inactivity — ping ourselves every 10min
// so the cron never misses a scheduled run
if (process.env.NODE_ENV === "production" && process.env.RENDER_EXTERNAL_URL) {
  const PING_INTERVAL = 10 * 60 * 1000; // 10 minutes
  setInterval(async () => {
    try {
      await fetch(`${process.env.RENDER_EXTERNAL_URL}/api/tracked`);
      console.log("[keep-alive] ping sent");
    } catch (err) {
      console.error("[keep-alive] ping failed:", err.message);
    }
  }, PING_INTERVAL);
  console.log("[keep-alive] started — pinging every 10 minutes");
}
