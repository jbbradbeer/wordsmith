import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest } from "next";
import { checkRateLimit, getClientIp } from "../rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests up to the limit and blocks the next one", () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit(key, 3, 60_000).allowed).toBe(true);
    }
    const blocked = checkRateLimit(key, 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("resets after the window elapses", () => {
    const key = `test:${Math.random()}`;
    expect(checkRateLimit(key, 1, 60_000).allowed).toBe(true);
    expect(checkRateLimit(key, 1, 60_000).allowed).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect(checkRateLimit(key, 1, 60_000).allowed).toBe(true);
  });

  it("tracks keys independently", () => {
    const a = `test:${Math.random()}`;
    const b = `test:${Math.random()}`;
    expect(checkRateLimit(a, 1, 60_000).allowed).toBe(true);
    expect(checkRateLimit(a, 1, 60_000).allowed).toBe(false);
    expect(checkRateLimit(b, 1, 60_000).allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  function mockReq(headers: Record<string, string | string[]>, remoteAddress?: string) {
    return {
      headers,
      socket: { remoteAddress },
    } as unknown as NextApiRequest;
  }

  it("uses the first x-forwarded-for entry", () => {
    expect(getClientIp(mockReq({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
  });

  it("falls back to the socket address", () => {
    expect(getClientIp(mockReq({}, "9.9.9.9"))).toBe("9.9.9.9");
  });

  it("returns 'unknown' when nothing is available", () => {
    expect(getClientIp(mockReq({}))).toBe("unknown");
  });
});
