// notifier.js — Background cron job that checks for new chapters
// and sends notifications when updates are found.
//
// Notifications are sent via:
//   push  — ntfy.sh (set NTFY_TOPIC in .env)
//   email — Resend   (set RESEND_API_KEY + NOTIFY_EMAIL in .env)
//
// Schedule: every 30 minutes by default.
// Trigger manually via GET /api/test-notifier.

import cron from "node-cron";
import {
  getAllTracked,
  updateChapterCache,
  updateLastNotified,
  setSystemStatus,
} from "./db.js";
import { getLatestChapter } from "./services/chapters.js";
import { sendNotification } from "./notifications/index.js";

// ─── Update check ─────────────────────────────────────────────────────────────

export async function checkForUpdates() {
  console.log("[notifier] Checking for new chapters…");

  const all = await getAllTracked();
  // Skip completed manga — no new chapters expected
  const mangaList = all.filter((m) => m.readingStatus !== "completed");
  const updates = [];

  const results = await Promise.allSettled(
    mangaList.map(async (manga) => {
      const data = await getLatestChapter(manga.id);
      if (!data) return null;

      const latest = parseInt(data.chapter);

      // Use lastNotifiedChapter as the baseline — NOT currentChapter.
      // This way the unread badge on the site still shows the user's progress
      // while we avoid re-notifying for chapters they haven't marked read yet.
      const lastSeen = manga.lastNotifiedChapter || manga.currentChapter || 0;

      // Always refresh the cache when the notifier fetches fresh data
      await updateChapterCache(manga.id, {
        latestChapter: latest,
        latestChapterUrl: data.readUrl,
        mangaboltSlug: data.mangaboltSlug,
      }).catch(() => {});

      if (!isNaN(latest) && latest > lastSeen) {
        return {
          id: manga.id,
          title: manga.title,
          oldChapter: lastSeen,
          newChapter: latest,
          readUrl: data.readUrl,
        };
      }
      return null;
    }),
  );

  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      updates.push(result.value);
      // Only advance lastNotifiedChapter — currentChapter is reading progress
      // and should only be changed by the user.
      await updateLastNotified(result.value.id, result.value.newChapter);
    }
  }

  if (updates.length > 0) {
    console.log(
      `[notifier] Found ${updates.length} update(s):`,
      updates.map((u) => u.title),
    );
    await sendNotification(updates);
  } else {
    console.log("[notifier] No new chapters found");
  }

  // Always record when the notifier last ran so the Activity tab can show it
  await setSystemStatus("notifier_last_ran", new Date().toISOString()).catch(
    () => {},
  );
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

export function startNotifier() {
  console.log("[notifier] Started — checking every 30 minutes");

  // Run once immediately on startup to catch anything missed while offline
  checkForUpdates().catch(console.error);

  // Then check on a recurring schedule
  cron.schedule("*/30 * * * *", () => {
    checkForUpdates().catch(console.error);
  });
}
