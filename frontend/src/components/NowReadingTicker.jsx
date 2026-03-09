export default function NowReadingTicker({ manga }) {
  if (!manga || manga.length === 0) return null;

  const titles = manga
    .filter((m) => m.readingStatus !== "completed")
    .map((m) => m.title.toUpperCase());

  if (titles.length === 0) return null;

  const repeated = [...titles, ...titles, ...titles];
  const text = repeated.join("  ·  ");

  return (
    <div className="ticker-wrap">
      <div className="ticker-label">NOW READING</div>
      <div className="ticker-track">
        <span className="ticker-content">
          {text}&nbsp;&nbsp;&nbsp;{text}
        </span>
      </div>
    </div>
  );
}
