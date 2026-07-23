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
