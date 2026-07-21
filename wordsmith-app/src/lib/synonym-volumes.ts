/**
 * Monthly US search volume for "synonyms for {word}" (DataForSEO via OpenSEO,
 * captured 2026-07-20). All queries measured informational intent and low
 * difficulty (KD 0–20). Drives sitemap <priority> and the order we generate
 * pages in. Extend when a new keyword batch is researched.
 */
export const SYNONYM_VOLUMES: Record<string, number> = {
  experience: 165000, excited: 110000, showed: 110000, help: 90500, strong: 90500,
  change: 74000, create: 74000, improve: 74000, interesting: 74000, understand: 74000,
  beautiful: 60500, comfortable: 60500, explain: 60500, significant: 60500, unique: 60500,
  confident: 49500, effective: 49500, good: 49500, important: 49500, mean: 49500,
  perfect: 49500, amazing: 40500, determined: 40500, easy: 40500, efficient: 40500,
  give: 40500, increase: 40500, sad: 40500, said: 40500, successful: 40500, wonderful: 40500,
  angry: 33100, calm: 33100, confused: 33100, dangerous: 33100, essential: 33100,
  happy: 33100, incredible: 33100, need: 33100, obvious: 33100, smart: 33100,
  think: 33100, want: 33100, bad: 27100, boring: 27100, dark: 27100, difficult: 27100,
  great: 27100, hard: 27100, love: 27100, proud: 27100, simple: 27100, sweet: 27100,
  creative: 22200, curious: 22200, fast: 22200, make: 22200, powerful: 22200,
  pretty: 22200, quiet: 22200, see: 22200, slow: 22200, tired: 22200, weak: 22200,
  weird: 22200, write: 22200, achieve: 18100, big: 18100, delicious: 18100, fair: 18100,
  generous: 18100, gorgeous: 18100, horrible: 18100, huge: 18100, loud: 18100,
  loyal: 18100, mysterious: 18100, nervous: 18100, old: 18100, real: 18100,
  reliable: 18100, start: 18100, surprised: 18100, take: 18100, terrible: 18100,
  brave: 14800, clean: 14800, cool: 14800, cry: 14800, cute: 14800, know: 14800,
  small: 14800, suddenly: 14800, wild: 14800, bright: 12100, deep: 12100, destroy: 12100,
  dirty: 12100, fancy: 12100, fantastic: 12100, hate: 12100, honest: 12100, laugh: 12100,
  messy: 12100, nice: 12100, really: 12100, scared: 12100, serious: 12100, smooth: 12100,
  tough: 12100, very: 12100, awesome: 9900, begin: 9900, empty: 9900, excellent: 9900,
  famous: 9900, full: 9900, funny: 9900, new: 9900, peaceful: 9900, smile: 9900,
  soft: 9900, special: 9900, stunning: 9900, walk: 9900, ancient: 8100, cheap: 8100,
  clever: 8100, cold: 8100, common: 8100, end: 8100, gigantic: 8100, hungry: 8100,
  journey: 8100, lazy: 8100, look: 8100, poor: 8100, popular: 8100, warm: 8100,
  expensive: 6600, fresh: 6600, hot: 6600, jump: 6600, light: 6600, lucky: 6600,
  mad: 6600, run: 6600, short: 6600, talk: 6600, thick: 6600, tiny: 6600, drink: 5400,
  enormous: 5400, rare: 5400, rough: 5400, tall: 5400, wet: 5400, dry: 4400, eat: 4400,
  gentle: 4400, got: 4400, heavy: 4400, lonely: 4400, lost: 4400, talented: 4400,
  ugly: 4400, bitter: 3600, dance: 3600, read: 3600, rich: 3600, shy: 3600, sleep: 3600,
  strange: 3600, wise: 3600, fine: 2900, listen: 2900, modern: 2900, pure: 2900,
  sharp: 2900, shiny: 2900, thin: 2900, went: 2900, young: 2900, patient: 2400,
  afraid: 1900, intelligent: 1900, sing: 1900, speak: 1900, kind: 1500,
};

/** Seed words ordered by descending "synonyms for" volume (unknowns last). */
export function byVolume(words: readonly string[]): string[] {
  return [...words].sort(
    (a, b) => (SYNONYM_VOLUMES[b] ?? 0) - (SYNONYM_VOLUMES[a] ?? 0)
  );
}
