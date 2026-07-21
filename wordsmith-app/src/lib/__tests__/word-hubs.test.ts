import { describe, it, expect } from "vitest";
import { WORD_HUBS, getHub } from "../word-hubs";
import { isSeedWord } from "../seed-words";

describe("WORD_HUBS", () => {
  it("has unique slugs", () => {
    const slugs = WORD_HUBS.map((h) => h.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every hub word is a seed word (otherwise its links 404)", () => {
    for (const hub of WORD_HUBS) {
      const bad = hub.words.filter((w) => !isSeedWord(w));
      expect(bad, `${hub.slug}: ${bad.join(", ")}`).toEqual([]);
    }
  });

  it("has no duplicate words within a hub", () => {
    for (const hub of WORD_HUBS) {
      expect(new Set(hub.words).size, hub.slug).toBe(hub.words.length);
    }
  });

  it("getHub resolves slugs and rejects unknowns", () => {
    expect(getHub("emotions")?.title).toBe("Emotion Words");
    expect(getHub("nope")).toBeUndefined();
  });
});
