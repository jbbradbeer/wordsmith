import type { Scan, ScanStats } from "@/lib/types";

const BAND_COLOR: Record<string, string> = {
  clean: "#1A7A6D",
  murky: "#8B6914",
  slop: "#C0392B",
};

function Sparkline({ scores }: { scores: number[] }) {
  if (scores.length < 2) return null;
  const w = 120;
  const h = 34;
  const max = Math.max(...scores, 1);
  const min = Math.min(...scores, 0);
  const range = Math.max(1, max - min);
  const pts = scores
    .map((s, i) => {
      const x = (i / (scores.length - 1)) * w;
      const y = h - ((s - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={`Recent Slop Scores from ${scores[0]} to ${scores[scores.length - 1]}`}
      className="overflow-visible"
    >
      <polyline points={pts} fill="none" stroke="#8B6914" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Pro companion strip: greeting + progress. Metadata only, never draft text. */
export default function CompanionHome({ recent, stats }: { recent: Scan[]; stats: ScanStats }) {
  const hasTrend = stats.earlyAvg !== null && stats.recentAvg !== null;
  // Sparkline wants chronological order; `recent` is newest-first.
  const chronoScores = [...recent].reverse().map((s) => s.score);

  return (
    <section
      aria-label="Your writing progress"
      className="max-w-[1000px] mx-auto px-6 pt-8 pb-2"
    >
      <div className="bg-white border border-parchment-300 rounded-3xl p-6 md:p-7 shadow-[0_4px_28px_rgba(26,26,24,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-black text-[22px] md:text-[26px] text-parchment-900 m-0">
              Welcome back.
            </h2>
            <p className="font-body text-[15px] text-parchment-600 m-0 mt-1">
              {hasTrend ? (
                <>
                  {stats.total} drafts de-slopped. Average score {stats.earlyAvg} to {stats.recentAvg}.
                </>
              ) : (
                <>Your first scans are in. Keep going to see your trend.</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-6">
            {stats.best !== null && (
              <div className="text-center">
                <div className="font-display font-black text-3xl text-gold leading-none tabular-nums">{stats.best}</div>
                <div className="font-body text-[11px] uppercase tracking-[0.12em] text-parchment-500 mt-1">Best</div>
              </div>
            )}
            {stats.streakDays > 0 && (
              <div className="text-center">
                <div className="font-display font-black text-3xl text-parchment-900 leading-none tabular-nums">{stats.streakDays}</div>
                <div className="font-body text-[11px] uppercase tracking-[0.12em] text-parchment-500 mt-1">Day streak</div>
              </div>
            )}
            <Sparkline scores={chronoScores} />
          </div>
        </div>

        {recent.length > 0 && (
          <div className="mt-5 pt-4 border-t border-parchment-200 flex flex-wrap gap-x-6 gap-y-2">
            {recent.slice(0, 6).map((s) => (
              <span key={s.createdAt} className="font-body text-[13px] text-parchment-600 inline-flex items-center gap-2">
                {new Date(s.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                <span className="font-semibold tabular-nums" style={{ color: BAND_COLOR[s.band] ?? "#8A8478" }}>
                  {s.score}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
