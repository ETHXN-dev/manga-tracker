import { useRef, useEffect } from "react";

const KANJI = [
  "漫",
  "画",
  "章",
  "新",
  "読",
  "本",
  "物",
  "語",
  "力",
  "夢",
  "剣",
  "闘",
  "血",
  "炎",
  "龍",
];

export default function KanjiBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 35 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      char: KANJI[Math.floor(Math.random() * KANJI.length)],
      size: Math.random() * 24 + 16,
      speed: Math.random() * 0.4 + 0.15,
      opacity: Math.random() * 0.25 + 0.15,
      drift: (Math.random() - 0.5) * 0.3,
      wobble: Math.random() * Math.PI * 2,
    }));

    particles.forEach((p) => {
      p.font = `${p.size}px serif`;
    });

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#e8302a";
      let lastFont = "";
      particles.forEach((p) => {
        p.wobble += 0.008;
        p.x += Math.sin(p.wobble) * p.drift;
        p.y -= p.speed;
        if (p.y < -40) {
          p.y = canvas.height + 20;
          p.x = Math.random() * canvas.width;
          p.char = KANJI[Math.floor(Math.random() * KANJI.length)];
        }
        ctx.globalAlpha = p.opacity;
        if (p.font !== lastFont) {
          ctx.font = p.font;
          lastFont = p.font;
        }
        ctx.fillText(p.char, p.x, p.y);
      });
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}
    />
  );
}
