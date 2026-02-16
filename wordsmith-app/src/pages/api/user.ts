import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { FREE_SEARCH_LIMIT } from "@/lib/constants";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = createServerSupabaseClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status, search_count, created_at")
    .eq("id", session.user.id)
    .single();

  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  const isPaid = profile.subscription_status === "active";

  return res.status(200).json({
    email: session.user.email,
    isPaid,
    subscriptionStatus: profile.subscription_status,
    searchCount: profile.search_count || 0,
    searchesRemaining: isPaid
      ? null
      : Math.max(0, FREE_SEARCH_LIMIT - (profile.search_count || 0)),
    limit: isPaid ? null : FREE_SEARCH_LIMIT,
    memberSince: profile.created_at,
  });
}
