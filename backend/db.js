import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CACHE_TTL_HOURS = 6; // only re-fetch if older than this

export async function getAllTracked() {
  return prisma.manga.findMany({ orderBy: { createdAt: "desc" } });
}

export async function addTracked({ id, title, coverUrl, status, year }) {
  return prisma.manga.create({
    data: {
      id,
      title,
      coverUrl,
      status,
      year,
      currentChapter: 0,
      readingStatus: "reading",
    },
  });
}

export async function removeTracked(id) {
  return prisma.manga.delete({ where: { id } });
}

export async function isTracked(id) {
  const manga = await prisma.manga.findUnique({ where: { id } });
  return !!manga;
}

export async function updateProgress(id, currentChapter) {
  return prisma.manga.update({
    where: { id },
    data: { currentChapter: parseInt(currentChapter) },
  });
}

export async function updateReadingStatus(id, readingStatus) {
  return prisma.manga.update({
    where: { id },
    data: { readingStatus },
  });
}

// Only updated by the notifier — tracks what chapter we last emailed about
// Separate from currentChapter which is the user's reading progress
export async function updateLastNotified(id, lastNotifiedChapter) {
  return prisma.manga.update({
    where: { id },
    data: { lastNotifiedChapter: parseInt(lastNotifiedChapter) },
  });
}

// Write chapter data back to the DB cache
export async function updateChapterCache(
  id,
  { latestChapter, latestChapterUrl, mangaboltSlug },
) {
  return prisma.manga.update({
    where: { id },
    data: {
      latestChapter: parseInt(latestChapter),
      latestChapterUrl,
      mangaboltSlug,
      chapterCachedAt: new Date(),
    },
  });
}

// Returns true if cache is fresh enough to use
export function isCacheFresh(manga) {
  if (!manga.chapterCachedAt || !manga.latestChapter) return false;
  const ageHours =
    (Date.now() - new Date(manga.chapterCachedAt).getTime()) / 1000 / 60 / 60;
  return ageHours < CACHE_TTL_HOURS;
}

// System status — used to track notifier health
export async function setSystemStatus(key, value) {
  return prisma.systemStatus.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function getSystemStatus(key) {
  return prisma.systemStatus.findUnique({ where: { key } });
}

// Log a chapter read to the activity table
export async function logReadActivity(mangaId, chapter) {
  return prisma.readActivity.create({
    data: { mangaId, chapter: parseInt(chapter) },
  });
}

// Get all activity for the past year, grouped by date
export async function getActivityHeatmap() {
  const since = new Date();
  since.setFullYear(since.getFullYear() - 1);

  const activity = await prisma.readActivity.findMany({
    where: { readAt: { gte: since } },
    select: { readAt: true },
  });

  // Group by date string YYYY-MM-DD and count
  const map = {};
  activity.forEach(({ readAt }) => {
    const date = readAt.toISOString().slice(0, 10);
    map[date] = (map[date] || 0) + 1;
  });

  return map;
}

// Bust chapter cache for all manga — forces re-fetch on next request
export async function bustAllChapterCaches() {
  return prisma.manga.updateMany({
    data: { chapterCachedAt: null },
  });
}

process.on("beforeExit", async () => {
  await prisma.$disconnect();
});
