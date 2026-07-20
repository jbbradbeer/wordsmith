/** Canonical site origin, no trailing slash. NEXT_PUBLIC_ so it's safe in page Heads. */
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
  /\/+$/,
  ""
);

/**
 * Serialize JSON-LD for a <script> tag. JSON.stringify alone does not escape
 * "<", so a string containing "</script>" would break out of the tag (XSS —
 * relevant here because word-page content is model-generated).
 */
export function jsonLdSerialize(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
