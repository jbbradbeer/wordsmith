import Stripe from "stripe";

let client: Stripe | null = null;

/**
 * Lazily construct the Stripe client so a missing STRIPE_SECRET_KEY surfaces
 * as a handler-level 503 (via missingEnv) instead of an import-time crash.
 */
export function getStripe(): Stripe {
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-02-24.acacia",
    });
  }
  return client;
}
