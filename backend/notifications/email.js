import { Resend } from "resend";

// Lazy singleton — instantiated once on first send, not at module load time.
// This avoids issues if the module is evaluated before dotenv has run.
let _resend = null;
function getResendClient() {
  if (!_resend && process.env.RESEND_API_KEY) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export async function sendEmailNotification(updates) {
  const resend = getResendClient();
  if (!resend || !process.env.NOTIFY_EMAIL) {
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
