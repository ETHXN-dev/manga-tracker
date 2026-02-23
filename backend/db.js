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

process.on("beforeExit", async () => {
  await prisma.$disconnect();
});
