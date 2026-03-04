import type { NextApiRequest, NextApiResponse } from "next";
import { stripe } from "@/lib/stripe";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/api";
import type { Session } from "@supabase/supabase-js";

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: Session
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const serviceClient = getServiceSupabase();
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", session.user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return res.status(400).json({ error: "No subscription found" });
  }

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/`,
    });

    return res.status(200).json({ url: portalSession.url });
  } catch (err: unknown) {
    console.error("Portal error:", err);
    return res.status(500).json({ error: "Failed to create portal session" });
  }
}

export default withAuth(handler);
