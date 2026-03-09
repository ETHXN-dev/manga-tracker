const MANGABOLT_LIST = "https://mangabolt.com/storage/manga-list.html";

let mangaboltSlugs = null;

async function getMangaboltSlugs() {
  if (mangaboltSlugs) return mangaboltSlugs;
  try {
    const res = await fetch(MANGABOLT_LIST);
    if (!res.ok) throw new Error("Could not fetch MangaBolt list");
    const html = await res.text();
    const slugMap = new Map();
    const regex = /href="\/manga\/([^"\/]+)\/"/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      const slug = match[1];
      const normalized = slug.replace(/-/g, " ").toLowerCase();
      slugMap.set(normalized, slug);
    }
    mangaboltSlugs = slugMap;
    return slugMap;
  } catch (err) {
    console.error("MangaBolt slug fetch failed:", err.message);
    return new Map();
  }
}

export async function findMangaboltSlug(title) {
  const slugs = await getMangaboltSlugs();
  const normalized = title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
  if (slugs.has(normalized)) return slugs.get(normalized);
  for (const [key, slug] of slugs) {
    if (key.includes(normalized) || normalized.includes(key)) return slug;
  }
  // Fallback: construct slug from title
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
