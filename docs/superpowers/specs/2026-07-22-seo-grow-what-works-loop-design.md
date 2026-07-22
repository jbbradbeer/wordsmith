# v2 SEO "Grow-What-Works" Loop — Design

**Date:** 2026-07-22
**Status:** Approved by JB

## Purpose

The v1 SEO loop is content-velocity only: it publishes ~50 pages/week from a
fixed validated backlog, blind to results. v2 closes the feedback loop with
Google Search Console (GSC) data. Monthly, it reads GSC and produces four
actions: **prune** pages that never index, **strengthen** pages sitting at
position 5-20, **re-prioritize** the backlog toward what earns impressions, and
**propose new page types** from real query patterns.

Actions are consequential on a live site, so the design is **automate the eyes,
gate the hands**: analysis is automated; every change lands as a reviewable PR
of reversible, data-only edits. New page types and content regeneration are
never auto-applied.

## Architecture

Three parts:

1. **Apply-plumbing** (built once, in code) — two sets the existing word/synonym
   templates and sitemap respect, so monthly changes are data edits, not code.
2. **`/seo-review` command** (a skill run in an interactive session, where the
   openseo GSC connector works) — pulls GSC, analyzes, writes a report, opens a PR.
3. **Reminder** — a monthly scheduled agent that reliably notifies JB the review
   is due.

