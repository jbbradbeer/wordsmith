import { describe, it, expect, vi } from "vitest";

// Mock all dependencies before importing the module under test
vi.mock("@/lib/seo-controls", () => ({
  isPruned: (w: string) => w === "prunedword",
  PRUNED_WORDS: new Set(["prunedword"]),
  BOOSTED_WORDS: new Set<string>(),
  isBoosted: () => false,
  boostRelated: (r: string[]) => r,
}));

vi.mock("@/lib/seed-words", () => ({
  SEED_WORDS: ["happy", "prunedword"],
}));

vi.mock("@/lib/word-hubs", () => ({
  WORD_HUBS: [],
}));

vi.mock("@/lib/synonym-volumes", () => ({
  SYNONYM_VOLUMES: {},
}));

vi.mock("@/lib/seo", () => ({
  SITE_URL: "https://wordsmith.example.com",
}));

import { buildSitemapEntries } from "../../pages/sitemap.xml";

describe("buildSitemapEntries", () => {
  it("includes both routes for a normal word", () => {
    const paths = buildSitemapEntries().map((e) => e.path);
    expect(paths).toContain("/words/happy");
    expect(paths).toContain("/synonyms-for/happy");
  });
  it("excludes both routes for a pruned word", () => {
    const paths = buildSitemapEntries().map((e) => e.path);
    expect(paths).not.toContain("/words/prunedword");
    expect(paths).not.toContain("/synonyms-for/prunedword");
  });
});
