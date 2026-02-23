import { useState, useEffect, useCallback, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

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
  const res = await fetch(
    `${API_BASE}/manga/search?q=${encodeURIComponent(query)}`,
  );
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "Search failed");
  }
  return (await res.json()).data;
}
async function fetchTracked() {
  const res = await fetch(`${API_BASE}/tracked`);
  if (!res.ok) throw new Error("Could not load your list");
  return (await res.json()).data;
}
async function addTrackedApi(manga) {
  const res = await fetch(`${API_BASE}/tracked`, {
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
  const res = await fetch(`${API_BASE}/tracked/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Could not remove manga");
}
async function getLatestChapter(mangaId) {
  const res = await fetch(`${API_BASE}/manga/${mangaId}/latest-chapter`);
  if (!res.ok) return null;
  return (await res.json()).data;
}
async function updateProgressApi(id, currentChapter) {
  const res = await fetch(`${API_BASE}/tracked/${id}/progress`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentChapter }),
  });
  if (!res.ok) throw new Error("Could not update progress");
}
async function updateReadingStatusApi(id, readingStatus) {
  const res = await fetch(`${API_BASE}/tracked/${id}/reading-status`, {
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

  return (
    <div className="chapter-dropdown-wrap" ref={ref}>
      <span className="chapter-num">
        {latestChapter === "?" ? "Ch. ?" : `Ch. ${latestChapter}`}
      </span>
      <div className="chapter-row">
        <a
          className="chapter-link"
          href={readUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Read now <span className="chapter-link-arrow">↗</span>
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
              className={`chapter-list-item ${num === latest ? "is-latest" : ""}`}
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

// ─── Search Bar ───────────────────────────────────────────────────────────────
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
function SearchResultCard({ manga, onAdd, isTracked }) {
  return (
    <div className={`result-card ${isTracked ? "is-tracked" : ""}`}>
      <div className="result-cover">
        {manga.coverUrl ? (
          <img src={manga.coverUrl} alt={manga.title} loading="lazy" />
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
}

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
function MangaTile({
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
      className={`manga-tile ${hasUnread || isNew ? "has-unread" : ""} ${isCompleted ? "is-completed" : ""}`}
      onMouseLeave={() => setConfirming(false)}
    >
      <div className="tile-cover">
        {manga.coverUrl ? (
          <img src={manga.coverUrl} alt={manga.title} loading="lazy" />
        ) : (
          <div className="tile-cover-placeholder">📖</div>
        )}
        <div className="tile-status-dot" data-status={manga.status} />
        {hasUnread && (
          <div className="tile-unread-badge">+{latest - currentCh}</div>
        )}
        {isCompleted && <div className="tile-completed-badge">✓</div>}

        {!confirming && (
          <button
            className="tile-delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              setConfirming(true);
            }}
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
        )}

        {confirming && (
          <div className="tile-confirm-overlay">
            <p className="tile-confirm-text">Remove?</p>
            <div className="tile-confirm-actions">
              <button
                className="tile-confirm-yes"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(manga.id);
                }}
              >
                Yes
              </button>
              <button
                className="tile-confirm-no"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirming(false);
                }}
              >
                No
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="tile-info">
        <p className="tile-title">{manga.title}</p>

        {!chapter && <span className="tile-chapter-loading">Loading…</span>}

        {chapter && (
          <>
            <ChapterDropdown
              latestChapter={chapter.chapter}
              readUrl={chapter.readUrl}
              mangaboltSlug={chapter.mangaboltSlug}
            />
            {!isCompleted && (
              <div className="progress-row">
                {currentCh > 0 && (
                  <span className="progress-label">
                    {hasUnread ? `On ch. ${currentCh}` : "Up to date ✓"}
                  </span>
                )}
                {(hasUnread || isNew) && (
                  <button
                    className="mark-read-btn"
                    onClick={markAsRead}
                    disabled={savingProgress}
                  >
                    {savingProgress ? "Saving…" : `Mark ch. ${latest} read`}
                  </button>
                )}
              </div>
            )}

            {/* Only show "Mark Completed" for finished manga, always show "Move to Reading" on completed shelf */}
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

        {!chapter && <span className="tile-chapter-error">No data</span>}
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

  const handleAdd = async (manga) => {
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
  };

  const handleRemove = async (id) => {
    try {
      await removeTrackedApi(id);
      setTracked((p) => p.filter((m) => m.id !== id));
    } catch (e) {
      alert(e.message);
    }
  };

  const handleProgressUpdate = (id, currentChapter) => {
    setTracked((p) =>
      p.map((m) => (m.id === id ? { ...m, currentChapter } : m)),
    );
  };

  const handleStatusChange = (id, readingStatus) => {
    setTracked((p) =>
      p.map((m) => (m.id === id ? { ...m, readingStatus } : m)),
    );
  };

  const trackedIds = new Set(trackedManga.map((m) => m.id));
  const reading = trackedManga.filter((m) => m.readingStatus !== "completed");
  const completed = trackedManga.filter((m) => m.readingStatus === "completed");

  const renderGrid = (list, emptyMessage, showAddButton) => {
    if (listLoading) {
      return (
        <div className="tracked-grid">
          {Array.from({ length: cachedCount }).map((_, i) => (
            <TileSkeleton key={i} />
          ))}
        </div>
      );
    }
    if (list.length === 0) {
      return (
        <EmptyState
          message={emptyMessage}
          onSwitchToSearch={showAddButton ? () => setActiveTab("search") : null}
        />
      );
    }
    return (
      <div className="tracked-grid">
        {list.map((m) =>
          !chapterMap[m.id] ? (
            <TileSkeleton key={m.id} />
          ) : (
            <MangaTile
              key={m.id}
              manga={m}
              chapter={chapterMap[m.id]}
              onRemove={handleRemove}
              onProgressUpdate={handleProgressUpdate}
              onStatusChange={handleStatusChange}
            />
          ),
        )}
      </div>
    );
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">MANGA</span>
            <div className="logo-divider" />
            <span className="logo-text">LOG</span>
          </div>
          <p className="header-sub">
            <strong>Your manga shelf</strong>
            Track every chapter. Miss nothing.
          </p>
        </div>
      </header>

      <main className="main">
        <nav className="tabs">
          <button
            className={`tab ${activeTab === "reading" ? "active" : ""}`}
            onClick={() => setActiveTab("reading")}
          >
            Reading{" "}
            {reading.length > 0 && (
              <span className="tab-count">{reading.length}</span>
            )}
          </button>
          <button
            className={`tab ${activeTab === "completed" ? "active" : ""}`}
            onClick={() => setActiveTab("completed")}
          >
            Completed{" "}
            {completed.length > 0 && (
              <span className="tab-count">{completed.length}</span>
            )}
          </button>
          <button
            className={`tab ${activeTab === "search" ? "active" : ""}`}
            onClick={() => setActiveTab("search")}
          >
            + Add Manga
          </button>
        </nav>

        {listError && <p className="error-msg">{listError}</p>}

        {activeTab === "reading" &&
          renderGrid(reading, "You're not reading anything yet.", true)}
        {activeTab === "completed" &&
          renderGrid(completed, "No completed manga yet.", false)}

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
      </main>
    </div>
  );
}
