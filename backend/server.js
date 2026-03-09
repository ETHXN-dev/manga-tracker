import "dotenv/config";
import express from "express";
import cors from "cors";
import { apiKeyAuth } from "./middleware/auth.js";
import { requestLogger } from "./middleware/logger.js";
import mangaRouter from "./routes/manga.js";
import trackedRouter from "./routes/tracked.js";
import activityRouter from "./routes/activity.js";
import systemRouter from "./routes/system.js";
import { startNotifier } from "./notifier.js";

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());
app.use("/api", apiKeyAuth);
app.use(requestLogger);

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use("/api/manga", mangaRouter);
app.use("/api/tracked", trackedRouter);
app.use("/api/activity", activityRouter);
app.use("/api", systemRouter);

// ─── Error handlers ───────────────────────────────────────────────────────────

app.use((req, res) =>
  res.status(404).json({ error: `${req.method} ${req.path} not found` }),
);
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong." });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () =>
  console.log(`\n🚀 Server running on http://localhost:${PORT}\n`),
);

startNotifier();

// ─── Keep-alive ping ──────────────────────────────────────────────────────────
// Render free tier spins down after 15min inactivity — ping ourselves every
// 10min so the cron never misses a scheduled run.
if (process.env.NODE_ENV === "production" && process.env.RENDER_EXTERNAL_URL) {
  const PING_INTERVAL = 10 * 60 * 1000;
  setInterval(async () => {
    try {
      await fetch(`${process.env.RENDER_EXTERNAL_URL}/api/health`);
      console.log("[keep-alive] ping sent");
    } catch (err) {
      console.error("[keep-alive] ping failed:", err.message);
    }
  }, PING_INTERVAL);
  console.log("[keep-alive] started — pinging every 10 minutes");
}
