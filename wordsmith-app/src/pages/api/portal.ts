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
  } catch (err: any) {
    console.error("Portal error:", err);
    return res.status(500).json({ error: "Failed to create portal session" });
  }
}
