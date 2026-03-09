export default function EmptyState({ message, onSwitchToSearch }) {
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
