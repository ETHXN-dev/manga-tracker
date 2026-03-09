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
    console.error(err);
    res.status(500).json({ error: "Could not remove manga." });
  }
});

router.patch("/:id/progress", async (req, res) => {
  const { currentChapter } = req.body;
  if (currentChapter === undefined)
    return res.status(400).json({ error: "currentChapter required" });
  try {
    const updated = await updateProgress(req.params.id, currentChapter);
    // Fire and forget — don't block the response
    logReadActivity(req.params.id, currentChapter).catch(() => {});
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
