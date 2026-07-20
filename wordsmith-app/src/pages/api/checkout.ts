import type { NextApiRequest, NextApiResponse } from "next";
import { getStripe } from "@/lib/stripe";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/api";
import { missingEnv } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit";
import { createRequestLogger, type RequestLogger } from "@/lib/logger";
import { SUBSCRIPTION_PRICE_MONTHLY } from "@/lib/constants";
import type Stripe from "stripe";
import type { User } from "@supabase/supabase-js";

const CHECKOUTS_PER_MINUTE = 5;

// The UI displays SUBSCRIPTION_PRICE_MONTHLY but Stripe charges STRIPE_PRICE_ID.
// Verify the two agree once per instance and log loudly if they've drifted.
let priceChecked = false;
function warnOnPriceMismatch(stripe: Stripe, log: RequestLogger): void {
  if (priceChecked) return;
  priceChecked = true;
  stripe.prices
    .retrieve(process.env.STRIPE_PRICE_ID!)
    .then((price) => {
      const expectedCents = SUBSCRIPTION_PRICE_MONTHLY * 100;
      if (price.unit_amount !== expectedCents || price.recurring?.interval !== "month") {
        log.error("STRIPE_PRICE_ID does not match the displayed price", undefined, {
          displayedCents: expectedCents,
          stripeCents: price.unit_amount,
          interval: price.recurring?.interval,
        });
      }
    })
    .catch((err) => log.error("price verification failed", err));
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user: User
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const log = createRequestLogger("/api/checkout", user.id);

  const missing = missingEnv("stripe", "supabase", "app");
  if (missing.length > 0) {
    log.error("checkout unavailable — missing env vars", undefined, { missing });
    return res.status(503).json({
      error: "server_misconfigured",
      message: "Checkout is temporarily unavailable. Please try again later.",
    });
  }

  const limit = checkRateLimit(`checkout:${user.id}`, CHECKOUTS_PER_MINUTE, 60_000);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSeconds));
    return res.status(429).json({ error: "rate_limited" });
  }

  const userId = user.id;
  const userEmail = user.email;

  try {
    const stripe = getStripe();
    warnOnPriceMismatch(stripe, log);

    // Check if user already has a Stripe customer ID
    const serviceClient = getServiceSupabase();
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("stripe_customer_id, subscription_status")
      .eq("id", userId)
      .single();

    // Don't allow if already subscribed
    if (profile?.subscription_status === "active") {
      return res.status(400).json({ error: "Already subscribed" });
    }

    // Create or retrieve Stripe customer
    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;

      // Save customer ID to profile
      await serviceClient
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/?upgraded=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/?canceled=true`,
      metadata: {
        supabase_user_id: userId,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: userId,
        },
      },
    });

    return res.status(200).json({ url: checkoutSession.url });
  } catch (err: unknown) {
    log.error("checkout session creation failed", err);
    return res.status(500).json({ error: "Failed to create checkout session" });
  }
}

export default withAuth(handler);
