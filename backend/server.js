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

app.get("/api/manga/:id/latest-chapter", async (req, res) => {
  try {
    res.json({ data: await getLatestChapter(req.params.id) });
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
    res.json({ data: await updateProgress(req.params.id, currentChapter) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not update progress." });
  }
});

// PATCH /api/tracked/:id/reading-status
// Body: { readingStatus: "reading" | "completed" }
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

app.get("/api/test-notifier", async (_req, res) => {
  try {
    await checkForUpdates();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use((req, res) =>
  res.status(404).json({ error: `${req.method} ${req.path} not found` }),
);
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong." });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}\n`);
});

startNotifier();
