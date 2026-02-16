import type { NextApiRequest, NextApiResponse } from "next";
import { stripe } from "@/lib/stripe";
import { getServiceSupabase } from "@/lib/supabase";
import { buffer } from "micro";
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

  const buf = await buffer(req);
  const sig = req.headers["stripe-signature"] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  const serviceClient = getServiceSupabase();

  try {
    switch (event.type) {
      // Checkout completed — ensure stripe_customer_id is linked to profile
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const userId = session.metadata?.supabase_user_id;

        if (userId && customerId) {
          await serviceClient
            .from("profiles")
            .update({ stripe_customer_id: customerId })
            .eq("id", userId);
        }
        break;
      }

      // Subscription created or updated
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const status = subscription.status;

        // Map Stripe status to our status
        let subStatus = "free";
        if (status === "active" || status === "trialing") subStatus = "active";
        else if (status === "canceled") subStatus = "canceled";
        else if (status === "past_due") subStatus = "past_due";

        await serviceClient
          .from("profiles")
          .update({
            subscription_status: subStatus,
            subscription_id: subscription.id,
          })
          .eq("stripe_customer_id", customerId);

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
    console.error("Webhook processing error:", err);
    return res.status(500).json({ error: "Webhook processing failed" });
  }

  return res.status(200).json({ received: true });
}
