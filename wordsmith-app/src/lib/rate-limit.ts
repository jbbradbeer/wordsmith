import { LRUCache } from "lru-cache";
import { createHmac } from "crypto";
import type { NextApiRequest } from "next";

interface Bucket {
  count: number;
  resetAt: number;
}

// In-memory, per serverless instance — same persistence model as the word
// cache in search.ts. A best-effort guard against burst abuse, not a strict
// global limit (each warm instance keeps its own buckets).
const buckets = new LRUCache<string, Bucket>({ max: 5000 });

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/** Fixed-window rate limit check. Counts this call against the window. */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Client IP from x-forwarded-for (set by Vercel) or the socket. */
export function getClientIp(req: NextApiRequest): string {
  const fwd = req.headers["x-forwarded-for"];
  const first = Array.isArray(fwd) ? fwd[0] : fwd?.split(",")[0];
  return first?.trim() || req.socket.remoteAddress || "unknown";
}

/** Keyed HMAC of an IP for server-side anon usage tracking — raw IPs never hit the DB. */
export function hashIp(ip: string): string {
  return createHmac("sha256", process.env.COOKIE_SECRET!)
    .update(ip)
    .digest("hex")
    .slice(0, 32);
}
