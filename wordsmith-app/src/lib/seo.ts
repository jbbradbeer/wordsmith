/** Canonical site origin, no trailing slash. NEXT_PUBLIC_ so it's safe in page Heads. */
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
  /\/+$/,
  ""
);
