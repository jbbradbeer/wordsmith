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
