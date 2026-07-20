import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { getServiceSupabase } from "@/lib/supabase";
import { hasActiveAccess } from "@/lib/subscription";
import type { User } from "@supabase/supabase-js";

type AuthedHandler = (
  req: NextApiRequest,
  res: NextApiResponse,
  user: User
) => Promise<void>;

/** Wrap a handler — returns 401 if user is not authenticated. */
export function withAuth(handler: AuthedHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const supabase = createServerSupabaseClient({ req, res });
    // getUser() revalidates the JWT with the auth server on every call;
    // getSession() would trust the cookie's embedded claims unverified.
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    return handler(req, res, user);
  };
}

/** Wrap a handler — returns 401/403 if user is not an active subscriber. */
export function withSubscription(handler: AuthedHandler) {
  return withAuth(async (req, res, user) => {
    const serviceClient = getServiceSupabase();
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("subscription_status")
      .eq("id", user.id)
      .single();

    if (!hasActiveAccess(profile?.subscription_status)) {
      return res.status(403).json({ error: "subscription_required" });
    }

    return handler(req, res, user);
  });
}
