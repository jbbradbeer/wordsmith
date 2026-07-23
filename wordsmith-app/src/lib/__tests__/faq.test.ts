import { describe, it, expect } from "vitest";
import { buildWordFaq } from "../faq";
import type { WordData } from "../types";

const alts: WordData[] = [
  { word: "elated", pronunciation: "", definition: "very happy", example: "", context: "", category: "elevated" },
  { word: "jubilant", pronunciation: "", definition: "joyful", example: "", context: "", category: "elevated" },
  { word: "content", pronunciation: "", definition: "satisfied", example: "", context: "", category: "elevated" },
  { word: "cheerful", pronunciation: "", definition: "upbeat", example: "", context: "", category: "elevated" },
];

describe("buildWordFaq", () => {
  it("produces a stable, non-empty Q&A list", () => {
    const a = buildWordFaq("happy", alts);
    const b = buildWordFaq("happy", alts);
    expect(a).toEqual(b); // deterministic
    expect(a.length).toBeGreaterThanOrEqual(2);
    for (const item of a) {
      expect(item.q.length).toBeGreaterThan(0);
      expect(item.a.length).toBeGreaterThan(0);
    }
  });

  it("references the word and its top alternatives", () => {
    const faq = buildWordFaq("happy", alts);
    const joined = faq.map((f) => f.q + " " + f.a).join(" ").toLowerCase();
    expect(joined).toContain("happy");
    expect(joined).toContain("elated");
  });

  it("handles a short alternatives list without throwing", () => {
    const faq = buildWordFaq("sad", alts.slice(0, 1));
    expect(faq.length).toBeGreaterThanOrEqual(1);
  });
});
