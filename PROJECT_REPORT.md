# MangaLog — Comprehensive Project Report

> This document is a complete reference for the MangaLog project. It covers every file, every decision, every API endpoint, every environment variable, and every piece of business logic. It is intended to give a new developer or AI assistant full context to continue working on the codebase immediately.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Architecture Overview](#4-architecture-overview)
5. [Frontend — Detailed Breakdown](#5-frontend--detailed-breakdown)
   - 5.1 [Entry Point](#51-entry-point)
   - 5.2 [App.jsx — Root Component](#52-appjsx--root-component)
   - 5.3 [API Layer](#53-api-layer)
   - 5.4 [Hooks](#54-hooks)
   - 5.5 [Components](#55-components)
   - 5.6 [Styling System](#56-styling-system)
6. [Backend — Detailed Breakdown](#6-backend--detailed-breakdown)
   - 6.1 [Entry Point](#61-entry-point)
   - 6.2 [Middleware](#62-middleware)
   - 6.3 [Routes](#63-routes)
   - 6.4 [Services](#64-services)
   - 6.5 [Notifications](#65-notifications)
   - 6.6 [Database Layer](#66-database-layer)
   - 6.7 [Notifier](#67-notifier)
7. [Database Schema](#7-database-schema)
8. [API Reference](#8-api-reference)
9. [Data Flow Walkthroughs](#9-data-flow-walkthroughs)
10. [External Services & APIs](#10-external-services--apis)
11. [Environment Variables](#11-environment-variables)
12. [Local Development Setup](#12-local-development-setup)
13. [Production Deployment](#13-production-deployment)
14. [Key Business Logic & Algorithms](#14-key-business-logic--algorithms)
15. [Design System](#15-design-system)
16. [Known Quirks & Implementation Notes](#16-known-quirks--implementation-notes)

---

## 1. Project Overview

MangaLog is a personal manga tracking web application. The user can:

- **Search** for manga by title (powered by the AniList GraphQL API)
- **Track** manga in a personal list with a "Reading" / "Completed" status
- **Monitor** the latest chapter of each tracked manga (sourced from AniList, MangaDex, and MangaBolt)
- **Record reading progress** (which chapter they are currently on)
- **Receive push and email notifications** when a new chapter drops for any tracked manga
- **View a GitHub-style activity heatmap** showing which days chapters were marked as read
- **Browse any chapter** of a tracked manga via a chapter picker dropdown that links directly to MangaBolt

The app is a single-user, self-hosted tool — there is no authentication UI, accounts, or multi-user support. Access is protected by a shared API key passed in request headers.

---

## 2. Tech Stack

### Frontend
| Concern | Technology |
|---|---|
| Framework | React 19 (with Vite) |
| Language | JavaScript (JSX) |
| Styling | Vanilla CSS (single `index.css`, no CSS-in-JS) |
| Build tool | Vite 7 |
| HTTP | Native `fetch` via a shared `apiFetch` wrapper |
| State management | React `useState` / `useEffect` / `useMemo` / `useCallback` (no external state library) |
| Linting | ESLint 9 with `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh` |

### Backend
| Concern | Technology |
|---|---|
| Runtime | Node.js (ESM — `"type": "module"`) |
| Framework | Express 4 |
| Database ORM | Prisma 5 |
| Database | PostgreSQL (production) / SQLite (local dev, via `prisma.db`) |
| Scheduler | node-cron 3 |
| Email notifications | Resend (HTTPS API — works on Render free tier) |
| Push notifications | ntfy.sh (HTTP POST) |
| Environment | dotenv |

### External APIs
| Service | Used for |
|---|---|
| AniList GraphQL API | Manga search, metadata, chapter count for completed series |
| MangaDex REST API | Latest chapter number for ongoing series |
| MangaBolt | Read URLs for all chapters |

### Hosting (production)
| Service | Hosts |
|---|---|
| Vercel | Frontend (static) |
| Railway | Backend (Node server) |
| Railway | PostgreSQL database |

---

## 3. Repository Structure

```
manga-tracker/
├── package.json                  ← Root-level (legacy, mostly unused)
├── .gitignore
├── test                          ← Ad-hoc test script (not a test suite)
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── eslint.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx              ← React root mount
│       ├── App.jsx               ← Root component (state + composition)
│       ├── api.js                ← All fetch calls to the backend
│       ├── index.css             ← All styles (design tokens + components)
│       ├── hooks/
│       │   └── useDebounce.js    ← Generic debounce hook
│       └── components/
│           ├── Header.jsx
│           ├── Toolbar.jsx
│           ├── NowReadingTicker.jsx
│           ├── KanjiBackground.jsx
│           ├── MangaGrid.jsx
│           ├── MangaTile.jsx
│           ├── ChapterDropdownToggle.jsx
│           ├── TileSkeleton.jsx
│           ├── SearchBar.jsx
│           ├── SearchResultCard.jsx
│           ├── ActivityHeatmap.jsx
│           ├── NotifierStatus.jsx
│           ├── EmptyState.jsx
│           └── Toast.jsx
│
└── backend/
    ├── package.json
    ├── server.js                 ← Express app + startup
    ├── db.js                     ← Prisma data access layer
    ├── notifier.js               ← Cron job: check for new chapters
    ├── .gitignore
    ├── DEPLOY.md
    ├── middleware/
    │   ├── auth.js               ← API key validation
    │   └── logger.js             ← Request logger
    ├── routes/
    │   ├── manga.js              ← /api/manga/*
    │   ├── tracked.js            ← /api/tracked/*
    │   ├── activity.js           ← /api/activity/*
    │   └── system.js             ← /api/health, /api/test-notifier
    ├── services/
    │   ├── anilist.js            ← AniList GraphQL client
    │   ├── mangadex.js           ← MangaDex REST client
    │   ├── mangabolt.js          ← MangaBolt slug resolver
    │   └── chapters.js           ← Orchestrates all three into getLatestChapter()
    ├── notifications/
    │   ├── email.js              ← Resend email sender
    │   ├── push.js               ← ntfy push sender
    │   └── index.js              ← Fires both in parallel
    └── prisma/
        ├── schema.prisma
        └── manga.db              ← SQLite file (local dev only, gitignored in prod)
```

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     BROWSER (Vercel)                    │
│                                                         │
│  React SPA                                              │
│  ┌──────────┐  ┌─────────┐  ┌──────────┐  ┌────────┐  │
│  │ App.jsx  │  │ Toolbar │  │MangaGrid │  │ Toast  │  │
│  │ (state)  │→ │ (tabs)  │  │ (tiles)  │  │        │  │
│  └──────────┘  └─────────┘  └──────────┘  └────────┘  │
│       │                                                 │
│  api.js (fetch wrapper with x-api-key header)          │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS /api/*
┌───────────────────────▼─────────────────────────────────┐
│                  BACKEND (Railway)                       │
│                                                         │
│  server.js                                              │
│  ├── middleware/auth.js       (API key check)           │
│  ├── middleware/logger.js     (request logging)         │
│  ├── routes/manga.js          (/api/manga/*)            │
│  ├── routes/tracked.js        (/api/tracked/*)          │
│  ├── routes/activity.js       (/api/activity/*)         │
│  └── routes/system.js         (/api/health, etc.)       │
│                                                         │
│  services/                                              │
│  ├── anilist.js    ──────────────────────────────────┐  │
│  ├── mangadex.js   ──────────────────────────────┐   │  │
│  ├── mangabolt.js  ────────────────────────────┐ │   │  │
│  └── chapters.js   (orchestrates all three) ←─┘─┘───┘  │
│                                                         │
│  notifier.js  (cron, every 30 min)                      │
│  ├── services/chapters.js  (fetch latest chapters)      │
│  └── notifications/        (email + push)               │
│                                                         │
│  db.js  (Prisma client, all DB access)                  │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│            DATABASE — PostgreSQL (Railway)              │
│   Manga  |  ReadActivity  |  SystemStatus               │
└─────────────────────────────────────────────────────────┘
                        │
         ┌──────────────┴───────────────┐
         ▼                              ▼
  AniList GraphQL             ntfy.sh / Resend
  MangaDex REST               (notifications)
  MangaBolt HTML
```

### Request flow summary

1. The React frontend makes all API calls via `api.js`, which attaches an `x-api-key` header on every request.
2. The Express backend validates the key in `middleware/auth.js` before any route handler runs.
3. Route handlers call `db.js` functions directly for data access, and `services/chapters.js` for external API calls.
4. Separately, `notifier.js` runs on a cron schedule every 30 minutes, fetches the latest chapter for all tracked non-completed manga, updates the DB cache, and fires notifications if anything is new.

---

## 5. Frontend — Detailed Breakdown

### 5.1 Entry Point

**`frontend/index.html`**
Standard Vite HTML shell. Mounts to `<div id="root">`.

**`frontend/src/main.jsx`**
```jsx
createRoot(document.getElementById("root")).render(
  <StrictMode><App /></StrictMode>
);
```
Wraps `App` in React `StrictMode` (double-invokes effects in development to catch bugs — no production effect). Imports `index.css` globally.

**`frontend/vite.config.js`**
- Enables `@vitejs/plugin-react`
- In development, proxies all `/api/*` requests to `http://localhost:3001` so the frontend doesn't need CORS headers and no env var is needed for the API URL in dev

---

### 5.2 App.jsx — Root Component

`App` is the top-level orchestrator. It owns all shared state and passes data + handlers down as props. It contains no JSX UI of its own beyond the layout shell.

#### State owned by App

| State variable | Type | Purpose |
|---|---|---|
| `query` | string | The search input value for the "Add Manga" tab |
| `searchResults` | array | Results returned from `/api/manga/search` |
| `isSearching` | boolean | Controls spinner in `SearchBar` |
| `searchError` | string\|null | Error message for failed searches |
| `activeTab` | string | One of `"reading"`, `"completed"`, `"activity"`, `"search"` |
| `trackedManga` | array | The full list of tracked manga from the DB |
| `listLoading` | boolean | True while initial data is loading |
| `listError` | string\|null | Error from initial load |
| `chapterMap` | object | `{ [mangaId]: { chapter, readUrl, mangaboltSlug } }` — latest chapters |
| `cachedCount` | number | Persisted to `localStorage` — used to render the right number of skeletons |
| `listQuery` | string | Filter query for the reading/completed grid |
| `sortBy` | string | One of `"added"`, `"alpha"`, `"behind"`, `"latest"` |
| `toast` | object\|null | `{ msg, type }` — drives the Toast component |
| `isRefreshing` | boolean | True while manual refresh is in flight |
| `recentlyAdded` | string\|null | The ID of a just-added manga, used to trigger the `is-new` animation on its tile |

#### Derived/memoised state

**`trackedIds`** (`useMemo`) — a `Set` of all tracked manga IDs, used for O(1) "already tracked" checks in the search results.

**`{ reading, completed }`** (`useMemo`) — the tracked list split by `readingStatus`, with filtering (`listQuery`) and sorting (`sortBy`) applied. The sort options are:
- `"added"` (default) — unread manga first, then alphabetical
- `"alpha"` — pure A→Z
- `"behind"` — sorted by chapter gap (latest - currentChapter) descending
- `"latest"` — sorted by latest chapter number descending

**`debouncedQuery`** (`useDebounce`, 500ms) — search only fires after the user stops typing.

#### Key handlers

| Handler | What it does |
|---|---|
| `showToast(msg, type)` | Sets toast state; the `Toast` component auto-dismisses after 3 seconds |
| `handleRefresh()` | Re-fetches tracked list and all chapter data; shows success/fail toast |
| `handleAdd(manga)` | POSTs to `/api/tracked`, optimistically prepends to list, switches to reading tab, fires toast, then fetches latest chapter and updates progress |
| `handleRemove(id)` | Optimistically removes from list, then calls DELETE; rolls back on error |
| `handleProgressUpdate(id, ch)` | Updates `currentChapter` in local state (called from `MangaTile` after the API call) |
| `handleStatusChange(id, status)` | Updates `readingStatus` in local state (called from `MangaTile`) |

#### `sharedGridProps`

A plain object constructed inline that bundles all props that both the Reading grid and Completed grid share, then spread onto `<MangaGrid>`:
```js
const sharedGridProps = {
  listLoading, cachedCount, listQuery, chapterMap,
  onRemove: handleRemove,
  onProgressUpdate: handleProgressUpdate,
  onStatusChange: handleStatusChange,
  onSwitchToSearch: () => setActiveTab("search"),
};
```

---

### 5.3 API Layer

**`frontend/src/api.js`**

All backend communication lives here. Every function is exported and imported directly by the component or hook that needs it.

**`apiFetch(path, options)`** — the base wrapper. Merges `Content-Type: application/json` and `x-api-key: <VITE_API_KEY>` into every request's headers. The API key is read from `import.meta.env.VITE_API_KEY` (empty string if not set — in which case the backend skips auth).

| Function | Method | Endpoint | Purpose |
|---|---|---|---|
| `searchManga(query)` | GET | `/manga/search?q=` | Returns array of manga from AniList |
| `fetchTracked()` | GET | `/tracked` | Returns full tracked list from DB |
| `addTrackedApi(manga)` | POST | `/tracked` | Adds a manga to the tracked list |
| `removeTrackedApi(id)` | DELETE | `/tracked/:id` | Removes a manga |
| `getLatestChapter(mangaId)` | GET | `/manga/:id/latest-chapter` | Returns latest chapter data (may be cached) |
| `updateProgressApi(id, ch)` | PATCH | `/tracked/:id/progress` | Updates user's current chapter |
| `updateReadingStatusApi(id, status)` | PATCH | `/tracked/:id/reading-status` | Sets "reading" or "completed" |
| `fetchAllLatestChapters(list)` | — | — | Calls `getLatestChapter` for every manga in parallel using `Promise.allSettled`; returns a map |

---

### 5.4 Hooks

**`frontend/src/hooks/useDebounce.js`**

```js
function useDebounce(value, delay)
```
Standard debounce. Sets a `setTimeout` on every value change; clears it on the next change. Returns the last stable value. Used in `App.jsx` to delay search API calls until the user pauses typing.

---

### 5.5 Components

#### `KanjiBackground`
A full-screen `<canvas>` fixed behind all content (`z-index: 0`, `pointer-events: none`). On mount, spawns 35 particle objects, each with a random kanji character from the `KANJI` array, size, speed, drift, wobble, and opacity. Uses `requestAnimationFrame` for the animation loop. Particles drift upward with a sinusoidal horizontal wobble; when a particle exits the top of the screen it resets to the bottom with a new random x-position and character. Cleans up the animation frame and resize listener on unmount.

The 15 kanji characters used: 漫 画 章 新 読 本 物 語 力 夢 剣 闘 血 炎 龍

#### `Header`
Purely presentational. Renders the sticky top bar with the book SVG logo icon and "MANGALOG" wordmark. Takes no props.

#### `NowReadingTicker`
A scrolling marquee banner that shows all non-completed manga titles in uppercase, separated by ` · `. The titles are tripled and concatenated twice to create a seamless infinite-scroll effect using a CSS `tickerScroll` keyframe animation. Returns `null` if there are no active (non-completed) manga.

Props: `manga` (array of tracked manga objects)

#### `Toolbar`
The full navigation + control bar rendered below the header. Contains:
- **Tabs** — Reading (with count badge), Completed (with count badge), Activity, + Add Manga
- **Stat pill** — "● N Reading" shown only when not loading
- **Right controls** — only visible when `activeTab` is `"reading"` or `"completed"`:
  - Filter input (searches by title within the grid)
  - Sort dropdown (`New Chapters First`, `A → Z`, `Most Behind`, `Most Chapters`)
  - `+ Add` button (switches to search tab)
  - Refresh button (spins while refreshing)

Props: `activeTab`, `setActiveTab`, `reading`, `completed`, `listQuery`, `setListQuery`, `sortBy`, `setSortBy`, `listLoading`, `isRefreshing`, `onRefresh`

#### `MangaGrid`
Handles all three rendering states of the manga list:
1. **Loading** — renders `cachedCount` number of `TileSkeleton` components
2. **No results** (filter query with no matches) — renders a "No manga matching..." message
3. **Empty list** — renders `EmptyState`
4. **Populated** — renders a grid of `MangaTile` components, plus an "+ Add Manga" card at the end if `showAddButton` is true

Props: `list`, `emptyMessage`, `showAddButton`, `recentlyAddedId`, `listLoading`, `cachedCount`, `listQuery`, `chapterMap`, `onRemove`, `onProgressUpdate`, `onStatusChange`, `onSwitchToSearch`

#### `MangaTile`
The main card component. Wrapped in `memo`. Uses a CSS 3D flip animation — the tile has a **front face** (normal card) and a **back face** (delete confirmation). The flip is triggered by hovering over the delete button (desktop) or a 600ms long-press (mobile, via `setTimeout` in `handleTouchStart`).

**Front face contains:**
- Cover image with lazy loading
- Status badge overlay (one of: `"New Ch."` in red, `"✓ Current"` in green, `"Completed"` in grey)
- Chapter overlay showing the latest chapter number
- Unread badge (`+N`) showing how many chapters behind the user is
- A delete button (trash icon, visible on hover)
- Card body with title, loading state, "source unavailable" warning, or action buttons:
  - **Read Now** link → opens latest chapter on MangaBolt in new tab
  - **Chapter dropdown toggle** (`ChapterDropdownToggle`)
  - **Progress row** with "On ch. N" label and "Mark ch. N read" button (shown when there are unread chapters)
  - **Status toggle** button (shown for completed manga or finished series)

**Back face contains:**
- Blurred cover image as background
- "Remove from list?" confirmation with Remove / Cancel buttons

**Internal state:**
- `confirming` — whether the tile is flipped to the back
- `currentCh` — local copy of `manga.currentChapter`, updated optimistically
- `savingProgress` — true while the PATCH /progress API call is in flight
- `savingStatus` — true while the PATCH /reading-status API call is in flight

Both `markAsRead` and `toggleStatus` use the **optimistic update pattern**: update local state immediately for instant UI feedback, then call the API, and roll back on error.

Props: `manga`, `chapter`, `onRemove`, `onProgressUpdate`, `onStatusChange`, `justAdded`

#### `ChapterDropdownToggle`
A small `▾` button that opens a scrollable list of all chapters for a manga. Wrapped in `memo`.

- Detects whether to open upward or downward by checking the button's `getBoundingClientRect().top` — if less than 220px from the top of the viewport, it opens downward, otherwise upward.
- Closes when clicking outside (via `document.addEventListener("mousedown", handler)` in a `useEffect` that is active only when `open` is true).
- Builds the chapter list as `Array.from({ length: latest }, (_, i) => latest - i)` — newest chapter first.
- Chapter URLs are constructed as: `https://mangabolt.com/chapter/{mangaboltSlug}-chapter-{num}/`
- Returns `null` if `latestChapter` is not a valid number ≥ 1.

Props: `latestChapter`, `mangaboltSlug`

#### `TileSkeleton`
A loading placeholder that mimics the shape of `MangaTile`. Uses `.skeleton` CSS class which has a shimmer animation. No props.

#### `SearchBar`
The search input shown on the "+ Add Manga" tab. Contains a search icon SVG, the text input (with `autoFocus`), and a spinner div shown while `isSearching` is true.

Props: `value`, `onChange`, `isSearching`

#### `SearchResultCard`
Displays one manga from the search results. Wrapped in `memo`. Shows cover image (or a `?` placeholder), title, status badge, year, chapter count, and a `+ Track` / `✓` button. The button is disabled and shows `✓` if the manga is already tracked.

Props: `manga`, `onAdd`, `isTracked`

#### `ActivityHeatmap`
A GitHub-style contribution heatmap showing 53 weeks of reading activity. Fetches data from `/api/activity/heatmap` on mount.

- Builds a 53×7 grid of day cells going back exactly 364 days from today, aligned to start on Sunday.
- Each cell is coloured with one of 5 CSS classes (`level-0` through `level-4`) based on how its count compares to the maximum count in the dataset.
- Future dates get `level-future` class.
- Month labels are shown above the grid by detecting when a week contains a date with `getDate() <= 7`.
- Tooltip is a fixed-position div driven by mouse events on each cell; it shows the date and chapter count.

#### `NotifierStatus`
Fetches `/api/activity/status` on mount to get `lastRan` (ISO timestamp of the last notifier run). Shows a coloured dot (green = healthy if ran within 2 hours, grey = stale otherwise) and a human-readable "last ran N minutes ago" label.

#### `EmptyState`
Simple placeholder for empty lists. Shows a 📚 emoji, a message, and optionally an "Add a manga" CTA button.

Props: `message`, `onSwitchToSearch`

#### `Toast`
Displays a success or error notification in the bottom-right corner. Auto-dismisses after 3 seconds via `setTimeout` in a `useEffect`. Shows a checkmark SVG for success, an info-circle SVG for errors.

Props: `message`, `type` (`"success"` | `"error"`), `onDone`

---

### 5.6 Styling System

All styles live in `frontend/src/index.css`. There is no CSS framework or CSS-in-JS.

**Fonts (Google Fonts):**
- `Bebas Neue` — display/logo font
- `Syne` (400/600/700/800) — body font
- `DM Mono` (400/500) — monospace

**Design tokens (CSS custom properties on `:root`):**

| Token | Value | Used for |
|---|---|---|
| `--bg` | `#050507` | Page background |
| `--accent` | `#ff2d2d` | Red accent — buttons, badges, logo |
| `--accent-dim` | `rgba(255,45,45,0.12)` | Subtle red tints |
| `--accent-glow` | `rgba(255,45,45,0.35)` | Drop shadows |
| `--glass` / `--glass-2` / `--glass-3` | `rgba(255,255,255,0.04/0.07/0.11)` | Glass card backgrounds |
| `--glass-border` | `rgba(255,255,255,0.09)` | Card borders |
| `--text` | `#f0ede8` | Primary text |
| `--text-muted` | `rgba(240,237,232,0.38)` | Secondary/helper text |
| `--text-sub` | `rgba(240,237,232,0.6)` | Subtitle text |
| `--green` | `#39e07a` | "Up to date" badge |
| `--gold` | `#f4a261` | Unused / accent |
| `--font-display` | `"Bebas Neue"` | — |
| `--font-body` | `"Syne"` | — |
| `--font-mono` | `"DM Mono"` | — |
| `--ease-out` | `cubic-bezier(0.22,1,0.36,1)` | Standard easing |
| `--ease-spring` | `cubic-bezier(0.34,1.56,0.64,1)` | Springy easing |
| `--r-sm/md/lg` | `10px / 14px / 20px` | Border radii |

**Named keyframe animations:**
`fadeUp`, `tileIn`, `spin`, `pulse`, `tickerScroll`, `shimmer`, `badgePop`, `dropdownOpen`, `glowPulse`, `toastIn`, `spinOnce`, `newCardPulse`

**Body background:** A `background-image` with three layered `radial-gradient` spots (red top-left, purple bottom-right, faint red center) on a near-black base. Set to `background-attachment: fixed`.

---

## 6. Backend — Detailed Breakdown

### 6.1 Entry Point

**`backend/server.js`**

Responsibilities:
1. Load env vars (`import "dotenv/config"`)
2. Create Express app
3. Register global middleware: CORS, JSON body parser, `apiKeyAuth`, `requestLogger`
4. Mount route routers at their prefix paths
5. Register 404 and global error handlers
6. Call `app.listen(PORT)`
7. Call `startNotifier()`
8. Conditionally start the keep-alive ping loop (production only)

**CORS:** Origin is controlled by `process.env.FRONTEND_URL` (defaults to `http://localhost:5173`).

**Keep-alive ping:** On Render free tier, the service sleeps after 15 minutes of inactivity. To prevent the cron job from missing scheduled runs, the server pings its own `/api/health` endpoint every 10 minutes using `setInterval`. This only runs when `NODE_ENV === "production"` and `RENDER_EXTERNAL_URL` is set.

> Note: The original `server.js` had a duplicate `/api/health` route — this was fixed during the refactor.

---

### 6.2 Middleware

**`backend/middleware/auth.js`**

```js
export function apiKeyAuth(req, res, next)
```
Applied to all `/api` routes. Skips auth for `/api/health` (so the keep-alive ping and health checks work without a key). If `process.env.API_KEY` is not set, auth is skipped entirely (useful for local development). Otherwise, checks the `x-api-key` request header against `process.env.API_KEY` and returns `401` if it doesn't match.

**`backend/middleware/logger.js`**

```js
export function requestLogger(req, _res, next)
```
Logs `{ISO timestamp}  {METHOD}  {path}` for every request. Applied globally (not just `/api`).

---

### 6.3 Routes

All routers are Express `Router` instances and are mounted in `server.js`.

#### `backend/routes/manga.js` — mounted at `/api/manga`

**`GET /search?q=`**
- Validates `q` query param is present and non-empty
- Calls `searchManga(q)` from `services/anilist.js`
- Returns `{ data: [...] }` or `502` on external API failure

**`GET /:id/latest-chapter`**
- Loads all tracked manga from DB
- Finds the manga with matching `id`
- If found and `isCacheFresh(manga)` → serves cached data instantly (`{ chapter, readUrl, mangaboltSlug, fromCache: true }`)
- If cache miss → calls `getLatestChapter(id)` from `services/chapters.js`
- If the call succeeds and the manga is tracked → writes result back to DB cache via `updateChapterCache()`
- Returns `{ data: { chapter, readUrl, mangaboltSlug } }`

#### `backend/routes/tracked.js` — mounted at `/api/tracked`

**`GET /`**
Returns full tracked list ordered by `createdAt DESC`.

**`POST /`**
Body: `{ id, title, coverUrl?, status?, year? }`
- Validates `id` and `title` are present
- Checks for duplicate via `isTracked(id)` → returns `409` if already tracked
- Creates record with `currentChapter: 0`, `readingStatus: "reading"`
- Returns `201` with created record

**`DELETE /:id`**
Deletes manga and cascades to `ReadActivity`. Returns `204`.

**`PATCH /:id/progress`**
Body: `{ currentChapter: number }`
- Updates `currentChapter` in the DB
- Fires `logReadActivity()` as fire-and-forget (does not block the response)
- Returns updated manga record

**`PATCH /:id/reading-status`**
Body: `{ readingStatus: "reading" | "completed" }`
- Validates value is one of the two allowed strings → `400` otherwise
- Returns updated manga record

#### `backend/routes/activity.js` — mounted at `/api/activity`

**`GET /heatmap`**
Calls `getActivityHeatmap()` which returns a plain object `{ "YYYY-MM-DD": count, ... }` for all days in the past year that had at least one chapter marked read.

**`GET /status`**
Returns `{ lastRan: "<ISO string>" | null }` — the timestamp of the last successful notifier run, read from the `SystemStatus` table with key `"notifier_last_ran"`.

#### `backend/routes/system.js` — mounted at `/api`

**`GET /health`**
Returns `{ ok: true, ts: Date.now() }`. Bypasses API key auth. Used by the keep-alive ping and by external uptime monitors.

**`GET /test-notifier`**
Manually triggers `checkForUpdates()` and waits for it to complete. Returns `{ ok: true }` on success. Used for debugging. Requires API key.

---

### 6.4 Services

The `services/` directory breaks down the external API integrations that were previously all in one `anilist.js` file.

#### `backend/services/anilist.js`

**`anilistRequest(query, variables)`**
The base GraphQL client for AniList. POSTs to `https://graphql.anilist.co` with `Content-Type: application/json`. Throws on HTTP error or on a GraphQL-level `errors` array in the response.

**`parseManga(raw)`**
Transforms a raw AniList `Media` object into the shape the frontend expects:
```js
{
  id: String(raw.id),       // AniList numeric ID coerced to string
  title,                    // English title, falling back to romaji
  description,              // HTML stripped, truncated to 200 chars
  status,                   // lowercased, underscores replaced with spaces
  coverUrl,                 // raw.coverImage.large
  year,                     // raw.startDate.year
  chapters,                 // total chapter count (null for ongoing)
  anilistUrl,               // raw.siteUrl
}
```

**`searchManga(query)`**
Executes the `SearchManga` GraphQL query (`Page(perPage: 10)`, sorted by `SEARCH_MATCH`) and maps results through `parseManga`.

#### `backend/services/mangadex.js`

**`findMangaDexId(title)`** *(internal)*
Searches the MangaDex REST API (`GET /manga?title=...&limit=5`). Prefers an exact case-insensitive English title match to avoid picking up spin-offs; falls back to the first result. Returns `null` on error.

**`getLatestChapterFromMangaDex(title)`** *(exported)*
Fetches the 20 most-recently-updated chapters from MangaDex for the found manga ID. **Critical implementation note:** MangaDex's `order[chapter]=desc` is lexicographic, not numeric — `"9"` sorts before `"23"` because `"9" > "2"` as a string. The fix is to fetch 20 results, parse all chapter numbers as floats, and take `Math.floor(Math.max(...nums))`. Returns `null` on any error.

#### `backend/services/mangabolt.js`

**In-memory slug cache** — `mangaboltSlugs` is a module-level variable. On first call, the HTML of `https://mangabolt.com/storage/manga-list.html` is fetched, parsed with a regex to extract all manga slugs, and stored in a `Map<normalizedTitle, slug>`. Subsequent calls return the cached map instantly. The cache lives for the lifetime of the Node process (no TTL — restarting the server busts it).

**`findMangaboltSlug(title)`** *(exported)*
Looks up a manga title in the slug map:
1. Normalizes the title: lowercase, strip non-alphanumeric except spaces, trim
2. Exact key match on the normalized slug map
3. Partial match: checks if the normalized title is a substring of any map key, or vice versa
4. Fallback: constructs a slug mechanically by lowercasing, replacing non-alphanumeric runs with `-`, and trimming leading/trailing hyphens

#### `backend/services/chapters.js`

**`getLatestChapter(anilistId)`** *(exported)*

The orchestrator. Strategy:
1. Fetch manga metadata from AniList (title, chapter count, completion status)
2. If AniList provides a chapter count (only set for completed/finished series) → use that
3. Otherwise → call `getLatestChapterFromMangaDex(title)` for ongoing series
4. Resolve a MangaBolt slug via `findMangaboltSlug(title)`
5. Build the read URL: `https://mangabolt.com/chapter/{slug}-chapter-{num}/` if a chapter number is known, else `https://mangabolt.com/manga/{slug}/`

Returns:
```js
{
  chapter: number | "?",   // "?" when no chapter data found anywhere
  isComplete: boolean,
  readUrl: string,
  mangaboltSlug: string,   // passed to frontend for client-side chapter URL generation
}
```

---

### 6.5 Notifications

#### `backend/notifications/push.js`

**`sendPushNotification(updates)`**
- Skips silently if `NTFY_TOPIC` env var is not set
- Constructs a title: single update → `"{title} — Ch. {n} dropped"`, multiple → `"{n} new chapters dropped"`
- Constructs a body listing all updates, one per line
- POSTs to `https://ntfy.sh/{NTFY_TOPIC}` with headers: `Title`, `Priority: high`, `Tags: manga,book`

#### `backend/notifications/email.js`

**`sendEmailNotification(updates)`**
- Skips if `RESEND_API_KEY` or `NOTIFY_EMAIL` are not set (logs a message)
- Lazily instantiates `new Resend(process.env.RESEND_API_KEY)` inside the function (not at module load time) to avoid throwing when the env var is missing at startup
- Builds an HTML email with a dark-themed table showing manga title, old chapter, new chapter (in red), and a "Read ↗" link
- Sends via `resend.emails.send()` from `"MangaLog <onboarding@resend.dev>"` to `process.env.NOTIFY_EMAIL`

#### `backend/notifications/index.js`

**`sendNotification(updates)`**
Calls both `sendPushNotification` and `sendEmailNotification` via `Promise.allSettled` so a failure in one does not prevent the other from running.

---

### 6.6 Database Layer

**`backend/db.js`**

Single file, single `PrismaClient` instance. All functions are named exports. The Prisma client is disconnected gracefully on `process.on("beforeExit")`.

`CACHE_TTL_HOURS = 6` — the threshold used by `isCacheFresh()`.

| Function | Description |
|---|---|
| `getAllTracked()` | `findMany` ordered by `createdAt DESC` |
| `addTracked({id, title, coverUrl, status, year})` | `create` with defaults: `currentChapter: 0`, `readingStatus: "reading"` |
| `removeTracked(id)` | `delete` — cascades to `ReadActivity` via schema relation |
| `isTracked(id)` | `findUnique` → returns boolean |
| `updateProgress(id, currentChapter)` | `update` — parses chapter as `parseInt` |
| `updateReadingStatus(id, readingStatus)` | `update` |
| `updateLastNotified(id, lastNotifiedChapter)` | `update` — only called by the notifier |
| `updateChapterCache(id, { latestChapter, latestChapterUrl, mangaboltSlug })` | `update` — sets `chapterCachedAt: new Date()` |
| `isCacheFresh(manga)` | Pure function — returns `true` if `chapterCachedAt` exists and age < 6 hours |
| `setSystemStatus(key, value)` | `upsert` on `SystemStatus` table |
| `getSystemStatus(key)` | `findUnique` on `SystemStatus` table |
| `logReadActivity(mangaId, chapter)` | `create` on `ReadActivity` table |
| `getActivityHeatmap()` | Fetches all `ReadActivity` in the past year, groups by `YYYY-MM-DD`, returns count map |
| `bustAllChapterCaches()` | `updateMany` setting `chapterCachedAt: null` — forces all tiles to re-fetch |

---

### 6.7 Notifier

**`backend/notifier.js`**

**`checkForUpdates()`** *(exported)*

1. Fetches all tracked manga from DB
2. Filters out completed manga (`readingStatus === "completed"`)
3. Runs `getLatestChapter()` for all remaining manga **in parallel** via `Promise.allSettled`
4. For each result, determines the "last seen" baseline as `lastNotifiedChapter ?? currentChapter ?? 0`
   - **Why `lastNotifiedChapter` and not `currentChapter`?** The user's reading progress (`currentChapter`) is managed by the user. Using it as the notification baseline would mean "we already told you about this" = "you've read it", which conflates two different things. `lastNotifiedChapter` tracks only what the notifier has already sent a notification about.
5. Always updates the chapter cache in the DB (regardless of whether a notification is sent)
6. Collects updates where `latest > lastSeen`
7. For each update, advances `lastNotifiedChapter` in the DB
8. If any updates found → calls `sendNotification(updates)`
9. Always writes the current timestamp to `SystemStatus["notifier_last_ran"]`

**`startNotifier()`** *(exported)*
- Immediately calls `checkForUpdates()` on startup (catches anything missed while the server was offline)
- Schedules recurring checks every 30 minutes via `cron.schedule("*/30 * * * *", ...)`

---

## 7. Database Schema

Provider: PostgreSQL in production, SQLite in local dev (both via Prisma).

```prisma
model Manga {
  id                  String         @id          // AniList manga ID (numeric, stored as string)
  title               String
  coverUrl            String?
  status              String?                      // AniList publication status
  year                Int?
  currentChapter      Int?           @default(0)  // User's reading progress
  lastNotifiedChapter Int?           @default(0)  // Last chapter the notifier sent a notification for
  readingStatus       String         @default("reading")  // "reading" | "completed"
  latestChapter       Int?                         // Cached latest chapter number
  latestChapterUrl    String?                      // Cached MangaBolt URL for latest chapter
  mangaboltSlug       String?                      // MangaBolt slug for generating chapter URLs
  chapterCachedAt     DateTime?                    // When the chapter cache was last written
  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt
  activity            ReadActivity[]
}

model ReadActivity {
  id      Int      @id @default(autoincrement())
  mangaId String
  manga   Manga    @relation(fields: [mangaId], references: [id], onDelete: Cascade)
  chapter Int                                      // Which chapter was marked read
  readAt  DateTime @default(now())
}

model SystemStatus {
  key       String   @id
  value     String
  updatedAt DateTime @updatedAt
}
```

**SystemStatus keys in use:**
- `"notifier_last_ran"` — ISO 8601 timestamp string of the last successful `checkForUpdates()` run

---

## 8. API Reference

Base URL (production): `https://<railway-domain>/api`
Base URL (development): `http://localhost:3001/api` (proxied via Vite as `/api`)

All endpoints except `/health` require header: `x-api-key: <API_KEY>`

All successful responses use `{ data: ... }` envelope. All errors use `{ error: "..." }`.

| Method | Path | Auth | Request body | Success | Error codes |
|---|---|---|---|---|---|
| GET | `/manga/search?q=` | ✓ | — | `{ data: Manga[] }` | 400, 502 |
| GET | `/manga/:id/latest-chapter` | ✓ | — | `{ data: ChapterInfo }` | 502 |
| GET | `/tracked` | ✓ | — | `{ data: TrackedManga[] }` | 500 |
| POST | `/tracked` | ✓ | `{ id, title, coverUrl?, status?, year? }` | `201 { data: TrackedManga }` | 400, 409, 500 |
| DELETE | `/tracked/:id` | ✓ | — | `204` | 500 |
| PATCH | `/tracked/:id/progress` | ✓ | `{ currentChapter: number }` | `{ data: TrackedManga }` | 400, 500 |
| PATCH | `/tracked/:id/reading-status` | ✓ | `{ readingStatus: "reading"\|"completed" }` | `{ data: TrackedManga }` | 400, 500 |
| GET | `/activity/heatmap` | ✓ | — | `{ data: { "YYYY-MM-DD": number } }` | 500 |
| GET | `/activity/status` | ✓ | — | `{ lastRan: string\|null }` | 500 |
| GET | `/health` | ✗ | — | `{ ok: true, ts: number }` | — |
| GET | `/test-notifier` | ✓ | — | `{ ok: true }` | 500 |

**`Manga` object shape (from search):**
```json
{
  "id": "113415",
  "title": "Chainsaw Man",
  "description": "Denji has a simple dream...",
  "status": "releasing",
  "coverUrl": "https://s4.anilist.co/file/...",
  "year": 2018,
  "chapters": null,
  "anilistUrl": "https://anilist.co/manga/113415"
}
```

**`TrackedManga` object shape (from DB):**
```json
{
  "id": "113415",
  "title": "Chainsaw Man",
  "coverUrl": "https://...",
  "status": "releasing",
  "year": 2018,
  "currentChapter": 120,
  "lastNotifiedChapter": 122,
  "readingStatus": "reading",
  "latestChapter": 122,
  "latestChapterUrl": "https://mangabolt.com/chapter/chainsaw-man-chapter-122/",
  "mangaboltSlug": "chainsaw-man",
  "chapterCachedAt": "2025-06-01T12:00:00.000Z",
  "createdAt": "2025-01-15T08:30:00.000Z",
  "updatedAt": "2025-06-01T12:00:00.000Z"
}
```

**`ChapterInfo` object shape:**
```json
{
  "chapter": 122,
  "readUrl": "https://mangabolt.com/chapter/chainsaw-man-chapter-122/",
  "mangaboltSlug": "chainsaw-man",
  "fromCache": true
}
```

---

## 9. Data Flow Walkthroughs

### 9.1 — User searches for and adds a manga

```
User types in SearchBar
  → useDebounce (500ms delay)
  → performSearch() in App.jsx
  → GET /api/manga/search?q=...
  → services/anilist.js: searchManga()
  → AniList GraphQL API
  ← array of Manga objects
  ← SearchResultCard components rendered

User clicks "+ Track"
  → handleAdd(manga) in App.jsx
  → POST /api/tracked  { id, title, coverUrl, status, year }
  ← 201 Created
  → optimistically prepend to trackedManga state
  → setRecentlyAdded(manga.id) — triggers is-new pulse animation
  → setActiveTab("reading") — switch to reading tab
  → showToast("added", "success")
  → getLatestChapter(manga.id) in background
    → GET /api/manga/:id/latest-chapter
    → services/chapters.js: getLatestChapter()
    → AniList (metadata) + MangaDex (if ongoing) + MangaBolt (slug)
    ← { chapter, readUrl, mangaboltSlug }
  → setChapterMap(...) — tile now shows chapter info
  → updateProgressApi(manga.id, ch.chapter) — set starting point
```

### 9.2 — User marks a chapter as read

```
User clicks "Mark ch. 122 read" on a MangaTile
  → markAsRead() in MangaTile
  → optimistic: setCurrentCh(latest) locally
  → optimistic: onProgressUpdate(manga.id, latest) → updates App state
  → setSaving(true) — button shows "Saving…"
  → PATCH /api/tracked/:id/progress  { currentChapter: 122 }
    → updateProgress() in db.js
    → logReadActivity() fired async (non-blocking)
       → inserts row into ReadActivity table
  ← { data: updatedManga }
  → setSaving(false)
  [on error] → rollback: setCurrentCh(prev), onProgressUpdate(manga.id, prev)
```

### 9.3 — Notifier cron run

```
Every 30 minutes (cron.schedule "*/30 * * * *"):
  checkForUpdates()
    → getAllTracked() → filter out "completed"
    → for each manga (in parallel via Promise.allSettled):
        getLatestChapter(manga.id)
          → AniList: fetch title + chapter count
          → if ongoing: MangaDex: fetch latest chapter (numeric sort fix)
          → MangaBolt: resolve slug
        updateChapterCache() → write latest chapter data to DB
        compare latest vs lastNotifiedChapter
        if latest > lastNotifiedChapter → add to updates[]
    → for each update:
        updateLastNotified(id, newChapter)
    → if updates.length > 0:
        sendNotification(updates)
          → sendPushNotification() → POST https://ntfy.sh/{NTFY_TOPIC}
          → sendEmailNotification() → Resend API
    → setSystemStatus("notifier_last_ran", new Date().toISOString())
```

### 9.4 — Page load (chapter data fetch)

```
App mounts
  → fetchTracked() → GET /api/tracked
  ← array of TrackedManga (with cached chapter data already in each record)
  → setTracked(list)
  → setCachedCount(list.length) + localStorage.setItem()
  → fetchAllLatestChapters(list)
      → for each manga: GET /api/manga/:id/latest-chapter
          → isCacheFresh(manga)?
              YES → return { chapter, readUrl, mangaboltSlug, fromCache: true }  (instant)
              NO  → call services/chapters.js, write cache, return data
  → setChapterMap(map)
  → setListLoading(false) → skeletons replaced by tiles
```

---

## 10. External Services & APIs

### AniList GraphQL API
- **URL:** `https://graphql.anilist.co`
- **Auth:** None required (public API)
- **Rate limits:** ~90 requests/minute per IP
- **Queries used:**
  - `SearchManga` — `Page(perPage: 10) { media(search, type: MANGA, sort: SEARCH_MATCH) { ... } }`
  - `GetManga` — `Media(id: Int, type: MANGA) { id, chapters, status, title { english romaji } }`
- **Limitation:** Only has accurate chapter counts for completed/finished series. For ongoing series, `chapters` is `null`.

### MangaDex REST API
- **URL:** `https://api.mangadex.org`
- **Auth:** None required (public API)
- **Endpoints used:**
  - `GET /manga?title=...&limit=5` — find manga ID by title
  - `GET /chapter?manga=...&limit=20&order[chapter]=desc` — fetch recent chapters
- **Key quirk:** Chapter ordering is lexicographic, not numeric. Fixed by fetching 20 results and using `Math.max` on parsed floats.
- **Only used for ongoing series** where AniList doesn't have a chapter count.

### MangaBolt
- **URL:** `https://mangabolt.com`
- **Auth:** None
- **Usage:** HTML scraping of `https://mangabolt.com/storage/manga-list.html` to build a slug lookup map
- **Chapter URL format:** `https://mangabolt.com/chapter/{slug}-chapter-{n}/`
- **Manga URL format:** `https://mangabolt.com/manga/{slug}/`
- **Slug cache:** Loaded once per process lifetime, stored in module-level variable

### Resend
- **URL:** `https://api.resend.com` (via `resend` npm package)
- **Auth:** `RESEND_API_KEY` env var
- **From address:** `"MangaLog <onboarding@resend.dev>"` — uses Resend's shared onboarding domain, no custom domain setup needed
- **Optional:** If `RESEND_API_KEY` or `NOTIFY_EMAIL` are not set, email sending is silently skipped

### ntfy.sh
- **URL:** `https://ntfy.sh/{NTFY_TOPIC}`
- **Auth:** None (topic is effectively a shared secret)
- **Optional:** If `NTFY_TOPIC` is not set, push notifications are silently skipped

---

## 11. Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes (prod) | — | PostgreSQL connection string from Railway. For local dev with SQLite, Prisma uses `prisma/manga.db` and this can be omitted if the schema is set to `sqlite`. |
| `API_KEY` | No | — | Shared secret for the `x-api-key` header. If not set, auth is entirely disabled (fine for local dev). |
| `FRONTEND_URL` | No | `http://localhost:5173` | Allowed CORS origin. Must exactly match the Vercel deployment URL in production (no trailing slash). |
| `PORT` | No | `3001` | Port the Express server listens on. |
| `NODE_ENV` | No | — | Set to `"production"` on Railway to enable the keep-alive ping. |
| `RENDER_EXTERNAL_URL` | No | — | If set alongside `NODE_ENV=production`, activates the keep-alive self-ping. Originally intended for Render, now used on Railway too. |
| `RESEND_API_KEY` | No | — | API key for the Resend email service. Email notifications are skipped if absent. |
| `NOTIFY_EMAIL` | No | — | Recipient email address for chapter notifications. |
| `NTFY_TOPIC` | No | — | ntfy.sh topic name for push notifications. Push notifications are skipped if absent. |

### Frontend (`frontend/.env` or Vercel environment variables)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | No (prod only) | `"/api"` | Base URL for all API calls. Set to `https://<railway-domain>/api` on Vercel. In local dev, the Vite proxy handles `/api` → `localhost:3001` so this is not needed. |
| `VITE_API_KEY` | No | `""` | The API key sent as `x-api-key` in every request. Must match `API_KEY` on the backend. If backend has no `API_KEY` set, this can be empty. |

---

## 12. Local Development Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd manga-tracker

# 2. Set up the backend
cd backend
npm install
# Prisma postinstall hook runs "prisma generate" automatically

# For local dev, change schema.prisma datasource to sqlite:
# provider = "sqlite"
# url      = "file:./manga.db"
# (or set DATABASE_URL=file:./prisma/manga.db in a .env file)

npm run db:push        # creates/syncs the SQLite DB from the schema
npm run dev            # starts server on :3001 with --watch (auto-restart)

# Test: http://localhost:3001/api/health  → { ok: true, ts: ... }
# Test: http://localhost:3001/api/tracked → { data: [] }

# 3. Set up the frontend (new terminal)
cd ../frontend
npm install
npm run dev            # starts on :5173, proxies /api/* → :3001
```

The Vite dev proxy (`vite.config.js`) means the frontend can call `/api/tracked` in dev and it automatically hits `http://localhost:3001/api/tracked` — no `VITE_API_URL` environment variable needed locally.

**Optional:** Create `backend/.env` with `API_KEY=mysecret` and `frontend/.env.local` with `VITE_API_KEY=mysecret` to test auth locally.

**Prisma commands:**
```bash
npm run db:push       # Fast sync — no migration files (good for local dev)
npm run db:migrate    # Creates a migration file (use when you want history)
npm run db:studio     # Opens visual DB browser at localhost:5555
```

---

## 13. Production Deployment

The project deploys to:
- **Frontend → Vercel** (static site from `frontend/`)
- **Backend → Railway** (Node.js service from `backend/`)
- **Database → Railway** (PostgreSQL add-on)

### Step 1 — Database on Railway
1. Railway → New Project → Provision PostgreSQL
2. Copy `DATABASE_URL` from the Variables tab

### Step 2 — Backend on Railway
1. New Project → Deploy from GitHub → set Root Directory to `backend`
2. Set environment variables:
   ```
   DATABASE_URL=postgresql://...
   NODE_ENV=production
   FRONTEND_URL=https://<your-vercel-url>
   API_KEY=<your-secret-key>
   RESEND_API_KEY=<optional>
   NOTIFY_EMAIL=<optional>
   NTFY_TOPIC=<optional>
   RENDER_EXTERNAL_URL=https://<your-railway-domain>
   ```
3. Generate a public domain in Settings → Networking
4. Run migration once: `npx prisma migrate deploy` (via Railway shell)

### Step 3 — Frontend on Vercel
1. Vercel → New Project → import repo → Root Directory: `frontend`
2. Set environment variables:
   ```
   VITE_API_URL=https://<railway-domain>/api
   VITE_API_KEY=<same-secret-key-as-backend>
   ```
3. Deploy → get Vercel URL → paste back into Railway's `FRONTEND_URL`

### Notes
- The `postinstall` script in `backend/package.json` runs `prisma generate` automatically after `npm install`, so Railway's build step works without any extra config.
- The `prisma.db` SQLite file in `backend/prisma/` is for local dev only and should not be committed to version control (it is gitignored via `backend/.gitignore`).

---

## 14. Key Business Logic & Algorithms

### Chapter progress vs. notification baseline

Two separate fields track "chapter state" on each manga row:

| Field | Who writes it | What it means |
|---|---|---|
| `currentChapter` | User (via PATCH /progress) | The chapter the user is currently on |
| `lastNotifiedChapter` | Notifier only | The latest chapter a notification was already sent for |

This split is deliberate. Without it, a user who is behind on chapters would get notified only once (when the notifier advances `currentChapter`), but the unread badge on the tile (which is `latestChapter - currentChapter`) would disappear. By keeping them separate, the badge stays correct and the notifier won't re-notify for the same chapter.

### Chapter cache strategy

Every `Manga` row in the DB has `latestChapter`, `latestChapterUrl`, `mangaboltSlug`, and `chapterCachedAt` fields. On any request to `/api/manga/:id/latest-chapter`:

- If `chapterCachedAt` is set and less than 6 hours old → serve from DB, no external API call (instant)
- Otherwise → call all three external APIs, write result to DB, return it

The notifier also writes to this cache every time it runs, so by the time users load the page, the cache is usually already warm.

The `cachedCount` in `localStorage` on the frontend records how many tiles to show as skeletons during the initial page load, so the layout doesn't jump when data arrives.

### MangaDex numeric sort fix

MangaDex's `order[chapter]=desc` endpoint sorts chapter numbers as strings. This means chapter `"9"` appears before `"23"` because `"9" > "2"` lexicographically. The fix (in `services/mangadex.js`) is to fetch the top 20 "latest" chapters by MangaDex's broken ordering, parse all chapter values as `parseFloat`, and then take `Math.floor(Math.max(...nums))` to get the true numeric maximum.

### Optimistic updates on the frontend

Both `markAsRead()` and `toggleStatus()` in `MangaTile`, and `handleRemove()` and `handleAdd()` in `App.jsx`, follow the optimistic update pattern:
1. Update local React state immediately for instant UI response
2. Make the API call
3. If the API call fails → roll back the local state change

This means the UI feels instantaneous even over slow connections, at the cost of a brief incorrect state if the server returns an error.

### MangaBolt slug resolution

The slug resolution in `services/mangabolt.js` tries three strategies in order:
1. **Exact match** on the normalized slug map (title lowercased, non-alphanumeric stripped)
2. **Partial match** — iterates all keys looking for substring containment in either direction
3. **Mechanical fallback** — constructs a slug by replacing non-alphanumeric character runs with hyphens

This is necessary because manga titles on MangaBolt sometimes have slightly different punctuation or spacing than on AniList or MangaDex.

---

## 15. Design System

The visual design follows a **dark glassmorphism** aesthetic with a red accent. Everything is implemented in plain CSS — no Tailwind, no CSS modules, no styled-components.

### Layout

The page is a vertical flex column: `Header → Ticker → Toolbar → Main`. The header is `position: sticky; top: 0; z-index: 100` so it stays visible while scrolling.

The manga grid uses CSS Grid with `auto-fill` and a `minmax` column width, so the number of columns is fully responsive without any media queries.

### Glass cards

Cards use semi-transparent backgrounds (`--glass`, `--glass-2`) with `backdrop-filter: blur(...)` to create the frosted-glass effect. Borders use `rgba(255,255,255,0.09)` to be visible but subtle.

### Tile flip animation

`MangaTile` uses a CSS 3D card-flip pattern:
- `.tile-flip-wrap` has `perspective: 1000px`
- `.tile-flip-inner` has `transform-style: preserve-3d; transition: transform 0.45s`
- When `.is-flipped` class is added, `.tile-flip-inner` gets `transform: rotateY(180deg)`
- `.tile-front` has no extra transform; `.tile-back` has `transform: rotateY(180deg)` and `backface-visibility: hidden`

### Skeleton shimmer

`.skeleton` class uses an animated `linear-gradient` moving across the element:
```css
background: linear-gradient(90deg, var(--glass) 25%, var(--glass-3) 50%, var(--glass) 75%);
background-size: 200% 100%;
animation: shimmer 1.4s infinite;
```

### Status badges

The tile cover has three possible overlay badge styles applied via dynamic class names:
- `.status-new` — red, shown when `latest > currentChapter`
- `.status-uptodate` — green, shown when the user is current
- `.status-completed` — muted grey, shown for completed manga

### Heatmap levels

Five CSS classes drive the heatmap cell colours:
- `level-0` — near-invisible (no activity)
- `level-1` through `level-4` — progressively more opaque red/accent tones
- `level-future` — a subtle dashed style to indicate dates that haven't happened yet

---

## 16. Known Quirks & Implementation Notes

### 1. Schema still says `sqlite` locally but `postgresql` in production
The committed `schema.prisma` has `provider = "postgresql"`. For local development with SQLite, you need to either temporarily change the provider to `sqlite` and set `url = "file:./manga.db"`, or set `DATABASE_URL` to a local Postgres instance. The `prisma/manga.db` file exists in the repo as a convenience for local dev but will be ignored by production Prisma.

### 2. Root `package.json` is a legacy artefact
The `manga-tracker/package.json` at the repo root has `node-cron` and `nodemailer` as dependencies from an earlier version of the project before Resend replaced nodemailer. It plays no role in the current app — the frontend and backend each have their own `package.json` and `node_modules`. It can be safely deleted.

### 3. `RENDER_EXTERNAL_URL` is used on Railway
The keep-alive ping checks for `process.env.RENDER_EXTERNAL_URL` (named after Render.com, the original hosting target) but the project is now deployed on Railway. The variable just needs to be set to the Railway public URL — the name doesn't matter functionally, only its presence is checked.

### 4. `apiFetch` always sends `Content-Type: application/json`
The base `apiFetch` wrapper in `frontend/src/api.js` always adds `Content-Type: application/json` to every request, including GETs and DELETEs that have no body. This is harmless but technically unnecessary for those methods.

### 5. `getAllTracked()` is called on every `/api/manga/:id/latest-chapter` request
The cache-check logic in `routes/manga.js` loads the entire tracked list from the DB on every request just to find the one manga being requested. This is fine for small lists (a personal tracker rarely has more than a few hundred entries) but would not scale. A targeted `prisma.manga.findUnique({ where: { id } })` would be more efficient.

### 6. The notifier runs immediately on startup
`startNotifier()` calls `checkForUpdates()` right away before scheduling the cron. This means every server restart triggers an immediate full chapter check and potentially sends notifications. This is intentional (to catch anything missed while offline) but can be surprising during development restarts.

### 7. `bustAllChapterCaches()` is exported but never called via the API
`db.js` exports `bustAllChapterCaches()` which sets `chapterCachedAt = null` on all manga, forcing a full re-fetch on the next load. There is no API endpoint that calls it — it must be triggered manually (e.g. via `npm run db:studio` or a one-off script). It was kept as a developer utility.

### 8. The `test` file at the repo root
`manga-tracker/test` is a plain file (no extension) containing ad-hoc test commands or notes. It is not a test suite and is not run by any script.

### 9. MangaBolt slug cache has no TTL
The MangaBolt slug map is cached for the lifetime of the Node process. If MangaBolt adds new manga or changes slugs, the server must be restarted to pick up the changes. In practice this is fine since the server restarts at least daily on Railway's free tier, and the fallback slug-construction logic covers most new titles anyway.

### 10. `parseManga` strips HTML but not all entities
The `description` field from AniList contains HTML tags which are stripped via `.replace(/<[^>]*>/g, "")`. However, HTML entities like `&amp;`, `&lt;`, etc. are not decoded. Descriptions are not currently displayed in the UI so this has no visible impact.

### 11. `readingStatus` is a plain string, not an enum
The schema uses `String` for `readingStatus` (defaulting to `"reading"`). The two valid values `"reading"` and `"completed"` are enforced only by the PATCH route handler, not at the database level. Adding a third status (e.g. `"on-hold"`, `"dropped"`) would require updating the route validation and the frontend filter logic.

### 12. Duplicate `/api/health` route (fixed)
The original `server.js` registered `app.get("/api/health", ...)` twice. Express silently uses the first matching handler and ignores the second. This was removed during the refactor.

### 13. `currentChapter` defaults to `0`, not `null`
When a manga is first added, `currentChapter` is `0`. The frontend uses `currentCh === 0` as a sentinel to show `isNew` state (unread badge but no "on ch. N" label). This means a manga where the user is genuinely on chapter 0 and one that was just added are indistinguishable — but chapter 0 is not a real chapter for any manga, so this is fine in practice.