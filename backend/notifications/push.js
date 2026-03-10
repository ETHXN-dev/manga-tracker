export async function sendPushNotification(updates) {
  if (!process.env.NTFY_TOPIC) {
    console.log("[push] NTFY_TOPIC is not set — skipping push notification");
    return;
  }

  const title =
    updates.length === 1
      ? `${updates[0].title} — Ch. ${updates[0].newChapter} dropped`
      : `${updates.length} new chapters dropped`;

  const body = updates
    .map(({ title, newChapter }) => `${title} → Ch. ${newChapter}`)
    .join("\n");

  try {
    const res = await fetch(`https://ntfy.sh/${process.env.NTFY_TOPIC}`, {
      method: "POST",
      headers: {
        Title: title,
        Priority: "high",
        Tags: "manga,book",
        "Content-Type": "text/plain",
      },
      body,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "(no body)");
      console.error(
        `[push] ntfy.sh returned ${res.status} ${res.statusText} — topic: "${process.env.NTFY_TOPIC}" — detail: ${detail}`,
      );
      return;
    }

    console.log(
      `[push] Notification sent — topic: "${process.env.NTFY_TOPIC}" — ${updates.length} update(s)`,
    );
  } catch (err) {
    console.error(
      "[push] Network error sending push notification:",
      err.message,
    );
  }
}
