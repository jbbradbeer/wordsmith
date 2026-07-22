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
