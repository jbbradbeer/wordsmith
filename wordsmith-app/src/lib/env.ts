/** Environment variables grouped by the feature that needs them. */
const ENV_GROUPS = {
  anthropic: ["ANTHROPIC_API_KEY"],
  supabase: [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ],
  cookie: ["COOKIE_SECRET"],
  stripe: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_ID"],
  app: ["NEXT_PUBLIC_APP_URL"],
} as const;

export type EnvGroup = keyof typeof ENV_GROUPS;

const ALL_GROUPS = Object.keys(ENV_GROUPS) as EnvGroup[];

/**
 * Return the names of any required env vars that are missing for the given
 * feature groups (defaults to every group). Non-throwing — callers decide how
 * to surface the result.
 */
export function missingEnv(...groups: EnvGroup[]): string[] {
  const scope = groups.length > 0 ? groups : ALL_GROUPS;
  const keys = scope
    .flatMap((g) => ENV_GROUPS[g])
    .filter((key, i, arr) => arr.indexOf(key) === i);
  return keys.filter((key) => !process.env[key]);
}

let validated = false;

/**
 * Assert that every required env var is present (all groups). Throws once at
 * API handler startup to surface misconfiguration early. Kept for routes that
 * legitimately need the full set (Stripe, billing, etc.).
 */
export function validateEnv() {
  if (validated) return;
  validated = true;

  const missing = missingEnv();
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing
        .map((k) => `  - ${k}`)
        .join("\n")}\n\nSee DEPLOY.md for setup instructions.`
    );
  }
}
