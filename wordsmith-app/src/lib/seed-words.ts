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
  // Batch 2 (keyword-researched 2026-07-20): professional/emotional/everyday
  "support", "show", "opportunity", "additionally", "appreciate", "challenge", "develop", "encourage",
  "focus", "hope", "impact", "influence", "problem", "provide", "use", "hopeful",
  "idea", "thing", "benefit", "better", "community", "demonstrate", "goal", "learn",
  "passion", "process", "skill", "utilize", "work", "contribute", "crazy", "enjoy",
  "explore", "highlight", "implement", "inform", "maintain", "present", "reflect", "require",
  "success", "transform", "say", "ability", "believe", "clearly", "communicate", "enhance",
  "environment", "establish", "facilitate", "growth", "issue", "many", "promote", "recognize",
  "responsibility", "reveal", "suggest", "therefore", "value", "overwhelmed", "result", "although",
  "culture", "decision", "especially", "identify", "lead", "leadership", "like", "manage",
  "reduce", "relationship", "relevant", "represent", "state", "bored", "grateful", "group",
  "story", "engage", "ensure", "expand", "express", "however", "participate", "perform",
  "progress", "purpose", "pursue", "quality", "quickly", "realize", "respond", "share",
  "slowly", "strength", "strengthen", "update", "disappointed", "fight", "find", "grow",
  "joyful", "life", "reason", "time", "fun", "immediately", "introduce", "organize",
  "project", "prove", "remove", "serve", "solution", "strategy", "ask", "food",
  "friend", "get", "graceful", "lie", "money", "part", "relaxed", "always",
  "because", "definitely", "elegant", "finally", "investigate", "knowledge", "leverage", "moreover",
  "obtain", "prepare", "receive", "request", "annoyed", "enthusiastic", "hurt", "long",
  "optimistic", "place", "stressed", "tell", "absolutely", "carefully", "collaborate", "feel",
  "guide", "illustrate", "involve", "monitor", "motivate", "named", "plan", "refer",
  "remember", "resolve", "extraordinary", "lose", "name", "outstanding", "question", "student",
  "worried", "busy", "charming", "little", "oversee", "produce", "replace", "seek",
  "vision", "welcome", "anxious", "hide", "house", "people", "remarkable", "thrilled",
  "upset", "best", "company", "completely", "delightful", "enable", "exceptional", "first",
  "indicate", "integrate", "mention", "offer", "referred", "sometimes", "worse", "answer",
  "book", "delighted", "frustrated", "guilty", "pessimistic", "relieved", "rise", "shake",
  "teach", "teacher", "water", "brilliant", "furthermore", "generate", "observe", "previous",
  "research", "resource", "usually", "content", "embarrassed", "impressive", "night", "spectacular",
  "examine", "feature", "final", "free", "generally", "late", "much", "often",
  "select", "solve", "track", "carry", "depressed", "fabulous", "forgive", "satisfied",
  "steal", "way", "gather", "introduction", "never", "notice", "recommend", "sick",
  "study", "team", "ashamed", "envious", "eye", "family", "flawless", "hold",
  "leave", "man", "pay", "shine", "spend", "exactly", "last", "predict",
  "propose", "relate", "review", "sorry", "succeed", "wish", "choose", "fall",
  "grumpy", "hear", "jealous", "marvelous", "meet", "miserable", "send", "stand",
  "stick", "woman", "representative", "thank", "worst", "buy", "come", "day",
  "fact", "hit", "keep", "number", "ride", "superb", "tear", "terrific",
  "win", "world", "alright", "next", "submit", "forget", "irritated", "sell",
  "set", "swim", "throw", "early", "bring", "cheerful", "fly", "put",
  "ring", "year", "suddenly", "very", "really",
  // Weekly SEO loop 2026-07-21 (25 words from backlog)
  "analyze", "comfort", "emphasize", "desire", "foster", "care", "cause", "determine",
  "fear", "inspire", "struggle", "allow", "approach", "celebrate", "continue", "evolve",
  "complex", "confusing", "eager", "helpful", "agree", "build", "complete", "consider",
  "decide",
  // Weekly SEO loop 2026-07-27 (25 words from backlog)
  "describe", "discuss", "navigate", "persist", "protect", "respect", "critical", "thrive",
  "intense", "address", "balance", "design", "differ", "embrace", "enforce", "evaluate",
  "include", "preserve", "scare", "shift", "emotional", "fake", "stop", "immense",
  "adapt",
  // Weekly SEO loop 2026-08-03 (25 words from backlog)
  "assess", "assist", "assume", "attempt", "avoid", "capture", "confirm", "confront",
  "connect", "correct", "criticize", "demand", "display", "empower", "form", "ignore",
  "master", "move", "praise", "prevent", "equal", "trust", "try", "innocent",
  "aware",
  // Weekly SEO loop 2026-08-10 (25 words from backlog)
  "bless", "collect", "discover", "dream", "escape", "fail", "follow", "fulfill",
  "function", "invest", "mix", "open", "operate", "overcome", "play", "point",
  "regret", "resist", "bold", "defiant", "dramatic", "expert", "friendly", "spread",
  "suffer",
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
