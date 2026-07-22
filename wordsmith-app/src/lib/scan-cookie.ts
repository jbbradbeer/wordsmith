import { createHmac, timingSafeEqual } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";

const COOKIE_NAME = "ws_scan";
const MAX_AGE = 60 * 60 * 24 * 365;

function sign(value: string): string {
  return createHmac("sha256", process.env.COOKIE_SECRET!).update(value).digest("hex");
}

/** Has this anonymous browser used its one lifetime scan? Tampered cookie = not used. */
export function getScanUsed(req: NextApiRequest): boolean {
  const raw = req.cookies[COOKIE_NAME];
  if (!raw) return false;
  const dotIdx = raw.lastIndexOf(".");
  if (dotIdx === -1) return false;
  const value = raw.slice(0, dotIdx);
  const sig = raw.slice(dotIdx + 1);
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(sign(value), "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }
  return value === "1";
}

export function markScanUsed(res: NextApiResponse): void {
  const cookie = `${COOKIE_NAME}=1.${sign("1")}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
  const existing = res.getHeader("Set-Cookie");
  const current = !existing ? [] : Array.isArray(existing) ? existing : [String(existing)];
  res.setHeader("Set-Cookie", [...current.filter((c) => !c.startsWith(`${COOKIE_NAME}=`)), cookie]);
}
