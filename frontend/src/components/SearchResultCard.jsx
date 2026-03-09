import { memo } from "react";

const SearchResultCard = memo(function SearchResultCard({ manga, onAdd, isTracked }) {
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
          <span className={`status-badge status-${manga.status?.replace(" ", "-")}`}>
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

export default SearchResultCard;
