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
} from "./db.js";
import { startNotifier } from "./notifier.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()}  ${req.method}  ${req.path}`);
  next();
});

// GET /api/manga/search?q=blue+lock
app.get("/api/manga/search", async (req, res) => {
  const { q } = req.query;
  if (!q?.trim())
    return res.status(400).json({ error: "Query 'q' is required" });
  try {
    res.json({ data: await searchManga(q.trim()) });
  } catch (err) {
    console.error("Search error:", err);
    res.status(502).json({ error: "Search failed. Try again." });
  }
});

// GET /api/manga/:id/latest-chapter
app.get("/api/manga/:id/latest-chapter", async (req, res) => {
  try {
    res.json({ data: await getLatestChapter(req.params.id) });
  } catch (err) {
    console.error("Chapter error:", err);
    res.status(502).json({ error: "Could not fetch chapter data." });
  }
});

// GET /api/tracked
app.get("/api/tracked", async (_req, res) => {
  try {
    res.json({ data: await getAllTracked() });
  } catch (err) {
    console.error("DB read error:", err);
    res.status(500).json({ error: "Could not retrieve tracked manga." });
  }
});

// POST /api/tracked
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
    console.error("DB write error:", err);
    res.status(500).json({ error: "Could not save manga." });
  }
});

// DELETE /api/tracked/:id
app.delete("/api/tracked/:id", async (req, res) => {
  try {
    await removeTracked(req.params.id);
    res.status(204).send();
  } catch (err) {
    console.error("DB delete error:", err);
    res.status(500).json({ error: "Could not remove manga." });
  }
});

// PATCH /api/tracked/:id/progress
// Updates which chapter the user is currently on.
// Body: { currentChapter: 42 }
app.patch("/api/tracked/:id/progress", async (req, res) => {
  const { currentChapter } = req.body;
  if (currentChapter === undefined)
    return res.status(400).json({ error: "currentChapter required" });
  try {
    const updated = await updateProgress(req.params.id, currentChapter);
    res.json({ data: updated });
  } catch (err) {
    console.error("Progress update error:", err);
    res.status(500).json({ error: "Could not update progress." });
  }
});

app.use((req, res) =>
  res.status(404).json({ error: `${req.method} ${req.path} not found` }),
);
app.use((err, _req, res, _next) => {
  console.error("Unhandled:", err);
  res.status(500).json({ error: "Something went wrong." });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`   GET   /api/manga/search?q=...`);
  console.log(`   GET   /api/manga/:id/latest-chapter`);
  console.log(`   GET   /api/tracked`);
  console.log(`   POST  /api/tracked`);
  console.log(`   PATCH /api/tracked/:id/progress`);
  console.log(`   DELETE /api/tracked/:id\n`);
});

// Start the chapter update notifier (runs every 6 hours)
startNotifier();
