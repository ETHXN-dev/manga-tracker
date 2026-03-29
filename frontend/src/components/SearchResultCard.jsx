import { memo } from "react";

const STATUS_META = {
  releasing: { label: "Ongoing", cls: "status-releasing" },
  finished: { label: "Finished", cls: "status-finished" },
  cancelled: { label: "Cancelled", cls: "status-cancelled" },
  hiatus: { label: "On Hiatus", cls: "status-hiatus" },
};

const SearchResultCard = memo(function SearchResultCard({
  manga,
  onAdd,
  isTracked,
}) {
  const statusInfo = STATUS_META[manga.status] || {
    label: manga.status,
    cls: "",
  };

  return (
    <div className={`result-card ${isTracked ? "is-tracked" : ""}`}>
      {/* Cover */}
      <div className="result-cover">
        {manga.coverUrl ? (
          <img
            src={manga.coverUrl}
            alt={manga.title}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="cover-placeholder">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
          </div>
        )}
        {/* Subtle gradient overlay on cover */}
        <div className="result-cover-overlay" />
      </div>

      {/* Info */}
      <div className="result-info">
        <h3 className="result-title">{manga.title}</h3>

        <div className="result-meta">
          {manga.status && (
            <span className={`status-badge ${statusInfo.cls}`}>
              {statusInfo.label}
            </span>
          )}
          {manga.year && <span className="result-pill">{manga.year}</span>}
          {manga.chapters && (
            <span className="result-pill result-pill-ch">
              {manga.chapters} ch
            </span>
          )}
        </div>

        {manga.description && (
          <p className="result-description">{manga.description}</p>
        )}
      </div>

      {/* Track button */}
      <div className="result-action">
        <button
          className={`track-btn ${isTracked ? "tracked" : ""}`}
          onClick={() => !isTracked && onAdd(manga)}
          disabled={isTracked}
          aria-label={
            isTracked
              ? `${manga.title} already tracked`
              : `Track ${manga.title}`
          }
        >
          {isTracked ? (
            <>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Tracked
            </>
          ) : (
            <>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Track
            </>
          )}
        </button>
      </div>
    </div>
  );
});

export default SearchResultCard;
