# Wordsmith De-Slop Companion — Design

**Date:** 2026-07-20
**Status:** Approved by JB (pricing amended to keep $10/$96)

## Purpose

Pivot Wordsmith from a thesaurus into a writing companion that removes AI-slop
tells from human writing. It never writes for the user — it flags slop, explains
why, offers word-level alternatives, and the user rewrites. The headline metric
is the **Slop Score** (0–100, lower is better), designed to be shared.

Positioning guardrails:
- We do NOT certify "not written by AI" and never claim to beat AI detectors.
  The promise is craft: no slop tells, distinct voice, human cadence.
- The tool never inserts sentences. Word-level suggestions only, plus craft
  hints. Authorship stays with the writer.

## Product surface

- `/` becomes the analyzer: paste-a-draft editor, "Get your Slop Score" CTA.
  Landing copy rewritten around de-slopping. Existing landing components
  (Hero, PricingSection, etc.) restyled/reworded, not rebuilt.
- Word search moves to `/search`, unchanged functionally. Nav links to it.
  All SEO pages (`/words/*`, `/synonyms-for/*`, category hubs, sitemap,
  weekly loop) unchanged — they funnel into the new identity.

## Engine — `src/lib/slop/` (hybrid: rules + one Claude pass)

### `rules.ts` — deterministic layer (instant, free, unit-tested)
Pure functions over the text. Detectors:
- Slop-phrase dictionary (separate data file `slop-phrases.ts`): AI-isms
  ("delve", "tapestry of", "it's important to note", "in today's fast-paced
  world", "game-changer", "unlock the power of"…), hedging boilerplate
  ("arguably", "it could be said"), stock transitions ("moreover",
  "furthermore" overuse).
- Em-dash density per 1,000 words.
- Sentence-length variance (too-uniform rhythm is a tell).
- Adverb density; empty intensifiers ("very", "truly", "incredibly").
- Listicle cadence and paragraph-length uniformity.
Each detector returns spans `{start, end, category, why, hint}` and/or a
document-level stat.

### `claude-pass.ts` — judgment layer (one call per scan)
Single Claude call returns JSON spans for categories rules can't catch:
generic voice, clichéd framing, empty intensity. Response schema-validated;
malformed output degrades to rules-only.

### `score.ts` — merge
Deterministic 0–100 from rule hits + Claude spans, normalized by word count.
Bands: 0–20 clean, 21–50 murky, 51+ slop. Per-category breakdown: rhythm,
clichés, hedging, AI-isms. Same input ⇒ same score.

### `/api/analyze`
POST, SSE (same pattern as `/api/search`): rules result streams immediately,
Claude spans follow (~5–10s). Metering checked before the Claude call. If the
Claude pass fails: serve rules-only result and DO NOT consume the scan.
Rate-limited like search. Text is never persisted.

## Fix loop (guided self-rewrite)

Highlighted document view. Click a span → card:
- **WHY** — plain-English explanation of the tell
- **TRY** — craft hint ("name the specific thing instead")
- **WORDS** — curated alternatives, served free from the existing `word_pages`
  cache when the flagged word is a seed word; otherwise a link to `/search`
User edits their text in place. Rules layer re-scores live client-side
(instant, free). A fresh Claude pass = a new scan (metered).

## Metering & pricing (final: price unchanged)

- Anonymous: 1 scan lifetime — reuse the signed anon cookie + `anon_usage` IP
  infra with a salted separate bucket (prefix the IP hash), no schema change.
- Free account: 1 scan/day, 1,500-word cap. Migration 007 adds
  `scan_count`/`last_scan_reset` to profiles + atomic RPC
  `try_increment_scan_count` mirroring the search-count pattern
  (daily lazy reset, paid statuses unlimited, FOR UPDATE lock).
- Pro: unchanged **$10/mo, $96/yr** (existing Stripe prices untouched).
  Pro gets: unlimited scans, 10,000-word cap, scan history (scores +
  metadata only, never text). Word-search free tier (3/day) unchanged.
- PaywallModal copy gains the scan pitch; price display unchanged.

## Trust & sharing

- Drafts never stored; analysis is in-flight only. Stated in the UI.
  Pro history = date, score, band, word count, category breakdown. No text.
- Share: result offers a share link rendering a score-badge OG image via a
  `@vercel/og` edge route (`/api/og-score`). The share page shows the badge
  and a CTA, never the analyzed text.

## Analytics

New funnel events (existing `trackEvent` union extended): `scan_started`,
`scan_completed {band}`, `span_clicked`, `limit_hit {kind: "scan"}`.
Downstream checkout events unchanged.

## Testing

- Rules detectors: fixtures of slop text vs clean text; span offsets exact.
- Score: deterministic, monotonic (removing a flagged span never raises it),
  normalization sane across 100 vs 5,000 words.
- Merge: overlapping rule/Claude spans dedupe sensibly.
- Metering RPC: daily reset, paid bypass, concurrency (mirrors existing tests).
- Claude-pass failure path: rules-only result, scan not consumed.

## Error handling

- Claude pass timeout/failure → rules-only result + notice, scan refunded.
- Oversized paste → clear error naming the cap for the user's tier.
- `/api/analyze` env-gated like search (503 with no var names leaked).

## Out of scope (v1)

Chrome extension; Google Docs integration; docx/PDF upload; slop-dictionary
SEO pages (`/slop/[phrase]` — earmarked as the next SEO expansion); team
plans; storing drafts.

## User setup on ship

- Run migration 007 in Supabase.
- No Stripe changes (pricing unchanged).

## Rollout note

Homepage swap is low-SEO-risk: organic traffic lives on `/words/*` and
`/synonyms-for/*`, which are untouched. The `/search` move keeps the current
search experience one click away for existing users.
