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
