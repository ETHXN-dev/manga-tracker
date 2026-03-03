// notifier.js — Background cron job that checks for new chapters
// and emails the user when one is found.
//
// Uses:
//   node-cron   — schedules the job (runs every 6 hours by default)
//   nodemailer  — sends email via Gmail SMTP
//
// Setup: add these to your .env file:
//   NOTIFY_EMAIL=your@gmail.com        ← address to send notifications TO
//   GMAIL_USER=your@gmail.com          ← Gmail account to send FROM
//   GMAIL_APP_PASSWORD=xxxx xxxx xxxx  ← Gmail App Password (not your real password)
//
// How to get a Gmail App Password:
//   1. Go to myaccount.google.com → Security → 2-Step Verification (enable it)
//   2. Then go to myaccount.google.com/apppasswords
//   3. Create a new app password → copy the 16-character code into .env

import cron from "node-cron";
import { Resend } from "resend";
import { getAllTracked, updateChapterCache, updateLastNotified } from "./db.js";
import { getLatestChapter } from "./anilist.js";

// ─── Email via Resend (works on Render free tier — uses HTTPS not SMTP) ───────
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendPushNotification(updates) {
  if (!process.env.NTFY_TOPIC) return;

  const title =
    updates.length === 1
      ? `📚 ${updates[0].title} — Ch. ${updates[0].newChapter} dropped`
      : `📚 ${updates.length} new chapters dropped`;

  const body = updates
    .map(({ title, newChapter }) => `${title} → Ch. ${newChapter}`)
    .join("\n");

  try {
    await fetch(`https://ntfy.sh/${process.env.NTFY_TOPIC}`, {
      method: "POST",
      headers: {
        Title: title,
        Priority: "high",
        Tags: "manga,book",
        "Content-Type": "text/plain",
      },
      body,
    });
    console.log(`[notifier] Push notification sent`);
  } catch (err) {
    console.error("[notifier] Push notification failed:", err.message);
  }
}

async function sendNotification(updates) {
  // Send both push and email in parallel
  await Promise.allSettled([
    sendPushNotification(updates),
    sendEmailNotification(updates),
  ]);
}

async function sendEmailNotification(updates) {
  if (!process.env.RESEND_API_KEY || !process.env.NOTIFY_EMAIL) {
    console.log("[notifier] Email not configured — skipping send");
    return;
  }

  const rows = updates
    .map(
      ({ title, oldChapter, newChapter, readUrl }) =>
        `<tr>
        <td style="padding:8px 12px;font-weight:600">${title}</td>
        <td style="padding:8px 12px;color:#999">Ch. ${oldChapter}</td>
        <td style="padding:8px 12px;color:#e63946;font-weight:700">→ Ch. ${newChapter}</td>
        <td style="padding:8px 12px"><a href="${readUrl}" style="color:#e63946">Read ↗</a></td>
      </tr>`,
    )
    .join("");

  await resend.emails.send({
    from: "MangaLog <onboarding@resend.dev>",
    to: process.env.NOTIFY_EMAIL,
    subject: `📚 ${updates.length} new chapter${updates.length > 1 ? "s" : ""} — MangaLog`,
    html: `
      <div style="font-family:sans-serif;background:#080809;color:#f0eff4;padding:32px;border-radius:12px;max-width:560px">
        <h2 style="color:#e63946;margin:0 0 8px">New chapters dropped</h2>
        <p style="color:#6b6a75;margin:0 0 24px;font-size:14px">
          ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <table style="width:100%;border-collapse:collapse;background:#0f0f12;border-radius:8px;overflow:hidden">
          <thead>
            <tr style="background:#17171c">
              <th style="padding:8px 12px;text-align:left;color:#6b6a75;font-size:12px;text-transform:uppercase;letter-spacing:.08em">Manga</th>
              <th style="padding:8px 12px;text-align:left;color:#6b6a75;font-size:12px;text-transform:uppercase;letter-spacing:.08em">Was</th>
              <th style="padding:8px 12px;text-align:left;color:#6b6a75;font-size:12px;text-transform:uppercase;letter-spacing:.08em">Now</th>
              <th style="padding:8px 12px;text-align:left;color:#6b6a75;font-size:12px;text-transform:uppercase;letter-spacing:.08em">Link</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="color:#6b6a75;font-size:12px;margin:24px 0 0">Sent by MangaLog · your manga tracker</p>
      </div>
    `,
  });

  console.log(`[notifier] Email sent — ${updates.length} update(s)`);
}

// ─── Check for new chapters ───────────────────────────────────────────────────
// Compares the latest chapter from the API against what's stored in the DB.
// We reuse the `currentChapter` field as "last known chapter" for notifications.
// (It doubles as both reading progress AND notification baseline.)
export async function checkForUpdates() {
  console.log("[notifier] Checking for new chapters…");
  const all = await getAllTracked();
  // Skip completed manga — no new chapters expected
  const mangaList = all.filter((m) => m.readingStatus !== "completed");
  const updates = [];

  // Run all API checks in parallel
  const results = await Promise.allSettled(
    mangaList.map(async (manga) => {
      const data = await getLatestChapter(manga.id);
      if (!data) return null;

      const latest = parseInt(data.chapter);
      // Use lastNotifiedChapter as the baseline — NOT currentChapter
      // This way the badge on the site still shows unread chapters
      const lastSeen = manga.lastNotifiedChapter || manga.currentChapter || 0;

      // Always update cache when notifier fetches fresh data
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
      // Only update lastNotifiedChapter — NOT currentChapter
      // currentChapter is reading progress, only the user should change that
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
}

// ─── Schedule ─────────────────────────────────────────────────────────────────
// Runs every 6 hours: 0 0,6,12,18 * * *
// Change the cron expression to adjust frequency.
// Format: minute hour day month weekday
export function startNotifier() {
  console.log("[notifier] Started — checking every 30 minutes");

  // Run once immediately on startup to catch anything missed
  checkForUpdates().catch(console.error);

  // Then schedule recurring checks
  // Check every 30 minutes for near-instant notifications
  cron.schedule("*/30 * * * *", () => {
    checkForUpdates().catch(console.error);
  });
}
