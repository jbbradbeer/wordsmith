import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { stripe } from "@/lib/stripe";
import { getServiceSupabase } from "@/lib/supabase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = createServerSupabaseClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const userId = session.user.id;
  const userEmail = session.user.email;

  try {
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
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/?upgraded=true`,
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
  } catch (err: any) {
    console.error("Checkout error:", err);
    return res.status(500).json({ error: "Failed to create checkout session" });
  }
}
