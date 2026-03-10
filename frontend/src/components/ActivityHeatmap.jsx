import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../api";
import { fetchDayActivity } from "../api";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDay(dateStr) {
  // Use T12:00Z so local-timezone offsets can never roll the date back a day
  return new Date(dateStr + "T12:00:00.000Z").toLocaleDateString("default", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ── DayPanel ───────────────────────────────────────────────────────────────────

function DayPanel({ date, onClose }) {
  const [items, setItems] = useState(null); // null = loading
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchDayActivity(date)
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setItems([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  const loading = items === null;

  return (
    <div
      className="heatmap-day-panel"
      role="region"
      aria-label={`Reading activity for ${formatDay(date)}`}
    >
      <div className="hdp-header">
        <span className="hdp-date">{formatDay(date)}</span>
        <button
          className="hdp-close"
          onClick={onClose}
          aria-label="Close day panel"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="hdp-list">
        {loading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="hdp-item" aria-hidden="true">
              <div className="hdp-cover skeleton" />
              <div className="hdp-body">
                <div className="skeleton hdp-skel-title" />
                <div className="skeleton hdp-skel-chapter" />
              </div>
            </div>
          ))}

        {!loading && error && (
          <p className="hdp-empty">Could not load activity for this day.</p>
        )}

        {!loading && !error && items.length === 0 && (
          <p className="hdp-empty">No chapters logged on this day.</p>
        )}

        {!loading &&
          !error &&
          items.map((item) => (
            <div key={item.id} className="hdp-item">
              {item.manga?.coverUrl ? (
                <img
                  src={item.manga.coverUrl}
                  alt=""
                  className="hdp-cover"
                  loading="lazy"
                />
              ) : (
                <div className="hdp-cover hdp-cover-placeholder" />
              )}
              <div className="hdp-body">
                <span className="hdp-title">
                  {item.manga?.title ?? "Unknown"}
                </span>
                <span className="hdp-chapter">Ch.&nbsp;{item.chapter}</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ── ActivityHeatmap ────────────────────────────────────────────────────────────

export default function ActivityHeatmap() {
  const [data, setData] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    apiFetch("/activity/heatmap")
      .then((r) => r.json())
      .then((r) => setData(r.data || {}))
      .catch((e) => {
        console.error("[heatmap]", e);
        setData({});
      });
  }, []);

  // ── Build 53-week grid ─────────────────────────────────────────────────────

  const today = new Date();
  const dayMs = 86400000;
  const start = new Date(today);
  start.setDate(start.getDate() - 364);
  start.setDate(start.getDate() - start.getDay());

  const weeks = [];
  for (let w = 0; w < 53; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start.getTime() + (w * 7 + d) * dayMs);
      const dateStr = date.toISOString().slice(0, 10);
      const count = data ? data[dateStr] || 0 : 0;
      week.push({ dateStr, count, future: date > today });
    }
    weeks.push(week);
  }

  const max = data ? Math.max(...Object.values(data), 1) : 1;
  const total = data ? Object.values(data).reduce((a, b) => a + b, 0) : 0;

  const getLevel = (count) => {
    if (!count) return 0;
    if (count <= max * 0.25) return 1;
    if (count <= max * 0.5) return 2;
    if (count <= max * 0.75) return 3;
    return 4;
  };

  // ── Month labels ───────────────────────────────────────────────────────────

  const months = [];
  weeks.forEach((week, wi) => {
    const d = new Date(week[0].dateStr);
    if (d.getDate() <= 7) {
      months.push({
        label: d.toLocaleString("default", { month: "short" }),
        col: wi,
      });
    }
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCellClick = useCallback((dateStr, count, future) => {
    if (future || count === 0) return;
    setTooltip(null);
    setSelectedDay((prev) => (prev === dateStr ? null : dateStr));
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="heatmap-wrap">
      <div className="heatmap-header">
        <span className="heatmap-title">Reading Activity</span>
        <span className="heatmap-total">
          {data === null
            ? "Loading…"
            : `${total} chapter${total !== 1 ? "s" : ""} marked read in the past year`}
        </span>
      </div>

      <div className="heatmap-scroll">
        <div className="heatmap-grid-wrap">
          {/* Month labels */}
          <div className="heatmap-months">
            {months.map((m, i) => (
              <span
                key={i}
                className="heatmap-month"
                style={{ gridColumn: m.col + 1 }}
              >
                {m.label}
              </span>
            ))}
          </div>

          {/* Cell grid */}
          <div className="heatmap-grid">
            {weeks.map((week, wi) => (
              <div key={wi} className="heatmap-week">
                {week.map(({ dateStr, count, future }) => {
                  const clickable = !future && count > 0;
                  const isSelected = selectedDay === dateStr;
                  return (
                    <div
                      key={dateStr}
                      className={[
                        "heatmap-cell",
                        `level-${future ? "future" : getLevel(count)}`,
                        isSelected ? "heatmap-cell-selected" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={clickable ? { cursor: "pointer" } : undefined}
                      role={clickable ? "button" : undefined}
                      tabIndex={clickable ? 0 : undefined}
                      aria-label={
                        clickable
                          ? `${count} chapter${count > 1 ? "s" : ""} read on ${dateStr} — click to view`
                          : undefined
                      }
                      aria-pressed={clickable ? isSelected : undefined}
                      onClick={() => handleCellClick(dateStr, count, future)}
                      onKeyDown={(e) => {
                        if (clickable && (e.key === "Enter" || e.key === " ")) {
                          e.preventDefault();
                          handleCellClick(dateStr, count, future);
                        }
                      }}
                      onMouseEnter={(e) => {
                        if (future) return;
                        const rect = e.target.getBoundingClientRect();
                        setTooltip({
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                          text:
                            count === 0
                              ? `No activity · ${dateStr}`
                              : `${count} chapter${count > 1 ? "s" : ""} · ${dateStr}`,
                        });
                      }}
                      onMouseMove={(e) => {
                        if (future || !tooltip) return;
                        const rect = e.target.getBoundingClientRect();
                        setTooltip((t) =>
                          t
                            ? {
                                ...t,
                                x: rect.left + rect.width / 2,
                                y: rect.top,
                              }
                            : null,
                        );
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="heatmap-legend">
            <span className="heatmap-legend-label">Less</span>
            {[0, 1, 2, 3, 4].map((l) => (
              <div key={l} className={`heatmap-cell level-${l}`} />
            ))}
            <span className="heatmap-legend-label">More</span>
          </div>
        </div>
      </div>

      {/* Day panel — key forces a clean remount whenever the selected date changes */}
      {selectedDay && (
        <DayPanel
          key={selectedDay}
          date={selectedDay}
          onClose={() => setSelectedDay(null)}
        />
      )}

      {/* Floating tooltip */}
      {tooltip && (
        <div
          className="heatmap-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
