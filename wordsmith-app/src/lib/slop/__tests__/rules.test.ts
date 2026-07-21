import { describe, it, expect } from "vitest";
import { runRules } from "../rules";

const SLOPPY = `In today's fast-paced world, it's important to note that our platform is a game-changer. We delve into a tapestry of solutions. Moreover, it is very robust. Furthermore, we unlock the power of synergy — truly — with cutting-edge tools — every day.`;

const CLEAN = `The migration finished in four hours. Two tables needed manual fixes: profiles lost a default, and events had a duplicate key. We wrote a script for the first and deleted three rows for the second. Downtime was eleven minutes.`;

describe("runRules", () => {
  it("finds phrase spans with exact offsets", () => {
    const r = runRules(SLOPPY);
    const gameChanger = r.spans.find((s) => s.text.toLowerCase() === "game-changer");
    expect(gameChanger).toBeDefined();
    expect(SLOPPY.slice(gameChanger!.start, gameChanger!.end)).toBe(gameChanger!.text);
  });

  it("matches case-insensitively on word boundaries", () => {
    const r = runRules("Very good. That is my everything."); // "very" yes; "every" inside "everything" no
    const cats = r.spans.map((s) => s.text.toLowerCase());
    expect(cats).toContain("very");
    expect(cats).not.toContain("every");
  });

  it("flags nothing phrase-wise on clean text except stats", () => {
    const r = runRules(CLEAN);
    expect(r.spans.filter((s) => s.category === "ai-ism")).toHaveLength(0);
    expect(r.stats.wordCount).toBeGreaterThan(30);
  });

  it("computes sentence-length variance and em-dash density", () => {
    const sloppy = runRules(SLOPPY);
    expect(sloppy.stats.emDashesPer1000).toBeGreaterThan(0);
    const clean = runRules(CLEAN);
    expect(clean.stats.sentenceLengthStdDev).toBeGreaterThan(0);
  });

  it("returns spans sorted by start", () => {
    const r = runRules(SLOPPY);
    const starts = r.spans.map((s) => s.start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });
});
