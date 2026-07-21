// Signed-in users: this many free searches PER DAY (renews daily, migration 006).
// Anonymous users: this many LIFETIME (cookie + anon_usage IP cap).
export const FREE_SEARCH_LIMIT = 3;
export const SUBSCRIPTION_PRICE_MONTHLY = 10; // dollars
export const APP_NAME = "Wordsmith";
export const APP_TAGLINE = "Trade the ordinary for the extraordinary";
export const ANON_COUNT_KEY = "wordsmith_anon_searches";

export const WORD_CATEGORIES: Record<
  string,
  { label: string; color: string; desc: string }
> = {
  elevated: { label: "Elevated", color: "#8B6914", desc: "Sophisticated & refined" },
  literary: { label: "Literary", color: "#6B4C8A", desc: "Bookish & evocative" },
  punchy:   { label: "Punchy",   color: "#C0392B", desc: "Sharp & impactful" },
  rare:     { label: "Rare Gem", color: "#1A7A6D", desc: "Uncommon & distinctive" },
};
