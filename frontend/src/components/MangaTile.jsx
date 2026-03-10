import { useState, useCallback, useRef, memo } from "react";
import { updateProgressApi, updateReadingStatusApi } from "../api";
import ChapterDropdownToggle from "./ChapterDropdownToggle";

const MangaTile = memo(function MangaTile({
  manga,
  chapter,
  onRemove,
  onProgressUpdate,
  onStatusChange,
  justAdded,
}) {
  const [confirming, setConfirming] = useState(false);
  const [currentCh, setCurrentCh] = useState(manga.currentChapter || 0);
  const [savingProgress, setSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const isCompleted = manga.readingStatus === "completed";
  const wrapRef = useRef(null);
  const longPressTimer = useRef(null);

  // Long-press to trigger delete on touch devices
  const handleTouchStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => setConfirming(true), 600);
  }, []);
  const handleTouchEnd = useCallback(() => {
    clearTimeout(longPressTimer.current);
  }, []);

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
    statusBadgeLabel = "✓ Current";
  }

  const markAsRead = async () => {
    if (!chapter || savingProgress) return;
    const prev = currentCh;
    setCurrentCh(latest); // optimistic
    onProgressUpdate(manga.id, latest);
    setSaving(true);
    try {
      await updateProgressApi(manga.id, latest);
    } catch {
      setCurrentCh(prev); // rollback
      onProgressUpdate(manga.id, prev);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    if (savingStatus) return;
    const newStatus = isCompleted ? "reading" : "completed";
    onStatusChange(manga.id, newStatus); // optimistic
    setSavingStatus(true);
    try {
      await updateReadingStatusApi(manga.id, newStatus);
    } catch {
      onStatusChange(manga.id, isCompleted ? "completed" : "reading"); // rollback
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <div
      ref={wrapRef}
      className={`tile-flip-wrap ${confirming ? "is-flipped" : ""} ${hasUnread || isNew ? "has-unread" : ""} ${isCompleted ? "is-completed" : ""} ${justAdded ? "is-new" : ""}`}
      onMouseLeave={() => setConfirming(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
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

            {statusBadgeLabel && (
              <div className={`tile-status-badge ${statusBadgeClass}`}>
                {statusBadgeLabel}
              </div>
            )}

            {chapter && chapter.chapter !== "?" && (
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
              aria-label="Remove manga"
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

            {chapter && chapter.chapter === "?" && (
              <div className="tile-unavailable">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                Source unavailable
              </div>
            )}

            {chapter && chapter.chapter !== "?" && (
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

export default MangaTile;
