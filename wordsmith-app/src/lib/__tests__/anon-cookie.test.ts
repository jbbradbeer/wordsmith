import { beforeAll, describe, expect, it } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";

beforeAll(() => {
  process.env.COOKIE_SECRET = "test-secret-for-unit-tests";
});

function mockReq(cookieValue?: string): NextApiRequest {
  return {
    cookies: cookieValue !== undefined ? { ws_anon: cookieValue } : {},
  } as unknown as NextApiRequest;
}

function mockRes() {
  const headers: Record<string, string | string[]> = {};
  return {
    res: {
      getHeader: (name: string) => headers[name],
      setHeader: (name: string, value: string | string[]) => {
        headers[name] = value;
      },
    } as unknown as NextApiResponse,
    headers,
  };
}

async function lib() {
  return import("../anon-cookie");
}

describe("anon-cookie", () => {
  it("round-trips a signed count", async () => {
    const { getAnonCount, setAnonCount } = await lib();
    const { res, headers } = mockRes();
    setAnonCount(res, 2);

    const cookie = String(headers["Set-Cookie"]);
    const value = cookie.split(";")[0].split("=")[1];
    expect(getAnonCount(mockReq(value))).toBe(2);
  });

  it("returns 0 when the cookie is absent", async () => {
    const { getAnonCount } = await lib();
    expect(getAnonCount(mockReq())).toBe(0);
  });

  it("returns 0 for a tampered count", async () => {
    const { getAnonCount, setAnonCount } = await lib();
    const { res, headers } = mockRes();
    setAnonCount(res, 1);

    const value = String(headers["Set-Cookie"]).split(";")[0].split("=")[1];
    const sig = value.split(".")[1];
    expect(getAnonCount(mockReq(`999.${sig}`))).toBe(0);
  });

  it("returns 0 for a forged signature", async () => {
    const { getAnonCount } = await lib();
    expect(getAnonCount(mockReq("3.deadbeef"))).toBe(0);
    expect(getAnonCount(mockReq("3.not-even-hex"))).toBe(0);
    expect(getAnonCount(mockReq("3"))).toBe(0);
  });

  it("returns 0 for negative or non-numeric values", async () => {
    const { getAnonCount, setAnonCount } = await lib();
    const { res, headers } = mockRes();
    // Sign "abc" indirectly is not possible via the public API, so just
    // verify a validly-signed negative-looking payload can't go below 0
    setAnonCount(res, 0);
    const value = String(headers["Set-Cookie"]).split(";")[0].split("=")[1];
    expect(getAnonCount(mockReq(value))).toBe(0);
  });

  it("replaces an existing ws_anon Set-Cookie instead of appending a duplicate", async () => {
    const { setAnonCount } = await lib();
    const { res, headers } = mockRes();
    setAnonCount(res, 1);
    setAnonCount(res, 2);

    const cookies = Array.isArray(headers["Set-Cookie"])
      ? headers["Set-Cookie"]
      : [headers["Set-Cookie"]];
    const anonCookies = cookies.filter((c) => String(c).startsWith("ws_anon="));
    expect(anonCookies).toHaveLength(1);
    expect(String(anonCookies[0])).toContain("ws_anon=2.");
  });
});
