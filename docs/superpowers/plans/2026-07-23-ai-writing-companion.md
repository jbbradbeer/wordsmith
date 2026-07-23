# AI Writing Companion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reposition Wordsmith as "the AI writing companion that keeps you sounding like you" and add a Pro-only companion home (greeting + Slop Score progress) to the homepage, reusing existing scan_history data.

**Architecture:** A pure `computeScanStats` function + new `GET /api/scans` (Pro-gated) feed a `useScans` hook and a presentational `CompanionHome` component conditionally rendered on `/` for signed-in Pro users. Copy updates carry the new brand. No migration, no stored draft text, no generation.

**Tech Stack:** Next.js 14 Pages router, TypeScript, vitest, existing helpers (withAuth, hasActiveAccess, checkRateLimit, missingEnv, getServiceSupabase).

## Global Constraints

- App root: `repo/wordsmith-app`. Paths relative to it.
- Pages router only; TypeScript strict; match existing style.
- Coaching only — NO generation/rewrite/ghostwriting. NEVER store or return draft text (scan_history is metadata only).
- No em-dashes in any new or edited user-facing copy (project rule).
- Companion home is Pro-only; free/anon see no progress. Anon/logged-out homepage must stay byte-identical to today (SEO safety).
- No new dependency; sparkline is inline SVG.
- Reuse existing helpers; do not re-implement auth/rate-limit/env checks.
- Verify: `npx tsc --noEmit`; `npx vitest run`; build via `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy SUPABASE_SERVICE_ROLE_KEY=dummy COOKIE_SECRET=dummy npx next build`. No dev server during build.
- Branch: `companion`. Commit after each task; body ends `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Types + computeScanStats (pure, tested)

**Files:**
- Modify: `src/lib/types.ts` (append)
- Create: `src/lib/scan-stats.ts`
- Test: `src/lib/__tests__/scan-stats.test.ts`

**Interfaces:**
- Produces: `Scan`, `ScanStats`, `ScansResponse` (types.ts); `computeScanStats(scans: { score: number; createdAt: string }[], todayISO: string): ScanStats`. Tasks 2-4 import these.

- [ ] **Step 1: Append types to types.ts**

```ts
// src/lib/types.ts (append)
export interface Scan {
  score: number;
  band: string;
  wordCount: number;
  createdAt: string; // ISO
}

export interface ScanStats {
  total: number;
  earlyAvg: number | null;   // null when total < 4
  recentAvg: number | null;  // null when total < 4
  best: number | null;       // lowest score; null when total === 0
  streakDays: number;        // consecutive UTC days ending today/yesterday
}

export type ScansResponse =
  | { pro: false }
  | { pro: true; recent: Scan[]; stats: ScanStats };
```

- [ ] **Step 2: Write the failing test**

```ts
// src/lib/__tests__/scan-stats.test.ts
import { describe, it, expect } from "vitest";
import { computeScanStats } from "../scan-stats";

const day = (d: string, score: number) => ({ score, createdAt: `${d}T12:00:00.000Z` });

