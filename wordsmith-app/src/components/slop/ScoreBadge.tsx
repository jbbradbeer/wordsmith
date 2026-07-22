import type { ScanResult } from "@/lib/slop/types";

const BAND_STYLES = {
  clean: { color: "#1A7A6D", label: "Clean" },
  murky: { color: "#D4A017", label: "Murky" },
  slop: { color: "#C0392B", label: "Slop" },
} as const;

export default function ScoreBadge({ result }: { result: ScanResult }) {
  const band = BAND_STYLES[result.band];
  const rows: [string, number][] = [
    ["AI-isms", result.breakdown.aiisms],
    ["Clichés", result.breakdown.cliches],
    ["Hedging", result.breakdown.hedging],
    ["Rhythm", result.breakdown.rhythm],
  ];
  return (
    <div className="bg-white border border-parchment-300 rounded-2xl p-6 text-center w-full max-w-[240px]">
      <div className="font-body text-[11px] font-semibold tracking-[0.22em] uppercase text-parchment-500 mb-1">
        Slop Score
      </div>
      <div className="font-display font-black text-[56px] leading-none" style={{ color: band.color }}>
        {result.score}
      </div>
      <div className="font-body text-sm font-semibold mb-4" style={{ color: band.color }}>
        {band.label}{result.degraded ? " · quick scan" : ""}
      </div>
      <div className="text-left">
        {rows.map(([label, v]) => (
          <div key={label} className="flex justify-between font-body text-[13px] text-parchment-700 py-0.5">
            <span>{label}</span>
            <span className="font-semibold" style={{ color: v > 0 ? band.color : "#8A8478" }}>
              {v > 0 ? v : "ok"}
            </span>
          </div>
        ))}
      </div>
      <a
        href={`/score?v=${result.score}`}
        target="_blank"
        rel="noreferrer"
        className="font-body text-[12px] text-gold font-semibold no-underline block mt-3"
      >
        Share this score →
      </a>
    </div>
  );
}
