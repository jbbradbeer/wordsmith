import { describe, it, expect } from "vitest";
import { isPruned, isBoosted, boostRelated, PRUNED_WORDS, BOOSTED_WORDS } from "../seo-controls";

describe("seo-controls sets", () => {
  it("hold the 2026-08 review data (edited only by the monthly review PR)", () => {
    expect(PRUNED_WORDS.size).toBe(0);
    expect(BOOSTED_WORDS.size).toBe(102);
  });
  it("isPruned/isBoosted reflect membership", () => {
    expect(isPruned("happy")).toBe(false);
    expect(isBoosted("happy")).toBe(false);
    expect(isBoosted("evaluate")).toBe(true);
  });
});

describe("boostRelated", () => {
  const related = ["a", "b", "c", "d", "e", "f", "g", "h"];
  it("returns the list unchanged when no boosted words exist", () => {
    expect(boostRelated(related, "x", 2, new Set())).toEqual(related);
  });
  it("injects boosted words (not already present, not the current word) by replacing the tail, keeping length", () => {
    const out = boostRelated(related, "x", 2, new Set(["zzz", "yyy"]));
    expect(out).toHaveLength(related.length);
    expect(out).toContain("zzz");
    expect(out).toContain("yyy");
    // head preserved, tail replaced
    expect(out.slice(0, 6)).toEqual(["a", "b", "c", "d", "e", "f"]);
  });
  it("does not inject the current word or duplicates already present", () => {
    const out = boostRelated(related, "zzz", 2, new Set(["zzz", "a"]));
    expect(out.filter((w) => w === "zzz")).toHaveLength(0);
    expect(out.filter((w) => w === "a")).toHaveLength(1);
  });
  it("injects at most maxBoosted", () => {
    const out = boostRelated(related, "x", 1, new Set(["zzz", "yyy"]));
    const injected = out.filter((w) => w === "zzz" || w === "yyy");
    expect(injected).toHaveLength(1);
  });
  it("never returns more items than the input, even when boosted words exceed length", () => {
    const short = ["a", "b"];
    const out = boostRelated(short, "x", 5, new Set(["p", "q", "r", "s"]));
    expect(out).toHaveLength(short.length);
  });
});
