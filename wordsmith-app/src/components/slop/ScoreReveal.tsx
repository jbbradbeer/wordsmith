import { useEffect, useRef, useState } from "react";
import type { ScanResult } from "@/lib/slop/types";

const BANDS = {
  clean: { color: "#1A7A6D", label: "Clean", note: "Reads human. Ship it." },
  murky: { color: "#8B6914", label: "Murky", note: "A few tells are showing." },
  slop: { color: "#C0392B", label: "Slop", note: "Reads machine-made. Rewrite the flagged spans." },
} as const;

/** Prominent, animated Slop Score. The centerpiece of the result state. */
export default function ScoreReveal({ result }: { result: ScanResult }) {
  const band = BANDS[result.band];
  const [shown, setShown] = useState(result.score);
  const raf = useRef<number | null>(null);

  // Count up to the score (respects reduced motion)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(result.score);
      return;
    }
    const target = result.score;
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 650);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(from + (target - from) * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [result.score]);

  const rows: [string, number][] = [
    ["AI-isms", result.breakdown.aiisms],
    ["Clichés", result.breakdown.cliches],
    ["Hedging", result.breakdown.hedging],
    ["Rhythm", result.breakdown.rhythm],
  ];

  return (
    <div className="bg-white border border-parchment-300 rounded-3xl p-7 text-center">
      <div className="font-body text-[11px] font-semibold tracking-[0.24em] uppercase text-parchment-500 mb-2">
        Slop Score
      </div>
      <div
        className="font-display font-black leading-none tabular-nums"
        style={{ fontSize: "clamp(72px, 12vw, 104px)", color: band.color }}
      >
        {shown}
      </div>
      <div className="font-body text-base font-bold uppercase tracking-[0.14em] mt-1" style={{ color: band.color }}>
        {band.label}
      </div>
      <p className="font-body text-[13px] text-parchment-600 mt-2 mb-6 max-w-[240px] mx-auto">
        {band.note}
        {result.degraded ? " (quick scan)" : ""}
      </p>

      <div className="grid grid-cols-2 gap-2 text-left">
        {rows.map(([label, v]) => (
          <div
            key={label}
            className="flex items-baseline justify-between rounded-xl border border-parchment-200 px-3 py-2 font-body"
          >
            <span className="text-[12px] text-parchment-600">{label}</span>
            <span
              className="text-[15px] font-bold tabular-nums"
              style={{ color: v > 0 ? band.color : "#6A6460" }}
            >
              {v > 0 ? v : "0"}
            </span>
          </div>
        ))}
      </div>

      <a
        href={`/score?v=${result.score}`}
        target="_blank"
        rel="noreferrer"
        className="footer-link inline-block mt-5 font-body text-[13px] font-semibold text-gold no-underline"
      >
        Share this score
      </a>
    </div>
  );
}
