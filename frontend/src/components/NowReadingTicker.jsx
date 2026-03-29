export default function NowReadingTicker({ manga }) {
  if (!manga || manga.length === 0) return null;

  const active = manga.filter((m) => m.readingStatus !== "completed");
  if (active.length === 0) return null;

  // Build individual title spans so we can style separators distinctly
  const text = active.map((m) => m.title.toUpperCase()).join("  ·  ");

  return (
    <div className="ticker-wrap" aria-hidden="true">
      <div className="ticker-label">
        <span className="ticker-dot" />
        NOW READING
      </div>
      <div className="ticker-track">
        {/* Two identical spans — the animation translates by -50% so the
            transition is seamless at the loop point. */}
        <span className="ticker-content">
          {text}&nbsp;&nbsp;&nbsp;·&nbsp;&nbsp;&nbsp;{text}
          &nbsp;&nbsp;&nbsp;·&nbsp;&nbsp;&nbsp;
        </span>
      </div>
      <div className="ticker-count">{active.length}</div>
    </div>
  );
}
