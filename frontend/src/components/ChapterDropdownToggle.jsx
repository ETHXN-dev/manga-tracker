import { useState, useEffect, useCallback, useRef, memo } from "react";

const ChapterDropdownToggle = memo(function ChapterDropdownToggle({
  latestChapter,
  mangaboltSlug,
}) {
  const [open, setOpen] = useState(false);
  const [opensDown, setOpensDown] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleToggle = useCallback((e) => {
    e.stopPropagation();
    setOpen((o) => {
      if (!o && ref.current) {
        const rect = ref.current.getBoundingClientRect();
        // If less than 220px above the button, open downward
        setOpensDown(rect.top < 220);
      }
      return !o;
    });
  }, []);

  const latest = parseInt(latestChapter);
  if (isNaN(latest) || latest < 1) return null;

  const chapters = Array.from({ length: latest }, (_, i) => latest - i);
  const chUrl = (num) =>
    `https://mangabolt.com/chapter/${mangaboltSlug}-chapter-${num}/`;

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        className={`btn-chapter-toggle ${open ? "open" : ""}`}
        onClick={handleToggle}
        title="Browse chapters"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className={`chapter-picker ${opensDown ? "opens-down" : ""}`}>
          <div className="chapter-picker-header">
            <span>All Chapters</span>
            <span className="chapter-picker-count">{latest} total</span>
          </div>
          <div className="chapter-picker-list">
            {chapters.map((num) => (
              <a
                key={num}
                className={`chapter-picker-item ${num === latest ? "is-latest" : ""}`}
                href={chUrl(num)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
              >
                <span>Ch. {num}</span>
                {num === latest && (
                  <span className="chapter-picker-badge">Latest</span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default ChapterDropdownToggle;
