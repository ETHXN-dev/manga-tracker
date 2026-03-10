import { useState, useEffect } from "react";
import { fetchActivityStats } from "../api";

const CARDS = [
  { key: "thisWeek",  label: "This Week",   unit: "chapters" },
  { key: "thisMonth", label: "This Month",  unit: "chapters" },
  { key: "total",     label: "All Time",    unit: "chapters" },
  { key: "streak",    label: "Day Streak",  unit: "days"     },
];

export default function ActivityStats() {
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivityStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const maxCount =
    stats?.topManga?.length
      ? Math.max(...stats.topManga.map((m) => m.count), 1)
      : 1;

  return (
    <div className="activity-stats-wrap">
      {/* ── Stat cards ──────────────────────────────────────── */}
      <div className="activity-stat-cards">
        {CARDS.map(({ key, label, unit }) => {
          const val   = stats?.[key];
          const isStr = key === "streak" && val > 0;
          return (
            <div
              key={key}
              className={`activity-stat-card${isStr ? " streak-active" : ""}`}
            >
              <span className="asc-value">
                {loading ? "—" : val ?? "—"}
              </span>
              <span className="asc-label">{label}</span>
              <span className="asc-unit">{unit}</span>
            </div>
          );
        })}
      </div>

      {/* ── Top manga ────────────────────────────────────────── */}
      {!loading && stats?.topManga?.length > 0 && (
        <div className="top-manga-wrap">
          <span className="section-eyebrow">Most Read</span>
          <div className="top-manga-list">
            {stats.topManga.map((m, i) => (
              <div key={m.mangaId} className="top-manga-row">
                <span className="top-manga-rank">#{i + 1}</span>

                {m.coverUrl ? (
                  <img
                    src={m.coverUrl}
                    alt=""
                    className="top-manga-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="top-manga-cover top-manga-cover-placeholder" />
                )}

                <span className="top-manga-title" title={m.title}>
                  {m.title}
                </span>

                <div
                  className="top-manga-bar-track"
                  role="presentation"
                  aria-hidden="true"
                >
                  <div
                    className="top-manga-bar-fill"
                    style={{ width: `${(m.count / maxCount) * 100}%` }}
                  />
                </div>

                <span className="top-manga-count">{m.count} ch</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skeleton placeholder for top-manga while loading */}
      {loading && (
        <div className="top-manga-wrap">
          <span className="section-eyebrow">Most Read</span>
          <div className="top-manga-list">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="top-manga-row">
                <span className="top-manga-rank" />
                <div className="top-manga-cover top-manga-cover-placeholder skeleton" />
                <div className="skeleton top-manga-skel-title" />
                <div className="top-manga-bar-track">
                  <div className="skeleton top-manga-skel-bar" style={{ width: `${70 - i * 20}%`, height: "100%" }} />
                </div>
                <span className="top-manga-count" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
