import { describe, it, expect } from "vitest";
import { SYNONYM_VOLUMES, byVolume } from "../synonym-volumes";
import { SEED_WORDS } from "../seed-words";

describe("byVolume", () => {
  it("sorts descending by search volume", () => {
    const sorted = byVolume(["happy", "experience", "afraid"]);
    expect(sorted).toEqual(["experience", "happy", "afraid"]);
  });

  it("pushes words with unknown volume to the end", () => {
    const sorted = byVolume(["notaword", "help"]);
    expect(sorted[0]).toBe("help");
    expect(sorted[1]).toBe("notaword");
  });

  it("does not mutate the input", () => {
    const input = ["afraid", "experience"];
    byVolume(input);
    expect(input).toEqual(["afraid", "experience"]);
  });
});

describe("SYNONYM_VOLUMES coverage", () => {
  it("has a volume for most seed words (data drives sitemap priority)", () => {
    const missing = SEED_WORDS.filter((w) => !(w in SYNONYM_VOLUMES));
    // A handful of later additions may lack researched volume; keep it small
    expect(missing.length).toBeLessThan(10);
  });
});
