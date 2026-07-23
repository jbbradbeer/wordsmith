import { describe, it, expect } from "vitest";
import { computeScanStats } from "../scan-stats";

const day = (d: string, score: number) => ({ score, createdAt: `${d}T12:00:00.000Z` });

describe("computeScanStats", () => {
  it("empty history", () => {
    expect(computeScanStats([], "2026-07-23")).toEqual({
      total: 0, earlyAvg: null, recentAvg: null, best: null, streakDays: 0,
    });
  });

  it("best is the lowest score", () => {
    const s = computeScanStats(
      [day("2026-07-20", 40), day("2026-07-21", 12), day("2026-07-22", 30)],
      "2026-07-23"
    );
    expect(s.best).toBe(12);
    expect(s.total).toBe(3);
  });

  it("no trend when total < 4", () => {
    const s = computeScanStats([day("2026-07-22", 40), day("2026-07-23", 20)], "2026-07-23");
    expect(s.earlyAvg).toBeNull();
    expect(s.recentAvg).toBeNull();
  });

  it("trend compares first vs last half (chronological), improving = recent lower", () => {
    const scans = [
      day("2026-07-01", 60), day("2026-07-02", 58), day("2026-07-03", 55), day("2026-07-04", 50),
      day("2026-07-20", 20), day("2026-07-21", 18), day("2026-07-22", 15), day("2026-07-23", 12),
    ];
    const s = computeScanStats(scans, "2026-07-23");
    expect(s.earlyAvg).toBeGreaterThan(s.recentAvg!);
  });

  it("handles unsorted input (sorts by date before trend)", () => {
    const scans = [
      day("2026-07-23", 12), day("2026-07-01", 60), day("2026-07-22", 15), day("2026-07-02", 58),
      day("2026-07-21", 18), day("2026-07-03", 55), day("2026-07-20", 20), day("2026-07-04", 50),
    ];
    const s = computeScanStats(scans, "2026-07-23");
    expect(s.earlyAvg).toBeGreaterThan(s.recentAvg!);
  });

  it("streak counts consecutive days ending today", () => {
    const s = computeScanStats(
      [day("2026-07-21", 30), day("2026-07-22", 25), day("2026-07-23", 20)],
      "2026-07-23"
    );
    expect(s.streakDays).toBe(3);
  });

  it("streak anchors to yesterday if no scan today", () => {
    const s = computeScanStats([day("2026-07-21", 30), day("2026-07-22", 25)], "2026-07-23");
    expect(s.streakDays).toBe(2);
  });

  it("streak is 0 when latest scan is older than yesterday", () => {
    const s = computeScanStats([day("2026-07-20", 30)], "2026-07-23");
    expect(s.streakDays).toBe(0);
  });

  it("streak breaks on a gap", () => {
    const s = computeScanStats(
      [day("2026-07-19", 30), day("2026-07-22", 25), day("2026-07-23", 20)],
      "2026-07-23"
    );
    expect(s.streakDays).toBe(2); // 22 and 23; 20-21 missing breaks it
  });
});
