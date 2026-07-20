import { describe, it, expect } from "vitest";
import {
  hasActiveAccess,
  mapSubscriptionStatus,
  shouldActivateFromCheckout,
} from "../subscription";
import type Stripe from "stripe";

describe("hasActiveAccess", () => {
  it("grants access for active", () => {
    expect(hasActiveAccess("active")).toBe(true);
  });

  it("keeps access during past_due (Stripe still retrying the card)", () => {
    expect(hasActiveAccess("past_due")).toBe(true);
  });

  it("denies free, canceled, null, undefined", () => {
    expect(hasActiveAccess("free")).toBe(false);
    expect(hasActiveAccess("canceled")).toBe(false);
    expect(hasActiveAccess(null)).toBe(false);
    expect(hasActiveAccess(undefined)).toBe(false);
  });
});

describe("mapSubscriptionStatus", () => {
  it("maps active and trialing to active", () => {
    expect(mapSubscriptionStatus("active")).toBe("active");
    expect(mapSubscriptionStatus("trialing")).toBe("active");
  });

  it("maps canceled and unpaid to canceled", () => {
    expect(mapSubscriptionStatus("canceled")).toBe("canceled");
    expect(mapSubscriptionStatus("unpaid")).toBe("canceled");
  });

  it("maps past_due to past_due", () => {
    expect(mapSubscriptionStatus("past_due")).toBe("past_due");
  });

  it("skips transient statuses", () => {
    const transient: Stripe.Subscription.Status[] = [
      "incomplete",
      "incomplete_expired",
      "paused",
    ];
    for (const s of transient) {
      expect(mapSubscriptionStatus(s)).toBeNull();
    }
  });
});

describe("shouldActivateFromCheckout", () => {
  it("activates a paid subscription session", () => {
    expect(
      shouldActivateFromCheckout({ payment_status: "paid", mode: "subscription" })
    ).toBe(true);
  });

  it("rejects unpaid sessions (async payment methods)", () => {
    expect(
      shouldActivateFromCheckout({ payment_status: "unpaid", mode: "subscription" })
    ).toBe(false);
  });

  it("rejects non-subscription modes", () => {
    expect(
      shouldActivateFromCheckout({ payment_status: "paid", mode: "payment" })
    ).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(shouldActivateFromCheckout({})).toBe(false);
  });
});
