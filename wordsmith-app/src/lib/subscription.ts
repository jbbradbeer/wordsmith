import type Stripe from "stripe";

/**
 * Whether a profile's subscription_status grants paid access. past_due keeps
 * access: Stripe is still retrying the card, and locking a paying user out on
 * the first failed charge churns them. Access ends only when the subscription
 * is actually canceled (subscription.deleted / status unpaid).
 */
export function hasActiveAccess(status: string | null | undefined): boolean {
  return status === "active" || status === "past_due";
}

/**
 * Map a Stripe subscription status to our profiles.subscription_status.
 * Returns null for transient states (incomplete, etc.) that should be skipped.
 */
export function mapSubscriptionStatus(
  status: Stripe.Subscription.Status
): "active" | "canceled" | "past_due" | null {
  if (status === "active" || status === "trialing") return "active";
  if (status === "canceled" || status === "unpaid") return "canceled";
  if (status === "past_due") return "past_due";
  return null;
}

/**
 * Whether a completed Checkout Session should activate the subscription.
 * payment_status guards against async payment methods completing unpaid;
 * mode guards against a future one-time-payment session granting a sub.
 */
export function shouldActivateFromCheckout(session: {
  payment_status?: string | null;
  mode?: string | null;
}): boolean {
  return session.payment_status === "paid" && session.mode === "subscription";
}
