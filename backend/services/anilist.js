const ANILIST_URL = "https://graphql.anilist.co";

export async function anilistRequest(query, variables) {
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
  // Full description for the detail panel — strip HTML tags but don't truncate
  const descriptionFull = raw.description
    ? raw.description
        .replace(/<[^>]*>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .trim()
    : "";
  // Short version for any legacy uses
  const description = descriptionFull.slice(0, 200);

  return {
    id: String(raw.id),
    title,
    description,
    descriptionFull,
    status: raw.status?.toLowerCase().replace("_", " ") || "unknown",
    coverUrl: raw.coverImage?.large || null,
    bannerUrl: raw.bannerImage || null,
    year: raw.startDate?.year || null,
    chapters: raw.chapters || null,
    genres: raw.genres || [],
    averageScore: raw.averageScore || null, // out of 100
    popularity: raw.popularity || null,
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
          genres
          averageScore
          popularity
          coverImage { large }
          bannerImage
          startDate { year }
          siteUrl
        }
      }
    }
  `;
  const data = await anilistRequest(gql, { search: query });
  return data.Page.media.map(parseManga);
}
