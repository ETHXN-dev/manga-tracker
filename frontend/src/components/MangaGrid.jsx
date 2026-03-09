import MangaTile from "./MangaTile";
import TileSkeleton from "./TileSkeleton";
import EmptyState from "./EmptyState";

export default function MangaGrid({
  list,
  emptyMessage,
  showAddButton,
  recentlyAddedId,
  listLoading,
  cachedCount,
  listQuery,
  chapterMap,
  onRemove,
  onProgressUpdate,
  onStatusChange,
  onSwitchToSearch,
}) {
  if (listLoading) {
    return (
      <div className="tracked-grid">
        {Array.from({ length: cachedCount }).map((_, i) => (
          <TileSkeleton key={i} />
        ))}
      </div>
    );
  }

  const noResults = list.length === 0 && listQuery.trim();

  if (noResults) {
    return <p className="no-results">No manga matching "{listQuery}"</p>;
  }

  if (list.length === 0) {
    return (
      <EmptyState
        message={emptyMessage}
        onSwitchToSearch={showAddButton ? onSwitchToSearch : null}
      />
    );
  }

  return (
    <div className="tracked-grid">
      {list.map((m) => (
        <MangaTile
          key={m.id}
          manga={m}
          chapter={chapterMap[m.id] || null}
          onRemove={onRemove}
          onProgressUpdate={onProgressUpdate}
          onStatusChange={onStatusChange}
          justAdded={m.id === recentlyAddedId}
        />
      ))}
      {showAddButton && (
        <div className="card-add" onClick={onSwitchToSearch}>
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
  );
}
