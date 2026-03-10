import { useState, useEffect } from "react";
import { fetchRecentActivity } from "../api";

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)     return "just now";
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return "yesterday";
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("default", {
    month: "short",
    day:   "numeric",
  });
}

function SkeletonItem() {
  return (
    <div className="recent-read-item skeleton-rr-item" aria-hidden="true">
      <div className="rri-cover skeleton" />
      <div className="rri-body">
        <div className="skeleton rri-skel-title" />
        <div className="skeleton rri-skel-meta" />
      </div>
      <div className="skeleton rri-skel-time" />
    </div>
  );
}

export default function RecentReads() {
  const [items,   setItems]   = useState(null); // null = loading
  const [error,   setError]   = useState(false);

  useEffect(() => {
    fetchRecentActivity(15)
      .then(setItems)
      .catch(() => {
        setError(true);
        setItems([]);
      });
  }, []);

  const loading = items === null;

  return (
    <div className="recent-reads-wrap">
      <span className="section-eyebrow">Recent Reads</span>

      {error && (
        <p className="recent-reads-empty">Could not load recent activity.</p>
      )}

      {!error && (
        <div className="recent-reads-list">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <SkeletonItem key={i} />
              ))
            : items.length === 0
            ? (
                <p className="recent-reads-empty">
                  No chapters marked as read yet.
                </p>
              )
            : items.map((item) => (
                <div key={item.id} className="recent-read-item">
                  {item.manga?.coverUrl ? (
                    <img
                      src={item.manga.coverUrl}
                      alt=""
                      className="rri-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="rri-cover rri-cover-placeholder" />
                  )}

                  <div className="rri-body">
                    <span className="rri-title">
                      {item.manga?.title ?? "Unknown"}
                    </span>
                    <span className="rri-meta">Ch.&nbsp;{item.chapter}</span>
                  </div>

                  <span className="rri-time" title={new Date(item.readAt).toLocaleString()}>
                    {timeAgo(item.readAt)}
                  </span>
                </div>
              ))}
        </div>
      )}
    </div>
  );
}
