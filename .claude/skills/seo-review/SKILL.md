---
name: seo-review
description: Monthly Search Console review for Wordsmith. Reads GSC via openseo, buckets pages into prune / strengthen / re-prioritize / new-page-type proposals, writes a dated report, and opens a PR of reversible data-only edits (PRUNED_WORDS, BOOSTED_WORDS, keyword-backlog order). Run monthly. Use when the user says "run seo review", "/seo-review", or the monthly reminder fires.
---

# Wordsmith monthly SEO review

Automate the eyes, gate the hands: analyze GSC, propose changes as a reviewable
PR. Never auto-build new templates or regenerate page content. All applied
changes are reversible data (word sets + backlog order).

App lives in `wordsmith-app/`. Branch off latest `main` for the PR.

## Step 0 — Prerequisite
Call `mcp__openseo__list_projects`. Confirm a project is connected to the
trywordsmith.com GSC property. If none is connected, STOP and tell the user:
"Connect the trywordsmith.com Search Console property to your openseo project,
then re-run." Do not fabricate data.

## Step 1 — Pull GSC (openseo)
For the trywordsmith.com project:
- `mcp__openseo__get_search_console_performance` — page rows and query rows
  (impressions, clicks, avg position) for the last 28 and 90 days.
- `mcp__openseo__inspect_urls` — indexation status for sitemap URLs, prioritizing
  pages with 0 impressions (sample up to the tool's limit; note coverage).

Large results persist to a file — read them in chunks / with jq, never dump the
whole payload into context.

## Step 2 — Bucket the data (explicit thresholds)
- **Prune candidates:** indexation status "Discovered - not indexed" or
  "Crawled - not indexed" AND page age >= 60 days; OR indexed with 0 impressions
  over 90 days. Cap APPLIED changes at <= 10% of indexed pages per month; list
  any excess in the report only. Never prune a word that has impressions.
  → add the word to `PRUNED_WORDS`.
- **Strengthen targets:** page/query avg position between 5 and 20 inclusive AND
  >= 20 impressions / 28 days. → add the word to `BOOSTED_WORDS`.
- **Backlog re-priority:** rank existing pages by impressions; note which
  categories/word-shapes over-index; reorder `wordsmith-app/seo/keyword-backlog.json`
  (order only — no additions or removals) so similar words publish sooner. Also
  list high-impression GSC queries with no matching page.
- **New-page-type proposals:** cluster GSC queries the site ranks for that don't
  map to /words or /synonyms-for (e.g. "another word for X", "words to describe
  X", "X vs Y"). Per cluster: the pattern, 3 example queries, total impressions,
  one-line template proposal. REPORT ONLY — do not build.

## Step 3 — Output
1. Write `wordsmith-app/seo/reviews/YYYY-MM.md` with all four buckets, the
   evidence (numbers), and before/after counts.
2. Create branch `seo-review-YYYY-MM`. Apply buckets 1-3 only:
   - Add prune words to `PRUNED_WORDS` in `wordsmith-app/src/lib/seo-controls.ts`.
   - Add strengthen words to `BOOSTED_WORDS` in the same file.
   - Reorder `wordsmith-app/seo/keyword-backlog.json`.
3. From `wordsmith-app`, run `npx tsc --noEmit` and `npx vitest run` (must pass).
4. Push the branch; open a PR with `gh pr create`, body = report summary. Do NOT
   merge — the user reviews.

## Guardrails
- Buckets 1-3 only in the PR. New page types are proposals for the user to
  greenlight (each becomes a separate build task).
- Never regenerate word_pages content. Never remove a word from SEED_WORDS.
- If GSC has little/no data (site still new), write an "insufficient data, no
  actions this month" report and open no PR. Expected for the first 1-2 months.
- Populate the word sets in a stable order (alphabetical) so the related-link
  boosting is deterministic.
