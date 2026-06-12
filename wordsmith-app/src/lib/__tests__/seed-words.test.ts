import { describe, expect, it } from "vitest";
import { SEED_WORDS, isSeedWord, relatedWords } from "../seed-words";

describe("SEED_WORDS", () => {
  it("contains only lowercase single words (valid URL slugs)", () => {
    for (const word of SEED_WORDS) {
      expect(word).toMatch(/^[a-z]+$/);
    }
  });

  it("has no duplicates", () => {
    expect(new Set(SEED_WORDS).size).toBe(SEED_WORDS.length);
  });
});

describe("isSeedWord", () => {
  it("accepts seed words and rejects everything else", () => {
    expect(isSeedWord("happy")).toBe(true);
    expect(isSeedWord("notarealseedword")).toBe(false);
    expect(isSeedWord("")).toBe(false);
    expect(isSeedWord("HAPPY")).toBe(false);
  });
});

describe("relatedWords", () => {
  it("returns the requested count, excluding the word itself", () => {
    const related = relatedWords("happy", 8);
    expect(related).toHaveLength(8);
    expect(related).not.toContain("happy");
    expect(new Set(related).size).toBe(8);
  });

  it("only returns seed words", () => {
    for (const w of relatedWords("good", 8)) {
      expect(isSeedWord(w)).toBe(true);
    }
  });

  it("handles unknown words gracefully", () => {
    const related = relatedWords("zzz", 4);
    expect(related).toHaveLength(4);
  });
});
