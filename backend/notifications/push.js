export async function sendPushNotification(updates) {
  if (!process.env.NTFY_TOPIC) return;

  const title =
    updates.length === 1
      ? `${updates[0].title} — Ch. ${updates[0].newChapter} dropped`
      : `${updates.length} new chapters dropped`;

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
    console.log("[notifier] Push notification sent");
  } catch (err) {
    console.error("[notifier] Push notification failed:", err.message);
  }
}
