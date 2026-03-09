import { useState, useEffect } from "react";
import { apiFetch } from "../api";

export default function NotifierStatus() {
  const [lastRan, setLastRan] = useState(null);

  useEffect(() => {
    apiFetch(`/activity/status`)
      .then((r) => r.json())
      .then((r) => setLastRan(r.lastRan))
      .catch(() => {});
  }, []);

  const getTimeAgo = (iso) => {
    if (!iso) return "Never";
    const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  const isHealthy =
    lastRan && Date.now() - new Date(lastRan) < 2 * 60 * 60 * 1000;

  return (
    <div className="notifier-status">
      <span className={`notifier-dot ${isHealthy ? "healthy" : "stale"}`} />
      <span className="notifier-label">
        Notifier last ran: <strong>{getTimeAgo(lastRan)}</strong>
      </span>
    </div>
  );
}
