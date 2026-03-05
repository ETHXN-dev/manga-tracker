import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "/api";
const API_KEY = import.meta.env.VITE_API_KEY || "";

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      ...options.headers,
    },
  });
  return res;
}

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// ─── API ──────────────────────────────────────────────────────────────────────
async function searchManga(query) {
  const res = await apiFetch(`/manga/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "Search failed");
  }
  return (await res.json()).data;
}
async function fetchTracked() {
  const res = await apiFetch(`/tracked`);
  if (!res.ok) throw new Error("Could not load your list");
  return (await res.json()).data;
}
async function addTrackedApi(manga) {
  const res = await apiFetch(`/tracked`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(manga),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "Could not save");
  }
}
async function removeTrackedApi(id) {
  const res = await apiFetch(`/tracked/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Could not remove manga");
}
async function getLatestChapter(mangaId) {
  const res = await apiFetch(`/manga/${mangaId}/latest-chapter`);
  if (!res.ok) return null;
  return (await res.json()).data;
}
async function updateProgressApi(id, currentChapter) {
  const res = await apiFetch(`/tracked/${id}/progress`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentChapter }),
  });
  if (!res.ok) throw new Error("Could not update progress");
}
async function updateReadingStatusApi(id, readingStatus) {
  const res = await apiFetch(`/tracked/${id}/reading-status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ readingStatus }),
  });
  if (!res.ok) throw new Error("Could not update status");
}

async function fetchAllLatestChapters(mangaList) {
  const results = await Promise.allSettled(
    mangaList.map((m) => getLatestChapter(m.id)),
  );
  const map = {};
  results.forEach((result, i) => {
    map[mangaList[i].id] = result.status === "fulfilled" ? result.value : null;
  });
  return map;
}

// ─── Kanji Background ─────────────────────────────────────────────────────────
const KANJI = [
  "漫",
  "画",
  "章",
  "新",
  "読",
  "本",
  "物",
  "語",
  "力",
  "夢",
  "剣",
  "闘",
  "血",
  "炎",
  "龍",
];

function KanjiBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 35 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      char: KANJI[Math.floor(Math.random() * KANJI.length)],
      size: Math.random() * 24 + 16,
      speed: Math.random() * 0.4 + 0.15,
      opacity: Math.random() * 0.25 + 0.15,
      drift: (Math.random() - 0.5) * 0.3,
      wobble: Math.random() * Math.PI * 2,
    }));

    particles.forEach((p) => {
      p.font = `${p.size}px serif`;
    });

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#e8302a";
      let lastFont = "";
      particles.forEach((p) => {
        p.wobble += 0.008;
        p.x += Math.sin(p.wobble) * p.drift;
        p.y -= p.speed;
        if (p.y < -40) {
          p.y = canvas.height + 20;
          p.x = Math.random() * canvas.width;
          p.char = KANJI[Math.floor(Math.random() * KANJI.length)];
        }
        ctx.globalAlpha = p.opacity;
        if (p.font !== lastFont) {
          ctx.font = p.font;
          lastFont = p.font;
        }
        ctx.fillText(p.char, p.x, p.y);
      });
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}
    />
  );
}

// ─── Chapter Dropdown ─────────────────────────────────────────────────────────
function ChapterDropdown({ latestChapter, readUrl, mangaboltSlug }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const latest = parseInt(latestChapter);
  const chapters = isNaN(latest)
    ? []
    : Array.from({ length: latest }, (_, i) => latest - i);
  const chUrl = (num) =>
    `https://mangabolt.com/chapter/${mangaboltSlug}-chapter-${num}/`;

  const target = parseInt(latestChapter);
  const [display, setDisplay] = useState(isNaN(target) ? 0 : target);

  useEffect(() => {
    if (isNaN(target)) return;
    let current = 0;
    const steps = Math.min(target, 40);
    const interval = 600 / steps;
    const timer = setInterval(() => {
      current += Math.ceil(target / steps);
      if (current >= target) {
        setDisplay(target);
        clearInterval(timer);
      } else {
        setDisplay(current);
      }
    }, interval);
    return () => clearInterval(timer);
  }, [target]);

  return (
    <div className="chapter-dropdown-wrap" ref={ref}>
      <span className="chapter-num">
        {latestChapter === "?" ? "Ch. ?" : `Ch. ${display}`}
      </span>
      <div className="chapter-row">
        <a
          className="chapter-link"
          href={readUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Read now ↗
        </a>
        {chapters.length > 0 && (
          <button
            className={`chapter-toggle ${open ? "open" : ""}`}
            onClick={() => setOpen((o) => !o)}
          >
            ▾
          </button>
        )}
      </div>
      {open && (
        <div className="chapter-list">
          {chapters.map((num) => (
            <a
              key={num}
              className="chapter-list-item"
              href={chUrl(num)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
            >
              <span>Ch. {num}</span>
              {num === latest && (
                <span className="chapter-list-badge">Latest</span>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Search Bar (Search tab) ───────────────────────────────────────────────────
function SearchBar({ value, onChange, isSearching }) {
  return (
    <div className="search-bar">
      <div className="search-input-wrap">
        <svg
          className="search-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search for a manga..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="search-input"
          autoFocus
        />
        {isSearching && <div className="search-spinner" />}
      </div>
    </div>
  );
}

// ─── Search Result Card ───────────────────────────────────────────────────────
const SearchResultCard = memo(function SearchResultCard({
  manga,
  onAdd,
  isTracked,
}) {
  return (
    <div className={`result-card ${isTracked ? "is-tracked" : ""}`}>
      <div className="result-cover">
        {manga.coverUrl ? (
          <img
            src={manga.coverUrl}
            alt={manga.title}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="cover-placeholder">?</div>
        )}
      </div>
      <div className="result-info">
        <h3 className="result-title">{manga.title}</h3>
        <div className="result-meta">
          <span
            className={`status-badge status-${manga.status?.replace(" ", "-")}`}
          >
            {manga.status}
          </span>
          {manga.year && <span className="result-year">{manga.year}</span>}
          {manga.chapters && (
            <span className="result-year">{manga.chapters} ch</span>
          )}
        </div>
      </div>
      <button
        className={`track-btn ${isTracked ? "tracked" : ""}`}
        onClick={() => onAdd(manga)}
        disabled={isTracked}
      >
        {isTracked ? "✓" : "+ Track"}
      </button>
    </div>
  );
});

// ─── Tile Skeleton ────────────────────────────────────────────────────────────
function TileSkeleton() {
  return (
    <div className="tile-skeleton">
      <div className="tile-skeleton-cover">
        <div className="skeleton" />
      </div>
      <div className="tile-skeleton-info">
        <div className="skeleton tile-skeleton-title" />
        <div className="skeleton tile-skeleton-title-short" />
        <div className="skeleton tile-skeleton-chapter" />
        <div className="skeleton tile-skeleton-link" />
      </div>
    </div>
  );
}

// ─── Manga Tile ───────────────────────────────────────────────────────────────
const MangaTile = memo(function MangaTile({
  manga,
  chapter,
  onRemove,
  onProgressUpdate,
  onStatusChange,
}) {
  const [confirming, setConfirming] = useState(false);
  const [currentCh, setCurrentCh] = useState(manga.currentChapter || 0);
  const [savingProgress, setSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const isCompleted = manga.readingStatus === "completed";

  const latest = chapter ? parseInt(chapter.chapter) : 0;
  const hasUnread =
    !isCompleted && !isNaN(latest) && latest > currentCh && currentCh > 0;
  const isNew = !isCompleted && currentCh === 0 && latest > 0;

  // Badge label for cover
  let statusBadgeClass = "";
  let statusBadgeLabel = "";
  if (isCompleted) {
    statusBadgeClass = "status-completed";
    statusBadgeLabel = "Completed";
  } else if (hasUnread || isNew) {
    statusBadgeClass = "status-new";
    statusBadgeLabel = "New Ch.";
  } else if (chapter && !isNaN(latest)) {
    statusBadgeClass = "status-uptodate";
    statusBadgeLabel = "Up to date";
  }

  const markAsRead = async () => {
    if (!chapter || savingProgress) return;
    setSaving(true);
    try {
      await updateProgressApi(manga.id, latest);
      setCurrentCh(latest);
      onProgressUpdate(manga.id, latest);
    } catch {
      /* silent */
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    if (savingStatus) return;
    setSavingStatus(true);
    const newStatus = isCompleted ? "reading" : "completed";
    try {
      await updateReadingStatusApi(manga.id, newStatus);
      onStatusChange(manga.id, newStatus);
    } catch {
      /* silent */
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <div
      className={`tile-flip-wrap ${confirming ? "is-flipped" : ""} ${hasUnread || isNew ? "has-unread" : ""} ${isCompleted ? "is-completed" : ""}`}
      onMouseLeave={() => setConfirming(false)}
    >
      <div className="tile-flip-inner">
        {/* ── FRONT ── */}
        <div className="manga-tile tile-front">
          {/* Cover */}
          <div className="tile-cover">
            {manga.coverUrl ? (
              <img
                src={manga.coverUrl}
                alt={manga.title}
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="tile-cover-placeholder">📖</div>
            )}

            {/* Gradient overlay + chapter + status are rendered via CSS ::after + these elements */}
            {statusBadgeLabel && (
              <div className={`tile-status-badge ${statusBadgeClass}`}>
                {statusBadgeLabel}
              </div>
            )}

            {chapter && (
              <div className="tile-chapter-overlay">
                <span>Chapter</span>
                {chapter.chapter}
              </div>
            )}

            {hasUnread && (
              <div className="tile-unread-badge">+{latest - currentCh}</div>
            )}

            {/* Delete button — shown on hover */}
            <button
              className="tile-delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                setConfirming(true);
              }}
              title="Remove"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6M9 6V4h6v2" />
              </svg>
            </button>
          </div>

          {/* Card body */}
          <div className="tile-info">
            <p className="tile-title">{manga.title}</p>

            {!chapter && <span className="tile-chapter-loading">Loading…</span>}

            {chapter && (
              <>
                {/* Read Now + Chapter toggle buttons */}
                <div className="card-actions">
                  <a
                    className="btn-read"
                    href={chapter.readUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    Read Now
                  </a>

                  <ChapterDropdownToggle
                    latestChapter={chapter.chapter}
                    readUrl={chapter.readUrl}
                    mangaboltSlug={chapter.mangaboltSlug}
                  />
                </div>

                {!isCompleted && (hasUnread || isNew) && (
                  <div className="progress-row">
                    {currentCh > 0 && (
                      <span className="progress-label">On ch. {currentCh}</span>
                    )}
                    <button
                      className="mark-read-btn"
                      onClick={markAsRead}
                      disabled={savingProgress}
                    >
                      {savingProgress ? "Saving…" : `Mark ch. ${latest} read`}
                    </button>
                  </div>
                )}

                {(isCompleted || manga.status === "finished") && (
                  <button
                    className="status-toggle-btn"
                    onClick={toggleStatus}
                    disabled={savingStatus}
                  >
                    {savingStatus
                      ? "…"
                      : isCompleted
                        ? "↩ Move to Reading"
                        : "✓ Mark Completed"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── BACK ── */}
        <div className="tile-back">
          {manga.coverUrl && (
            <div className="tile-back-blur">
              <img src={manga.coverUrl} alt="" aria-hidden="true" />
            </div>
          )}
          <div className="tile-back-content">
            <p className="tile-back-title">{manga.title}</p>
            <p className="tile-back-question">Remove from list?</p>
            <div className="tile-back-actions">
              <button
                className="tile-confirm-yes"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(manga.id);
                }}
              >
                Remove
              </button>
              <button
                className="tile-confirm-no"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirming(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// Small chapter list dropdown — ▾ button opens a scrollable chapter picker
const ChapterDropdownToggle = memo(function ChapterDropdownToggle({
  latestChapter,
  mangaboltSlug,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const latest = parseInt(latestChapter);
  if (isNaN(latest) || latest < 1) return null;

  // Show last 50 chapters max
  const chapters = Array.from(
    { length: Math.min(latest, 50) },
    (_, i) => latest - i,
  );
  const chUrl = (num) =>
    `https://mangabolt.com/chapter/${mangaboltSlug}-chapter-${num}/`;

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        className={`btn-chapter-toggle ${open ? "open" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        title="Browse chapters"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="chapter-picker">
          <div className="chapter-picker-header">
            <span>All Chapters</span>
            <span className="chapter-picker-count">{latest} total</span>
          </div>
          <div className="chapter-picker-list">
            {chapters.map((num) => (
              <a
                key={num}
                className={`chapter-picker-item ${num === latest ? "is-latest" : ""}`}
                href={chUrl(num)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
              >
                <span>Ch. {num}</span>
                {num === latest && (
                  <span className="chapter-picker-badge">Latest</span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

// ─── Now Reading Ticker ───────────────────────────────────────────────────────
function NowReadingTicker({ manga }) {
  if (!manga || manga.length === 0) return null;
  const titles = manga
    .filter((m) => m.readingStatus !== "completed")
    .map((m) => m.title.toUpperCase());
  if (titles.length === 0) return null;
  const repeated = [...titles, ...titles, ...titles];
  const text = repeated.join("  ·  ");

  return (
    <div className="ticker-wrap">
      <div className="ticker-label">NOW READING</div>
      <div className="ticker-track">
        <span className="ticker-content">
          {text}&nbsp;&nbsp;&nbsp;{text}
        </span>
      </div>
    </div>
  );
}

// ─── Notifier Status ──────────────────────────────────────────────────────────
function NotifierStatus() {
  const [lastRan, setLastRan] = useState(null);

  useEffect(() => {
    apiFetch(`/activity/status`)
      .then((r) => r.json())
      .then((r) => setLastRan(r.lastRan))
      .catch(() => {});
  }, []);

  const getTimeAgo = (iso) => {
    if (!iso) return "Never";
    const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  const isHealthy =
    lastRan && Date.now() - new Date(lastRan) < 2 * 60 * 60 * 1000;

  return (
    <div className="notifier-status">
      <span className={`notifier-dot ${isHealthy ? "healthy" : "stale"}`} />
      <span className="notifier-label">
        Notifier last ran: <strong>{getTimeAgo(lastRan)}</strong>
      </span>
    </div>
  );
}

// ─── Activity Heatmap ─────────────────────────────────────────────────────────
function ActivityHeatmap() {
  const [data, setData] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    apiFetch(`/activity/heatmap`)
      .then((r) => r.json())
      .then((r) => setData(r.data || {}))
      .catch((e) => {
        console.error("[heatmap]", e);
        setData({});
      });
  }, []);

  const today = new Date();
  const dayMs = 86400000;
  const start = new Date(today);
  start.setDate(start.getDate() - 364);
  start.setDate(start.getDate() - start.getDay());

  const weeks = [];
  for (let w = 0; w < 53; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start.getTime() + (w * 7 + d) * dayMs);
      const dateStr = date.toISOString().slice(0, 10);
      const count = data ? data[dateStr] || 0 : 0;
      week.push({ dateStr, count, future: date > today });
    }
    weeks.push(week);
  }

  const max = data ? Math.max(...Object.values(data), 1) : 1;
  const total = data ? Object.values(data).reduce((a, b) => a + b, 0) : 0;
  const getLevel = (count) => {
    if (!count) return 0;
    if (count <= max * 0.25) return 1;
    if (count <= max * 0.5) return 2;
    if (count <= max * 0.75) return 3;
    return 4;
  };

  const months = [];
  weeks.forEach((week, wi) => {
    const d = new Date(week[0].dateStr);
    if (d.getDate() <= 7) {
      months.push({
        label: d.toLocaleString("default", { month: "short" }),
        col: wi,
      });
    }
  });

  return (
    <div className="heatmap-wrap">
      <div className="heatmap-header">
        <span className="heatmap-title">Reading Activity</span>
        <span className="heatmap-total">
          {data === null
            ? "Loading…"
            : `${total} chapter${total !== 1 ? "s" : ""} marked read in the past year`}
        </span>
      </div>
      <div className="heatmap-scroll">
        <div className="heatmap-grid-wrap">
          <div className="heatmap-months">
            {months.map((m, i) => (
              <span
                key={i}
                className="heatmap-month"
                style={{ gridColumn: m.col + 1 }}
              >
                {m.label}
              </span>
            ))}
          </div>
          <div className="heatmap-grid">
            {weeks.map((week, wi) => (
              <div key={wi} className="heatmap-week">
                {week.map(({ dateStr, count, future }) => (
                  <div
                    key={dateStr}
                    className={`heatmap-cell level-${future ? "future" : getLevel(count)}`}
                    onMouseEnter={(e) => {
                      if (future) return;
                      const rect = e.target.getBoundingClientRect();
                      setTooltip({
                        x: rect.left + rect.width / 2,
                        y: rect.top - 8,
                        text:
                          count === 0
                            ? `No activity · ${dateStr}`
                            : `${count} chapter${count > 1 ? "s" : ""} · ${dateStr}`,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="heatmap-legend">
            <span className="heatmap-legend-label">Less</span>
            {[0, 1, 2, 3, 4].map((l) => (
              <div key={l} className={`heatmap-cell level-${l}`} />
            ))}
            <span className="heatmap-legend-label">More</span>
          </div>
        </div>
      </div>
      {tooltip && (
        <div
          className="heatmap-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

// ─── List Filter Bar ──────────────────────────────────────────────────────────
function ListFilterBar({ query, onChange }) {
  return (
    <div className="list-filter-bar">
      <div className="list-filter-wrap">
        <svg
          className="list-filter-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          className="list-filter-input"
          placeholder="Filter your list..."
          value={query}
          onChange={(e) => onChange(e.target.value)}
        />
        {query && (
          <button className="list-filter-clear" onClick={() => onChange("")}>
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ message, onSwitchToSearch }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">📚</div>
      <p>{message || "Nothing here yet."}</p>
      {onSwitchToSearch && (
        <p className="empty-sub">
          <button className="empty-cta" onClick={onSwitchToSearch}>
            Add a manga
          </button>{" "}
          to start tracking.
        </p>
      )}
    </div>
  );
}

// ─── Sort Bar (stable component, defined outside App) ─────────────────────────
const SortBar = memo(function SortBar({
  listQuery,
  onQueryChange,
  sortBy,
  onSortChange,
}) {
  return (
    <div className="list-toolbar">
      <ListFilterBar query={listQuery} onChange={onQueryChange} />
      <select
        className="sort-select"
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value)}
      >
        <option value="added">New Chapters First</option>
        <option value="alpha">A → Z</option>
        <option value="behind">Most Behind</option>
        <option value="latest">Most Chapters</option>
      </select>
    </div>
  );
});

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [query, setQuery] = useState("");
  const [searchResults, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [activeTab, setActiveTab] = useState("reading");
  const [trackedManga, setTracked] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(null);
  const [chapterMap, setChapterMap] = useState({});
  const [cachedCount, setCachedCount] = useState(() =>
    parseInt(localStorage.getItem("mangalog_count") || "6"),
  );
  const [listQuery, setListQuery] = useState("");
  const [sortBy, setSortBy] = useState("added");

  const debouncedQuery = useDebounce(query, 500);

  useEffect(() => {
    fetchTracked()
      .then(async (list) => {
        setTracked(list);
        setCachedCount(list.length);
        localStorage.setItem("mangalog_count", String(list.length));
        const map = await fetchAllLatestChapters(list);
        setChapterMap(map);
      })
      .catch((e) => setListError(e.message))
      .finally(() => setListLoading(false));
  }, []);

  const performSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    try {
      setResults(await searchManga(q));
    } catch (e) {
      setSearchError(e.message);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    performSearch(debouncedQuery);
  }, [debouncedQuery, performSearch]);

  const handleAdd = useCallback(async (manga) => {
    try {
      await addTrackedApi(manga);
      setTracked((p) => [{ ...manga, readingStatus: "reading" }, ...p]);
      setActiveTab("reading");
      getLatestChapter(manga.id).then(async (ch) => {
        if (ch) {
          setChapterMap((prev) => ({ ...prev, [manga.id]: ch }));
          await updateProgressApi(manga.id, ch.chapter);
        }
      });
    } catch (e) {
      alert(e.message);
    }
  }, []);

  const handleRemove = useCallback(async (id) => {
    try {
      await removeTrackedApi(id);
      setTracked((p) => p.filter((m) => m.id !== id));
    } catch (e) {
      alert(e.message);
    }
  }, []);

  const handleProgressUpdate = useCallback((id, currentChapter) => {
    setTracked((p) =>
      p.map((m) => (m.id === id ? { ...m, currentChapter } : m)),
    );
  }, []);

  const handleStatusChange = useCallback((id, readingStatus) => {
    setTracked((p) =>
      p.map((m) => (m.id === id ? { ...m, readingStatus } : m)),
    );
  }, []);

  // Memoize expensive derived state
  const trackedIds = useMemo(
    () => new Set(trackedManga.map((m) => m.id)),
    [trackedManga],
  );

  const { reading, completed } = useMemo(() => {
    const applySort = (list) => {
      let result = !listQuery.trim()
        ? list
        : list.filter((m) =>
            m.title.toLowerCase().includes(listQuery.toLowerCase().trim()),
          );

      switch (sortBy) {
        case "alpha":
          return [...result].sort((a, b) => a.title.localeCompare(b.title));
        case "behind":
          return [...result].sort((a, b) => {
            const aGap =
              (chapterMap[a.id]?.chapter || 0) - (a.currentChapter || 0);
            const bGap =
              (chapterMap[b.id]?.chapter || 0) - (b.currentChapter || 0);
            return bGap - aGap;
          });
        case "latest":
          return [...result].sort(
            (a, b) =>
              (chapterMap[b.id]?.chapter || 0) -
              (chapterMap[a.id]?.chapter || 0),
          );
        default:
          return [...result].sort((a, b) => {
            const aUnread =
              (chapterMap[a.id]?.chapter || 0) > (a.currentChapter || 0)
                ? 1
                : 0;
            const bUnread =
              (chapterMap[b.id]?.chapter || 0) > (b.currentChapter || 0)
                ? 1
                : 0;
            if (bUnread !== aUnread) return bUnread - aUnread;
            return a.title.localeCompare(b.title);
          });
      }
    };

    return {
      reading: applySort(
        trackedManga.filter((m) => m.readingStatus !== "completed"),
      ),
      completed: applySort(
        trackedManga.filter((m) => m.readingStatus === "completed"),
      ),
    };
  }, [trackedManga, chapterMap, listQuery, sortBy]);

  const renderGrid = (list, emptyMessage, showAddButton) => {
    if (listLoading) {
      return (
        <>
          <SortBar
            listQuery={listQuery}
            onQueryChange={setListQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
          <div className="tracked-grid">
            {Array.from({ length: cachedCount }).map((_, i) => (
              <TileSkeleton key={i} />
            ))}
          </div>
        </>
      );
    }

    const noResults = list.length === 0 && listQuery.trim();

    return (
      <>
        <SortBar
          listQuery={listQuery}
          onQueryChange={setListQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
        {noResults ? (
          <p className="no-results">No manga matching "{listQuery}"</p>
        ) : list.length === 0 ? (
          <EmptyState
            message={emptyMessage}
            onSwitchToSearch={
              showAddButton ? () => setActiveTab("search") : null
            }
          />
        ) : (
          <div className="tracked-grid">
            {list.map((m) => (
              <MangaTile
                key={m.id}
                manga={m}
                chapter={chapterMap[m.id] || null}
                onRemove={handleRemove}
                onProgressUpdate={handleProgressUpdate}
                onStatusChange={handleStatusChange}
              />
            ))}
            {showAddButton && (
              <div className="card-add" onClick={() => setActiveTab("search")}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Add Manga</span>
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="app" style={{ position: "relative", zIndex: 1 }}>
      <KanjiBackground />

      {/* ── HEADER ── */}
      <header className="header">
        {/* Logo */}
        <div className="logo">
          <div className="logo-mark">
            {/* Book SVG icon */}
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 6a2 2 0 012-2h7a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM13 6a2 2 0 012-2h3a2 2 0 012 2v12a2 2 0 01-2 2h-3a2 2 0 01-2-2V6z" />
            </svg>
          </div>
          <span className="logo-text">
            MANGA<span>LOG</span>
          </span>
        </div>

        {/* Right side */}
        <div className="header-right">
          {!listLoading && (
            <div className="stat-pill">
              <div className="dot" />
              <strong>{reading.length}</strong> Reading
            </div>
          )}
        </div>
      </header>

      {/* Ticker */}
      <NowReadingTicker manga={trackedManga} />

      {/* ── TOOLBAR ── */}
      <div className="toolbar">
        {/* Tabs */}
        <nav className="tabs">
          <button
            className={`tab ${activeTab === "reading" ? "active" : ""}`}
            onClick={() => setActiveTab("reading")}
          >
            Reading
            {reading.length > 0 && (
              <span className="tab-count">{reading.length}</span>
            )}
          </button>
          <button
            className={`tab ${activeTab === "completed" ? "active" : ""}`}
            onClick={() => setActiveTab("completed")}
          >
            Completed
            {completed.length > 0 && (
              <span className="tab-count">{completed.length}</span>
            )}
          </button>
          <button
            className={`tab ${activeTab === "activity" ? "active" : ""}`}
            onClick={() => setActiveTab("activity")}
          >
            Activity
          </button>
          <button
            className={`tab ${activeTab === "search" ? "active" : ""}`}
            onClick={() => setActiveTab("search")}
          >
            + Add Manga
          </button>
        </nav>

        {/* Right controls — search + sort (only on grid tabs) */}
        {(activeTab === "reading" || activeTab === "completed") && (
          <div className="toolbar-right">
            <div className="search-wrap">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search titles..."
                value={listQuery}
                onChange={(e) => setListQuery(e.target.value)}
              />
            </div>
            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="added">New Chapters First</option>
              <option value="alpha">A → Z</option>
              <option value="behind">Most Behind</option>
              <option value="latest">Most Chapters</option>
            </select>
            <button className="btn-add" onClick={() => setActiveTab("search")}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add
            </button>
          </div>
        )}
      </div>

      {/* ── MAIN ── */}
      <main className="main">
        <div className="grid-section">
          {listError && <p className="error-msg">{listError}</p>}

          {activeTab === "reading" &&
            renderGrid(reading, "You're not reading anything yet.", true)}
          {activeTab === "completed" &&
            renderGrid(completed, "No completed manga yet.", false)}

          {activeTab === "activity" && (
            <>
              <NotifierStatus />
              <ActivityHeatmap />
            </>
          )}

          {activeTab === "search" && (
            <section>
              <SearchBar
                value={query}
                onChange={setQuery}
                isSearching={isSearching}
              />
              {searchError && <p className="error-msg">{searchError}</p>}
              {searchResults.length > 0 && (
                <div className="results-list">
                  {searchResults.map((m) => (
                    <SearchResultCard
                      key={m.id}
                      manga={m}
                      onAdd={handleAdd}
                      isTracked={trackedIds.has(m.id)}
                    />
                  ))}
                </div>
              )}
              {!isSearching &&
                query &&
                searchResults.length === 0 &&
                !searchError && (
                  <p className="no-results">No results for "{query}"</p>
                )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
