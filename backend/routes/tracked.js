import { Router } from "express";
import {
  getAllTracked,
  addTracked,
  removeTracked,
  isTracked,
  updateProgress,
  updateReadingStatus,
  logReadActivity,
} from "../db.js";

// Prisma error code for "record not found"
const P2025 = "P2025";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    res.json({ data: await getAllTracked() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not retrieve tracked manga." });
  }
});

router.post("/", async (req, res) => {
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

router.delete("/:id", async (req, res) => {
  try {
    await removeTracked(req.params.id);
    res.status(204).send();
  } catch (err) {
    if (err.code === P2025)
      return res.status(404).json({ error: "Manga not found." });
    console.error(err);
    res.status(500).json({ error: "Could not remove manga." });
  }
});

router.patch("/:id/progress", async (req, res) => {
  const { currentChapter } = req.body;
  const chapter = parseInt(currentChapter);
  if (isNaN(chapter) || chapter < 0)
    return res
      .status(400)
      .json({ error: "currentChapter must be a non-negative integer" });
  try {
    const updated = await updateProgress(req.params.id, chapter);
    // Fire and forget — don't block the response
    logReadActivity(req.params.id, chapter).catch(() => {});
    res.json({ data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not update progress." });
  }
});

router.patch("/:id/reading-status", async (req, res) => {
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

export default router;
