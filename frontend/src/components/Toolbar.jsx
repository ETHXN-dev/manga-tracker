export default function Toolbar({
  activeTab,
  setActiveTab,
  reading,
  completed,
  listQuery,
  setListQuery,
  sortBy,
  setSortBy,
  listLoading,
  isRefreshing,
  onRefresh,
}) {
  const showControls = activeTab === "reading" || activeTab === "completed";

  return (
    <div className="toolbar">
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

      {!listLoading && (
        <div className="stat-pill">
          <div className="dot" />
          <strong>{reading.length}</strong> Reading
        </div>
      )}

      {showControls && (
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
          <button
            className={`btn-refresh ${isRefreshing ? "spinning" : ""}`}
            onClick={onRefresh}
            title="Refresh chapters"
            disabled={isRefreshing}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0114.36-3.36L23 10M1 14l5.13 4.36A9 9 0 0020.49 15" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
