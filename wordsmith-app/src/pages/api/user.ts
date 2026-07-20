import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { FREE_SEARCH_LIMIT } from "@/lib/constants";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/api";
import { getAnonCount, clearAnonCookie } from "@/lib/anon-cookie";
import { missingEnv } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit";
import { createRequestLogger } from "@/lib/logger";
import type { User } from "@supabase/supabase-js";

const TRANSFERS_PER_MINUTE = 5;

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user: User
) {
  const missing = missingEnv("supabase", "cookie");
  if (missing.length > 0) {
    createRequestLogger("/api/user", user.id).error(
      "user route unavailable — missing env vars",
      undefined,
      { missing }
    );
    return res.status(503).json({ error: "server_misconfigured" });
  }

  // POST: Transfer anonymous search count (from signed cookie) to profile on login
  if (req.method === "POST") {
    const limit = checkRateLimit(`user-post:${user.id}`, TRANSFERS_PER_MINUTE, 60_000);
    if (!limit.allowed) {
      res.setHeader("Retry-After", String(limit.retryAfterSeconds));
      return res.status(429).json({ error: "rate_limited" });
    }

    // Cap at the free limit — the cookie is signed, but if the secret ever
    // leaks a forged count must not exceed what a legitimate user could reach
    const anonCount = Math.min(getAnonCount(req), FREE_SEARCH_LIMIT);

    if (anonCount > 0) {
      const serviceClient = getServiceSupabase();

      const { data: profile } = await serviceClient
        .from("profiles")
        .select("search_count")
        .eq("id", user.id)
        .single();

      const currentCount = profile?.search_count || 0;
      await serviceClient
        .from("profiles")
        .update({ search_count: currentCount + anonCount })
        .eq("id", user.id);
    }

    // Clear the cookie regardless — count is now in the DB
    clearAnonCookie(res);

    return res.status(200).json({ success: true });
  }

  // GET: Return user info
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Use session-scoped client (respects RLS) for user's own profile read
  const supabase = createServerSupabaseClient({ req, res });
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status, search_count, created_at")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  const isPaid = profile.subscription_status === "active";

  return res.status(200).json({
    email: user.email,
    isPaid,
    subscriptionStatus: profile.subscription_status,
    searchCount: profile.search_count || 0,
    searchesRemaining: isPaid
      ? null
      : Math.max(0, FREE_SEARCH_LIMIT - (profile.search_count || 0)),
    limit: isPaid ? null : FREE_SEARCH_LIMIT,
    memberSince: profile.created_at,
  });
}

export default withAuth(handler);
