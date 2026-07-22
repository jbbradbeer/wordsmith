import type { NextApiRequest, NextApiResponse } from "next";
import Anthropic from "@anthropic-ai/sdk";
import { missingEnv } from "@/lib/env";
import { getServiceSupabase } from "@/lib/supabase";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createRequestLogger } from "@/lib/logger";
import { overallStatus, type CheckState, type HealthChecks } from "@/lib/health";

// The Anthropic canary costs a token, so cache it. An uptime monitor pinging
// every minute triggers at most one real API call per window.
const CANARY_TTL_MS = 5 * 60 * 1000;
let canaryCache: { at: number; state: CheckState; note?: string } | null = null;

async function anthropicCanary(): Promise<{ state: CheckState; note?: string }> {
  if (missingEnv("anthropic").length > 0) return { state: "skip", note: "no key" };
  if (canaryCache && Date.now() - canaryCache.at < CANARY_TTL_MS) {
    return { state: canaryCache.state, note: canaryCache.note };
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let result: { state: CheckState; note?: string };
  try {
    await client.messages.create({
      // Same model the app depends on, so the canary tests the real thing.
      model: "claude-sonnet-4-6",
      max_tokens: 1,
      messages: [{ role: "user", content: "ping" }],
    });
    result = { state: "ok" };
  } catch (err: unknown) {
    // Distinguish "out of credits" from a transient blip for the operator
    const msg = err instanceof Error ? err.message : String(err);
    const outOfCredits = /credit balance is too low|billing/i.test(msg);
    result = { state: "fail", note: outOfCredits ? "credits" : "api_error" };
  }
  canaryCache = { at: Date.now(), ...result };
  return result;
}

async function supabaseCheck(): Promise<CheckState> {
  if (missingEnv("supabase").length > 0) return "fail";
  try {
    const { error } = await getServiceSupabase()
      .from("profiles")
      .select("id", { head: true, count: "exact" })
      .limit(1);
    return error ? "fail" : "ok";
  } catch {
    return "fail";
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Light rate limit so the endpoint (and its canary) can't be hammered.
  const limit = checkRateLimit(`health:${getClientIp(req)}`, 20, 60_000);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSeconds));
    return res.status(429).json({ error: "rate_limited" });
  }

  // Detailed diagnostics (missing var names, canary notes) only with the token.
  const token = req.query.token;
  const detailed =
    !!process.env.HEALTH_TOKEN &&
    typeof token === "string" &&
    token === process.env.HEALTH_TOKEN;

  const envMissing = missingEnv();
  const envState: CheckState = envMissing.length === 0 ? "ok" : "fail";
  const [supabase, anthropic] = await Promise.all([supabaseCheck(), anthropicCanary()]);

  const checks: HealthChecks = { env: envState, supabase, anthropic: anthropic.state };
  const verdict = overallStatus(checks);

  if (verdict.status !== "ok") {
    createRequestLogger("/api/health").error("health check failed", undefined, {
      status: verdict.status,
      checks,
      missing: envMissing,
      anthropicNote: anthropic.note,
    });
  }

  res.setHeader("Cache-Control", "no-store");
  return res.status(verdict.http).json({
    status: verdict.status,
    checks,
    ...(detailed
      ? { detail: { missingEnv: envMissing, anthropic: anthropic.note } }
      : {}),
  });
}
