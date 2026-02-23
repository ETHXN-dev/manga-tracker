# MangaLog — Chapter Tracker

A full-stack learning project built to understand React, Node.js, databases, and real API integration.

## What This Project Teaches

Each phase of this project maps to a real skill:

| Phase | What You Build | What You Learn |
|-------|---------------|----------------|
| 1 ✅ | React frontend + MangaDex API | Components, hooks, state, async data fetching |
| 2 | Node.js backend | REST APIs, Express, middleware, routing |
| 3 | Database | SQL or MongoDB, CRUD, data modeling |
| 4 | Notifications | Cron jobs, email/push, background tasks |
| 5 | Deploy | CI/CD, hosting, env vars, production mindset |

---

## Phase 1: Getting Started (You Are Here)

### Setup

```bash
npm install
npm run dev
```

Open `http://localhost:5173`

### What's Built

- Search manga by title via MangaDex public API
- Add titles to your personal tracking list
- See the latest English chapter for each tracked title
- Data persists to localStorage (temporary — replaced by a real DB in Phase 3)

### File Structure

```
src/
├── App.jsx        # All components + logic for Phase 1 (deliberately one file)
├── main.jsx       # React entry point
└── index.css      # All styles
```

> **Why one file?** When learning, consolidation > abstraction. Once you understand
> what everything does, Phase 2 will split this into proper feature folders.

### Key Concepts to Understand Before Moving On

1. **useState** — reactive variables. When they change, React re-renders the component.
2. **useEffect** — side effects (API calls, timers, subscriptions). Runs after render.
3. **Custom hooks** — `useDebounce` and `useLocalStorage` are just functions that use hooks.
   You can extract any reusable stateful logic into a custom hook.
4. **Props** — how parent components pass data to children. Data flows DOWN.
5. **Callbacks as props** — how children communicate back to parents. Events flow UP.
6. **Debouncing** — don't fire on every keystroke. Wait until the user stops.
7. **Cleanup functions** — the function you return from useEffect prevents memory leaks.

---

## Phase 2: Node.js Backend (Coming Next)

You'll build a Node.js + Express server that:

- Receives requests from your React app instead of calling MangaDex directly
- Handles rate limiting (MangaDex has limits you need to respect)
- Serves your user's manga list from a database (not localStorage)
- Provides endpoints like:
  - `GET /api/manga/search?q=naruto`
  - `GET /api/tracked` — your list
  - `POST /api/tracked` — add a manga
  - `DELETE /api/tracked/:id` — remove one

**Why move API calls to the backend?**
- Security: hide API keys if you need them
- Rate limiting: one server handles requests for all users
- Caching: store results so you don't re-fetch the same data
- Control: you can transform data before it hits the frontend

In `vite.config.js`, you'll uncomment the proxy config so `fetch('/api/...')` in React
automatically routes to `http://localhost:3001` in development.

---

## Phase 3: Database

You'll replace localStorage with a real database.

**Recommended: SQLite → PostgreSQL path**
- SQLite: file-based, zero config, perfect for local dev
- PostgreSQL: production-grade, what most companies use

You'll learn:
- SQL basics: `SELECT`, `INSERT`, `DELETE`, `JOIN`
- Schema design: what columns does your `manga` table need?
- Migrations: how to change your schema without losing data
- ORMs: tools like Prisma or Drizzle that let you write JS instead of raw SQL

---

## Phase 4: Notifications

Check for new chapters on a schedule and notify users.

- **Cron jobs**: Node-cron to run a task every hour
- **Diffing**: compare stored chapter count vs. current — if changed, notify
- **Delivery**: email (Resend/SendGrid), push notifications, or Discord webhook

---

## Phase 5: Deploy

Ship it to the internet.

- Frontend: Vercel or Netlify (free, connects to GitHub)
- Backend: Railway or Fly.io (free tiers available)
- Database: Railway Postgres or Supabase
- Learn: environment variables, build pipelines, domain names

---

## MangaDex API Notes

Base URL: `https://api.mangadex.org`

Useful endpoints:
- `GET /manga?title=naruto` — search
- `GET /chapter?manga={id}&order[publishAt]=desc` — latest chapters
- `GET /cover/{id}` — cover art metadata

Full docs: https://api.mangadex.org/docs/

Rate limits: ~5 requests/second. In production your backend handles this with a queue.

---

## Becoming a Senior Developer

This project teaches more than syntax. Senior developers think about:

- **Architecture**: why does the backend exist? what does each layer own?
- **User experience**: debouncing, loading states, error handling, empty states
- **Data flow**: where does state live? who owns it? how does it change?
- **Pragmatism**: ship Phase 1 first. Don't build Phase 5 before Phase 1 works.
- **Refactoring**: starting in one file is fine. Extract when you feel the pain.

The instinct to over-engineer early is what separates juniors from seniors. Build the
simplest thing that works. Then improve it based on real pain points.
