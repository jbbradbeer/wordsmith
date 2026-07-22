import { describe, it, expect } from "vitest";
import { runRules } from "../rules";
import { computeScan } from "../score";

const SLOPPY = `In today's fast-paced world, it's important to note that our platform is a game-changer. We delve into a tapestry of solutions. Moreover, it is very robust. Furthermore, we unlock the power of synergy — truly — with cutting-edge tools — every day.`;
const CLEAN = `The migration finished in four hours. Two tables needed manual fixes: profiles lost a default, and events had a duplicate key. We wrote a script for the first and deleted three rows for the second. Downtime was eleven minutes.`;

describe("computeScan", () => {
  it("scores sloppy text much higher than clean text", () => {
    const sloppy = computeScan(runRules(SLOPPY), [], false);
    const clean = computeScan(runRules(CLEAN), [], false);
    expect(sloppy.score).toBeGreaterThan(50);
    expect(clean.score).toBeLessThanOrEqual(20);
    expect(sloppy.band).toBe("slop");
    expect(clean.band).toBe("clean");
  });

  it("is deterministic", () => {
    const a = computeScan(runRules(SLOPPY), [], false);
    const b = computeScan(runRules(SLOPPY), [], false);
    expect(a).toEqual(b);
  });

  it("is monotonic — removing a flagged phrase never raises the score", () => {
    const before = computeScan(runRules(SLOPPY), [], false);
    const after = computeScan(runRules(SLOPPY.replace("game-changer", "shipping tool")), [], false);
    expect(after.score).toBeLessThanOrEqual(before.score);
  });

  it("is monotonic under pure deletion across phrases and categories", () => {
    const phrases = ["game-changer", "it's important to note that", "Moreover", "very", "Furthermore", "unlock the power of"];
    for (const phrase of phrases) {
      if (!SLOPPY.toLowerCase().includes(phrase.toLowerCase())) continue;
      const before = computeScan(runRules(SLOPPY), [], false);
      const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const after = computeScan(runRules(SLOPPY.replace(re, "")), [], false);
      expect(after.score, `removing "${phrase}" raised the score`).toBeLessThanOrEqual(before.score);
    }
  });

  it("merges claude spans, dedupes overlaps with rule spans", () => {
    const rules = runRules(SLOPPY);
    const overlap = { ...rules.spans[0], source: "claude" as const, category: "generic-voice" as const };
    const scan = computeScan(rules, [overlap], false);
    const atStart = scan.spans.filter((s) => s.start === overlap.start && s.end === overlap.end);
    expect(atStart).toHaveLength(1);
    expect(atStart[0].source).toBe("rules"); // rules span wins the overlap
  });

  it("clamps to 0–100 and carries the degraded flag", () => {
    const scan = computeScan(runRules(SLOPPY + SLOPPY + SLOPPY), [], true);
    expect(scan.score).toBeLessThanOrEqual(100);
    expect(scan.degraded).toBe(true);
  });
});
