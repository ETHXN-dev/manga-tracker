export default function NowReadingTicker({ manga }) {
  if (!manga || manga.length === 0) return null;

  const titles = manga
    .filter((m) => m.readingStatus !== "completed")
    .map((m) => m.title.toUpperCase());

  if (titles.length === 0) return null;

  // The tickerScroll animation translates by -50%, so the element needs two
  // identical halves. One copy of the joined titles per half is sufficient —
  // the original code produced 6 copies (3x array, then rendered twice).
  const text = titles.join("  ·  ");

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