### Why interactive, not headless cron
openseo's GSC tools are an interactively-authenticated MCP connector; a headless
cloud routine cannot reliably reach them (per the schedule skill's own warning).
So the data-pull runs in a session JB triggers via `/seo-review`; the reminder
(which needs no connector) is the only scheduled piece.

## Part 1 — Apply-plumbing (one-time code)

### `src/lib/seo-controls.ts`
```ts
// Words whose pages should be de-indexed (noindex + dropped from sitemap).
// Kept live for direct visitors and existing backlinks; reversible.
export const PRUNED_WORDS: ReadonlySet<string>;
// Words whose pages get an FAQ block + extra inbound internal links.
// Additive strengthening for position 5-20 pages; core content untouched.
export const BOOSTED_WORDS: ReadonlySet<string>;
export function isPruned(word: string): boolean;
export function isBoosted(word: string): boolean;
```
Both sets start empty. The monthly PR edits them.

### Template changes (`/words/[word].tsx`, `/synonyms-for/[word].tsx`)
- If `isPruned(word)`: add `<meta name="robots" content="noindex,follow" />`.
  (`follow` so link equity still flows out.)
- If `isBoosted(word)`: render an **FAQ section** + `FAQPage` JSON-LD, built
  deterministically from the page's own `alternatives` data (no Claude call).
  FAQ questions are templated, e.g.:
  - "What is a better word for {word}?" → top 3 alternatives.
  - "What can I say instead of {word}?" → next alternatives.
  - "Is {word} overused?" → short static answer + CTA.

### Sitemap (`sitemap.xml.ts`)
Exclude `PRUNED_WORDS` from both `/words/*` and `/synonyms-for/*` entries.

### Internal-link bias (`relatedWords` in `seed-words.ts`, or a wrapper)
When building a page's related-word chips, ensure any `BOOSTED_WORDS` that are
plausibly related surface in the list, so boosted pages gain inbound internal
links from across the site. Keep deterministic; do not exceed the existing chip
count. Implementation: after computing the normal related list, if fewer than N
boosted words appear, swap the lowest-priority chips for related boosted words.

### FAQ generator (`src/lib/faq.ts`)
Pure function `buildWordFaq(word, alternatives): {q: string; a: string}[]`.
Deterministic, no network. Used by both templates and the JSON-LD.

### Tests
- `sitemap` excludes a pruned word; includes a normal word.
- `isPruned`/`isBoosted` correct.
- `buildWordFaq` returns well-formed Q&A from sample alternatives; stable output.
- Internal-link bias: a boosted related word appears in the chip list when
  eligible; chip count unchanged.

## Part 2 — `/seo-review` command (monthly playbook)

A skill at `.claude/skills/seo-review/` (or a slash command) encoding:

**Step 0 — Prerequisite check.** Confirm the openseo project is connected to the
trywordsmith.com GSC property (via `list_projects` / a probe call). If not,
stop and tell JB to connect it in the openseo dashboard.

**Step 1 — Pull GSC (openseo).** For trywordsmith.com:
- `get_search_console_performance` — page + query rows (impressions, clicks,
  avg position) over the last 28 and 90 days.
- `inspect_urls` — indexation status for a sample of sitemap URLs (prioritize
  pages with zero impressions).

**Step 2 — Bucket the data (heuristics, all thresholds explicit):**
- **Prune candidates:** URL indexation status is "Discovered – not indexed" or
  "Crawled – not indexed" AND page age ≥ 60 days; OR indexed with 0 impressions
  over 90 days. → add word to `PRUNED_WORDS`.
- **Strengthen targets:** page/query avg position between 5 and 20 (inclusive)
  AND ≥ 20 impressions/28 days. → add word to `BOOSTED_WORDS`.
- **Backlog re-priority:** rank existing pages by impressions; note which
  categories/word-shapes over-index; reorder `keyword-backlog.json` so
  similar words publish sooner. Also list high-impression GSC queries with no
  matching page.
- **New-page-type proposals:** cluster GSC queries the site ranks for that don't
  map to an existing template (e.g. "another word for X", "words to describe X",
  "X vs Y"). For each cluster: the pattern, example queries, total impressions,
  and a one-line template proposal. **Report only — not applied.**

**Step 3 — Output:**
- Commit a dated report to `seo/reviews/YYYY-MM.md` (all four buckets, evidence,
  before/after counts).
- Open a PR on a branch `seo-review-YYYY-MM` applying buckets 1-3 only:
  edits to `PRUNED_WORDS`, `BOOSTED_WORDS`, and `keyword-backlog.json` order.
  PR body summarizes the report. JB reviews, merges or trims.

**Guardrails in the playbook:**
- Cap prune at ≤ 10% of indexed pages per month (avoid mass-deindex from a data
  glitch); if the heuristic flags more, list the rest in the report but don't
  apply.
- Never edit `PRUNED_WORDS` to remove a word that has impressions.
- Never auto-build a new template or regenerate `word_pages` content.

## Part 3 — Reminder

A monthly scheduled agent (cron `0 14 1 * *`, 1st of month 14:00 UTC). Its only
job: reliably tell JB the review is due. Notification channel finalized in
implementation, in priority order: (a) open a GitHub issue "Monthly SEO review
due — run /seo-review" via `gh` if the routine's token allows; else (b) commit
and push a marker file `seo/reviews/DUE-YYYY-MM.md`. Either produces a real
notification. The routine does not attempt the GSC pull (headless connector
unreliable).

## Data flow

```
[monthly reminder] --notify--> JB runs /seo-review (session)
  -> openseo GSC pull -> bucket -> seo/reviews/YYYY-MM.md (report)
                                 -> PR: PRUNED_WORDS / BOOSTED_WORDS / backlog order
  -> JB reviews PR -> merge -> Vercel deploy
     -> pruned pages noindex + drop from sitemap
     -> boosted pages get FAQ + inbound links
     -> weekly v1 loop now publishes re-prioritized words
```

## Error handling
- openseo not connected to GSC → stop at Step 0 with clear instructions.
- GSC returns little/no data (site still new) → report says "insufficient data,
  no actions this month"; open no PR. Expected for the first 1-2 months.
- PR conflicts with the weekly loop's backlog edits → rebase; backlog is the only
  shared file, and order-only edits merge cleanly in practice.

## Out of scope (v2)
- Auto-building new page-type templates (proposed only; each is a separate task).
- Regenerating existing page content (additive strengthening only).
- Headless/autonomous apply (all changes are human-reviewed PRs).
- Non-GSC data sources (openseo keyword tools already cover backlog research).

## User setup (one-time)
Connect the trywordsmith.com GSC property to the openseo project in the openseo
dashboard. Verified by Step 0 of the first `/seo-review` run.

## Files
- Create: `src/lib/seo-controls.ts`, `src/lib/faq.ts`, tests for both.
- Modify: `src/pages/words/[word].tsx`, `src/pages/synonyms-for/[word].tsx`,
  `src/pages/sitemap.xml.ts`, `src/lib/seed-words.ts` (or a related-words wrapper).
- Create: `.claude/skills/seo-review/SKILL.md` (the playbook).
- Create (via schedule tooling): the monthly reminder routine.
- Monthly output: `seo/reviews/YYYY-MM.md` + `seo-review-YYYY-MM` PRs.