describe("computeScanStats", () => {
  it("empty history", () => {
    expect(computeScanStats([], "2026-07-23")).toEqual({
      total: 0, earlyAvg: null, recentAvg: null, best: null, streakDays: 0,
    });
  });

  it("best is the lowest score", () => {
    const s = computeScanStats(
      [day("2026-07-20", 40), day("2026-07-21", 12), day("2026-07-22", 30)],
      "2026-07-23"
    );
    expect(s.best).toBe(12);
    expect(s.total).toBe(3);
  });

  it("no trend when total < 4", () => {
    const s = computeScanStats([day("2026-07-22", 40), day("2026-07-23", 20)], "2026-07-23");
    expect(s.earlyAvg).toBeNull();
    expect(s.recentAvg).toBeNull();
  });

  it("trend compares first vs last half (chronological), improving = recent lower", () => {
    const scans = [
      day("2026-07-01", 60), day("2026-07-02", 58), day("2026-07-03", 55), day("2026-07-04", 50),
      day("2026-07-20", 20), day("2026-07-21", 18), day("2026-07-22", 15), day("2026-07-23", 12),
    ];
    const s = computeScanStats(scans, "2026-07-23");
    expect(s.earlyAvg).toBeGreaterThan(s.recentAvg!);
  });

  it("handles unsorted input (sorts by date before trend)", () => {
    const scans = [
      day("2026-07-23", 12), day("2026-07-01", 60), day("2026-07-22", 15), day("2026-07-02", 58),
      day("2026-07-21", 18), day("2026-07-03", 55), day("2026-07-20", 20), day("2026-07-04", 50),
    ];
    const s = computeScanStats(scans, "2026-07-23");
    expect(s.earlyAvg).toBeGreaterThan(s.recentAvg!);
  });

  it("streak counts consecutive days ending today", () => {
    const s = computeScanStats(
      [day("2026-07-21", 30), day("2026-07-22", 25), day("2026-07-23", 20)],
      "2026-07-23"
    );
    expect(s.streakDays).toBe(3);
  });

  it("streak anchors to yesterday if no scan today", () => {
    const s = computeScanStats([day("2026-07-21", 30), day("2026-07-22", 25)], "2026-07-23");
    expect(s.streakDays).toBe(2);
  });

  it("streak is 0 when latest scan is older than yesterday", () => {
    const s = computeScanStats([day("2026-07-20", 30)], "2026-07-23");
    expect(s.streakDays).toBe(0);
  });

  it("streak breaks on a gap", () => {
    const s = computeScanStats(
      [day("2026-07-19", 30), day("2026-07-22", 25), day("2026-07-23", 20)],
      "2026-07-23"
    );
    expect(s.streakDays).toBe(2); // 22 and 23; 20-21 missing breaks it
  });
});
```

- [ ] **Step 3: Run to verify fail**

Run: `npx vitest run src/lib/__tests__/scan-stats.test.ts` — Expected: FAIL, cannot resolve `../scan-stats`.

- [ ] **Step 4: Implement scan-stats.ts**

```ts
// src/lib/scan-stats.ts
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
```

- [ ] **Step 5: Run tests + commit**

Run: `npx vitest run src/lib/__tests__/scan-stats.test.ts` (PASS), `npx tsc --noEmit` (clean).

```bash
git add wordsmith-app/src/lib/types.ts wordsmith-app/src/lib/scan-stats.ts wordsmith-app/src/lib/__tests__/scan-stats.test.ts
git commit -m "Add Scan/ScanStats types and computeScanStats"
```

---

### Task 2: GET /api/scans (Pro-gated)

**Files:**
- Create: `src/pages/api/scans.ts`

**Interfaces:**
- Consumes: `withAuth` (`@/lib/api`, passes `user`), `getServiceSupabase`, `hasActiveAccess` (`@/lib/subscription`), `missingEnv` (`@/lib/env`), `checkRateLimit` (`@/lib/rate-limit`), `createRequestLogger`, `computeScanStats` + `Scan`/`ScansResponse` (Task 1).
- Produces: GET returns `ScansResponse`. Task 3's hook parses it.

- [ ] **Step 1: Implement scans.ts**

```ts
// src/pages/api/scans.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/api";
import { hasActiveAccess } from "@/lib/subscription";
import { missingEnv } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit";
import { createRequestLogger } from "@/lib/logger";
import { computeScanStats } from "@/lib/scan-stats";
import type { Scan } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

async function handler(req: NextApiRequest, res: NextApiResponse, user: User) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (missingEnv("supabase").length > 0) {
    return res.status(503).json({ error: "server_misconfigured" });
  }
  const limit = checkRateLimit(`scans:${user.id}`, 30, 60_000);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSeconds));
    return res.status(429).json({ error: "rate_limited" });
  }

  const log = createRequestLogger("/api/scans", user.id);
  const serviceClient = getServiceSupabase();

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .single();

  if (!hasActiveAccess(profile?.subscription_status)) {
    return res.status(200).json({ pro: false });
  }

  const { data, error } = await serviceClient
    .from("scan_history")
    .select("score, band, word_count, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    log.error("scan_history read failed", error);
    return res.status(500).json({ error: "Could not load history" });
  }

  const rows = data ?? [];
  const stats = computeScanStats(
    rows.map((r) => ({ score: r.score, createdAt: r.created_at })),
    new Date().toISOString().slice(0, 10)
  );
  // Recent 10, newest first, metadata only (never any draft text)
  const recent: Scan[] = rows
    .slice(-10)
    .reverse()
    .map((r) => ({
      score: r.score,
      band: r.band,
      wordCount: r.word_count,
      createdAt: r.created_at,
    }));

  return res.status(200).json({ pro: true, recent, stats });
}

