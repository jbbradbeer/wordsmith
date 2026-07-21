# De-Slop Companion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pivot Wordsmith's core surface to a de-slop analyzer: paste a draft, get a Slop Score (0–100, lower better) with highlighted spans and guided self-rewrite; word search moves to `/search`.

**Architecture:** Hybrid engine — deterministic rules layer (`src/lib/slop/`) runs instantly and free; one Claude call per scan adds judgment spans. `/api/analyze` streams rules result then final merged result over SSE (same pattern as `/api/search`). Metering mirrors the existing daily-search pattern (migration 007). Drafts are never persisted.

**Tech Stack:** Next.js 14 Pages router, TypeScript, Supabase (service-role RPCs), Anthropic SDK (`claude-sonnet-4-6`), vitest, Tailwind, `@vercel/og` for the share badge.

## Global Constraints

- App root: `repo/wordsmith-app`. All paths below relative to it.
- Pages router only — no App-router files.
- Pricing untouched: $10/mo, $96/yr; existing Stripe env vars unchanged.
- Analyzed text is NEVER persisted (scan_history stores score metadata only).
- Never claim "beats AI detectors" in any copy. Positioning: craft, voice, no slop tells.
- The tool never inserts sentences — word-level suggestions and hints only.
- Verify commands: `npx tsc --noEmit`, `npx vitest run`, and build via
  `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy SUPABASE_SERVICE_ROLE_KEY=dummy COOKIE_SECRET=dummy npx next build`
- Never run `next build` while a dev server is running.
- Commit after every task; message style matches repo (imperative, no scope prefix), body ends with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Free-tier scan limits: anon 1 lifetime + IP backstop 3/day; free account 1/day, 1,500-word cap; paid unlimited, 10,000-word cap.

---

### Task 1: Slop types + phrase dictionary

**Files:**
- Create: `src/lib/slop/types.ts`
- Create: `src/lib/slop/slop-phrases.ts`
- Test: `src/lib/slop/__tests__/slop-phrases.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `SlopCategory`, `SlopSpan`, `DocStats`, `RulesResult`, `CategoryBreakdown`, `ScanResult`, `SCAN_WORD_CAP_FREE = 1500`, `SCAN_WORD_CAP_PRO = 10000` (types.ts); `SLOP_PHRASES: PhraseEntry[]` with `{ phrase, category, why, hint }` (slop-phrases.ts). Later tasks import these exact names.

- [ ] **Step 1: Write types.ts**

```ts
// src/lib/slop/types.ts
export type SlopCategory =
  | "ai-ism"        // stock AI phrases ("delve", "tapestry of")
  | "cliche"        // tired figurative framing
  | "hedging"       // boilerplate qualifiers
  | "intensifier"   // empty intensity ("very", "truly")
  | "transition"    // stock connective overuse
  | "generic-voice"; // Claude-only: says nothing specific

export interface SlopSpan {
  start: number; // char offset in the analyzed text
  end: number;   // exclusive
  text: string;  // exact excerpt
  category: SlopCategory;
  why: string;   // plain-English tell
  hint: string;  // craft hint for the rewrite
  source: "rules" | "claude";
}

export interface DocStats {
  wordCount: number;
  sentenceCount: number;
  sentenceLengthStdDev: number; // uniform rhythm is a tell
  emDashesPer1000: number;
  intensifiersPer1000: number;
}

export interface RulesResult {
  spans: SlopSpan[];
  stats: DocStats;
}

/** Per-category subscores, 0–100, lower is better. */
export interface CategoryBreakdown {
  rhythm: number;
  cliches: number;
  hedging: number;
  aiisms: number;
}

export type SlopBand = "clean" | "murky" | "slop";

export interface ScanResult {
  score: number; // 0–100, lower is better
  band: SlopBand;
  breakdown: CategoryBreakdown;
  spans: SlopSpan[];
  stats: DocStats;
  /** true when the Claude pass failed and only rules ran */
  degraded: boolean;
}

export const SCAN_WORD_CAP_FREE = 1500;
export const SCAN_WORD_CAP_PRO = 10000;

export function bandFor(score: number): SlopBand {
  if (score <= 20) return "clean";
  if (score <= 50) return "murky";
  return "slop";
}
```

- [ ] **Step 2: Write slop-phrases.ts**

```ts
// src/lib/slop/slop-phrases.ts
import type { SlopCategory } from "./types";

export interface PhraseEntry {
  phrase: string; // lowercase; matched on word boundaries, case-insensitive
  category: SlopCategory;
  why: string;
  hint: string;
}

const AIISM = (phrase: string, hint: string): PhraseEntry => ({
  phrase, category: "ai-ism",
  why: "Stock AI phrasing — readers now recognize it as machine-generated filler.",
  hint,
});
const HEDGE = (phrase: string): PhraseEntry => ({
  phrase, category: "hedging",
  why: "Boilerplate qualifier that weakens the sentence without adding information.",
  hint: "Commit to the claim or cut the sentence.",
});
const INT = (phrase: string): PhraseEntry => ({
  phrase, category: "intensifier",
  why: "Empty intensity — it asserts strength instead of showing it.",
  hint: "Delete it, or replace the whole phrase with a specific detail.",
});
const TRANS = (phrase: string): PhraseEntry => ({
  phrase, category: "transition",
  why: "Stock connective — overuse flattens your paragraph rhythm.",
  hint: "Cut it, or connect the ideas with content instead of a signpost.",
});
const CLICHE = (phrase: string, hint: string): PhraseEntry => ({
  phrase, category: "cliche",
  why: "Tired figurative framing — it was vivid once, now it is wallpaper.",
  hint,
});

export const SLOP_PHRASES: PhraseEntry[] = [
  AIISM("delve into", "Say what you actually do: examine, unpack, measure."),
  AIISM("delves into", "Say what it actually does: examines, unpacks, measures."),
  AIISM("tapestry of", "Name the actual parts instead of the weave."),
  AIISM("it's important to note that", "Just state the point — importance shows itself."),
  AIISM("it is important to note that", "Just state the point — importance shows itself."),
  AIISM("it's worth noting that", "Just state the point."),
  AIISM("in today's fast-paced world", "Cut the throat-clearing; start with your claim."),
  AIISM("in the ever-evolving landscape", "Name the specific change you mean."),
  AIISM("in the realm of", "Name the field plainly or cut it."),
  AIISM("game-changer", "Say what changed and by how much."),
  AIISM("game changer", "Say what changed and by how much."),
  AIISM("unlock the power of", "Say what the reader can now do."),
  AIISM("unleash the potential", "Say what the reader can now do."),
  AIISM("elevate your", "Name the concrete improvement."),
  AIISM("take it to the next level", "Name the level: faster, cheaper, clearer?"),
  AIISM("seamlessly integrates", "Describe how the pieces actually connect."),
  AIISM("a testament to", "Show the evidence instead of labeling it."),
  AIISM("navigate the complexities", "Name one complexity and how you handle it."),
  AIISM("harness the power", "Say what you do with it."),
  AIISM("dive deep into", "Say what you examine and what you found."),
  AIISM("deep dive", "Name what you examined and what you found."),
  AIISM("robust solution", "Robust how? Survives what failure?"),
  AIISM("cutting-edge", "Name the technique — 'new' is not a feature."),
  AIISM("state-of-the-art", "Name the technique and the benchmark."),
  AIISM("revolutionize", "Say what becomes possible that wasn't."),
  AIISM("empower you to", "Say what the reader can now do, plainly."),
  AIISM("at the end of the day", "Cut it; give the conclusion directly."),
  AIISM("look no further", "Cut the infomercial beat."),
  AIISM("in conclusion", "End with your strongest point, not a label."),
  AIISM("furthermore, it", "Vary the connective or fuse the sentences."),
  HEDGE("it could be argued that"),
  HEDGE("some might say"),
  HEDGE("arguably"),
  HEDGE("to some extent"),
  HEDGE("in many ways"),
  HEDGE("generally speaking"),
  INT("very"),
  INT("really"),
  INT("truly"),
  INT("incredibly"),
  INT("extremely"),
  INT("absolutely"),
  TRANS("moreover"),
  TRANS("furthermore"),
  TRANS("additionally"),
  TRANS("in addition"),
  TRANS("on the other hand"),
  CLICHE("double-edged sword", "Name both edges explicitly instead."),
  CLICHE("tip of the iceberg", "Quantify what is below the surface."),
  CLICHE("think outside the box", "Describe the unconventional idea itself."),
  CLICHE("low-hanging fruit", "Name the easy win concretely."),
  CLICHE("move the needle", "Which metric, moved how far?"),
  CLICHE("paradigm shift", "Describe the before and after plainly."),
];
```

- [ ] **Step 3: Write the failing test**

```ts
// src/lib/slop/__tests__/slop-phrases.test.ts
import { describe, it, expect } from "vitest";
import { SLOP_PHRASES } from "../slop-phrases";

