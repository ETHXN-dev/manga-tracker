import { anilistRequest } from "./anilist.js";
import { getLatestChapterFromMangaDex } from "./mangadex.js";
import { findMangaboltSlug } from "./mangabolt.js";

// Orchestrates AniList + MangaDex + MangaBolt to resolve the latest chapter
// for a given AniList manga ID.
//
// Strategy:
//   1. Fetch metadata from AniList (title, chapter count, status)
//   2. If AniList knows the total chapters (completed series), use that
//   3. Otherwise fall back to MangaDex with a numeric sort fix
//   4. Resolve a MangaBolt slug for the read URL
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

  // AniList knows total chapters for completed series.
  // For ongoing, fall back to MangaDex with the numeric sort fix.
  const chapterNum = media.chapters
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
