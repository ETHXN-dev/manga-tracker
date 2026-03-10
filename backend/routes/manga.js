import { Router } from "express";
import { searchManga } from "../services/anilist.js";
import { getLatestChapter } from "../services/chapters.js";
import { getTrackedById, updateChapterCache, isCacheFresh } from "../db.js";

const router = Router();

// GET /api/manga/search?q=...
router.get("/search", async (req, res) => {
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
// Serves from DB cache if fresh (< 6hrs), otherwise fetches from APIs and updates cache.
router.get("/:id/latest-chapter", async (req, res) => {
  try {
    const { id } = req.params;

    const manga = await getTrackedById(id);

    if (manga && isCacheFresh(manga)) {
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

    console.log(`[cache] MISS for ${manga?.title || id} — fetching from API`);
    const data = await getLatestChapter(id);

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

export default router;
