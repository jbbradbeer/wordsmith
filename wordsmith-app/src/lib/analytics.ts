import { track } from "@vercel/analytics";

/**
 * Conversion-funnel events. Kept as a closed union so every call site uses a
 * consistent name — the funnel in the Vercel Analytics dashboard is only as
 * good as the naming discipline here.
 *
 *   search_started → limit_hit → paywall_view → checkout_start → upgrade_complete
 */
export type FunnelEvent =
  | "search_started"
  | "limit_hit"
  | "paywall_view"
  | "checkout_start"
  | "upgrade_complete"
  | "scan_started"
  | "scan_completed"
  | "span_clicked";

type EventProps = Record<string, string | number | boolean | null>;

/** Fire a funnel event. Never throws — analytics must not break the app. */
export function trackEvent(event: FunnelEvent, props?: EventProps): void {
  try {
    track(event, props);
  } catch {
    // Ignore — a failed beacon must never surface to the user
  }
}
