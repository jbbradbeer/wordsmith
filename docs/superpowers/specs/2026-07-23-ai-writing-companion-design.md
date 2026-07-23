# Wordsmith as the AI Writing Companion — Design

**Date:** 2026-07-23
**Status:** Approved by JB

## Purpose

Reposition Wordsmith as **"the AI writing companion that keeps you sounding like
you, not like AI"** and enhance the product so it *feels* like a companion, not a
one-shot tool. The AI is the coach: it flags slop, explains it, and tracks your
progress. It never writes for you. The paradox (an AI whose job is making you
sound un-AI) is the brand hook and protects the existing moat.

Two parts:
- **A. Brand/copy reposition** — site-wide, no structural change.
- **B. Companion home** — a Pro-only progress surface on the homepage that turns
  scans into a return-visit habit, reusing the `scan_history` metadata already
  captured. Ships the previously-deferred Pro history UI.

Guardrails: no generation/rewrite/ghostwriting; no draft text ever stored
(metadata only, unchanged); coaching only.

## Part A — Brand/copy reposition

No new components. Update copy in place:

- `src/pages/_app.tsx`: `DEFAULT_TITLE` = "Wordsmith: The AI Writing Companion";
  `DEFAULT_DESCRIPTION` reframed around "AI writing companion that flags the AI
  tells in your writing and never writes for you."
- `src/pages/index.tsx` hero: keep the punch line "Sound like you. Not like a
  bot." Add a companion subline: "Your AI writing companion. It reads every
  draft, flags the slop, and never writes a word for you." Update the page
  `TITLE`/`DESCRIPTION` similarly.
- `src/components/home/HowItWorks.tsx`: the "It coaches. It never ghostwrites."
  section is the brand spine — keep, tighten copy to reinforce "AI companion".
- Add one short beat (reuse an existing section or a light addition) answering
  "Why trust an AI to sound less like AI?" → it only ever points; you do the
  writing. Keep it to a headline + one sentence; do not add a heavy new section.
- No em-dashes in any new/edited copy (project rule). Wordmark stays "Wordsmith".

## Part B — Companion home

### Data (no migration; reuses `scan_history`)
`scan_history` already holds, per Pro scan: `score`, `band`, `word_count`,
`breakdown` (JSONB), `created_at`, `user_id`, indexed `(user_id, created_at DESC)`.
Metadata only — never the draft text. Populated in `analyze.ts` for paid users.

### `GET /api/scans` (new)
- `withAuth` (revalidated `getUser()`), Pro-gated via `hasActiveAccess`.
- Non-Pro (free/canceled) → `200 { pro: false }`.
- Pro → `200 { pro: true, recent: Scan[], stats: Stats }`:
  - `recent`: latest 10 scans, each `{ score, band, wordCount, createdAt }`
    (breakdown fetched but not required in the response; keep response lean).
  - `stats`:
    - `total`: count of the user's scans.
    - `earlyAvg` / `recentAvg`: mean score of the first vs last `min(5, floor(total/2))`
      scans by date; both null if `total < 4` (not enough to show a trend).
    - `best`: lowest score ever.
    - `streakDays`: consecutive calendar days (UTC) ending today or yesterday
      with >= 1 scan.
  - Reads via the service client scoped by `user.id` (scan_history is
    service-role only, RLS-locked). Rate-limited (reuse `checkRateLimit`, e.g.
    30/min/user). Env-gated (503 if supabase missing), consistent with siblings.
- Types added to `src/lib/types.ts`: `Scan`, `ScanStats`, `ScansResponse`.

### `useScans` hook (`src/lib/use-scans.ts`)
Fetches `/api/scans` once on mount when a session exists. Returns
`{ loading, pro, recent, stats }`. No fetch when logged out.

### `CompanionHome` component (`src/components/home/CompanionHome.tsx`)
Rendered on `/` when `session && pro`. Contains:
- Greeting: "Welcome back." (generic; no name — we only have email, keep it clean).
- Headline stat: when a trend exists, "N drafts de-slopped. Average score
  {earlyAvg} to {recentAvg}." Else a first-timer line ("Your first scans are in.
  Keep going to see your trend.").
- **Sparkline**: inline SVG of the recent scores (chronological), gold stroke,
  `aria-label` describing the trend. No chart library, no new dependency.
- Recent-scans list: up to ~6 rows, each `date | score | band chip`.
- All metadata; never shows draft text (consistent with "never stored").

### Homepage wiring (`src/pages/index.tsx`)
- `const { pro } = useScans()` (plus session).
- If `session && pro`: render `<CompanionHome />` above the analyzer header.
- If `session && !pro` (free signed-in): render a subtle one-line teaser card
  "Pro tracks your Slop Score over time." linking to the paywall/pricing.
- Else (anon / logged-out): render nothing extra — the marketing landing is
  byte-identical to today. SEO crawlers are logged out, so indexing is untouched.

### Free-user teaser
A small `Pro tracks your progress` card (reuse existing button styles); clicking
opens the existing PaywallModal (already wired on the page). No new modal.

## Data flow
```
Pro scan -> analyze.ts inserts metadata into scan_history (already happens)
Homepage mount (Pro) -> useScans -> GET /api/scans -> service client (by user.id)
  -> recent 10 + computed stats -> CompanionHome renders greeting/sparkline/list
Free signed-in -> GET /api/scans -> { pro:false } -> teaser card
Anon/logged-out -> no fetch -> marketing landing unchanged
```

## Error handling
- `/api/scans` env missing -> 503 server_misconfigured (no var names leaked).
- scan_history query error -> 500 generic; CompanionHome shows nothing (fails
  quiet, analyzer still works).
- `total < 4` -> no trend numbers; first-timer copy.
- Rate-limited -> 429; hook treats as no-data, silent.

## Testing
- Stats computation extracted to a pure `computeScanStats(scans): ScanStats` in
  `src/lib/scan-stats.ts`, unit-tested: trend halves, best = min, streak
  (consecutive days incl. gap breaks and today/yesterday anchor), `total < 4`
  returns null trend. Deterministic (pass dates in; no `Date.now` inside the
  pure fn — caller passes "today").
- `/api/scans` handler: pieces are unit-tested; no handler test (consistent with
  repo convention for SSE/API routes).
- Brand copy: no test; verified by build + visual.

## Out of scope
- Generation / rewrite / autocomplete (never).
- Storing draft text or a personal voice profile (future north-star; needs a
  privacy decision).
- Progress for free/anon users (no data stored for them by design).
- A dedicated /progress route (homepage-conditional chosen for the companion feel
  and SEO safety).
- Charts library (inline SVG sparkline only).

## User setup
None. `scan_history` already exists and is populated; no migration, no env, no
Stripe change.

## Files
- Modify: `src/pages/_app.tsx`, `src/pages/index.tsx`,
  `src/components/home/HowItWorks.tsx` (copy), `src/lib/types.ts` (types).
- Create: `src/pages/api/scans.ts`, `src/lib/use-scans.ts`,
  `src/lib/scan-stats.ts` (+ test), `src/components/home/CompanionHome.tsx`.
