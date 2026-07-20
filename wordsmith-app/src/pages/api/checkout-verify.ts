import type { NextApiRequest, NextApiResponse } from "next";
import { getStripe } from "@/lib/stripe";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/api";
import { missingEnv } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit";
import { createRequestLogger } from "@/lib/logger";
import { shouldActivateFromCheckout } from "@/lib/subscription";
import type { User } from "@supabase/supabase-js";

const VERIFIES_PER_MINUTE = 5;

/**
 * Called by the client after returning from Stripe Checkout. The success
 * redirect can beat webhook delivery, leaving a just-paid user gated as free —
 * this verifies the session directly with Stripe and activates immediately.
 * The webhook remains the source of truth for every later lifecycle event.
 */
async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user: User
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const log = createRequestLogger("/api/checkout-verify", user.id);

  const missing = missingEnv("stripe", "supabase");
  if (missing.length > 0) {
    log.error("checkout-verify unavailable — missing env vars", undefined, { missing });
    return res.status(503).json({ error: "server_misconfigured" });
  }

  const limit = checkRateLimit(`checkout-verify:${user.id}`, VERIFIES_PER_MINUTE, 60_000);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSeconds));
    return res.status(429).json({ error: "rate_limited" });
  }

  const { sessionId } = req.body;
  if (!sessionId || typeof sessionId !== "string" || !sessionId.startsWith("cs_")) {
    return res.status(400).json({ error: "sessionId is required" });
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);

    // The session must belong to this user — the id alone isn't proof
    if (session.metadata?.supabase_user_id !== user.id) {
      return res.status(403).json({ error: "session_mismatch" });
    }

    if (!shouldActivateFromCheckout(session)) {
      return res.status(200).json({ activated: false, paymentStatus: session.payment_status });
    }

    await getServiceSupabase()
      .from("profiles")
      .update({
        stripe_customer_id: session.customer as string,
        subscription_status: "active",
        subscription_id: session.subscription as string,
      })
      .eq("id", user.id);

    log.info("subscription activated via checkout verification");
    return res.status(200).json({ activated: true });
  } catch (err: unknown) {
    log.error("checkout verification failed", err);
    return res.status(500).json({ error: "Verification failed" });
  }
}

export default withAuth(handler);
