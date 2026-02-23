const ANILIST_URL = "https://graphql.anilist.co";
const MANGADEX_BASE = "https://api.mangadex.org";
const MANGABOLT_LIST = "https://mangabolt.com/storage/manga-list.html";

// ─── MangaBolt slug cache ─────────────────────────────────────────────────────
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

async function findMangaboltSlug(title) {
  const slugs = await getMangaboltSlugs();
  const normalized = title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
  if (slugs.has(normalized)) return slugs.get(normalized);
  for (const [key, slug] of slugs) {
    if (key.includes(normalized) || normalized.includes(key)) return slug;
  }
  // fallback: construct it ourselves
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function getMangaboltUrl(title, chapterNum) {
  const slug = await findMangaboltSlug(title);
  if (!chapterNum || chapterNum === "?")
    return `https://mangabolt.com/manga/${slug}/`;
  return `https://mangabolt.com/chapter/${slug}-chapter-${chapterNum}/`;
}

// ─── AniList ──────────────────────────────────────────────────────────────────
async function anilistRequest(query, variables) {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`AniList request failed: ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

export function parseManga(raw) {
  const title = raw.title.english || raw.title.romaji || "Unknown Title";
  const description = raw.description
    ? raw.description.replace(/<[^>]*>/g, "").slice(0, 200)
    : "";
  return {
    id: String(raw.id),
    title,
    description,
    status: raw.status?.toLowerCase().replace("_", " ") || "unknown",
    coverUrl: raw.coverImage?.large || null,
    year: raw.startDate?.year || null,
    chapters: raw.chapters || null,
    anilistUrl: raw.siteUrl || null,
  };
}

export async function searchManga(query) {
  const gql = `
    query SearchManga($search: String) {
      Page(perPage: 10) {
        media(search: $search, type: MANGA, sort: SEARCH_MATCH) {
          id
          title { english romaji }
          description(asHtml: false)
          status
          chapters
          coverImage { large }
          startDate { year }
          siteUrl
        }
      }
    }
  `;
  const data = await anilistRequest(gql, { search: query });
  return data.Page.media.map(parseManga);
}

// ─── MangaDex helpers ─────────────────────────────────────────────────────────
async function findMangaDexId(title) {
  const params = new URLSearchParams();
  params.append("title", title);
  params.append("limit", "5");
  const res = await fetch(`${MANGADEX_BASE}/manga?${params}`);
  if (!res.ok) return null;
  const json = await res.json();
  // Prefer exact English title match to avoid picking spin-offs
  const exact = json.data?.find(
    (m) => m.attributes.title.en?.toLowerCase() === title.toLowerCase(),
  );
  return exact?.id || json.data?.[0]?.id || null;
}

// Fetches a batch of chapters and returns the true numeric maximum.
// MangaDex's order[chapter]=desc is LEXICOGRAPHIC not numeric —
// "9" sorts higher than "23" because "9" > "2" as a string.
// Fix: fetch top 20, parse as floats, take Math.max.
async function getLatestChapterFromMangaDex(title) {
  try {
    const mangaId = await findMangaDexId(title);
    if (!mangaId) return null;

    const params = new URLSearchParams();
    params.append("manga", mangaId);
    params.append("limit", "20");
    params.append("order[chapter]", "desc");
    // No translatedLanguage filter — any language, we just want the number

    const res = await fetch(`${MANGADEX_BASE}/chapter?${params}`);
    if (!res.ok) return null;
    const json = await res.json();

    const nums = json.data
      ?.map((ch) => parseFloat(ch.attributes?.chapter))
      .filter((n) => !isNaN(n));

    if (!nums?.length) return null;
    return Math.floor(Math.max(...nums)); // true numeric max as integer
  } catch {
    return null;
  }
}

// ─── getLatestChapter ─────────────────────────────────────────────────────────
export async function getLatestChapter(anilistId) {
  const gql = `
    query GetManga($id: Int) {
      Media(id: $id, type: MANGA) {
        id
        chapters
        status
        title { english romaji }
      }
    }
  `;
  const data = await anilistRequest(gql, { id: parseInt(anilistId) });
  const media = data.Media;
  const title = media.title.english || media.title.romaji;
  const isComplete = media.status === "FINISHED";

  // AniList knows total chapters for completed series
  // For ongoing, fall back to MangaDex with numeric sort fix
  let chapterNum = media.chapters
    ? Math.floor(media.chapters)
    : await getLatestChapterFromMangaDex(title);

  const slug = await findMangaboltSlug(title);
  const readUrl = chapterNum
    ? `https://mangabolt.com/chapter/${slug}-chapter-${chapterNum}/`
    : `https://mangabolt.com/manga/${slug}/`;

  return {
    chapter: chapterNum || "?",
    isComplete,
    readUrl,
    mangaboltSlug: slug, // passed to frontend to generate all chapter URLs locally
  };
}
