# MangaLog

> A personal manga tracking app — search titles, track your progress, get notified when new chapters drop.

![Node.js](https://img.shields.io/badge/Node.js-ESM-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E?logo=supabase&logoColor=white)
![Render](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render&logoColor=white)
![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?logo=vercel&logoColor=white)

---

## Features

- 🔍 **Search** — find any manga instantly via the AniList GraphQL API
- 📚 **Track** — maintain a personal Reading and Completed list
- 📖 **Latest chapters** — auto-fetched from AniList and MangaDex with a 6-hour DB cache
- 🔔 **Notifications** — email (Resend) and push (ntfy.sh) alerts when new chapters drop
- 📊 **Activity heatmap** — GitHub-style chart of your reading history
- 🗂️ **Chapter browser** — browse and jump to any chapter directly on MangaBolt
- ✅ **Progress tracking** — mark chapters as read; the unread badge shows how far behind you are
- 🎌 **Animated background** — falling kanji canvas animation

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, Vanilla CSS |
| Backend | Node.js (ESM), Express 4 |
| Database | PostgreSQL via Prisma 5 (SQLite for local dev) |
| Scheduler | node-cron |
| Email | Resend |
| Push | ntfy.sh |
| External APIs | AniList GraphQL, MangaDex REST, MangaBolt |
| Hosting | Vercel (frontend) + Render (backend) + Supabase (DB) |

---

## Project Structure

```
manga-tracker/
├── frontend/
│   └── src/
│       ├── App.jsx               # Root — state & composition
│       ├── api.js                # All fetch calls to the backend
│       ├── hooks/
│       │   └── useDebounce.js
│       └── components/
│           ├── Header.jsx
│           ├── Toolbar.jsx
│           ├── MangaGrid.jsx
│           ├── MangaTile.jsx
│           ├── ChapterDropdownToggle.jsx
│           ├── ActivityHeatmap.jsx
│           ├── NotifierStatus.jsx
│           ├── SearchBar.jsx
│           ├── SearchResultCard.jsx
│           ├── NowReadingTicker.jsx
│           ├── KanjiBackground.jsx
│           ├── TileSkeleton.jsx
│           ├── EmptyState.jsx
│           └── Toast.jsx
│
└── backend/
    ├── server.js                 # Express app + startup
    ├── db.js                     # Prisma data access layer
    ├── notifier.js               # Cron job — chapter update checks
    ├── middleware/
    │   ├── auth.js               # API key validation
    │   └── logger.js             # Request logger
    ├── routes/
    │   ├── manga.js              # /api/manga/*
    │   ├── tracked.js            # /api/tracked/*
    │   ├── activity.js           # /api/activity/*
    │   └── system.js             # /api/health, /api/test-notifier
    ├── services/
    │   ├── anilist.js            # AniList GraphQL client
    │   ├── mangadex.js           # MangaDex REST client
    │   ├── mangabolt.js          # Slug resolver
    │   └── chapters.js           # Orchestrates all three
    ├── notifications/
    │   ├── email.js              # Resend email
    │   ├── push.js               # ntfy push
    │   └── index.js              # Fires both in parallel
    └── prisma/
        └── schema.prisma
```

---

## Local Development

### Prerequisites

- Node.js 18+
- Git

### 1. Clone

```bash
git clone https://github.com/your-username/manga-tracker.git
cd manga-tracker
```

### 2. Backend

```bash
cd backend
npm install
```

For local dev, switch the Prisma datasource to SQLite. In `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./manga.db"
}
```

Then create the database and start the server:

```bash
npm run db:push   # creates manga.db from the schema
npm run dev       # starts on :3001 with auto-restart
```

Verify it's running: `http://localhost:3001/api/health` → `{ "ok": true }`

### 3. Frontend

```bash
# in a new terminal
cd frontend
npm install
npm run dev       # starts on :5173
```

The Vite dev server automatically proxies `/api/*` → `http://localhost:3001`, so no environment variables are needed locally.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes (prod) | PostgreSQL connection string |
| `API_KEY` | No | Shared secret for `x-api-key` header. Auth is skipped if unset. |
| `FRONTEND_URL` | No | Allowed CORS origin. Defaults to `http://localhost:5173`. |
| `PORT` | No | Server port. Defaults to `3001`. |
| `NODE_ENV` | No | Set to `production` on Render to enable the keep-alive ping. |
| `RENDER_EXTERNAL_URL` | No | Your Render service's public URL (e.g. `https://<app>.onrender.com`) — activates the keep-alive self-ping. |
| `RESEND_API_KEY` | No | Resend API key for email notifications. |
| `NOTIFY_EMAIL` | No | Recipient address for chapter notification emails. |
| `NTFY_TOPIC` | No | ntfy.sh topic name for push notifications. |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes (prod) | Backend URL e.g. `https://your-backend.onrender.com/api` |
| `VITE_API_KEY` | No | Must match `API_KEY` on the backend. |

---

## Deployment

### Database — Supabase

1. [supabase.com](https://supabase.com) → **New Project**
2. Go to **Project Settings** → **Database** → copy the **URI** connection string (use the direct URI, not the pooled one, for Prisma compatibility)

### Backend — Render

1. [render.com](https://render.com) → **New** → **Web Service** → connect your GitHub repo
2. Set **Root Directory** to `backend`, **Build Command** to `npm install`, **Start Command** to `node server.js`
3. Add environment variables (see table above) — set `RENDER_EXTERNAL_URL` to your Render service URL
4. Deploy — Render gives you a URL like `https://manga-tracker-backend.onrender.com`
5. Run the DB migration once via the Render **Shell** tab:
   ```bash
   npx prisma migrate deploy
   ```

### Frontend — Vercel

1. **New Project** → import repo → Root Directory: `frontend`
2. Add environment variables:
   ```
   VITE_API_URL=https://<your-render-service>.onrender.com/api
   VITE_API_KEY=<your-api-key>
   ```
3. Deploy → copy the Vercel URL → paste it back into Render's `FRONTEND_URL` environment variable

---

## API Overview

All endpoints require an `x-api-key` header (except `/api/health`).

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/manga/search?q=` | Search manga via AniList |
| `GET` | `/api/manga/:id/latest-chapter` | Latest chapter (cached) |
| `GET` | `/api/tracked` | Get full tracked list |
| `POST` | `/api/tracked` | Add a manga |
| `DELETE` | `/api/tracked/:id` | Remove a manga |
| `PATCH` | `/api/tracked/:id/progress` | Update current chapter |
| `PATCH` | `/api/tracked/:id/reading-status` | Set `reading` or `completed` |
| `GET` | `/api/activity/heatmap` | Reading activity by date |
| `GET` | `/api/activity/status` | Last notifier run time |
| `GET` | `/api/health` | Health check (no auth) |
| `GET` | `/api/test-notifier` | Manually trigger update check |

---

## Notifications

The notifier runs every **30 minutes** as a cron job. On each run it:

1. Fetches the latest chapter for every non-completed tracked manga
2. Compares against `lastNotifiedChapter` in the DB
3. Sends a notification for any manga where a new chapter has dropped
4. Updates the chapter cache for all manga

Both notifications channels are **optional** — if the env vars aren't set, they're silently skipped. You can use one, both, or neither.

**Push (ntfy.sh):** Install the [ntfy app](https://ntfy.sh) on your phone, create a topic, and set `NTFY_TOPIC` on the backend. Free and requires no account.

**Email (Resend):** Create a free [Resend](https://resend.com) account, grab an API key, and set `RESEND_API_KEY` + `NOTIFY_EMAIL`. Uses Resend's shared sending domain so no custom domain setup is required.

---

## Prisma Commands

```bash
npm run db:push       # Sync schema to DB without migration files (local dev)
npm run db:migrate    # Create a new migration file
npm run db:studio     # Open visual DB browser at localhost:5555
```

---

## Further Reading

For a deep-dive into every file, design decision, algorithm, and known quirk, see **[PROJECT_REPORT.md](./PROJECT_REPORT.md)**.

---

## License

MIT