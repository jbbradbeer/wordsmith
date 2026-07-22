import { describe, it, expect, beforeAll } from "vitest";
import { getScanUsed, markScanUsed } from "../scan-cookie";
import { createHmac } from "crypto";

beforeAll(() => {
  process.env.COOKIE_SECRET = "test-secret";
});

function reqWith(cookie?: string) {
  return { cookies: cookie ? { ws_scan: cookie } : {} } as any;
}

describe("scan cookie", () => {
  it("unset cookie = not used", () => {
    expect(getScanUsed(reqWith())).toBe(false);
  });

  it("valid signed cookie = used", () => {
    const sig = createHmac("sha256", "test-secret").update("1").digest("hex");
    expect(getScanUsed(reqWith(`1.${sig}`))).toBe(true);
  });

  it("tampered signature = not used", () => {
    expect(getScanUsed(reqWith("1.deadbeef"))).toBe(false);
  });

  it("markScanUsed writes a verifiable cookie", () => {
    const headers: Record<string, unknown> = {};
    const res = {
      getHeader: (k: string) => headers[k],
      setHeader: (k: string, v: unknown) => { headers[k] = v; },
    } as any;
    markScanUsed(res);
    const cookie = (headers["Set-Cookie"] as string[])[0];
    const value = cookie.split(";")[0].split("=")[1];
    expect(getScanUsed(reqWith(value))).toBe(true);
  });
});
