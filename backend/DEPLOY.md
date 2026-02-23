# Deployment Guide

## Stack
- **Frontend**: Vercel (free)
- **Backend + Database**: Railway (free tier)

---

## Local dev (start here)

Run these once to get set up:

```bash
cd manga-tracker/backend
npm install        # installs express, prisma, cors, dotenv
npm run db:push    # creates manga.db (SQLite) from your schema — no config needed
npm run dev        # starts server on :3001 with auto-restart on save
```

Test it: open `http://localhost:3001/api/tracked` in your browser.
You should see `{ "data": [] }` — empty list, database is working.

Then in a second terminal:
```bash
cd manga-tracker/frontend
npm run dev        # starts on :5173, proxies /api → :3001 automatically
```

---

## Deploy to production

### Step 1 — Database on Railway

1. [railway.app](https://railway.app) → New Project → **Provision PostgreSQL**
2. Click your Postgres service → **Variables** tab → copy `DATABASE_URL`

### Step 2 — Backend on Railway

1. Push your whole `manga-tracker` folder to GitHub
2. Railway → New Project → **Deploy from GitHub** → select your repo
3. Set the **Root Directory** to `backend`
4. Add these environment variables in Railway's dashboard:
   ```
   DB_PROVIDER=postgresql
   DATABASE_URL=postgresql://...   ← from Step 1
   NODE_ENV=production
   FRONTEND_URL=https://your-app.vercel.app   ← fill in after Step 3
   PORT=3001
   ```
5. Settings → Networking → **Generate Domain**
   You'll get something like `manga-tracker-backend.up.railway.app`

6. Run the DB migration once (in Railway's terminal/shell):
   ```bash
   npx prisma migrate deploy
   ```

### Step 3 — Frontend on Vercel

1. [vercel.com](https://vercel.com) → New Project → import your repo
2. Set **Root Directory** to `frontend`
3. Add environment variable:
   ```
   VITE_API_URL=https://manga-tracker-backend.up.railway.app/api
   ```
4. Deploy → Vercel gives you a URL like `manga-tracker.vercel.app`
5. Go back to Railway → update `FRONTEND_URL` to your Vercel URL

---

## Prisma command reference

| Command | When to use |
|---------|-------------|
| `npm run db:push` | Local dev — fast, syncs schema without migration files |
| `npm run db:migrate` | When you want committed migration history |
| `npx prisma migrate deploy` | Production — run once after first deploy |
| `npm run db:studio` | Opens a visual database browser at localhost:5555 |

---

## Troubleshooting

**CORS error in production**
→ `FRONTEND_URL` on Railway must exactly match your Vercel URL (no trailing slash)

**`PrismaClientInitializationError`**
→ `DATABASE_URL` is missing or wrong — double check Railway's environment variables

**Frontend shows "Could not load your list"**
→ Open DevTools → Network tab → see what URL `/api/tracked` is actually hitting
→ Usually means `VITE_API_URL` isn't set on Vercel
