# v2 SEO Grow-What-Works Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the apply-plumbing + monthly `/seo-review` playbook + reminder so GSC data can drive pruning, strengthening, backlog re-prioritization, and new-page-type proposals as reviewable, reversible PRs.

**Architecture:** Two word sets (`PRUNED_WORDS`, `BOOSTED_WORDS`) in `src/lib/seo-controls.ts` that the existing word/synonym templates and sitemap respect. A deterministic FAQ builder (`src/lib/faq.ts`) for boosted pages. A `/seo-review` skill (playbook) that reads GSC via openseo and opens a monthly PR editing only those sets + the backlog order. A monthly reminder routine.

**Tech Stack:** Next.js 14 Pages router, TypeScript, vitest, existing `jsonLdSerialize` (seo.ts), openseo MCP (interactive), RemoteTrigger (routine).

## Global Constraints

- App root: `repo/wordsmith-app`. Paths below relative to it.
- Pages router only; TypeScript strict; match existing file style.
- Sets start EMPTY; the monthly PR is the only thing that edits them.
- Pruned = `noindex,follow` meta + excluded from sitemap; page stays live (no 404). Reversible.
- Boosted = additive only: FAQ block + FAQPage JSON-LD (deterministic, no Claude call) + extra inbound internal links. Core `word_pages` content is NEVER regenerated.
- Any JSON-LD injected via `dangerouslySetInnerHTML` MUST go through `jsonLdSerialize` from `src/lib/seo.ts` (XSS: FAQ answers derive from model-generated definitions).
- Verify: `npx tsc --noEmit`; `npx vitest run`; build via `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy SUPABASE_SERVICE_ROLE_KEY=dummy COOKIE_SECRET=dummy npx next build`. Never run `next build` with a dev server up.
- Commit after each task; body ends with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Branch: do all work on `seo-v2-loop` (main auto-deploys; never commit feature work straight to main).

---

### Task 1: seo-controls.ts — pruned/boosted sets + helpers

**Files:**
- Create: `src/lib/seo-controls.ts`
- Test: `src/lib/__tests__/seo-controls.test.ts`

**Interfaces:**
- Produces: `PRUNED_WORDS: ReadonlySet<string>`, `BOOSTED_WORDS: ReadonlySet<string>`, `isPruned(word: string): boolean`, `isBoosted(word: string): boolean`, `boostRelated(related: string[], currentWord: string, maxBoosted: number): string[]`. Tasks 3-5 import these.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/seo-controls.test.ts
import { describe, it, expect } from "vitest";
import { isPruned, isBoosted, boostRelated, PRUNED_WORDS, BOOSTED_WORDS } from "../seo-controls";

describe("seo-controls sets", () => {
  it("start empty (edited only by the monthly review PR)", () => {
    expect(PRUNED_WORDS.size).toBe(0);
    expect(BOOSTED_WORDS.size).toBe(0);
  });
  it("isPruned/isBoosted reflect membership", () => {
    // membership is data-driven; with empty sets everything is false
    expect(isPruned("happy")).toBe(false);
    expect(isBoosted("happy")).toBe(false);
  });
});

