import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

process.on("beforeExit", async () => {
  await prisma.$disconnect();
});