describe("SLOP_PHRASES", () => {
  it("phrases are lowercase and non-empty", () => {
    for (const e of SLOP_PHRASES) {
      expect(e.phrase.length).toBeGreaterThan(0);
      expect(e.phrase).toBe(e.phrase.toLowerCase());
    }
  });

  it("has no duplicate phrases", () => {
    const set = new Set(SLOP_PHRASES.map((e) => e.phrase));
    expect(set.size).toBe(SLOP_PHRASES.length);
  });

  it("every entry has why and hint", () => {
    for (const e of SLOP_PHRASES) {
      expect(e.why.length).toBeGreaterThan(10);
      expect(e.hint.length).toBeGreaterThan(5);
    }
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/slop/__tests__/slop-phrases.test.ts`
Expected: PASS (3 tests). Also `npx tsc --noEmit` clean.

- [ ] **Step 5: Commit**

```bash
git add wordsmith-app/src/lib/slop
git commit -m "Add slop engine types and phrase dictionary"
```

---

### Task 2: Rules layer

**Files:**
- Create: `src/lib/slop/rules.ts`
- Test: `src/lib/slop/__tests__/rules.test.ts`

**Interfaces:**
- Consumes: `SLOP_PHRASES` (Task 1), types from `./types`.
- Produces: `runRules(text: string): RulesResult` — the only export later tasks call. Spans sorted by `start`; `stats` always populated.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/slop/__tests__/rules.test.ts
import { describe, it, expect } from "vitest";
import { runRules } from "../rules";

const SLOPPY = `In today's fast-paced world, it's important to note that our platform is a game-changer. We delve into a tapestry of solutions. Moreover, it is very robust. Furthermore, we unlock the power of synergy — truly — with cutting-edge tools — every day.`;

const CLEAN = `The migration finished in four hours. Two tables needed manual fixes: profiles lost a default, and events had a duplicate key. We wrote a script for the first and deleted three rows for the second. Downtime was eleven minutes.`;

describe("runRules", () => {
  it("finds phrase spans with exact offsets", () => {
    const r = runRules(SLOPPY);
    const gameChanger = r.spans.find((s) => s.text.toLowerCase() === "game-changer");
    expect(gameChanger).toBeDefined();
    expect(SLOPPY.slice(gameChanger!.start, gameChanger!.end)).toBe(gameChanger!.text);
  });

  it("matches case-insensitively on word boundaries", () => {
    const r = runRules("Very good. That is my everything."); // "very" yes; "every" inside "everything" no
    const cats = r.spans.map((s) => s.text.toLowerCase());
    expect(cats).toContain("very");
    expect(cats).not.toContain("every");
  });

  it("flags nothing phrase-wise on clean text except stats", () => {
    const r = runRules(CLEAN);
    expect(r.spans.filter((s) => s.category === "ai-ism")).toHaveLength(0);
    expect(r.stats.wordCount).toBeGreaterThan(30);
  });

  it("computes sentence-length variance and em-dash density", () => {
    const sloppy = runRules(SLOPPY);
    expect(sloppy.stats.emDashesPer1000).toBeGreaterThan(0);
    const clean = runRules(CLEAN);
    expect(clean.stats.sentenceLengthStdDev).toBeGreaterThan(0);
  });

  it("returns spans sorted by start", () => {
    const r = runRules(SLOPPY);
    const starts = r.spans.map((s) => s.start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/slop/__tests__/rules.test.ts`
Expected: FAIL — cannot resolve `../rules`.

- [ ] **Step 3: Implement rules.ts**

```ts
// src/lib/slop/rules.ts
import { SLOP_PHRASES } from "./slop-phrases";
import type { DocStats, RulesResult, SlopSpan } from "./types";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findPhraseSpans(text: string): SlopSpan[] {
  const spans: SlopSpan[] = [];
  for (const entry of SLOP_PHRASES) {
    const re = new RegExp(`\\b${escapeRegExp(entry.phrase)}\\b`, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      spans.push({
        start: m.index,
        end: m.index + m[0].length,
        text: m[0],
        category: entry.category,
        why: entry.why,
        hint: entry.hint,
        source: "rules",
      });
    }
  }
  return spans.sort((a, b) => a.start - b.start);
}

function computeStats(text: string): DocStats {
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text
    .split(/[.!?]+(?:\s|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const lengths = sentences.map((s) => s.split(/\s+/).filter(Boolean).length);
  const mean = lengths.length ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0;
  const variance = lengths.length
    ? lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length
    : 0;
  const per1000 = (n: number) => (words.length ? (n / words.length) * 1000 : 0);
  const emDashes = (text.match(/—/g) || []).length;
  const intensifiers = (text.match(/\b(very|really|truly|incredibly|extremely|absolutely)\b/gi) || []).length;
  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    sentenceLengthStdDev: Math.sqrt(variance),
    emDashesPer1000: per1000(emDashes),
    intensifiersPer1000: per1000(intensifiers),
  };
}

/** Deterministic slop detection — instant, free, no network. */
export function runRules(text: string): RulesResult {
  return { spans: findPhraseSpans(text), stats: computeStats(text) };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/slop/__tests__/rules.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add wordsmith-app/src/lib/slop
git commit -m "Add deterministic slop rules layer"
```

---

### Task 3: Score merge

**Files:**
- Create: `src/lib/slop/score.ts`
- Test: `src/lib/slop/__tests__/score.test.ts`

**Interfaces:**
- Consumes: `RulesResult`, `SlopSpan`, `ScanResult`, `bandFor` (Task 1).
- Produces: `computeScan(rules: RulesResult, claudeSpans: SlopSpan[], degraded: boolean): ScanResult`. Deterministic; monotonic (fewer spans never raises the score).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/slop/__tests__/score.test.ts
import { describe, it, expect } from "vitest";
import { runRules } from "../rules";
import { computeScan } from "../score";

const SLOPPY = `In today's fast-paced world, it's important to note that our platform is a game-changer. We delve into a tapestry of solutions. Moreover, it is very robust. Furthermore, we unlock the power of synergy — truly — with cutting-edge tools — every day.`;
const CLEAN = `The migration finished in four hours. Two tables needed manual fixes: profiles lost a default, and events had a duplicate key. We wrote a script for the first and deleted three rows for the second. Downtime was eleven minutes.`;

describe("computeScan", () => {
  it("scores sloppy text much higher than clean text", () => {
    const sloppy = computeScan(runRules(SLOPPY), [], false);
    const clean = computeScan(runRules(CLEAN), [], false);
    expect(sloppy.score).toBeGreaterThan(50);
    expect(clean.score).toBeLessThanOrEqual(20);
    expect(sloppy.band).toBe("slop");
    expect(clean.band).toBe("clean");
  });

  it("is deterministic", () => {
    const a = computeScan(runRules(SLOPPY), [], false);
    const b = computeScan(runRules(SLOPPY), [], false);
    expect(a).toEqual(b);
  });

  it("is monotonic — removing a flagged phrase never raises the score", () => {
    const before = computeScan(runRules(SLOPPY), [], false);
    const after = computeScan(runRules(SLOPPY.replace("game-changer", "shipping tool")), [], false);
    expect(after.score).toBeLessThanOrEqual(before.score);
  });

  it("merges claude spans, dedupes overlaps with rule spans", () => {
    const rules = runRules(SLOPPY);
    const overlap = { ...rules.spans[0], source: "claude" as const, category: "generic-voice" as const };
    const scan = computeScan(rules, [overlap], false);
    const atStart = scan.spans.filter((s) => s.start === overlap.start && s.end === overlap.end);
    expect(atStart).toHaveLength(1);
    expect(atStart[0].source).toBe("rules"); // rules span wins the overlap
  });

  it("clamps to 0–100 and carries the degraded flag", () => {
    const scan = computeScan(runRules(SLOPPY + SLOPPY + SLOPPY), [], true);
    expect(scan.score).toBeLessThanOrEqual(100);
    expect(scan.degraded).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/slop/__tests__/score.test.ts`
Expected: FAIL — cannot resolve `../score`.

- [ ] **Step 3: Implement score.ts**

```ts
// src/lib/slop/score.ts
import type { CategoryBreakdown, RulesResult, ScanResult, SlopSpan } from "./types";
import { bandFor } from "./types";

// Penalty per hit, normalized per 300 words (a typical passage).
const WEIGHTS: Record<SlopSpan["category"], number> = {
  "ai-ism": 9,
  cliche: 7,
  "generic-voice": 6,
  hedging: 4,
  transition: 3,
  intensifier: 2,
};
const CATEGORY_CAP = 45; // one sin can't max the score alone

function overlaps(a: SlopSpan, b: SlopSpan): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Merge: rule spans win overlaps (they carry exact dictionary explanations). */
export function mergeSpans(rules: SlopSpan[], claude: SlopSpan[]): SlopSpan[] {
  const kept = [...rules];
  for (const c of claude) {
    if (!kept.some((r) => overlaps(r, c))) kept.push(c);
  }
  return kept.sort((a, b) => a.start - b.start);
}

export function computeScan(
  rules: RulesResult,
  claudeSpans: SlopSpan[],
  degraded: boolean
): ScanResult {
  const spans = mergeSpans(rules.spans, claudeSpans);
  const norm = Math.max(rules.stats.wordCount, 50) / 300; // per-300-word normalization

  const catTotal = (cats: SlopSpan["category"][]) =>
    Math.min(
      CATEGORY_CAP,
      spans
        .filter((s) => cats.includes(s.category))
        .reduce((sum, s) => sum + WEIGHTS[s.category], 0) / norm
    );

  const aiisms = catTotal(["ai-ism"]);
  const cliches = catTotal(["cliche", "generic-voice"]);
  const hedging = catTotal(["hedging", "intensifier", "transition"]);

  // Rhythm: uniform sentence lengths + em-dash overuse are tells.
  let rhythm = 0;
  if (rules.stats.sentenceCount >= 4 && rules.stats.sentenceLengthStdDev < 3) rhythm += 12;
  if (rules.stats.emDashesPer1000 > 8) rhythm += Math.min(15, rules.stats.emDashesPer1000);
  rhythm = Math.min(CATEGORY_CAP, rhythm);

  const raw = aiisms + cliches + hedging + rhythm;
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  const breakdown: CategoryBreakdown = {
    rhythm: Math.round(rhythm),
    cliches: Math.round(cliches),
    hedging: Math.round(hedging),
    aiisms: Math.round(aiisms),
  };

  return { score, band: bandFor(score), breakdown, spans, stats: rules.stats, degraded };
}
```

- [ ] **Step 4: Run tests; tune weights if bands miss**

Run: `npx vitest run src/lib/slop/__tests__/score.test.ts`
Expected: PASS (5 tests). If the sloppy fixture lands below 50 or clean above 20, adjust `WEIGHTS`/`norm` — do not weaken the test fixtures.

- [ ] **Step 5: Commit**

```bash
git add wordsmith-app/src/lib/slop
git commit -m "Add slop score merge with category breakdown"
```

---

### Task 4: Claude judgment pass

**Files:**
- Create: `src/lib/slop/claude-pass.ts`
- Test: `src/lib/slop/__tests__/claude-pass.test.ts`

**Interfaces:**
- Consumes: `SlopSpan` type; Anthropic SDK (same import style as `src/lib/word-pages.ts`).
- Produces: `parseClaudeSpans(raw: string, text: string): SlopSpan[]` (pure, tested) and `runClaudePass(text: string): Promise<SlopSpan[]>` (throws on API failure — caller degrades). Model: `claude-sonnet-4-6`, max_tokens 1500.

- [ ] **Step 1: Write the failing tests (pure parser only — no network)**

```ts
// src/lib/slop/__tests__/claude-pass.test.ts
import { describe, it, expect } from "vitest";
import { parseClaudeSpans } from "../claude-pass";

const TEXT = "Our solution empowers teams. It is a comprehensive platform for growth.";

describe("parseClaudeSpans", () => {
  it("maps quoted excerpts to exact offsets", () => {
    const raw = JSON.stringify([
      { quote: "a comprehensive platform for growth", category: "generic-voice", why: "Says nothing specific.", hint: "Name what it does." },
    ]);
    const spans = parseClaudeSpans(raw, TEXT);
    expect(spans).toHaveLength(1);
    expect(TEXT.slice(spans[0].start, spans[0].end)).toBe("a comprehensive platform for growth");
    expect(spans[0].source).toBe("claude");
  });

  it("drops quotes not found in the text and unknown categories", () => {
    const raw = JSON.stringify([
      { quote: "not present anywhere", category: "generic-voice", why: "x", hint: "y" },
      { quote: "empowers teams", category: "bogus-category", why: "x", hint: "y" },
    ]);
    expect(parseClaudeSpans(raw, TEXT)).toHaveLength(0);
  });

  it("returns [] on malformed JSON", () => {
    expect(parseClaudeSpans("not json {", TEXT)).toEqual([]);
  });

  it("strips markdown fences if present", () => {
    const raw = '```json\n[{"quote":"empowers teams","category":"cliche","why":"w","hint":"h"}]\n```';
    expect(parseClaudeSpans(raw, TEXT)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/slop/__tests__/claude-pass.test.ts`
Expected: FAIL — cannot resolve `../claude-pass`.

- [ ] **Step 3: Implement claude-pass.ts**

```ts
// src/lib/slop/claude-pass.ts
import Anthropic from "@anthropic-ai/sdk";
import type { SlopCategory, SlopSpan } from "./types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const JUDGMENT_CATEGORIES = new Set<SlopCategory>(["generic-voice", "cliche", "hedging"]);

function buildPrompt(text: string): string {
  return `You are a writing editor hunting AI-slop tells in a human draft. Find up to 12 spans that read as generic, machine-generated, or clichéd. Do NOT rewrite anything.

Categories (use exactly these): "generic-voice" (says nothing specific), "cliche" (tired figurative framing), "hedging" (empty qualification).

Return ONLY a JSON array. Each item: {"quote": "<exact substring copied verbatim from the text>", "category": "...", "why": "<one blunt sentence naming the tell>", "hint": "<one sentence telling the writer what to reach for instead — never a rewrite>"}

The quote MUST be an exact character-for-character substring. Prefer short spans (3-12 words). If the text is clean, return [].

TEXT:
${text}`;
}

/** Pure parser — exported for tests. Invalid items are dropped, never thrown. */
export function parseClaudeSpans(raw: string, text: string): SlopSpan[] {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let items: unknown;
  try {
    items = JSON.parse(cleaned);
  } catch {
    return [];
  }
  if (!Array.isArray(items)) return [];
  const spans: SlopSpan[] = [];
  for (const it of items) {
    if (typeof it !== "object" || it === null) continue;
    const { quote, category, why, hint } = it as Record<string, unknown>;
    if (typeof quote !== "string" || typeof why !== "string" || typeof hint !== "string") continue;
    if (typeof category !== "string" || !JUDGMENT_CATEGORIES.has(category as SlopCategory)) continue;
    const start = text.indexOf(quote);
    if (start === -1 || quote.length < 3) continue;
    spans.push({
      start,
      end: start + quote.length,
      text: quote,
      category: category as SlopCategory,
      why,
      hint,
      source: "claude",
    });
  }
  return spans.sort((a, b) => a.start - b.start);
}

/** One judgment call per scan. Throws on API failure — the caller degrades to rules-only. */
export async function runClaudePass(text: string): Promise<SlopSpan[]> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    messages: [{ role: "user", content: buildPrompt(text) }],
  });
  const raw = response.content[0]?.type === "text" ? response.content[0].text : "";
  return parseClaudeSpans(raw, text);
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/slop/__tests__/claude-pass.test.ts`
Expected: PASS (4 tests). `npx tsc --noEmit` clean.

- [ ] **Step 5: Commit**

```bash
git add wordsmith-app/src/lib/slop
git commit -m "Add Claude judgment pass with validated span parsing"
```

---

### Task 5: Migration 007 — scan metering + history

**Files:**
- Create: `supabase-migrations/007_scan_metering.sql`

**Interfaces:**
- Produces: `profiles.scan_count`, `profiles.last_scan_reset`; RPC `try_increment_scan_count(p_user_id UUID, p_limit INTEGER) RETURNS JSONB` with keys `allowed`, `scan_count`, `subscription_status` (mirrors `try_increment_search_count` exactly, incl. daily lazy reset and paid bypass); RPC `refund_scan(p_user_id UUID)`; table `scan_history` (metadata only, RLS on, no policies). Task 6 calls all three.

- [ ] **Step 1: Write the migration**

```sql
-- supabase-migrations/007_scan_metering.sql
-- Run in Supabase SQL Editor. De-slop analyzer metering: free accounts get
-- N scans PER DAY (lazy daily reset, same pattern as migration 006); paid
-- statuses are unlimited. scan_history stores score METADATA ONLY — never
-- the analyzed text.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS scan_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_scan_reset DATE;

CREATE OR REPLACE FUNCTION public.try_increment_scan_count(p_user_id UUID, p_limit INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_today_count INTEGER;
BEGIN
  SELECT scan_count, subscription_status, last_scan_reset INTO v_profile
  FROM public.profiles WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'scan_count', 0, 'subscription_status', 'free');
  END IF;

  IF v_profile.subscription_status IN ('active', 'past_due') THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'scan_count', v_profile.scan_count,
      'subscription_status', v_profile.subscription_status
    );
  END IF;

  IF v_profile.last_scan_reset IS NULL OR v_profile.last_scan_reset < CURRENT_DATE THEN
    v_today_count := 0;
  ELSE
    v_today_count := v_profile.scan_count;
  END IF;

  IF v_today_count >= p_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'scan_count', v_today_count,
      'subscription_status', v_profile.subscription_status
    );
  END IF;

  UPDATE public.profiles
  SET scan_count = v_today_count + 1, last_scan_reset = CURRENT_DATE
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'scan_count', v_today_count + 1,
    'subscription_status', v_profile.subscription_status
  );
END;
$$;

-- Refund when the Claude pass fails after the scan was claimed.
CREATE OR REPLACE FUNCTION public.refund_scan(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET scan_count = GREATEST(0, scan_count - 1)
  WHERE id = p_user_id AND last_scan_reset = CURRENT_DATE;
END;
$$;

-- Pro scan history: metadata only, never text.
CREATE TABLE IF NOT EXISTS public.scan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  band TEXT NOT NULL,
  word_count INTEGER NOT NULL,
  breakdown JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS scan_history_user_created
  ON public.scan_history (user_id, created_at DESC);
ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY; -- service-role only

GRANT EXECUTE ON FUNCTION public.try_increment_scan_count(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_scan(UUID) TO service_role;
```

- [ ] **Step 2: Sanity-check SQL locally**

No local Postgres — review only: confirm function names match Task 6's calls (`try_increment_scan_count`, `refund_scan`) and column names match Task 9's `/api/user` reads (`scan_count`, `last_scan_reset`).

- [ ] **Step 3: Commit**

```bash
git add wordsmith-app/supabase-migrations/007_scan_metering.sql
git commit -m "Add migration 007: scan metering RPCs and scan_history"
```

---

### Task 6: `/api/analyze` endpoint

**Files:**
- Create: `src/pages/api/analyze.ts`
- Create: `src/lib/scan-cookie.ts`
- Test: `src/lib/__tests__/scan-cookie.test.ts`

**Interfaces:**
- Consumes: `runRules`, `computeScan`, `runClaudePass` (Tasks 2–4); `missingEnv`, `checkRateLimit`, `getClientIp`, `hashIp`, `getServiceSupabase`, `createRequestLogger`, `hasActiveAccess`, caps from `src/lib/slop/types.ts`; anon-cookie signing pattern from `src/lib/anon-cookie.ts`.
- Produces: SSE events — `rules` (payload `ScanResult` with `degraded: true`, provisional), then `result` (final `ScanResult`), or `error`. HTTP 403 `{error: "signup_required" | "scan_limit_reached"}` before SSE opens. The client hook (Task 8) parses exactly these events.

- [ ] **Step 1: Write scan-cookie.ts (anon 1-lifetime-scan flag) + failing test**

`scan-cookie.ts` is `anon-cookie.ts` with cookie name `ws_scan` — same HMAC signing, same append helper. Copy the structure, exporting `getScanUsed(req): boolean` (count >= 1) and `markScanUsed(res): void` (writes count 1).

```ts
// src/lib/scan-cookie.ts
import { createHmac, timingSafeEqual } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";

const COOKIE_NAME = "ws_scan";
const MAX_AGE = 60 * 60 * 24 * 365;

function sign(value: string): string {
  return createHmac("sha256", process.env.COOKIE_SECRET!).update(value).digest("hex");
}

/** Has this anonymous browser used its one lifetime scan? Tampered cookie = not used. */
export function getScanUsed(req: NextApiRequest): boolean {
  const raw = req.cookies[COOKIE_NAME];
  if (!raw) return false;
  const dotIdx = raw.lastIndexOf(".");
  if (dotIdx === -1) return false;
  const value = raw.slice(0, dotIdx);
  const sig = raw.slice(dotIdx + 1);
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(sign(value), "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }
  return value === "1";
}

export function markScanUsed(res: NextApiResponse): void {
  const cookie = `${COOKIE_NAME}=1.${sign("1")}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
  const existing = res.getHeader("Set-Cookie");
  const current = !existing ? [] : Array.isArray(existing) ? existing : [String(existing)];
  res.setHeader("Set-Cookie", [...current.filter((c) => !c.startsWith(`${COOKIE_NAME}=`)), cookie]);
}
```

```ts
// src/lib/__tests__/scan-cookie.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { getScanUsed, markScanUsed } from "../scan-cookie";
import { createHmac } from "crypto";

beforeAll(() => {
  process.env.COOKIE_SECRET = "test-secret";
});

function reqWith(cookie?: string) {
  return { cookies: cookie ? { ws_scan: cookie } : {} } as any;
}

describe("scan cookie", () => {
  it("unset cookie = not used", () => {
    expect(getScanUsed(reqWith())).toBe(false);
  });

  it("valid signed cookie = used", () => {
    const sig = createHmac("sha256", "test-secret").update("1").digest("hex");
    expect(getScanUsed(reqWith(`1.${sig}`))).toBe(true);
  });

  it("tampered signature = not used", () => {
    expect(getScanUsed(reqWith("1.deadbeef"))).toBe(false);
  });

  it("markScanUsed writes a verifiable cookie", () => {
    const headers: Record<string, unknown> = {};
    const res = {
      getHeader: (k: string) => headers[k],
      setHeader: (k: string, v: unknown) => { headers[k] = v; },
    } as any;
    markScanUsed(res);
    const cookie = (headers["Set-Cookie"] as string[])[0];
    const value = cookie.split(";")[0].split("=")[1];
    expect(getScanUsed(reqWith(value))).toBe(true);
  });
});
```

Run: `npx vitest run src/lib/__tests__/scan-cookie.test.ts` — Expected: PASS (4 tests).

- [ ] **Step 2: Implement `/api/analyze`**

```ts
// src/pages/api/analyze.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { getServiceSupabase } from "@/lib/supabase";
import { missingEnv } from "@/lib/env";
import { checkRateLimit, getClientIp, hashIp } from "@/lib/rate-limit";
import { createRequestLogger } from "@/lib/logger";
import { hasActiveAccess } from "@/lib/subscription";
import { getScanUsed, markScanUsed } from "@/lib/scan-cookie";
import { runRules } from "@/lib/slop/rules";
import { runClaudePass } from "@/lib/slop/claude-pass";
import { computeScan } from "@/lib/slop/score";
import { SCAN_WORD_CAP_FREE, SCAN_WORD_CAP_PRO } from "@/lib/slop/types";

export const config = { api: { responseLimit: false } };

const SCANS_PER_MINUTE = 4;          // per IP or user — Claude calls are expensive
const FREE_SCANS_PER_DAY = 1;
const ANON_IP_SCANS_PER_DAY = 3;     // backstop against cookie clearing

function writeSSE(res: NextApiResponse, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function openSSE(res: NextApiResponse) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const missing = missingEnv("anthropic", "supabase", "cookie");
  if (missing.length > 0) {
    createRequestLogger("/api/analyze").error("analyze unavailable — missing env", undefined, { missing });
    return res.status(503).json({
      error: "server_misconfigured",
      message: "Analysis is temporarily unavailable. Please try again later.",
    });
  }

  const { text } = req.body;
  if (!text || typeof text !== "string" || text.trim().length < 100) {
    return res.status(400).json({ error: "Paste at least 100 characters of your draft." });
  }

  const supabase = createServerSupabaseClient({ req, res });
  const { data: { user } } = await supabase.auth.getUser();
  const log = createRequestLogger("/api/analyze", user?.id);
  const serviceClient = getServiceSupabase();

  const rateKey = user ? `analyze:${user.id}` : `analyze-ip:${getClientIp(req)}`;
  const limit = checkRateLimit(rateKey, SCANS_PER_MINUTE, 60_000);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSeconds));
    return res.status(429).json({ error: "rate_limited" });
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // --- Metering (before the expensive Claude call) ---
  let isPaid = false;
  let scanClaimed = false; // true when a free-account scan was consumed (refundable)

  if (!user) {
    if (wordCount > SCAN_WORD_CAP_FREE) {
      return res.status(400).json({ error: "too_long", cap: SCAN_WORD_CAP_FREE });
    }
    if (getScanUsed(req)) {
      return res.status(403).json({
        error: "signup_required",
        message: "You've used your free scan. Create a free account for one scan every day.",
      });
    }
    // IP backstop — same anon_usage RPC, salted bucket so scans don't collide with searches
    const { data: anonRpc, error: anonErr } = await serviceClient.rpc("try_increment_anon_count", {
      p_ip_hash: hashIp("scan:" + getClientIp(req)),
      p_limit: ANON_IP_SCANS_PER_DAY,
    });
    if (anonErr) {
      log.error("anon scan RPC failed (failing open)", anonErr);
    } else if (anonRpc && !anonRpc.allowed) {
      return res.status(403).json({
        error: "signup_required",
        message: "Daily scan limit reached for this network. Create a free account to continue.",
      });
    }
    markScanUsed(res); // must be set before SSE headers flush
  } else {
    const { data: rpc, error: rpcError } = await serviceClient.rpc("try_increment_scan_count", {
      p_user_id: user.id,
      p_limit: FREE_SCANS_PER_DAY,
    });
    if (rpcError || !rpc) {
      log.error("try_increment_scan_count RPC failed", rpcError);
      return res.status(500).json({ error: "Could not process scan" });
    }
    isPaid = hasActiveAccess(rpc.subscription_status);
    if (!rpc.allowed) {
      return res.status(403).json({
        error: "scan_limit_reached",
        message: "You've used today's free scan. Upgrade to Wordsmith Pro for unlimited scans.",
      });
    }
    scanClaimed = !isPaid;
    const cap = isPaid ? SCAN_WORD_CAP_PRO : SCAN_WORD_CAP_FREE;
    if (wordCount > cap) {
      if (scanClaimed) await serviceClient.rpc("refund_scan", { p_user_id: user.id });
      return res.status(400).json({ error: "too_long", cap });
    }
  }

  // --- Analysis ---
  openSSE(res);
  const rules = runRules(text);
  writeSSE(res, "rules", computeScan(rules, [], true)); // provisional, rules-only

  try {
    const claudeSpans = await runClaudePass(text);
    const result = computeScan(rules, claudeSpans, false);
    if (user && isPaid) {
      Promise.resolve(
        serviceClient.from("scan_history").insert({
          user_id: user.id,
          score: result.score,
          band: result.band,
          word_count: rules.stats.wordCount,
          breakdown: result.breakdown,
        })
      ).catch((err) => log.error("scan history write failed", err));
    }
    writeSSE(res, "result", result);
    log.info("scan complete", { score: result.score, words: wordCount, latencyMs: log.latencyMs() });
  } catch (err) {
    log.error("claude pass failed — serving rules-only, refunding scan", err);
    if (user && scanClaimed) {
      await serviceClient.rpc("refund_scan", { p_user_id: user.id }).catch(() => {});
    }
    writeSSE(res, "result", computeScan(rules, [], true));
  }
  res.end();
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean, all tests pass. (Endpoint behavior is exercised in Task 11's live check — no unit test for the handler itself; its pieces are all unit-tested.)

- [ ] **Step 4: Commit**

```bash
git add wordsmith-app/src/pages/api/analyze.ts wordsmith-app/src/lib/scan-cookie.ts wordsmith-app/src/lib/__tests__/scan-cookie.test.ts
git commit -m "Add /api/analyze SSE endpoint with scan metering and refund"
```

---

### Task 7: Move word search to `/search`

**Files:**
- Create: `src/pages/search.tsx` (moved content of current `src/pages/index.tsx`)
- Modify: `src/pages/index.tsx` (becomes a temporary re-export — replaced in Task 8)
- Modify: `src/pages/api/user.ts` (no change needed — verify only)

**Interfaces:**
- Produces: `/search` renders the exact current search experience. Task 8 replaces `index.tsx`. Canonical URL inside `search.tsx` becomes `${SITE_URL}/search`.

- [ ] **Step 1: Move the file**

```bash
git mv wordsmith-app/src/pages/index.tsx wordsmith-app/src/pages/search.tsx
```

- [ ] **Step 2: Fix canonical + OG URLs in `search.tsx`**

In `search.tsx`, change the two `Head` URLs from `${SITE_URL}/` to `${SITE_URL}/search`:

```tsx
<link rel="canonical" href={`${SITE_URL}/search`} />
<meta property="og:url" content={`${SITE_URL}/search`} />
```

Leave everything else (paywall, checkout-verify effect, landing sections) untouched — Task 8 relocates the checkout-verify effect to the new homepage; until then both pages having it is harmless but the `?upgraded=true` redirect lands on `/`, so Task 8 must carry it.

- [ ] **Step 3: Create placeholder index.tsx (keeps the build green until Task 8)**

```tsx
// src/pages/index.tsx — temporary; replaced by the analyzer in the next task
export { default } from "./search";
```

- [ ] **Step 4: Verify build + commit**

Run: `npx tsc --noEmit` then the dummy-env build.
Expected: `/search` appears in the route list; build green.

```bash
git add -A wordsmith-app/src/pages
git commit -m "Move word search to /search ahead of analyzer homepage"
```

---

### Task 8: Analyzer UI — hook, components, homepage

**Files:**
- Create: `src/lib/use-analyze.ts`
- Create: `src/components/slop/ScoreBadge.tsx`
- Create: `src/components/slop/SpanCard.tsx`
- Create: `src/components/slop/HighlightedText.tsx`
- Create: `src/pages/index.tsx` (replacing the Task 7 placeholder)
- Modify: `src/lib/analytics.ts` (extend event union)

**Interfaces:**
- Consumes: SSE events `rules`/`result`/`error` from Task 6; `runRules` + `computeScan` client-side for live re-score; `ScanResult`, `SlopSpan` types; `isSeedWord` from `@/lib/seed-words` (for the WORDS suggestion link); `trackEvent`.
- Produces: the new homepage. `useAnalyze()` returns `{ result, loading, error, limit, analyze(text) }` where `limit` is `"signup" | "paywall" | null`.

- [ ] **Step 1: Extend analytics union**

In `src/lib/analytics.ts` change the union to:

```ts
export type FunnelEvent =
  | "search_started"
  | "limit_hit"
  | "paywall_view"
  | "checkout_start"
  | "upgrade_complete"
  | "scan_started"
  | "scan_completed"
  | "span_clicked";
```

- [ ] **Step 2: Write use-analyze.ts**

```ts
// src/lib/use-analyze.ts
import { useCallback, useState } from "react";
import type { ScanResult } from "./slop/types";

interface UseAnalyze {
  result: ScanResult | null;
  setResult: (r: ScanResult | null) => void;
  loading: boolean;
  error: string | null;
  limit: "signup" | "paywall" | null;
  analyze: (text: string) => Promise<void>;
}

/** Owns the /api/analyze SSE request. Mirrors use-sse-search.ts. */
export function useAnalyze(): UseAnalyze {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState<"signup" | "paywall" | null>(null);

  const analyze = useCallback(async (text: string) => {
    setLoading(true);
    setError(null);
    setLimit(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (response.status === 403) {
        const data = await response.json();
        setLimit(data.error === "scan_limit_reached" ? "paywall" : "signup");
        setLoading(false);
        return;
      }
      if (response.status === 400 || response.status === 429) {
        const data = await response.json().catch(() => null);
        setError(
          data?.error === "too_long"
            ? `That draft is over the ${data.cap.toLocaleString()}-word limit for your plan.`
            : data?.message || data?.error || "Analysis failed. Please try again."
        );
        setLoading(false);
        return;
      }
      if (!response.ok || !response.body) throw new Error("Analysis failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop()!;
        for (const rawEvent of events) {
          let name = "", dataLine = "";
          for (const line of rawEvent.split("\n")) {
            if (line.startsWith("event: ")) name = line.slice(7).trim();
            if (line.startsWith("data: ")) dataLine = line.slice(6);
          }
          if (!dataLine) continue;
          try {
            const payload = JSON.parse(dataLine);
            if (name === "rules" || name === "result") {
              setResult(payload);
              setLoading(name === "rules"); // still waiting on the Claude pass
            }
            if (name === "error") {
              setError(payload.message || "Something went wrong.");
              setLoading(false);
            }
          } catch { /* malformed event — skip */ }
        }
      }
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }, []);

  return { result, setResult, loading, error, limit, analyze };
}
```

- [ ] **Step 3: Write ScoreBadge.tsx**

```tsx
// src/components/slop/ScoreBadge.tsx
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
    </div>
  );
}
```

- [ ] **Step 4: Write SpanCard.tsx**

```tsx
// src/components/slop/SpanCard.tsx
import Link from "next/link";
import type { SlopSpan } from "@/lib/slop/types";
import { isSeedWord } from "@/lib/seed-words";

/** WHY / TRY / WORDS card for a flagged span. Never offers a rewrite. */
export default function SpanCard({ span, onClose }: { span: SlopSpan; onClose: () => void }) {
  const firstWord = span.text.toLowerCase().replace(/[^a-z\s'-]/g, "").trim().split(/\s+/)[0] || "";
  const wordLink = isSeedWord(firstWord) ? `/synonyms-for/${firstWord}` : `/search`;
  return (
    <div className="bg-white border border-gold/40 rounded-xl p-5 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <span className="font-display italic text-[15px] text-parchment-900">&ldquo;{span.text}&rdquo;</span>
        <button onClick={onClose} aria-label="Close" className="bg-transparent border-none cursor-pointer text-parchment-500">✕</button>
      </div>
      <p className="font-body text-[13px] text-parchment-800 m-0 mb-1.5">
        <span className="font-bold text-gold uppercase text-[11px] tracking-wider mr-1.5">Why</span>
        {span.why}
      </p>
      <p className="font-body text-[13px] text-parchment-800 m-0 mb-1.5">
        <span className="font-bold text-gold uppercase text-[11px] tracking-wider mr-1.5">Try</span>
        {span.hint}
      </p>
      <p className="font-body text-[13px] m-0">
        <span className="font-bold text-gold uppercase text-[11px] tracking-wider mr-1.5">Words</span>
        <Link href={wordLink} className="text-gold font-semibold no-underline">
          curated alternatives →
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Write HighlightedText.tsx**

```tsx
// src/components/slop/HighlightedText.tsx
import type { SlopSpan } from "@/lib/slop/types";

interface Props {
  text: string;
  spans: SlopSpan[];
  activeIndex: number | null;
  onSpanClick: (index: number) => void;
}

/** Read-only render of the draft with flagged spans marked. */
export default function HighlightedText({ text, spans, activeIndex, onSpanClick }: Props) {
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  spans.forEach((span, i) => {
    if (span.start < cursor) return; // skip overlaps already rendered
    if (span.start > cursor) parts.push(<span key={`t${i}`}>{text.slice(cursor, span.start)}</span>);
    parts.push(
      <button
        key={`s${i}`}
        onClick={() => onSpanClick(i)}
        className={`inline bg-transparent border-none p-0 cursor-pointer font-inherit text-inherit rounded-sm ${
          activeIndex === i ? "bg-gold/30" : "bg-gold/15"
        }`}
        style={{ boxShadow: "inset 0 -2px 0 #C0392B66", font: "inherit" }}
        aria-label={`Flagged: ${span.text}`}
      >
        {text.slice(span.start, span.end)}
      </button>
    );
    cursor = span.end;
  });
  if (cursor < text.length) parts.push(<span key="tail">{text.slice(cursor)}</span>);
  return (
    <div className="font-body text-[15px] leading-relaxed text-parchment-900 whitespace-pre-wrap">
      {parts}
    </div>
  );
}
```

- [ ] **Step 6: Write the new homepage `index.tsx`**

Structure (complete file; landing sections are imported unchanged from the existing `src/components/landing/*` used by `search.tsx` — copy the import list and the section order from `search.tsx`'s bottom half):

```tsx
// src/pages/index.tsx — the de-slop analyzer (new core surface)
import { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSession } from "@supabase/auth-helpers-react"; // match search.tsx's session mechanism
import { SITE_URL, jsonLdSerialize } from "@/lib/seo";
import { useAnalyze } from "@/lib/use-analyze";
import { runRules } from "@/lib/slop/rules";
import { computeScan } from "@/lib/slop/score";
import { trackEvent } from "@/lib/analytics";
import ScoreBadge from "@/components/slop/ScoreBadge";
import SpanCard from "@/components/slop/SpanCard";
import HighlightedText from "@/components/slop/HighlightedText";
import AuthModal from "@/components/AuthModal";
import PaywallModal from "@/components/PaywallModal";
import Footer from "@/components/landing/Footer";

const TITLE = "Wordsmith — De-slop your writing. Get your Slop Score.";
const DESCRIPTION =
  "Paste your draft. Wordsmith flags AI-slop tells — stock phrases, hedging, flat rhythm — explains each one, and helps you rewrite in your own voice. It never writes for you.";

export default function Analyzer() {
  const session = useSession();
  const { result, setResult, loading, error, limit, analyze } = useAnalyze();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(true);
  const [activeSpan, setActiveSpan] = useState<number | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const analyzedText = useRef("");

  // 403 from the API → the right modal
  useEffect(() => {
    if (limit === "signup") setShowAuth(true);
    if (limit === "paywall") setShowPaywall(true);
    if (limit) trackEvent("limit_hit", { kind: "scan" });
  }, [limit]);

  const handleAnalyze = async () => {
    trackEvent("scan_started", { auth: session ? "authed" : "anon" });
    analyzedText.current = draft;
    setEditing(false);
    setActiveSpan(null);
    await analyze(draft);
  };

  // Live rules-only re-score while the user edits after a scan (free, client-side)
  const liveResult = useMemo(() => {
    if (!result || editing === false || draft === analyzedText.current) return result;
    return computeScan(runRules(draft), [], true);
  }, [draft, editing, result]);

  useEffect(() => {
    if (result && !loading && !result.degraded) {
      trackEvent("scan_completed", { band: result.band });
    }
  }, [result, loading]);

  const shown = liveResult ?? result;

  return (
    <div className="min-h-screen">
      <Head>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href={`${SITE_URL}/`} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={`${SITE_URL}/`} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdSerialize({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Wordsmith",
              url: SITE_URL,
              description: DESCRIPTION,
              applicationCategory: "Productivity",
            }),
          }}
        />
      </Head>

      <nav aria-label="Site navigation" className="sticky top-0 z-40 px-6 py-4 flex justify-between items-center border-b border-gold/[.09] bg-[#f2ede2]/75 backdrop-blur-md">
        <span className="font-display font-black text-parchment-900">Wordsmith</span>
        <div className="flex gap-4 items-center">
          <Link href="/search" className="font-body text-sm text-parchment-700 no-underline">Word Search</Link>
          <Link href="/words" className="font-body text-sm text-parchment-700 no-underline">Word Library</Link>
        </div>
      </nav>

      <main className="max-w-[980px] mx-auto px-6 pt-14 pb-16">
        <header className="text-center mb-10">
          <h1 className="font-display font-black text-parchment-900 m-0 mb-4 tracking-[-0.03em]" style={{ fontSize: "clamp(38px, 6vw, 64px)" }}>
            Sound like you. Not like a bot.
          </h1>
          <p className="font-body text-[16px] text-parchment-600 max-w-[560px] mx-auto m-0">
            Paste your draft. Wordsmith flags the slop — stock phrases, hedging, flat
            rhythm — explains every tell, and you rewrite it in your own voice.
            It never writes a word for you.
          </p>
        </header>

        <div className="grid gap-6" style={{ gridTemplateColumns: shown ? "1fr 260px" : "1fr" }}>
          <section>
            {editing || !shown ? (
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Paste your draft here (at least 100 characters)…"
                className="w-full min-h-[320px] bg-white border border-parchment-300 rounded-2xl p-6 font-body text-[15px] leading-relaxed text-parchment-900 resize-y"
              />
            ) : (
              <div className="bg-white border border-parchment-300 rounded-2xl p-6">
                <HighlightedText
                  text={analyzedText.current}
                  spans={shown.spans}
                  activeIndex={activeSpan}
                  onSpanClick={(i) => { setActiveSpan(i); trackEvent("span_clicked"); }}
                />
              </div>
            )}

            <div className="flex gap-3 mt-4 items-center">
              <button
                onClick={handleAnalyze}
                disabled={loading || draft.trim().length < 100}
                className={`btn-primary px-8 py-3 rounded-xl border-none font-body text-[15px] font-semibold text-white ${loading ? "bg-parchment-500 cursor-wait" : "bg-gold cursor-pointer"}`}
              >
                {loading ? "Analyzing…" : shown ? "Re-analyze" : "Get my Slop Score"}
              </button>
              {shown && !editing && (
                <button
                  onClick={() => { setEditing(true); setActiveSpan(null); }}
                  className="bg-transparent border border-parchment-300 rounded-xl px-5 py-3 font-body text-[14px] text-parchment-700 cursor-pointer"
                >
                  Edit draft
                </button>
              )}
              {error && <span className="font-body text-sm text-category-punchy">{error}</span>}
            </div>

            {activeSpan !== null && shown?.spans[activeSpan] && (
              <div className="mt-4">
                <SpanCard span={shown.spans[activeSpan]} onClose={() => setActiveSpan(null)} />
              </div>
            )}
          </section>

          {shown && (
            <aside className="flex flex-col gap-4 items-center">
              <ScoreBadge result={shown} />
              <p className="font-body text-[12px] text-parchment-500 text-center m-0">
                Your draft is analyzed in-flight and never stored.
              </p>
            </aside>
          )}
        </div>
      </main>

      <Footer />
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} initialMode="signup" />
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} />
    </div>
  );
}
```

**Implementation notes for this step (read before wiring):**
- Check `search.tsx` for the exact `AuthModal` prop names (`mode`/`initialMode`, callbacks) and session hook used (`useSession` vs manual client) — mirror them exactly; the snippet above must be adapted to the real prop names found there.
- Carry the `?upgraded=true&session_id=` checkout-verify `useEffect` over from `search.tsx` into this page verbatim (it must live on `/` because Stripe redirects there). Remove it from `search.tsx` in this task.
- Keep the landing sections (`PricingSection`, `Testimonials`, etc.) OFF this page for v1 — the analyzer + nav + footer is the page. Landing copy rework is Task 10.

- [ ] **Step 7: Verify + commit**

Run: `npx tsc --noEmit && npx vitest run` then the dummy-env build.
Expected: all green; `/` and `/search` both in the route list.

```bash
git add -A wordsmith-app/src
git commit -m "Add de-slop analyzer as the homepage"
```

---

### Task 9: Scan info in `/api/user` + paywall copy

**Files:**
- Modify: `src/pages/api/user.ts`
- Modify: `src/components/PaywallModal.tsx`
- Modify: `src/lib/types.ts` (UserInfo gains scan fields)

**Interfaces:**
- Consumes: `effectiveDailyCount` (already in `src/lib/subscription.ts`), migration 007 columns.
- Produces: GET `/api/user` additionally returns `scansRemaining: number | null` (null when paid). `UserInfo` type extended to match.

- [ ] **Step 1: Extend the GET response**

In `user.ts`, add `scan_count, last_scan_reset` to the profile select, then after `todayCount`:

```ts
const todayScans = effectiveDailyCount(profile.scan_count, profile.last_scan_reset);
```

and add to the JSON response:

```ts
scansRemaining: isPaid ? null : Math.max(0, 1 - todayScans),
```

Add `scansRemaining: number | null;` to `UserInfo` in `src/lib/types.ts`.

- [ ] **Step 2: Paywall copy**

In `PaywallModal.tsx`, update `PRO_FEATURES` to lead with the analyzer:

```ts
const PRO_FEATURES = [
  "Unlimited Slop Score scans",
  "10,000-word drafts (free: 1,500)",
  "Scan history",
  "Unlimited word searches",
  "Save words to collections",
  "Cancel anytime",
];
```

and change the subtitle line to be limit-agnostic:

```tsx
You&apos;ve hit today&apos;s free limit. Upgrade for unlimited scans and
searches, and keep your writing unmistakably yours.
```

- [ ] **Step 3: Verify + commit**

Run: `npx tsc --noEmit && npx vitest run`.

```bash
git add wordsmith-app/src
git commit -m "Surface scan allowance in user API and paywall copy"
```

---

### Task 10: Share card + landing/SEO copy alignment

**Files:**
- Create: `src/pages/api/og-score.tsx`
- Create: `src/pages/score.tsx`
- Modify: `src/components/slop/ScoreBadge.tsx` (add share link)
- Modify: `package.json` (add `@vercel/og`)

**Interfaces:**
- Produces: `/score?v=17&b=clean` share page (no stored data — all from query params, clamped/validated) with OG image from `/api/og-score?v=17&b=clean`.

- [ ] **Step 1: Install @vercel/og**

Run: `npm install @vercel/og`

- [ ] **Step 2: Edge OG route**

```tsx
// src/pages/api/og-score.tsx
import { ImageResponse } from "@vercel/og";
import type { NextRequest } from "next/server";

export const config = { runtime: "edge" };

const BANDS: Record<string, { color: string; label: string }> = {
  clean: { color: "#1A7A6D", label: "CLEAN" },
  murky: { color: "#D4A017", label: "MURKY" },
  slop: { color: "#C0392B", label: "SLOP" },
};

export default function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const score = Math.max(0, Math.min(100, parseInt(searchParams.get("v") || "0", 10) || 0));
  const band = BANDS[searchParams.get("b") || ""] || BANDS.murky;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f2ede2", fontFamily: "Georgia" }}>
        <div style={{ fontSize: 28, letterSpacing: 6, color: "#8A8478" }}>SLOP SCORE</div>
        <div style={{ fontSize: 220, fontWeight: 800, color: band.color, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: 40, fontWeight: 700, color: band.color, letterSpacing: 4 }}>{band.label}</div>
        <div style={{ fontSize: 24, color: "#8A8478", marginTop: 24 }}>trywordsmith.com — de-slop your writing</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
```

- [ ] **Step 3: Share page**

```tsx
// src/pages/score.tsx
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Footer from "@/components/landing/Footer";
import { SITE_URL } from "@/lib/seo";
import { bandFor } from "@/lib/slop/types";

export default function SharedScore() {
  const router = useRouter();
  const score = Math.max(0, Math.min(100, parseInt(String(router.query.v || "0"), 10) || 0));
  const band = bandFor(score);
  const og = `${SITE_URL}/api/og-score?v=${score}&b=${band}`;
  const colors = { clean: "#1A7A6D", murky: "#D4A017", slop: "#C0392B" } as const;
  return (
    <div className="min-h-screen">
      <Head>
        <title>{`Slop Score: ${score} | Wordsmith`}</title>
        <meta name="robots" content="noindex" />
        <meta property="og:title" content={`My writing scored ${score} (${band}) on Wordsmith`} />
        <meta property="og:image" content={og} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={og} />
      </Head>
      <main className="max-w-[560px] mx-auto px-6 pt-20 pb-16 text-center">
        <div className="font-body text-[12px] font-semibold tracking-[0.22em] uppercase text-parchment-500 mb-2">Slop Score</div>
        <div className="font-display font-black leading-none mb-2" style={{ fontSize: 140, color: colors[band] }}>{score}</div>
        <div className="font-body font-bold text-lg uppercase tracking-widest mb-10" style={{ color: colors[band] }}>{band}</div>
        <Link href="/" className="btn-primary inline-block bg-gold text-white no-underline rounded-xl px-8 py-3.5 font-body text-[15px] font-semibold">
          Score your own writing
        </Link>
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 4: Share link in ScoreBadge**

Add below the breakdown rows in `ScoreBadge.tsx`:

```tsx
<a
  href={`/score?v=${result.score}`}
  target="_blank"
  rel="noreferrer"
  className="font-body text-[12px] text-gold font-semibold no-underline block mt-3"
>
  Share this score →
</a>
```

- [ ] **Step 5: Verify + commit**

Run: `npx tsc --noEmit && npx vitest run` + dummy-env build (confirm `/score` and `/api/og-score` in output).

```bash
git add -A wordsmith-app
git commit -m "Add shareable Slop Score page with OG image"
```

---

### Task 11: Verification sweep + docs

**Files:**
- Modify: `tasks/todo.md` (repo-root tasks dir — mark pivot shipped, list user actions)

- [ ] **Step 1: Full local verification**

Run in `wordsmith-app`:
1. `npx tsc --noEmit` — clean
2. `npx vitest run` — all pass
3. Dummy-env `next build` — green; route list contains `/`, `/search`, `/score`, `/api/analyze`, `/api/og-score`
4. `npm run dev` (if not running), then with real creds absent locally: hit `http://localhost:3000/` — page renders, paste ≥100 chars, click analyze → expect 503 `server_misconfigured` handled as visible error (local env is a template; full flow is verified in prod). Stop the dev server afterward.

- [ ] **Step 2: Update tasks/todo.md**

Append a "De-slop pivot v1 shipped" section: what shipped, USER actions:
- Run `supabase-migrations/007_scan_metering.sql` in Supabase
- After deploy: live smoke test — anon scan works once, second anon scan asks for signup; free account gets 1/day; Pro unlimited; share link renders OG image
- No Stripe changes

- [ ] **Step 3: Final commit + push**

```bash
git add -A
git commit -m "De-slop companion v1: verification and rollout notes"
git push origin main
```

---

## Self-Review (completed)

- **Spec coverage:** surface swap (T7/T8), hybrid engine (T1–T4), metering incl. anon lifetime + IP backstop + refund (T5/T6), guided self-rewrite UX with WHY/TRY/WORDS (T8), pricing untouched (T9 copy only), trust/no-persistence (T6 + T8 copy), share card (T10), analytics (T8), tests throughout, error handling (T6 degraded path). Slop-dictionary SEO pages, extension, uploads: explicitly out of scope per spec.
- **Placeholder scan:** none — all steps carry code or exact commands. Two intentional adapt-in-place notes (AuthModal props, checkout-verify effect relocation) name exactly what to copy and from where.
- **Type consistency:** `runRules`/`computeScan`/`runClaudePass`/`parseClaudeSpans`/`try_increment_scan_count`/`refund_scan`/`scansRemaining` names match across tasks; SSE event names `rules`/`result`/`error` consistent between T6 and T8.
