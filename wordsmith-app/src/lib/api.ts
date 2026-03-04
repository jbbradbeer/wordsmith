import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { getServiceSupabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

type AuthedHandler = (
  req: NextApiRequest,
  res: NextApiResponse,
  session: Session
) => Promise<void>;

/** Wrap a handler — returns 401 if user is not authenticated. */
export function withAuth(handler: AuthedHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const supabase = createServerSupabaseClient({ req, res });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    return handler(req, res, session);
  };
}

/** Wrap a handler — returns 401/403 if user is not an active subscriber. */
export function withSubscription(handler: AuthedHandler) {
  return withAuth(async (req, res, session) => {
    const serviceClient = getServiceSupabase();
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("subscription_status")
      .eq("id", session.user.id)
      .single();

    if (profile?.subscription_status !== "active") {
      return res.status(403).json({ error: "subscription_required" });
    }

    return handler(req, res, session);
  });
}
