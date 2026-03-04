import { useState, useEffect, useCallback, useRef } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const MANGADEX_BASE = "https://api.mangadex.org";

const getCoverUrl = (mangaId, coverFile) =>
  `https://uploads.mangadex.org/covers/${mangaId}/${coverFile}.256.jpg`;

// ─── Custom Hooks ─────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value) => {
    const valueToStore = value instanceof Function ? value(storedValue) : value;
    setStoredValue(valueToStore);
    localStorage.setItem(key, JSON.stringify(valueToStore));
  };

  return [storedValue, setValue];
}

// ─── API Functions ─────────────────────────────────────────────────────────────
async function searchManga(query) {
  const params = new URLSearchParams({
    title: query,
    limit: 10,
    "includes[]": "cover_art",
    "contentRating[]": ["safe", "suggestive"],
    "availableTranslatedLanguage[]": "en",
  });
  const res = await fetch(`${MANGADEX_BASE}/manga?${params}`);
  if (!res.ok) throw new Error("Search failed");
  const json = await res.json();
  return json.data;
}

async function getLatestChapter(mangaId) {
  const params = new URLSearchParams({
    manga: mangaId,
    limit: 1,
    "translatedLanguage[]": "en",
    "order[publishAt]": "desc",
  });
  const res = await fetch(`${MANGADEX_BASE}/chapter?${params}`);
  if (!res.ok) throw new Error("Chapter fetch failed");
  const json = await res.json();
  return json.data[0] || null;
}

