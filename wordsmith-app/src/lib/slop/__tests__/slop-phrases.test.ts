import { describe, it, expect } from "vitest";
import { SLOP_PHRASES } from "../slop-phrases";

describe("SLOP_PHRASES", () => {
  it("phrases are lowercase and non-empty", () => {
    for (const e of SLOP_PHRASES) {
      expect(e.phrase.length).toBeGreaterThan(0);
      expect(e.phrase).toBe(e.phrase.toLowerCase());
    }
  });

  it("has no duplicate phrases", () => {
    const set = new Set(SLOP_PHRASES.map((e) => e.phrase));
    expect(set.size).toBe(SLOP_PHRASES.length);
  });

  it("every entry has why and hint", () => {
    for (const e of SLOP_PHRASES) {
      expect(e.why.length).toBeGreaterThan(10);
      expect(e.hint.length).toBeGreaterThan(5);
    }
  });
});
