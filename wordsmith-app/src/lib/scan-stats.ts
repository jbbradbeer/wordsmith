import type { ScanStats } from "./types";

function dayKey(iso: string): string {
  return iso.slice(0, 10); // UTC YYYY-MM-DD
}

function avg(nums: number[]): number {
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function shiftDay(key: string, deltaDays: number): string {
  const d = new Date(`${key}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

/** Pure, deterministic. `todayISO` = "YYYY-MM-DD" (UTC), passed in by the caller. */
export function computeScanStats(
  scans: { score: number; createdAt: string }[],
  todayISO: string
): ScanStats {
  const total = scans.length;
  if (total === 0) {
    return { total: 0, earlyAvg: null, recentAvg: null, best: null, streakDays: 0 };
  }

  const sorted = [...scans].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const scores = sorted.map((s) => s.score);
  const best = Math.min(...scores);

  let earlyAvg: number | null = null;
  let recentAvg: number | null = null;
  if (total >= 4) {
    const half = Math.min(5, Math.floor(total / 2));
    earlyAvg = avg(scores.slice(0, half));
    recentAvg = avg(scores.slice(total - half));
  }

  // Streak: consecutive days ending today or yesterday with >= 1 scan.
  const dayset = new Set(sorted.map((s) => dayKey(s.createdAt)));
  let streakDays = 0;
  let cursor: string | null = null;
  if (dayset.has(todayISO)) cursor = todayISO;
  else if (dayset.has(shiftDay(todayISO, -1))) cursor = shiftDay(todayISO, -1);
  while (cursor && dayset.has(cursor)) {
    streakDays += 1;
    cursor = shiftDay(cursor, -1);
  }

  return { total, earlyAvg, recentAvg, best, streakDays };
}
