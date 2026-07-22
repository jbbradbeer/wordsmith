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
