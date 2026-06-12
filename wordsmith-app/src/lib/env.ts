const REQUIRED_SERVER_VARS = [
  "ANTHROPIC_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_ID",
  "COOKIE_SECRET",
] as const;

const REQUIRED_PUBLIC_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_APP_URL",
] as const;

let validated = false;

/** Call once at API handler startup to surface missing env vars early. */
export function validateEnv() {
  if (validated) return;
  validated = true;

  const missing = [...REQUIRED_SERVER_VARS, ...REQUIRED_PUBLIC_VARS].filter(
    (key) => !process.env[key]
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing
        .map((k) => `  - ${k}`)
        .join("\n")}\n\nSee DEPLOY.md for setup instructions.`
    );
  }
}
