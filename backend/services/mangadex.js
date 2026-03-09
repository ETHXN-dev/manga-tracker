const MANGADEX_BASE = "https://api.mangadex.org";

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
export async function getLatestChapterFromMangaDex(title) {
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
