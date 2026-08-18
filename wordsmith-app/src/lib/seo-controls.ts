// Data-only SEO levers edited exclusively by the monthly /seo-review PR.
// Pruned words: noindex + dropped from sitemap (still live for direct visitors).
// Boosted words: FAQ block + extra inbound internal links (additive; core
// content never regenerated).

export const PRUNED_WORDS: ReadonlySet<string> = new Set<string>([
  // Added by the monthly review when a page fails to index. Empty until then.
]);

export const BOOSTED_WORDS: ReadonlySet<string> = new Set<string>([
  // Added by the monthly review for position 5-20 striking-distance pages.
  // 2026-08: pages at avg position 5-20 with >=20 impressions over 28 days (GSC).
  "answer", "bitter", "bless", "bold", "build", "cheerful", "collect",
  "defiant", "delightful", "differ", "dry", "enable", "enforce", "envious",
  "evaluate", "exactly", "expensive", "expert", "fact", "find", "fine",
  "follow", "fulfill", "full", "function", "generally", "generate", "gentle",
  "hear", "hit", "identify", "introduce", "invest", "involve", "jump", "keep",
  "know", "leverage", "long", "lost", "make", "meet", "messy", "mix", "much",
  "mysterious", "need", "never", "next", "offer", "operate", "organize",
  "overcome", "part", "pessimistic", "play", "point", "previous", "prove",
  "rare", "read", "real", "recognize", "reduce", "refer", "referred",
  "regret", "reliable", "replace", "require", "resist", "respond", "select",
  "sharp", "short", "sick", "sing", "soft", "sometimes", "speak",
  "spectacular", "stand", "start", "stick", "story", "strengthen", "suffer",
  "sweet", "tear", "thick", "thin", "thing", "tiny", "track", "usually",
  "want", "win", "wish", "worried", "worse", "worst", "write",
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
  for (const w of Array.from(boosted)) {
    if (toInject.length >= maxBoosted) break;
    if (w === currentWord || present.has(w)) continue;
    toInject.push(w);
  }
  if (toInject.length === 0) return related;
  const injectCount = Math.min(toInject.length, related.length);
  const keep = related.slice(0, related.length - injectCount);
  return [...keep, ...toInject.slice(0, injectCount)];
}
