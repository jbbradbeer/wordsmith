import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { getServiceSupabase } from "@/lib/supabase";
import { missingEnv } from "@/lib/env";
import { checkRateLimit, getClientIp, hashIp } from "@/lib/rate-limit";
import { createRequestLogger } from "@/lib/logger";
import { hasActiveAccess } from "@/lib/subscription";
import { getScanUsed, markScanUsed } from "@/lib/scan-cookie";
import { runRules } from "@/lib/slop/rules";
import { runClaudePass } from "@/lib/slop/claude-pass";
import { computeScan } from "@/lib/slop/score";
import { SCAN_WORD_CAP_FREE, SCAN_WORD_CAP_PRO } from "@/lib/slop/types";

export const config = { api: { responseLimit: false } };

const SCANS_PER_MINUTE = 4;          // per IP or user — Claude calls are expensive
const FREE_SCANS_PER_DAY = 1;
const ANON_IP_SCANS_PER_DAY = 3;     // backstop against cookie clearing

function writeSSE(res: NextApiResponse, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function openSSE(res: NextApiResponse) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const missing = missingEnv("anthropic", "supabase", "cookie");
  if (missing.length > 0) {
    createRequestLogger("/api/analyze").error("analyze unavailable — missing env", undefined, { missing });
    return res.status(503).json({
      error: "server_misconfigured",
      message: "Analysis is temporarily unavailable. Please try again later.",
    });
  }

  const { text } = req.body;
  if (!text || typeof text !== "string" || text.trim().length < 100) {
    return res.status(400).json({ error: "Paste at least 100 characters of your draft." });
  }

  const supabase = createServerSupabaseClient({ req, res });
  const { data: { user } } = await supabase.auth.getUser();
  const log = createRequestLogger("/api/analyze", user?.id);
  const serviceClient = getServiceSupabase();

  const rateKey = user ? `analyze:${user.id}` : `analyze-ip:${getClientIp(req)}`;
  const limit = checkRateLimit(rateKey, SCANS_PER_MINUTE, 60_000);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSeconds));
    return res.status(429).json({ error: "rate_limited" });
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // --- Metering (before the expensive Claude call) ---
  let isPaid = false;
  let scanClaimed = false; // true when a free-account scan was consumed (refundable)

  if (!user) {
    if (wordCount > SCAN_WORD_CAP_FREE) {
      return res.status(400).json({ error: "too_long", cap: SCAN_WORD_CAP_FREE });
    }
    if (getScanUsed(req)) {
      return res.status(403).json({
        error: "signup_required",
        message: "You've used your free scan. Create a free account for one scan every day.",
      });
    }
    // IP backstop — same anon_usage RPC, salted bucket so scans don't collide with searches
    const { data: anonRpc, error: anonErr } = await serviceClient.rpc("try_increment_anon_count", {
      p_ip_hash: hashIp("scan:" + getClientIp(req)),
      p_limit: ANON_IP_SCANS_PER_DAY,
    });
    if (anonErr) {
      log.error("anon scan RPC failed (failing open)", anonErr);
    } else if (anonRpc && !anonRpc.allowed) {
      return res.status(403).json({
        error: "signup_required",
        message: "Daily scan limit reached for this network. Create a free account to continue.",
      });
    }
    markScanUsed(res); // must be set before SSE headers flush
  } else {
    const { data: rpc, error: rpcError } = await serviceClient.rpc("try_increment_scan_count", {
      p_user_id: user.id,
      p_limit: FREE_SCANS_PER_DAY,
    });
    if (rpcError || !rpc) {
      log.error("try_increment_scan_count RPC failed", rpcError);
      return res.status(500).json({ error: "Could not process scan" });
    }
    isPaid = hasActiveAccess(rpc.subscription_status);
    if (!rpc.allowed) {
      return res.status(403).json({
        error: "scan_limit_reached",
        message: "You've used today's free scan. Upgrade to Wordsmith Pro for unlimited scans.",
      });
    }
    scanClaimed = !isPaid;
    const cap = isPaid ? SCAN_WORD_CAP_PRO : SCAN_WORD_CAP_FREE;
    if (wordCount > cap) {
      if (scanClaimed) await serviceClient.rpc("refund_scan", { p_user_id: user.id });
      return res.status(400).json({ error: "too_long", cap });
    }
  }

  // --- Analysis ---
  openSSE(res);
  const rules = runRules(text);
  writeSSE(res, "rules", computeScan(rules, [], true)); // provisional, rules-only

  try {
    const claudeSpans = await runClaudePass(text);
    const result = computeScan(rules, claudeSpans, false);
    if (user && isPaid) {
      Promise.resolve(
        serviceClient.from("scan_history").insert({
          user_id: user.id,
          score: result.score,
          band: result.band,
          word_count: rules.stats.wordCount,
          breakdown: result.breakdown,
        })
      ).catch((err) => log.error("scan history write failed", err));
    }
    writeSSE(res, "result", result);
    log.info("scan complete", { score: result.score, words: wordCount, latencyMs: log.latencyMs() });
  } catch (err) {
    log.error("claude pass failed — serving rules-only, refunding scan", err);
    if (user && scanClaimed) {
      await Promise.resolve(serviceClient.rpc("refund_scan", { p_user_id: user.id })).catch(() => {});
    }
    writeSSE(res, "result", computeScan(rules, [], true));
  }
  res.end();
}
