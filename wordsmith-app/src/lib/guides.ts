/**
 * Product-intent guide pages (/guides/[slug]) targeting the winnable
 * AI-writing keyword cluster (DataForSEO, Aug 2026: KD 0-16, US volumes).
 *
 * WORKFLOW: James writes all published copy. Every section ships with a
 * TODO placeholder brief; while ANY section still contains the TODO marker
 * the page is noindexed and excluded from the sitemap. Replace the
 * placeholder text with real copy to publish a guide.
 */

export const GUIDE_TODO_MARKER = "TODO(james)";

export interface GuideSection {
  heading: string;
  /** Real copy, or a placeholder brief starting with GUIDE_TODO_MARKER. */
  body: string;
}

export interface Guide {
  slug: string;
  /** <title> — keep under 60 characters. */
  title: string;
  metaDescription: string;
  /** Primary query this page targets (for reviews/tracking, not rendered). */
  targetKeyword: string;
  h1: string;
  intro: string;
  sections: GuideSection[];
}

export const GUIDES: Guide[] = [
  {
    slug: "ai-words-to-avoid",
    title: "AI Words to Avoid in Your Writing | Wordsmith",
    metaDescription:
      "The words and phrases that make writing read as AI-generated, and what to use instead.",
    targetKeyword: "ai words to avoid", // 110/mo, KD 0
    h1: "AI words to avoid",
    intro:
      "TODO(james): 2-3 sentences. Angle: certain words now function as AI fingerprints — readers discount writing that uses them. Promise: the list, why each reads as AI, and human alternatives.",
    sections: [
      {
        heading: "The current AI fingerprint list",
        body: "TODO(james): the core list (delve, tapestry, leverage, robust, seamless, elevate, crucial, foster, testament, landscape...). One line each on where models overuse it. Link 3-5 of the words to their /synonyms-for/ pages as replacements.",
      },
      {
        heading: "Why these words read as AI",
        body: "TODO(james): short mechanism explanation — RLHF register, hedging, formality bias. Your voice, not a research paper.",
      },
      {
        heading: "What to use instead",
        body: "TODO(james): the substitution approach — concrete over abstract, shorter over longer. Point at the Wordsmith search tool for per-word alternatives.",
      },
      {
        heading: "Check your own draft",
        body: "TODO(james): 1-2 sentences introducing Slop Score as the automated version of this checklist.",
      },
    ],
  },
  {
    slug: "ai-sounding-words",
    title: "Words That Make Writing Sound Like AI | Wordsmith",
    metaDescription:
      "Why some words instantly read as machine-written, with human-sounding alternatives for each.",
    targetKeyword: "ai sounding words", // 210/mo, KD 11
    h1: "Words that make writing sound like AI",
    intro:
      "TODO(james): distinct angle from ai-words-to-avoid — this one is about the READER's perception: which words trigger the 'this is AI' reaction and how fast.",
    sections: [
      {
        heading: "Words readers flag first",
        body: "TODO(james): ranked list by how strongly each triggers AI suspicion. Different framing from the avoid-list page to keep the two pages distinct.",
      },
      {
        heading: "Phrases and structures, not just words",
        body: "TODO(james): 'it's not just X, it's Y', rule-of-three everywhere, em-dash density, 'in today's fast-paced world' openers.",
      },
      {
        heading: "Rewriting without losing your point",
        body: "TODO(james): 2-3 before/after rewrites in your own voice.",
      },
    ],
  },
  {
    slug: "ai-writing-style",
    title: "What AI Writing Style Looks Like | Wordsmith",
    metaDescription:
      "The tics of AI writing style — vocabulary, rhythm, and structure — and how to keep your own voice.",
    targetKeyword: "ai writing style", // 170/mo, KD 16
    h1: "What AI writing style actually looks like",
    intro:
      "TODO(james): the widest of the four pages — style-level, not word-level. Sets up internal links to the other three guides.",
    sections: [
      {
        heading: "Vocabulary tics",
        body: "TODO(james): brief summary + link to /guides/ai-words-to-avoid for the full list.",
      },
      {
        heading: "Rhythm and structure tics",
        body: "TODO(james): uniform sentence length, paragraph symmetry, list addiction, hedged conclusions.",
      },
      {
        heading: "Tone tics",
        body: "TODO(james): relentless positivity, false balance, the 'delighted to help' register.",
      },
      {
        heading: "Keeping your own style when you use AI tools",
        body: "TODO(james): your actual workflow position — Wordsmith's thesis: use AI for suggestions, keep the sentences yours.",
      },
    ],
  },
  {
    slug: "does-my-writing-sound-like-ai",
    title: "Does My Writing Sound Like AI? | Wordsmith",
    metaDescription:
      "A quick self-check for AI-sounding writing, plus a free scanner that scores your draft.",
    targetKeyword: "does my writing sound like ai", // 110/mo, KD 0
    h1: "Does my writing sound like AI?",
    intro:
      "TODO(james): the highest-intent page of the four — searcher wants a verdict on their own text. Get them to the Slop Score scanner fast; the checklist is the warm-up.",
    sections: [
      {
        heading: "The 60-second self-check",
        body: "TODO(james): 5-7 yes/no questions (do you delve? is every list three items? ...).",
      },
      {
        heading: "Scan it instead",
        body: "TODO(james): 1-2 sentences introducing the Slop Score scanner — this page's primary CTA.",
      },
      {
        heading: "If it does sound like AI",
        body: "TODO(james): triage advice + links to the other guides for fixes.",
      },
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

/** A guide is publishable once no section (or intro) still carries the TODO marker. */
export function isGuidePublished(guide: Guide): boolean {
  return (
    !guide.intro.includes(GUIDE_TODO_MARKER) &&
    guide.sections.every((s) => !s.body.includes(GUIDE_TODO_MARKER))
  );
}
