import type { NextApiRequest, NextApiResponse } from "next";
import { getStripe } from "@/lib/stripe";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/api";
import { missingEnv } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit";
import { createRequestLogger } from "@/lib/logger";
import type { User } from "@supabase/supabase-js";

const PORTAL_SESSIONS_PER_MINUTE = 5;

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user: User
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const log = createRequestLogger("/api/portal", user.id);

  const missing = missingEnv("stripe", "supabase", "app");
  if (missing.length > 0) {
    log.error("portal unavailable — missing env vars", undefined, { missing });
    return res.status(503).json({
      error: "server_misconfigured",
      message: "Billing portal is temporarily unavailable. Please try again later.",
    });
  }

  const limit = checkRateLimit(`portal:${user.id}`, PORTAL_SESSIONS_PER_MINUTE, 60_000);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSeconds));
    return res.status(429).json({ error: "rate_limited" });
  }

  const serviceClient = getServiceSupabase();
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return res.status(400).json({ error: "No subscription found" });
  }

  try {
    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/`,
    });

    return res.status(200).json({ url: portalSession.url });
  } catch (err: unknown) {
    log.error("portal session creation failed", err);
    return res.status(500).json({ error: "Failed to create portal session" });
  }
}

export default withAuth(handler);
