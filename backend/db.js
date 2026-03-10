import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CACHE_TTL_HOURS = 6; // only re-fetch if older than this

export async function getAllTracked() {
  return prisma.manga.findMany({ orderBy: { createdAt: "desc" } });
}

// Fetch a single tracked manga by its AniList ID — use this instead of
// getAllTracked() + .find() when you only need one record.
export async function getTrackedById(id) {
  return prisma.manga.findUnique({ where: { id } });
}

// Lightweight DB connectivity check for the health endpoint.
export async function ping() {
  await prisma.$queryRaw`SELECT 1`;
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

// Get the most recent N read-activity entries, each with its manga's title and cover
export async function getRecentActivity(limit = 15) {
  return prisma.readActivity.findMany({
    take: limit,
    orderBy: { readAt: "desc" },
    include: {
      manga: { select: { title: true, coverUrl: true } },
    },
  });
}

// Get reading statistics: totals by period, current streak, and top manga by chapters read
export async function getActivityStats() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const monthAgo = new Date(now.getTime() - 30 * 86400000);
  const yearAgo = new Date(now.getTime() - 365 * 86400000);

  const [total, thisWeek, thisMonth, topGroups, allDatesRaw] =
    await Promise.all([
      prisma.readActivity.count(),
      prisma.readActivity.count({ where: { readAt: { gte: weekAgo } } }),
      prisma.readActivity.count({ where: { readAt: { gte: monthAgo } } }),
      prisma.readActivity.groupBy({
        by: ["mangaId"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
      prisma.readActivity.findMany({
        select: { readAt: true },
        where: { readAt: { gte: yearAgo } },
        orderBy: { readAt: "desc" },
      }),
    ]);

  // Calculate current reading streak (consecutive UTC days with at least one read)
  const dateSet = new Set(
    allDatesRaw.map(({ readAt }) => readAt.toISOString().slice(0, 10)),
  );
  const todayStr = now.toISOString().slice(0, 10);
  const yesterdayStr = new Date(now.getTime() - 86400000)
    .toISOString()
    .slice(0, 10);

  let streak = 0;
  if (dateSet.has(todayStr) || dateSet.has(yesterdayStr)) {
    let d = new Date(
      (dateSet.has(todayStr) ? todayStr : yesterdayStr) + "T00:00:00.000Z",
    );
    while (dateSet.has(d.toISOString().slice(0, 10))) {
      streak++;
      d = new Date(d.getTime() - 86400000);
    }
  }

  // Resolve manga titles/covers for the top groups in one batch query
  const topMangaIds = topGroups.map((g) => g.mangaId);
  const mangaRecords =
    topMangaIds.length > 0
      ? await prisma.manga.findMany({
          where: { id: { in: topMangaIds } },
          select: { id: true, title: true, coverUrl: true },
        })
      : [];
  const mangaMap = Object.fromEntries(mangaRecords.map((m) => [m.id, m]));

  const topManga = topGroups.map((g) => ({
    mangaId: g.mangaId,
    count: g._count.id,
    title: mangaMap[g.mangaId]?.title ?? "Unknown",
    coverUrl: mangaMap[g.mangaId]?.coverUrl ?? null,
  }));

  return { total, thisWeek, thisMonth, streak, topManga };
}

// Bust chapter cache for all manga — forces re-fetch on next request
export async function bustAllChapterCaches() {
  return prisma.manga.updateMany({
    data: { chapterCachedAt: null },
  });
}

// Disconnect cleanly on both graceful shutdown signals and natural process exit.
async function disconnect() {
  await prisma.$disconnect();
}
process.on("beforeExit", disconnect);
process.on("SIGTERM", disconnect);
process.on("SIGINT", disconnect);
