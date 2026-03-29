import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../api";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("default", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ScoreRing({ score }) {
  if (!score) return null;
  const pct = score / 100;
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  const color = score >= 75 ? "#39e07a" : score >= 50 ? "#f4a261" : "#ff2d2d";

  return (
    <div className="mdp-score-ring" title={`AniList score: ${score}/100`}>
      <svg viewBox="0 0 56 56" fill="none">
        {/* Track */}
        <circle
          cx="28"
          cy="28"
          r={r}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="4"
        />
        {/* Fill */}
        <circle
          cx="28"
          cy="28"
          r={r}
          stroke={color}
          strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 28 28)"
          style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}
        />
      </svg>
      <span className="mdp-score-value" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

// ── Reading Timeline ───────────────────────────────────────────────────────────

function ReadingTimeline({ mangaId }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiFetch(`/activity/manga/${mangaId}`)
      .then((r) => r.json())
      .then((r) => setItems(r.data))
      .catch(() => {
        setError(true);
        setItems([]);
      });
  }, [mangaId]);

  if (items === null) {
    return (
      <div className="mdp-timeline-list">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="mdp-timeline-item skeleton-timeline">
            <div className="skeleton mdp-skel-ch" />
            <div className="skeleton mdp-skel-date" />
          </div>
        ))}
      </div>
    );
  }

  if (error)
    return <p className="mdp-empty">Could not load reading history.</p>;
  if (items.length === 0)
    return <p className="mdp-empty">No chapters logged yet.</p>;

  return (
    <div className="mdp-timeline-list">
      {items.map((item, i) => (
        <div
          key={item.id}
          className={`mdp-timeline-item ${i === 0 ? "is-latest" : ""}`}
        >
          <span className="mdp-timeline-ch">Ch. {item.chapter}</span>
          <span className="mdp-timeline-date">{formatDate(item.readAt)}</span>
        </div>
      ))}
    </div>
  );
}

// ── MangaDetailPanel ───────────────────────────────────────────────────────────

export default function MangaDetailPanel({ manga, chapter, onClose }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleBackdropClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  const latest = chapter?.chapter;
  const progress = manga.currentChapter || 0;
  const behind =
    latest && !isNaN(parseInt(latest)) ? parseInt(latest) - progress : 0;
  const pctRead =
    latest && parseInt(latest) > 0
      ? Math.min(100, Math.round((progress / parseInt(latest)) * 100))
      : 0;

  return (
    <div
      className="mdp-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={manga.title}
    >
      <div className="mdp-panel">
        {/* ── Banner / hero ── */}
        <div className="mdp-hero">
          {manga.bannerUrl || manga.coverUrl ? (
            <img
              src={manga.bannerUrl || manga.coverUrl}
              alt=""
              className="mdp-hero-img"
              aria-hidden="true"
            />
          ) : null}
          <div className="mdp-hero-overlay" />

          {/* Close button */}
          <button
            className="mdp-close"
            onClick={onClose}
            aria-label="Close panel"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Hero content */}
          <div className="mdp-hero-content">
            <div className="mdp-cover-wrap">
              {manga.coverUrl ? (
                <img
                  src={manga.coverUrl}
                  alt={manga.title}
                  className="mdp-cover"
                />
              ) : (
                <div className="mdp-cover mdp-cover-placeholder">📖</div>
              )}
            </div>
            <div className="mdp-hero-meta">
              <h2 className="mdp-title">{manga.title}</h2>
              <div className="mdp-badges">
                {manga.status && (
                  <span
                    className={`mdp-status status-${manga.status.replace(" ", "-")}`}
                  >
                    {manga.status}
                  </span>
                )}
                {manga.year && <span className="mdp-pill">{manga.year}</span>}
                {manga.chapters && (
                  <span className="mdp-pill">{manga.chapters} ch</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="mdp-body">
          {/* Left column */}
          <div className="mdp-left">
            {/* Score + AniList link */}
            <div className="mdp-score-row">
              <ScoreRing score={manga.averageScore} />
              {manga.anilistUrl && (
                <a
                  href={manga.anilistUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mdp-anilist-link"
                >
                  View on AniList
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              )}
            </div>

            {/* Genres */}
            {manga.genres?.length > 0 && (
              <div className="mdp-section">
                <span className="mdp-section-label">Genres</span>
                <div className="mdp-genres">
                  {manga.genres.map((g) => (
                    <span key={g} className="mdp-genre-tag">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Synopsis */}
            {(manga.descriptionFull || manga.description) && (
              <div className="mdp-section">
                <span className="mdp-section-label">Synopsis</span>
                <p className="mdp-description">
                  {manga.descriptionFull || manga.description}
                </p>
              </div>
            )}

            {/* Read Now button */}
            {chapter?.readUrl && (
              <a
                href={chapter.readUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mdp-read-btn"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Read Latest — Ch. {latest}
              </a>
            )}
          </div>

          {/* Right column — personal stats */}
          <div className="mdp-right">
            <div className="mdp-section">
              <span className="mdp-section-label">Your Progress</span>

              {/* Progress bar */}
              <div className="mdp-progress-wrap">
                <div className="mdp-progress-bar">
                  <div
                    className="mdp-progress-fill"
                    style={{ width: `${pctRead}%` }}
                  />
                </div>
                <div className="mdp-progress-labels">
                  <span>
                    Ch. {progress} of {latest ?? "?"}
                  </span>
                  <span>{pctRead}%</span>
                </div>
              </div>

              {/* Stat chips */}
              <div className="mdp-stat-chips">
                <div className="mdp-stat-chip">
                  <span className="mdp-stat-value">{progress}</span>
                  <span className="mdp-stat-label">Read</span>
                </div>
                <div className="mdp-stat-chip">
                  <span
                    className="mdp-stat-value"
                    style={{
                      color: behind > 0 ? "var(--accent)" : "var(--green)",
                    }}
                  >
                    {behind > 0 ? `+${behind}` : "✓"}
                  </span>
                  <span className="mdp-stat-label">
                    {behind > 0 ? "Behind" : "Current"}
                  </span>
                </div>
                <div className="mdp-stat-chip">
                  <span className="mdp-stat-value">
                    {manga.readingStatus === "completed" ? "Done" : "Active"}
                  </span>
                  <span className="mdp-stat-label">Status</span>
                </div>
              </div>
            </div>

            {/* Reading history timeline */}
            <div className="mdp-section mdp-timeline-section">
              <span className="mdp-section-label">Reading History</span>
              <ReadingTimeline mangaId={manga.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
