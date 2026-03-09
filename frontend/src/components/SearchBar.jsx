export default function SearchBar({ value, onChange, isSearching }) {
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
