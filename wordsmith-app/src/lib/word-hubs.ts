/**
 * Curated category hubs for the word library. Each hub is a landing page at
 * /words/category/[slug] that groups seed words by writing situation and
 * concentrates internal links on the highest-value synonym pages. Words may
 * appear in more than one hub; every word must be in SEED_WORDS (enforced by
 * test) or its links 404.
 */
export interface WordHub {
  slug: string;
  title: string;
  /** Short phrase used in headings ("words for …"). */
  noun: string;
  description: string;
  words: string[];
}

export const WORD_HUBS: WordHub[] = [
  {
    slug: "emotions",
    title: "Emotion Words",
    noun: "emotions and feelings",
    description:
      "Words for every shade of feeling — from mildly annoyed to utterly overjoyed. Swap the flat 'happy' or 'sad' for something that carries real weight.",
    words: [
      "happy", "sad", "angry", "scared", "afraid", "lonely", "proud", "calm",
      "mad", "shy", "excited", "nervous", "confused", "surprised", "worried",
      "anxious", "annoyed", "ashamed", "bored", "cheerful", "delighted",
      "depressed", "disappointed", "embarrassed", "enthusiastic", "envious",
      "frustrated", "grateful", "grumpy", "guilty", "hopeful", "hurt",
      "irritated", "jealous", "joyful", "miserable", "optimistic",
      "overwhelmed", "pessimistic", "relaxed", "relieved", "satisfied",
      "stressed", "thrilled", "upset", "curious", "confident", "determined",
    ],
  },
  {
    slug: "professional",
    title: "Professional & Business Words",
    noun: "professional writing",
    description:
      "Resume bullets, cover letters, performance reviews, LinkedIn posts. Replace tired corporate filler with verbs and nouns that actually land.",
    words: [
      "support", "opportunity", "provide", "develop", "demonstrate",
      "implement", "collaborate", "communicate", "contribute", "establish",
      "maintain", "manage", "organize", "participate", "perform", "prepare",
      "produce", "recommend", "respond", "utilize", "ability", "benefit",
      "challenge", "community", "company", "culture", "decision", "environment",
      "focus", "goal", "growth", "impact", "issue", "knowledge", "leadership",
      "passion", "problem", "process", "progress", "project", "purpose",
      "quality", "relationship", "resource", "responsibility", "skill",
      "solution", "strategy", "strength", "success", "team", "value", "vision",
      "ensure", "enhance", "facilitate", "leverage", "monitor", "oversee",
      "promote", "strengthen", "achieve", "successful",
      "efficient", "effective", "reliable", "experience",
    ],
  },
  {
    slug: "descriptive",
    title: "Descriptive Words",
    noun: "vivid description",
    description:
      "Adjectives that pull their weight. Trade 'good', 'big', and 'nice' for words that let readers see, hear, and feel what you mean.",
    words: [
      "good", "bad", "nice", "great", "amazing", "awesome", "cool", "perfect",
      "beautiful", "pretty", "cute", "ugly", "interesting", "important",
      "special", "weird", "strange", "mysterious", "funny", "smart", "clever",
      "wise", "simple", "fancy", "big", "small", "huge", "tiny", "strong",
      "weak", "fast", "slow", "bright", "dark", "loud", "quiet", "brilliant",
      "charming", "delightful", "elegant", "exceptional", "extraordinary",
      "fabulous", "flawless", "graceful", "impressive",
      "marvelous", "outstanding", "remarkable", "spectacular",
      "superb", "terrific", "stunning", "gorgeous", "incredible", "fantastic",
      "excellent", "wonderful", "delicious", "enormous", "gigantic",
    ],
  },
  {
    slug: "actions",
    title: "Action Verbs",
    noun: "stronger verbs",
    description:
      "Verbs carry sentences. Replace 'said', 'went', and 'got' with verbs that show motion, intent, and voice — the fastest upgrade any draft can get.",
    words: [
      "said", "showed", "went", "got", "walk", "run", "look", "see", "think",
      "know", "make", "give", "take", "help", "want", "need", "start", "end",
      "change", "create", "destroy", "begin", "improve", "increase",
      "understand", "explain", "say", "tell", "ask", "answer", "find", "keep",
      "hold", "bring", "carry", "choose", "come", "fall", "fight",
      "grow", "hear", "hide", "leave", "lose", "meet", "put", "rise", "send",
      "shake", "shine", "stand", "teach", "throw", "win", "learn", "explore",
      "express", "gather", "guide", "notice", "observe", "obtain", "prove",
      "pursue", "realize", "recognize", "reduce", "remove", "replace",
      "reveal", "seek", "serve", "solve", "transform",
    ],
  },
  {
    slug: "transitions",
    title: "Transitions & Connectors",
    noun: "smoother transitions",
    description:
      "However, therefore, additionally — the connective tissue of clear writing. Vary your transitions so every paragraph doesn't open the same way.",
    words: [
      "however", "therefore", "moreover", "furthermore", "additionally",
      "although", "because", "especially", "exactly", "finally",
      "generally", "immediately", "absolutely", "completely", "definitely",
      "clearly", "carefully", "quickly", "slowly", "often", "always", "never",
      "sometimes", "usually", "suddenly", "very", "really",
    ],
  },
  {
    slug: "everyday",
    title: "Everyday Words",
    noun: "everyday vocabulary",
    description:
      "The words everyone reaches for first — house, food, friend, fun. Perfectly fine words, each with richer alternatives when the moment calls for one.",
    words: [
      "house", "food", "water", "money", "time", "day", "night", "year",
      "friend", "family", "man", "woman", "people", "place", "thing",
      "way", "world", "life", "work", "book", "story", "name", "idea",
      "question", "reason", "result", "part", "number", "group", "fact",
      "fun", "sick", "crazy", "busy", "free", "little", "many", "much",
      "best", "better", "worst", "worse", "first", "last", "next", "early",
      "late", "new", "old", "young", "rich", "poor", "hot", "cold", "clean",
      "dirty", "easy", "hard", "difficult", "cheap", "expensive",
    ],
  },
];

const HUB_BY_SLUG = new Map(WORD_HUBS.map((h) => [h.slug, h]));

export function getHub(slug: string): WordHub | undefined {
  return HUB_BY_SLUG.get(slug);
}
