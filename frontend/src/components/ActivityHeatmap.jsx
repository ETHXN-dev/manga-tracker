import { useState, useEffect } from "react";
import { apiFetch } from "../api";

export default function ActivityHeatmap() {
  const [data, setData] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    apiFetch(`/activity/heatmap`)
      .then((r) => r.json())
      .then((r) => setData(r.data || {}))
      .catch((e) => {
        console.error("[heatmap]", e);
        setData({});
      });
  }, []);

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
          <div className="heatmap-grid">
            {weeks.map((week, wi) => (
              <div key={wi} className="heatmap-week">
                {week.map(({ dateStr, count, future }) => (
                  <div
                    key={dateStr}
                    className={`heatmap-cell level-${future ? "future" : getLevel(count)}`}
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
                          ? { ...t, x: rect.left + rect.width / 2, y: rect.top }
                          : null,
                      );
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="heatmap-legend">
            <span className="heatmap-legend-label">Less</span>
            {[0, 1, 2, 3, 4].map((l) => (
              <div key={l} className={`heatmap-cell level-${l}`} />
            ))}
            <span className="heatmap-legend-label">More</span>
          </div>
        </div>
      </div>
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
