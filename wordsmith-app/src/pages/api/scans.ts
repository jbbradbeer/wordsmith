// src/pages/api/scans.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/api";
import { hasActiveAccess } from "@/lib/subscription";
import { missingEnv } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit";
import { createRequestLogger } from "@/lib/logger";
import { computeScanStats } from "@/lib/scan-stats";
import type { Scan } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

async function handler(req: NextApiRequest, res: NextApiResponse, user: User) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (missingEnv("supabase").length > 0) {
    return res.status(503).json({ error: "server_misconfigured" });
  }
  const limit = checkRateLimit(`scans:${user.id}`, 30, 60_000);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSeconds));
    return res.status(429).json({ error: "rate_limited" });
  }

  const log = createRequestLogger("/api/scans", user.id);
  const serviceClient = getServiceSupabase();

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .single();

  if (!hasActiveAccess(profile?.subscription_status)) {
    return res.status(200).json({ pro: false });
  }

  const { data, error } = await serviceClient
    .from("scan_history")
    .select("score, band, word_count, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    log.error("scan_history read failed", error);
    return res.status(500).json({ error: "Could not load history" });
  }

  const rows = data ?? [];
  const stats = computeScanStats(
    rows.map((r) => ({ score: r.score, createdAt: r.created_at })),
    new Date().toISOString().slice(0, 10)
  );
  // Recent 10, newest first, metadata only (never any draft text)
  const recent: Scan[] = rows
    .slice(-10)
    .reverse()
    .map((r) => ({
      score: r.score,
      band: r.band,
      wordCount: r.word_count,
      createdAt: r.created_at,
    }));

  return res.status(200).json({ pro: true, recent, stats });
}

export default withAuth(handler);