function parseManga(raw) {
  const coverRel = raw.relationships?.find((r) => r.type === "cover_art");
  const coverFile = coverRel?.attributes?.fileName;
  return {
    id: raw.id,
    title:
      raw.attributes.title.en ||
      Object.values(raw.attributes.title)[0] ||
      "Unknown Title",
    description: raw.attributes.description?.en?.slice(0, 200) || "",
    status: raw.attributes.status,
    coverUrl: coverFile ? getCoverUrl(raw.id, coverFile) : null,
    year: raw.attributes.year,
  };
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const BookIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const CheckIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const PlusIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const XIcon = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SearchIconSvg = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg
    width="11"
    height="11"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

// ─── Add Manga Modal ──────────────────────────────────────────────────────────
function AddMangaModal({ onClose, onAdd, trackedIds }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const inputRef = useRef(null);
  const debouncedQuery = useDebounce(query, 500);

  const performSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    try {
      setIsSearching(true);
      setSearchError(null);
      const raw = await searchManga(q);
      setResults(raw.map(parseManga));
    } catch {
      setSearchError("Search failed. MangaDex may be down — try again.");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    performSearch(debouncedQuery);
  }, [debouncedQuery, performSearch]);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={handleBackdrop}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Add Manga</h2>
          <button className="modal-close" onClick={onClose}>
            <XIcon size={16} />
          </button>
        </div>

        <div className="modal-search">
          <div className="search-input-wrap">
            <span className="search-icon">
              <SearchIconSvg />
            </span>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search titles..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="search-input"
            />
            {isSearching && <div className="search-spinner" />}
          </div>
        </div>

        <div className="modal-results">
          {searchError && <p className="modal-error">{searchError}</p>}

          {results.length > 0 && (
            <div className="results-list">
              {results.map((manga) => {
                const tracked = trackedIds.has(manga.id);
                return (
                  <div
                    key={manga.id}
                    className={`result-card ${tracked ? "is-tracked" : ""}`}
                  >
                    <div className="result-cover">
                      {manga.coverUrl ? (
                        <img
                          src={manga.coverUrl}
                          alt={manga.title}
                          loading="lazy"
                        />
                      ) : (
                        <div className="cover-placeholder">?</div>
                      )}
                    </div>
                    <div className="result-info">
                      <h3 className="result-title">{manga.title}</h3>
                      <div className="result-meta">
                        <span className={`status-badge status-${manga.status}`}>
                          {manga.status}
                        </span>
                        {manga.year && (
                          <span className="result-year">{manga.year}</span>
                        )}
                      </div>
                      {manga.description && (
                        <p className="result-desc">{manga.description}…</p>
                      )}
                    </div>
                    <button
                      className={`track-btn ${tracked ? "tracked" : ""}`}
                      onClick={() => {
                        if (!tracked) {
                          onAdd(manga);
                          onClose();
                        }
                      }}
                      disabled={tracked}
                    >
                      {tracked ? (
                        <>
                          <CheckIcon />
                          <span>Tracking</span>
                        </>
                      ) : (
                        <>
                          <PlusIcon />
                          <span>Track</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {!isSearching && query && results.length === 0 && !searchError && (
            <p className="no-results">No results for "{query}"</p>
          )}

          {!query && (
            <div className="modal-empty-hint">
              <SearchIconSvg />
              <span>Search MangaDex to find titles</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tracked Manga Card ────────────────────────────────────────────────────────
function TrackedMangaCard({ manga, onRemove, index }) {
  const [chapter, setChapter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchChapter() {
      try {
        setLoading(true);
        const ch = await getLatestChapter(manga.id);
        if (!cancelled) {
          setChapter(ch);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Couldn't load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchChapter();
    return () => {
      cancelled = true;
    };
  }, [manga.id]);

  const chapterNum = chapter?.attributes?.chapter;
  const chapterTitle = chapter?.attributes?.title;
  const publishDate = chapter?.attributes?.publishAt
    ? new Date(chapter.attributes.publishAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="tracked-card" style={{ "--i": index }}>
      <div className="card-cover">
        {manga.coverUrl ? (
          <img src={manga.coverUrl} alt={manga.title} loading="lazy" />
        ) : (
          <div className="cover-placeholder">?</div>
        )}
        <span className={`card-status-badge status-${manga.status}`}>
          {manga.status}
        </span>
      </div>

      <div className="card-body">
        <h3 className="card-title">{manga.title}</h3>

        <div className="card-chapter">
          {loading && <span className="chapter-loading">Loading…</span>}
          {error && <span className="chapter-error">{error}</span>}
          {!loading && !error && chapter && (
            <>
              <span className="chapter-num">Ch.{chapterNum || "?"}</span>
              {chapterTitle && (
                <span className="chapter-sub">{chapterTitle}</span>
              )}
              {publishDate && (
                <span className="chapter-date">{publishDate}</span>
              )}
            </>
          )}
          {!loading && !error && !chapter && (
            <span className="chapter-error">No English chapters</span>
          )}
        </div>

        <div className="card-actions">
          <a
            href={`https://mangadex.org/title/${manga.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="card-btn card-btn-read"
          >
            <ExternalLinkIcon /> Read
          </a>
          <button
            className="card-btn card-btn-remove"
            onClick={() => onRemove(manga.id)}
          >
            <XIcon size={11} /> Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Prompt Card ──────────────────────────────────────────────────────────
function AddPromptCard({ onClick }) {
  return (
    <button className="add-prompt-card" onClick={onClick}>
      <div className="add-prompt-inner">
        <div className="add-prompt-icon">
          <PlusIcon />
        </div>
        <span>Add Manga</span>
      </div>
    </button>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ onAdd }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <BookIcon />
      </div>
      <p className="empty-title">Your list is empty</p>
      <p className="empty-sub">Search for manga and start tracking chapters.</p>
      <button className="empty-cta" onClick={onAdd}>
        <PlusIcon /> Add your first manga
      </button>
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState("reading");
  const [showModal, setShowModal] = useState(false);
  const [trackedManga, setTrackedManga] = useLocalStorage("tracked-manga", []);

  const handleAdd = (manga) => {
    if (trackedManga.find((m) => m.id === manga.id)) return;
    setTrackedManga((prev) => [manga, ...prev]);
  };

  const handleRemove = (id) => {
    setTrackedManga((prev) => prev.filter((m) => m.id !== id));
  };

  const trackedIds = new Set(trackedManga.map((m) => m.id));
  const readingManga = trackedManga.filter((m) => m.status !== "completed");
  const completedManga = trackedManga.filter((m) => m.status === "completed");
  const displayManga = activeTab === "reading" ? readingManga : completedManga;

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="logo">
          <div className="logo-mark">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="logo-text">
            MANGA<span>LOG</span>
          </span>
        </div>

        <div className="header-right">
          <div className="stat-pill">
            <div className="stat-dot" />
            <strong>{trackedManga.length}</strong>
            <span>tracked</span>
          </div>
          <button className="add-btn" onClick={() => setShowModal(true)}>
            <PlusIcon /> Add Manga
          </button>
        </div>
      </header>

      {/* ── Toolbar ── */}
      <div className="toolbar">
        <div className="tabs">
          <button
            className={`tab ${activeTab === "reading" ? "active" : ""}`}
            onClick={() => setActiveTab("reading")}
          >
            <BookIcon />
            Reading
            {readingManga.length > 0 && (
              <span className="tab-count">{readingManga.length}</span>
            )}
          </button>
          <button
            className={`tab ${activeTab === "completed" ? "active" : ""}`}
            onClick={() => setActiveTab("completed")}
          >
            <CheckIcon />
            Completed
            {completedManga.length > 0 && (
              <span className="tab-count">{completedManga.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* ── Main ── */}
      <main className="main">
        {trackedManga.length === 0 ? (
          <EmptyState onAdd={() => setShowModal(true)} />
        ) : displayManga.length === 0 ? (
          <div className="empty-tab">
            <p>No {activeTab} manga yet.</p>
            <button
              className="empty-tab-cta"
              onClick={() => setShowModal(true)}
            >
              <PlusIcon /> Add Manga
            </button>
          </div>
        ) : (
          <div className="manga-grid">
            {displayManga.map((manga, i) => (
              <TrackedMangaCard
                key={manga.id}
                manga={manga}
                onRemove={handleRemove}
                index={i}
              />
            ))}
            <AddPromptCard onClick={() => setShowModal(true)} />
          </div>
        )}
      </main>

      {/* ── Modal ── */}
      {showModal && (
        <AddMangaModal
          onClose={() => setShowModal(false)}
          onAdd={handleAdd}
          trackedIds={trackedIds}
        />
      )}
    </div>
  );
}
