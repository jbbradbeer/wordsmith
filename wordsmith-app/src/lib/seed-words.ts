/**
 * The allowlist behind /words/[word]. Each entry becomes a programmatic SEO
 * page ("Better words for X"), generated once via Claude and persisted in the
 * word_pages table. Keeping this a fixed list bounds generation cost — pages
 * outside it 404.
 */
export const SEED_WORDS = [
  // adjectives — feeling
  "happy", "sad", "angry", "scared", "afraid", "tired", "hungry", "lonely",
  "proud", "calm", "mad", "shy", "brave", "lucky", "lost",
  // adjectives — quality
  "good", "bad", "nice", "great", "amazing", "awesome", "cool", "perfect",
  "beautiful", "pretty", "cute", "ugly", "interesting", "important", "special",
  "weird", "strange", "mysterious", "funny", "smart", "clever", "wise",
  "simple", "fancy", "fair", "fine", "fresh", "pure", "real", "rare",
  // adjectives — physical
  "big", "small", "huge", "tiny", "tall", "short", "thin", "thick",
  "strong", "weak", "fast", "slow", "heavy", "light", "deep", "sharp",
  "soft", "rough", "smooth", "shiny", "bright", "dark", "loud", "quiet",
  "hot", "cold", "warm", "wet", "dry", "clean", "dirty", "full", "empty",
  "new", "old", "young", "rich", "poor", "hard", "easy", "tough", "wild",
  "gentle", "kind", "mean", "lazy", "messy", "sweet", "bitter",
  // verbs
  "said", "walk", "run", "look", "see", "think", "know", "love", "hate",
  "eat", "drink", "sleep", "cry", "laugh", "smile", "jump", "dance", "sing",
  "write", "read", "talk", "speak", "listen", "give", "take", "make",
  "start", "end", "change", "help", "want", "need",
  // High-volume additions (validated via keyword research, July 2026) — every
  // one has strong "synonyms for X" demand and low difficulty. See
  // synonym-volumes.ts for the numbers behind this list.
  "experience", "excited", "showed", "understand", "explain", "improve",
  "create", "increase", "comfortable", "significant", "unique", "confident",
  "effective", "determined", "efficient", "successful", "wonderful",
  "dangerous", "confused", "incredible", "obvious", "essential", "boring",
  "difficult", "curious", "creative", "powerful", "achieve", "delicious",
  "generous", "gorgeous", "horrible", "loyal", "nervous", "surprised",
  "terrible", "reliable", "destroy", "fantastic", "honest",
  "serious", "begin", "excellent", "famous", "peaceful",
  "stunning", "ancient", "cheap", "common", "gigantic",
  "journey", "popular", "expensive", "enormous", "talented",
  "intelligent", "modern", "patient", "went", "got",
] as const;

const SEED_SET = new Set<string>(SEED_WORDS);

export function isSeedWord(word: string): boolean {
  return SEED_SET.has(word);
}

/** Deterministic neighbours in the seed list — used for internal linking. */
export function relatedWords(word: string, count: number): string[] {
  const idx = SEED_WORDS.indexOf(word as (typeof SEED_WORDS)[number]);
  const start = idx === -1 ? 0 : idx + 1;
  const related: string[] = [];
  for (let i = 0; i < SEED_WORDS.length && related.length < count; i++) {
    const candidate = SEED_WORDS[(start + i) % SEED_WORDS.length];
    if (candidate !== word) related.push(candidate);
  }
  return related;
}