describe("boostRelated", () => {
  const related = ["a", "b", "c", "d", "e", "f", "g", "h"];
  it("returns the list unchanged when no boosted words exist", () => {
    expect(boostRelated(related, "x", 2)).toEqual(related);
  });
  it("injects boosted words (not already present, not the current word) by replacing the tail, keeping length", () => {
    const out = boostRelated(related, "x", 2, new Set(["zzz", "yyy"]));
    expect(out).toHaveLength(related.length);
    expect(out).toContain("zzz");
    expect(out).toContain("yyy");
    // head preserved, tail replaced
    expect(out.slice(0, 6)).toEqual(["a", "b", "c", "d", "e", "f"]);
  });
  it("does not inject the current word or duplicates already present", () => {
    const out = boostRelated(related, "zzz", 2, new Set(["zzz", "a"]));
    expect(out.filter((w) => w === "zzz")).toHaveLength(0);
    expect(out.filter((w) => w === "a")).toHaveLength(1);
  });
  it("injects at most maxBoosted", () => {
    const out = boostRelated(related, "x", 1, new Set(["zzz", "yyy"]));
    const injected = out.filter((w) => w === "zzz" || w === "yyy");
    expect(injected).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/__tests__/seo-controls.test.ts`
Expected: FAIL — cannot resolve `../seo-controls`.

- [ ] **Step 3: Implement seo-controls.ts**

```ts
// src/lib/seo-controls.ts
// Data-only SEO levers edited exclusively by the monthly /seo-review PR.
// Pruned words: noindex + dropped from sitemap (still live for direct visitors).
// Boosted words: FAQ block + extra inbound internal links (additive; core
// content never regenerated).

export const PRUNED_WORDS: ReadonlySet<string> = new Set<string>([
  // Added by the monthly review when a page fails to index. Empty until then.
]);

export const BOOSTED_WORDS: ReadonlySet<string> = new Set<string>([
  // Added by the monthly review for position 5-20 striking-distance pages.
]);

export function isPruned(word: string): boolean {
  return PRUNED_WORDS.has(word);
}

export function isBoosted(word: string): boolean {
  return BOOSTED_WORDS.has(word);
}

/**
 * Inject up to `maxBoosted` boosted words into a page's related-word list so
 * boosted pages gain inbound internal links from across the site. Replaces the
 * tail of `related`, preserving length and the higher-priority head entries.
 * The boosted set is injectable for testing; defaults to BOOSTED_WORDS.
 */
export function boostRelated(
  related: string[],
  currentWord: string,
  maxBoosted: number,
  boosted: ReadonlySet<string> = BOOSTED_WORDS
): string[] {
  if (maxBoosted <= 0 || boosted.size === 0) return related;
  const present = new Set(related);
  const toInject: string[] = [];
  for (const w of boosted) {
    if (toInject.length >= maxBoosted) break;
    if (w === currentWord || present.has(w)) continue;
    toInject.push(w);
  }
  if (toInject.length === 0) return related;
  const keep = related.slice(0, Math.max(0, related.length - toInject.length));
  return [...keep, ...toInject];
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/__tests__/seo-controls.test.ts` — Expected: PASS. Then `npx tsc --noEmit` clean.

- [ ] **Step 5: Commit**

```bash
git add wordsmith-app/src/lib/seo-controls.ts wordsmith-app/src/lib/__tests__/seo-controls.test.ts
git commit -m "Add SEO controls: pruned/boosted word sets and related-link boosting"
```

---

### Task 2: faq.ts — deterministic FAQ builder

**Files:**
- Create: `src/lib/faq.ts`
- Test: `src/lib/__tests__/faq.test.ts`

**Interfaces:**
- Consumes: `WordData` from `@/lib/types` (`{ word, pronunciation, definition, example, context, category }`).
- Produces: `buildWordFaq(word: string, alternatives: WordData[]): { q: string; a: string }[]`. Deterministic, no network. Task 4 renders it + builds FAQPage JSON-LD from it.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/faq.test.ts
import { describe, it, expect } from "vitest";
import { buildWordFaq } from "../faq";
import type { WordData } from "../types";

const alts: WordData[] = [
  { word: "elated", pronunciation: "", definition: "very happy", example: "", context: "", category: "elevated" },
  { word: "jubilant", pronunciation: "", definition: "joyful", example: "", context: "", category: "elevated" },
  { word: "content", pronunciation: "", definition: "satisfied", example: "", context: "", category: "elevated" },
  { word: "cheerful", pronunciation: "", definition: "upbeat", example: "", context: "", category: "elevated" },
];

describe("buildWordFaq", () => {
  it("produces a stable, non-empty Q&A list", () => {
    const a = buildWordFaq("happy", alts);
    const b = buildWordFaq("happy", alts);
    expect(a).toEqual(b); // deterministic
    expect(a.length).toBeGreaterThanOrEqual(2);
    for (const item of a) {
      expect(item.q.length).toBeGreaterThan(0);
      expect(item.a.length).toBeGreaterThan(0);
    }
  });

  it("references the word and its top alternatives", () => {
    const faq = buildWordFaq("happy", alts);
    const joined = faq.map((f) => f.q + " " + f.a).join(" ").toLowerCase();
    expect(joined).toContain("happy");
    expect(joined).toContain("elated");
  });

  it("handles a short alternatives list without throwing", () => {
    const faq = buildWordFaq("sad", alts.slice(0, 1));
    expect(faq.length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/__tests__/faq.test.ts` — Expected: FAIL, cannot resolve `../faq`.

- [ ] **Step 3: Implement faq.ts**

```ts
// src/lib/faq.ts
import type { WordData } from "./types";

/**
 * Deterministic FAQ for a boosted word page. Built only from the page's own
 * alternatives (no network, no Claude call). Rendered visibly AND as FAQPage
 * JSON-LD by the word/synonym templates.
 */
export function buildWordFaq(word: string, alternatives: WordData[]): { q: string; a: string }[] {
  const names = alternatives.map((a) => a.word);
  const top3 = names.slice(0, 3);
  const next3 = names.slice(3, 6);
  const faq: { q: string; a: string }[] = [];

  if (top3.length > 0) {
    faq.push({
      q: `What is a better word for "${word}"?`,
      a: `Strong alternatives to "${word}" include ${top3.join(", ")}. Each carries a slightly different shade of meaning, so pick the one that fits your sentence.`,
    });
  }
  if (next3.length > 0) {
    faq.push({
      q: `What can I say instead of "${word}"?`,
      a: `Beyond the obvious choices, try ${next3.join(", ")}. These read as more precise and less generic than "${word}".`,
    });
  }
  faq.push({
    q: `Is "${word}" overused?`,
    a: `"${word}" is common enough that it can read as filler. Swapping in a more specific alternative usually makes the sentence sharper and more clearly your own.`,
  });
  return faq;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/__tests__/faq.test.ts` — Expected: PASS. `npx tsc --noEmit` clean.

- [ ] **Step 5: Commit**

```bash
git add wordsmith-app/src/lib/faq.ts wordsmith-app/src/lib/__tests__/faq.test.ts
git commit -m "Add deterministic FAQ builder for boosted word pages"
```

---

### Task 3: Sitemap excludes pruned words

**Files:**
- Modify: `src/pages/sitemap.xml.ts`
- Test: `src/lib/__tests__/sitemap-entries.test.ts` (extract the entry-building logic to a pure, testable function)

**Interfaces:**
- Consumes: `PRUNED_WORDS`/`isPruned` (Task 1), `SEED_WORDS`, `WORD_HUBS`, `priorityFor`.
- Produces: `buildSitemapEntries(): { path: string; priority: string }[]` exported from `sitemap.xml.ts`, excluding pruned words from both `/words/*` and `/synonyms-for/*`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/sitemap-entries.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("../seo-controls", () => ({
  isPruned: (w: string) => w === "prunedword",
  PRUNED_WORDS: new Set(["prunedword"]),
  BOOSTED_WORDS: new Set<string>(),
  isBoosted: () => false,
  boostRelated: (r: string[]) => r,
}));
vi.mock("../seed-words", () => ({ SEED_WORDS: ["happy", "prunedword"] }));
vi.mock("../word-hubs", () => ({ WORD_HUBS: [] }));
vi.mock("../synonym-volumes", () => ({ SYNONYM_VOLUMES: {} }));

import { buildSitemapEntries } from "../../pages/sitemap.xml";

describe("buildSitemapEntries", () => {
  it("includes both routes for a normal word", () => {
    const paths = buildSitemapEntries().map((e) => e.path);
    expect(paths).toContain("/words/happy");
    expect(paths).toContain("/synonyms-for/happy");
  });
  it("excludes both routes for a pruned word", () => {
    const paths = buildSitemapEntries().map((e) => e.path);
    expect(paths).not.toContain("/words/prunedword");
    expect(paths).not.toContain("/synonyms-for/prunedword");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/__tests__/sitemap-entries.test.ts` — Expected: FAIL (`buildSitemapEntries` not exported).

- [ ] **Step 3: Refactor sitemap.xml.ts to expose the pure builder + filter pruned**

Replace the body of `getServerSideProps`'s entry construction with a call to a new exported function, and filter pruned words:

```ts
import { isPruned } from "@/lib/seo-controls";
// ...existing imports unchanged...

export function buildSitemapEntries(): { path: string; priority: string }[] {
  const staticEntries = [
    { path: "", priority: "1.0" },
    { path: "/words", priority: "0.8" },
    ...WORD_HUBS.map((h) => ({ path: `/words/category/${h.slug}`, priority: "0.8" })),
    { path: "/privacy", priority: "0.3" },
  ];
  const wordEntries = SEED_WORDS.filter((w) => !isPruned(w)).flatMap((w) => [
    { path: `/synonyms-for/${w}`, priority: priorityFor(w) },
    { path: `/words/${w}`, priority: priorityFor(w) },
  ]);
  return [...staticEntries, ...wordEntries];
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const entries = buildSitemapEntries();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
    .map((e) => `  <url><loc>${SITE_URL}${e.path}</loc><priority>${e.priority}</priority></url>`)
    .join("\n")}
</urlset>`;
  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=43200");
  res.write(xml);
  res.end();
  return { props: {} };
};
```
Keep the existing `priorityFor` and default `Sitemap()` component.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/__tests__/sitemap-entries.test.ts` — Expected: PASS. `npx tsc --noEmit` clean.

- [ ] **Step 5: Commit**

```bash
git add wordsmith-app/src/pages/sitemap.xml.ts wordsmith-app/src/lib/__tests__/sitemap-entries.test.ts
git commit -m "Sitemap: exclude pruned words; extract testable entry builder"
```

---

### Task 4: Word + synonym templates — noindex pruned, FAQ boosted

**Files:**
- Modify: `src/pages/words/[word].tsx`
- Modify: `src/pages/synonyms-for/[word].tsx`

**Interfaces:**
- Consumes: `isPruned`, `isBoosted`, `boostRelated` (Task 1); `buildWordFaq` (Task 2); `jsonLdSerialize` (already imported in both files).
- Produces: rendered behavior only (verified by build). No new exports.

- [ ] **Step 1: Add the shared FAQ render + noindex to `/words/[word].tsx`**

At the top of the component, after `const canonical = ...`:

```tsx
import { isPruned, isBoosted, boostRelated } from "@/lib/seo-controls";
import { buildWordFaq } from "@/lib/faq";
// ...
  const pruned = isPruned(word);
  const faq = isBoosted(word) ? buildWordFaq(word, alternatives) : [];
```

In `<Head>`, add (before the JSON-LD script):

```tsx
{pruned && <meta name="robots" content="noindex,follow" />}
```

Extend the JSON-LD `@graph` array: when `faq.length > 0`, append a FAQPage node:

```tsx
  const graph: object[] = [ /* existing DefinedTermSet + BreadcrumbList */ ];
  if (faq.length > 0) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }
  const jsonLd = { "@context": "https://schema.org", "@graph": graph };
```
(Rework the existing `jsonLd` object to build `graph` first, then serialize with the existing `jsonLdSerialize(jsonLd)` call — do NOT hand-serialize.)

Change the related list to boost:

```tsx
// getStaticProps already computes related; boost at render:
const related = boostRelated(props.related, word, 2);
```
Or, simpler, apply `boostRelated` where `related` is mapped to chips.

Render the visible FAQ section before the Footer (only when `faq.length > 0`):

```tsx
{faq.length > 0 && (
  <section aria-label="Frequently asked questions" className="max-w-[720px] mx-auto px-6 pb-12">
    <h2 className="font-display font-bold text-[22px] text-parchment-900 mb-4">
      Frequently asked
    </h2>
    {faq.map((f) => (
      <div key={f.q} className="mb-4">
        <h3 className="font-body font-semibold text-[15px] text-parchment-900 m-0 mb-1">{f.q}</h3>
        <p className="font-body text-[14px] text-parchment-600 m-0">{f.a}</p>
      </div>
    ))}
  </section>
)}
```

- [ ] **Step 2: Mirror the same changes in `/synonyms-for/[word].tsx`**

Same imports, same `pruned`/`faq` computation, same `<meta noindex>`, same FAQPage graph append (into that file's existing `@graph`), same `boostRelated(props.related, word, 2)`, same visible FAQ section before Footer. Keep each file's existing copy/styling.

- [ ] **Step 3: Verify by build**

Run: `npx tsc --noEmit` then the dummy-env build. Expected: clean; `/words/[word]` and `/synonyms-for/[word]` still compile. (No unit test — these are React pages; the pure pieces they use are already tested in Tasks 1-2. The empty sets mean noindex/FAQ never render yet, so the build output is unchanged in behavior.)

- [ ] **Step 4: Commit**

```bash
git add wordsmith-app/src/pages/words/[word].tsx wordsmith-app/src/pages/synonyms-for/[word].tsx
git commit -m "Word pages: noindex when pruned, FAQ + boosted internal links when boosted"
```

---

### Task 5: The `/seo-review` skill (monthly playbook)

**Files:**
- Create: `.claude/skills/seo-review/SKILL.md`

**Interfaces:** none (a playbook document, not code). No tests.

- [ ] **Step 1: Write the skill**

Create `.claude/skills/seo-review/SKILL.md` with this content:

```markdown
---
name: seo-review
description: Monthly Search Console review for Wordsmith. Reads GSC via openseo, buckets pages into prune / strengthen / re-prioritize / new-page-type proposals, writes a dated report, and opens a PR of reversible data-only edits (PRUNED_WORDS, BOOSTED_WORDS, keyword-backlog order). Run monthly. Use when the user says "run seo review", "/seo-review", or the monthly reminder fires.
---

# Wordsmith monthly SEO review

Automate the eyes, gate the hands: analyze GSC, propose changes as a reviewable PR. Never auto-build new templates or regenerate page content.

## Step 0 — Prerequisite
Call `mcp__openseo__list_projects`. Confirm a project is connected to the trywordsmith.com GSC property. If none is connected, STOP and tell the user: "Connect the trywordsmith.com Search Console property to your openseo project, then re-run." Do not fabricate data.

## Step 1 — Pull GSC (openseo)
For the trywordsmith.com project:
- `mcp__openseo__get_search_console_performance` — page rows and query rows (impressions, clicks, avg position) for the last 28 and 90 days.
- `mcp__openseo__inspect_urls` — indexation status for sitemap URLs, prioritizing pages with 0 impressions (sample up to the tool's limit; note coverage).

## Step 2 — Bucket (explicit thresholds)
- **Prune candidates:** indexation status "Discovered - not indexed" or "Crawled - not indexed" AND page age >= 60 days; OR indexed with 0 impressions over 90 days. Cap applied changes at <= 10% of indexed pages per month; list the rest in the report only. Never prune a word that has impressions.
- **Strengthen targets:** page/query avg position between 5 and 20 inclusive AND >= 20 impressions / 28 days.
- **Backlog re-priority:** rank existing pages by impressions; identify which categories/word-shapes over-index; reorder `wordsmith-app/seo/keyword-backlog.json` (order only, no additions/removals) so similar words publish sooner. Also list high-impression GSC queries with no matching page.
- **New-page-type proposals:** cluster GSC queries the site ranks for that don't map to /words or /synonyms-for (e.g. "another word for X", "words to describe X", "X vs Y"). Per cluster: pattern, 3 example queries, total impressions, one-line template proposal. REPORT ONLY.

## Step 3 — Output
1. Write `wordsmith-app/seo/reviews/YYYY-MM.md` with all four buckets, evidence (numbers), and before/after counts.
2. Create branch `seo-review-YYYY-MM`. Apply buckets 1-3 only:
   - Add prune words to `PRUNED_WORDS` in `src/lib/seo-controls.ts`.
   - Add strengthen words to `BOOSTED_WORDS` in `src/lib/seo-controls.ts`.
   - Reorder `seo/keyword-backlog.json`.
3. Run `npx tsc --noEmit` and `npx vitest run` (must pass).
4. Push the branch and open a PR with `gh pr create`, body = report summary. Do NOT merge; the user reviews.

## Guardrails
- Buckets 1-3 only in the PR. New page types are proposals for the user to greenlight.
- Never regenerate word_pages content. Never remove a word from SEED_WORDS.
- If GSC has little/no data (site still new), write a "insufficient data, no actions this month" report and open no PR.
```

- [ ] **Step 2: Verify the skill file is well-formed**

Run: `head -5 .claude/skills/seo-review/SKILL.md` — confirm the frontmatter `name`/`description` are present.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/seo-review/SKILL.md
git commit -m "Add /seo-review skill: monthly GSC review playbook"
```

---

### Task 6: Monthly reminder routine

**Files:** none in repo (created via RemoteTrigger tooling). Document in `seo/reviews/README.md`.

**Interfaces:** none.

- [ ] **Step 1: Create `seo/reviews/README.md`**

```markdown
# Monthly SEO reviews

`/seo-review` (run in an interactive Claude session, where the openseo GSC
connector works) writes a dated `YYYY-MM.md` report here and opens a
`seo-review-YYYY-MM` PR of reversible edits (PRUNED_WORDS / BOOSTED_WORDS /
backlog order). A monthly reminder routine notifies when a review is due.

Prerequisite: the trywordsmith.com Search Console property must be connected to
the openseo project.
```

- [ ] **Step 2: Create the reminder routine (RemoteTrigger)**

Load `RemoteTrigger` (ToolSearch `select:RemoteTrigger`) and create a routine with `action: "create"` and this body (fill `<uuid>` with a fresh lowercase v4 UUID; `environment_id` from the available environments list):

```json
{
  "name": "Wordsmith monthly SEO review reminder",
  "cron_expression": "0 14 1 * *",
  "enabled": true,
  "job_config": { "ccr": {
    "environment_id": "<env id>",
    "session_context": {
      "model": "claude-sonnet-5",
      "sources": [{ "git_repository": { "url": "https://github.com/jbbradbeer/wordsmith" } }],
      "allowed_tools": ["Bash", "Read", "Write"]
    },
    "events": [{ "data": {
      "uuid": "<uuid>", "session_id": "", "type": "user", "parent_tool_use_id": null,
      "message": { "role": "user", "content": "It is the monthly Wordsmith SEO review reminder. Do NOT attempt to pull Search Console data (the openseo connector is not available in this headless run). Your only job: notify that the review is due. Try, in order: (1) `gh issue create --title \"Monthly SEO review due\" --body \"Run /seo-review in an interactive Claude session to pull GSC and open the monthly PR.\"` from the repo root; if gh is unavailable or unauthenticated, (2) create the file wordsmith-app/seo/reviews/DUE-<YEAR>-<MONTH>.md containing a one-line reminder, commit it (Co-Authored-By: Claude <noreply@anthropic.com>), and push to main. Report which notification you used. Do nothing else." }
    }}]
  }}
}
```

- [ ] **Step 3: Confirm creation**

Verify the RemoteTrigger response includes a `next_run_at`. Record the routine id in `seo/reviews/README.md`.

- [ ] **Step 4: Commit**

```bash
git add wordsmith-app/seo/reviews/README.md
git commit -m "Document monthly SEO reviews; add reminder routine"
```

---

### Task 7: Verification sweep + user actions

**Files:**
- Modify: `tasks/todo.md` (repo-root tasks dir).

- [ ] **Step 1: Full verification**

Run in `wordsmith-app`: `npx tsc --noEmit`; `npx vitest run` (all pass incl. new seo-controls, faq, sitemap-entries); dummy-env `next build` (green; `/words/[word]`, `/synonyms-for/[word]`, `/sitemap.xml` all present). Behavior is unchanged with empty sets — confirm the build output matches the prior deploy in spirit (no noindex/FAQ rendered yet).

- [ ] **Step 2: Record user actions in tasks/todo.md**

Append a "v2 SEO loop" section noting the one-time USER action: connect the trywordsmith.com GSC property to the openseo project; and that `/seo-review` runs monthly (reminder routine live), first meaningful run ~month 2-3 once GSC has data.

- [ ] **Step 3: Merge**

Open a PR from `seo-v2-loop` (or fast-forward merge to main after review). Push. Vercel deploys; behavior unchanged until the first review PR populates the sets.

---

## Self-Review (completed)

- **Spec coverage:** plumbing sets (T1), FAQ (T2), sitemap prune (T3), template noindex+FAQ+boost (T4), the `/seo-review` playbook incl. all four buckets + thresholds + guardrails (T5), reminder (T6), verification + setup prerequisite (T7). New-page-types = report-only (T5) matches spec. All spec sections mapped.
- **Placeholder scan:** none — every code step carries full code; the routine JSON and skill markdown are complete; `<uuid>`/`<env id>` are explicit fill-ins with instructions, not vague TODOs.
- **Type consistency:** `isPruned`/`isBoosted`/`boostRelated`/`PRUNED_WORDS`/`BOOSTED_WORDS` (T1) consumed verbatim in T3/T4; `buildWordFaq(word, alternatives)` (T2) consumed in T4; `buildSitemapEntries` (T3) matches its test. `jsonLdSerialize` reused, not re-implemented.