export default withAuth(handler);
```

- [ ] **Step 2: Verify + commit**

Run: `npx tsc --noEmit` and `npx vitest run` (no regression).

```bash
git add wordsmith-app/src/pages/api/scans.ts
git commit -m "Add GET /api/scans: Pro-gated Slop Score history and stats"
```

---

### Task 3: useScans hook + CompanionHome component

**Files:**
- Create: `src/lib/use-scans.ts`
- Create: `src/components/home/CompanionHome.tsx`

**Interfaces:**
- Consumes: `ScansResponse`/`Scan`/`ScanStats` (Task 1); `/api/scans` (Task 2); `useSession`.
- Produces: `useScans(): { loading: boolean; pro: boolean; recent: Scan[]; stats: ScanStats | null }`; `CompanionHome({ recent, stats }: { recent: Scan[]; stats: ScanStats })` (presentational). Task 4 imports both.

- [ ] **Step 1: Implement use-scans.ts (mirror use-user-info.ts)**

```ts
// src/lib/use-scans.ts
import { useEffect, useState } from "react";
import { useSession } from "@supabase/auth-helpers-react";
import type { Scan, ScanStats } from "./types";

/** Pro Slop Score history for the signed-in user. pro=false for free/anon. */
export function useScans() {
  const session = useSession();
  const [loading, setLoading] = useState(false);
  const [pro, setPro] = useState(false);
  const [recent, setRecent] = useState<Scan[]>([]);
  const [stats, setStats] = useState<ScanStats | null>(null);

  useEffect(() => {
    if (!session) {
      setPro(false);
      setRecent([]);
      setStats(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch("/api/scans")
      .then((res) => (res.ok ? res.json() : { pro: false }))
      .then((data) => {
        if (cancelled) return;
        if (data?.pro) {
          setPro(true);
          setRecent(data.recent ?? []);
          setStats(data.stats ?? null);
        } else {
          setPro(false);
        }
      })
      .catch(() => {
        if (!cancelled) setPro(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  return { loading, pro, recent, stats };
}
```

- [ ] **Step 2: Implement CompanionHome.tsx**

```tsx
// src/components/home/CompanionHome.tsx
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
                <div className="font-display font-black text-3xl text-gold leading-none">{stats.best}</div>
                <div className="font-body text-[11px] uppercase tracking-[0.12em] text-parchment-500 mt-1">Best</div>
              </div>
            )}
            {stats.streakDays > 0 && (
              <div className="text-center">
                <div className="font-display font-black text-3xl text-parchment-900 leading-none">{stats.streakDays}</div>
                <div className="font-body text-[11px] uppercase tracking-[0.12em] text-parchment-500 mt-1">Day streak</div>
              </div>
            )}
            <Sparkline scores={chronoScores} />
          </div>
        </div>

        {recent.length > 0 && (
          <div className="mt-5 pt-4 border-t border-parchment-200 flex flex-wrap gap-x-6 gap-y-2">
            {recent.slice(0, 6).map((s, i) => (
              <span key={i} className="font-body text-[13px] text-parchment-600 inline-flex items-center gap-2">
                {new Date(s.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                <span className="font-semibold" style={{ color: BAND_COLOR[s.band] ?? "#8A8478" }}>
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
```

- [ ] **Step 3: Verify + commit**

Run: `npx tsc --noEmit`; `npx vitest run` (no regression). No unit test for the React component/hook (repo convention); pure logic is tested in Task 1.

```bash
git add wordsmith-app/src/lib/use-scans.ts wordsmith-app/src/components/home/CompanionHome.tsx
git commit -m "Add useScans hook and CompanionHome progress strip"
```

---

### Task 4: Homepage wiring (Pro strip + free teaser)

**Files:**
- Modify: `src/pages/index.tsx`

**Interfaces:**
- Consumes: `useScans` (Task 3), `CompanionHome` (Task 3). The page already imports `useSession`, has `setShowPaywall`, and renders the hero + analyzer.

- [ ] **Step 1: Add imports + hook call**

Near the other imports:
```tsx
import { useScans } from "@/lib/use-scans";
import CompanionHome from "@/components/home/CompanionHome";
```
Inside the component, after `const session = useSession();`:
```tsx
  const { pro, stats, recent } = useScans();
```

- [ ] **Step 2: Render the companion strip / teaser above the hero header**

Immediately AFTER the closing `</nav>` and BEFORE the `<header ...>` hero, insert:
```tsx
      {session && pro && stats && <CompanionHome recent={recent} stats={stats} />}
      {session && !pro && (
        <div className="max-w-[1000px] mx-auto px-6 pt-8">
          <button
            onClick={() => setShowPaywall(true)}
            className="w-full text-left bg-parchment-100/70 border border-gold/25 rounded-2xl px-5 py-4 font-body text-[14px] text-parchment-700 cursor-pointer transition-colors hover:bg-parchment-100"
          >
            <span className="font-semibold text-parchment-900">Wordsmith Pro tracks your Slop Score over time.</span>{" "}
            See your drafts get cleaner, scan after scan. Upgrade to unlock your progress.
          </button>
        </div>
      )}
```
(Anon / logged-out renders neither, so the marketing landing is unchanged.)

- [ ] **Step 3: Verify + commit**

Run: `npx tsc --noEmit`; `npx vitest run`; dummy-env build — green, `/` compiles. Confirm the anon path renders nothing extra (the two blocks are gated on `session`).

```bash
git add wordsmith-app/src/pages/index.tsx
git commit -m "Homepage: companion progress strip for Pro, teaser for free"
```

---

### Task 5: Brand/copy reposition

**Files:**
- Modify: `src/pages/_app.tsx`, `src/pages/index.tsx`, `src/components/home/HowItWorks.tsx`

**Interfaces:** copy only; no new exports.

- [ ] **Step 1: `_app.tsx` default meta**

Replace:
```tsx
const DEFAULT_TITLE = "Wordsmith: De-slop Your Writing";
const DEFAULT_DESCRIPTION =
  "Paste your draft and get a Slop Score. Wordsmith flags the AI tells in your writing, explains each one, and helps you rewrite in your own voice. It never writes for you.";
```
with:
```tsx
const DEFAULT_TITLE = "Wordsmith: The AI Writing Companion";
const DEFAULT_DESCRIPTION =
  "Wordsmith is the AI writing companion that keeps you sounding like you, not like AI. Paste a draft, get a Slop Score, and rewrite in your own voice. It never writes for you.";
```

- [ ] **Step 2: `index.tsx` title/description/hero subline**

Update the page constants:
```tsx
const TITLE = "Wordsmith: The AI Writing Companion That Keeps You Human";
const DESCRIPTION =
  "The AI writing companion that keeps you sounding like you, not like AI. It reads your draft, flags the tells, and never writes a word for you.";
```
Replace the hero subline paragraph text with:
```tsx
            Your AI writing companion. It reads every draft, flags the slop, and
            explains each tell. You rewrite in your own voice. It never writes a
            word for you.
```
(Keep the `<h1>` "Sound like you. Not like a bot." unchanged.)

- [ ] **Step 3: `HowItWorks.tsx` reinforce the brand spine**

Keep the heading "It coaches. It never ghostwrites." Add ONE sentence directly under that `<h2>` (a `<p>` with the section's existing max-width/centering classes):
```tsx
          <p className="font-body text-[15px] text-parchment-600 text-center max-w-[520px] mx-auto m-0 mb-14 -mt-8">
            An AI whose entire job is making sure you do not sound like AI. It
            points; you write.
          </p>
```
Adjust the existing heading's bottom margin if needed so spacing reads cleanly (the heading currently has `mb-14`; move that to the new paragraph as shown).

- [ ] **Step 4: Copy self-audit + verify**

Re-read every edited string: no em-dashes, no broken grammar. Run `npx tsc --noEmit`, `npx vitest run`, dummy-env build.

```bash
git add wordsmith-app/src/pages/_app.tsx wordsmith-app/src/pages/index.tsx wordsmith-app/src/components/home/HowItWorks.tsx
git commit -m "Reposition copy: the AI writing companion that keeps you human"
```

---

### Task 6: Verification sweep

**Files:** none (verification + optional tasks/todo note).

- [ ] **Step 1: Full verification**

In `wordsmith-app`: `npx tsc --noEmit`; `npx vitest run` (all pass incl. scan-stats); dummy-env build (green; `/`, `/api/scans` present in route list). Confirm no em-dashes in changed copy: `git diff main --unified=0 -- src | grep -n "—"` returns nothing in added lines.

- [ ] **Step 2: Note user-facing behavior**

Append a short "AI writing companion" section to `tasks/todo.md` (repo-root tasks dir): what shipped, and that the companion home appears only for signed-in Pro users (no user setup, reuses scan_history).

- [ ] **Step 3: Open PR / merge**

Push `companion`; merge to main after the whole-branch review. Vercel deploys.

---

## Self-Review (completed)

- **Spec coverage:** types + stats (T1), /api/scans Pro-gated (T2), hook + CompanionHome sparkline/greeting/list (T3), homepage conditional + free teaser + anon-unchanged (T4), brand copy across _app/index/HowItWorks (T5), verification (T6). Metadata-only + SEO-safety + no-generation guardrails enforced in T2/T4 and global constraints.
- **Placeholder scan:** none — every code step carries complete code; copy strings are final and em-dash-free.
- **Type consistency:** `Scan`/`ScanStats`/`ScansResponse` (T1) consumed verbatim by T2/T3; `computeScanStats(scans, todayISO)` signature matches its test and its T2 call; `useScans` return shape matches CompanionHome props (`recent`, `stats`) used in T4.
