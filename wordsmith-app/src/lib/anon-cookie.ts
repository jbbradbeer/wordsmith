import { createHmac, timingSafeEqual } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";

const COOKIE_NAME = "ws_anon";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function sign(value: string): string {
  return createHmac("sha256", process.env.COOKIE_SECRET!)
    .update(value)
    .digest("hex");
}

/** Read and verify the anonymous search count from the signed cookie. Returns 0 if absent or tampered. */
export function getAnonCount(req: NextApiRequest): number {
  const raw = req.cookies[COOKIE_NAME];
  if (!raw) return 0;

  const dotIdx = raw.lastIndexOf(".");
  if (dotIdx === -1) return 0;

  const value = raw.slice(0, dotIdx);
  const sig = raw.slice(dotIdx + 1);
  const expected = sign(value);

  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return 0;
  } catch {
    return 0;
  }

  const n = parseInt(value, 10);
  return isNaN(n) || n < 0 ? 0 : n;
}

/** Write a signed anonymous count cookie. Appends alongside any existing Set-Cookie headers. */
export function setAnonCount(res: NextApiResponse, count: number): void {
  const value = String(count);
  const cookie = `${COOKIE_NAME}=${value}.${sign(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
  appendCookie(res, cookie);
}

/** Expire the anonymous count cookie. */
export function clearAnonCookie(res: NextApiResponse): void {
  appendCookie(res, `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function appendCookie(res: NextApiResponse, cookie: string): void {
  const existing = res.getHeader("Set-Cookie");
  if (!existing) {
    res.setHeader("Set-Cookie", cookie);
  } else if (Array.isArray(existing)) {
    const filtered = existing.filter((c) => !c.startsWith(`${COOKIE_NAME}=`));
    res.setHeader("Set-Cookie", [...filtered, cookie]);
  } else {
    res.setHeader("Set-Cookie", [existing as string, cookie]);
  }
}
