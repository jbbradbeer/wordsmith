export type CheckState = "ok" | "fail" | "skip";

export interface HealthChecks {
  env: CheckState;
  supabase: CheckState;
  anthropic: CheckState;
}

export interface HealthVerdict {
  status: "ok" | "degraded" | "down";
  http: number;
}

/**
 * Aggregate the individual checks into an overall verdict.
 * - env or supabase failing = the site is effectively down (503).
 * - anthropic failing (credits/API) = pages load but analysis and search are
 *   broken = degraded (503, so an uptime monitor still alerts).
 * - "skip" (a check we couldn't run, e.g. anthropic when its key is absent)
 *   never counts as failure on its own; the env check already covers a missing key.
 */
export function overallStatus(c: HealthChecks): HealthVerdict {
  if (c.env === "fail" || c.supabase === "fail") return { status: "down", http: 503 };
  if (c.anthropic === "fail") return { status: "degraded", http: 503 };
  return { status: "ok", http: 200 };
}
