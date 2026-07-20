import type { NextApiRequest, NextApiResponse } from "next";
import { getStripe } from "@/lib/stripe";
import { getServiceSupabase } from "@/lib/supabase";
import { buffer } from "micro";
import { missingEnv } from "@/lib/env";
import { createRequestLogger } from "@/lib/logger";
import Stripe from "stripe";

// Disable body parsing — Stripe needs raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const log = createRequestLogger("/api/webhook");

  const missing = missingEnv("stripe", "supabase");
  if (missing.length > 0) {
    // 500 (not 200) so Stripe retries once the deploy is fixed
    log.error("webhook unavailable — missing env vars", undefined, { missing });
    return res.status(500).json({ error: "server_misconfigured" });
  }

  const buf = await buffer(req);
  const sig = req.headers["stripe-signature"] as string;

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    log.error("signature verification failed", err);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  const serviceClient = getServiceSupabase();

  // Idempotency: claim the event id before processing. Stripe retries
  // deliveries and can send the same event twice — a duplicate insert hits
  // the primary key (23505) and we acknowledge without reprocessing.
  const { error: claimError } = await serviceClient
    .from("stripe_events")
    .insert({ id: event.id, type: event.type });

  if (claimError) {
    if (claimError.code === "23505") {
      return res.status(200).json({ received: true, duplicate: true });
    }
    log.error("event claim failed", claimError, { eventId: event.id, eventType: event.type });
    return res.status(500).json({ error: "Webhook processing failed" });
  }

  try {
    switch (event.type) {
      // Checkout completed — payment succeeded, activate subscription
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const userId = session.metadata?.supabase_user_id;

        if (userId) {
          // Use user ID (not customer ID) to match — this is the most reliable
          await serviceClient
            .from("profiles")
            .update({
              stripe_customer_id: customerId,
              subscription_status: "active",
              subscription_id: subscriptionId,
            })
            .eq("id", userId);
        }
        break;
      }

      // Subscription updated (renewals, plan changes, etc.)
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const status = subscription.status;

        // Map Stripe status to our status
        let subStatus: string;
        if (status === "active" || status === "trialing") subStatus = "active";
        else if (status === "canceled") subStatus = "canceled";
        else if (status === "past_due") subStatus = "past_due";
        else break; // Skip "incomplete" and other transient statuses

        await serviceClient
          .from("profiles")
          .update({
            subscription_status: subStatus,
            subscription_id: subscription.id,
          })
          .eq("stripe_customer_id", customerId);

        break;
      }

      // Subscription created — skip, handled by checkout.session.completed
      case "customer.subscription.created": {
        // New subscriptions are activated via checkout.session.completed
        // which uses the reliable user ID match. This event often fires
        // with status "incomplete" before payment confirms, causing issues.
        break;
      }

      // Subscription deleted/canceled
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await serviceClient
          .from("profiles")
          .update({
            subscription_status: "canceled",
            subscription_id: null,
          })
          .eq("stripe_customer_id", customerId);

        break;
      }

      // Payment failed
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await serviceClient
          .from("profiles")
          .update({ subscription_status: "past_due" })
          .eq("stripe_customer_id", customerId);

        break;
      }
    }
  } catch (err: any) {
    log.error("event processing failed", err, { eventId: event.id, eventType: event.type });
    // Release the claim so Stripe's retry of this event isn't skipped as a duplicate
    await serviceClient.from("stripe_events").delete().eq("id", event.id);
    return res.status(500).json({ error: "Webhook processing failed" });
  }

  return res.status(200).json({ received: true });
}
