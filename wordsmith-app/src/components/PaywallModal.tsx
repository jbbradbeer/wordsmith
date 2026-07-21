import { useState } from "react";
import {
  SUBSCRIPTION_PRICE_MONTHLY,
  SUBSCRIPTION_PRICE_ANNUAL,
  type BillingPlan,
} from "@/lib/constants";
import { trackEvent } from "@/lib/analytics";
import Modal from "./Modal";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRO_FEATURES = [
  "Unlimited Slop Score scans",
  "10,000-word drafts (free: 1,500)",
  "Unlimited word searches",
  "Save words to collections",
  "Cancel anytime",
];

const ANNUAL_MONTHLY_EQUIV = Math.round((SUBSCRIPTION_PRICE_ANNUAL / 12) * 100) / 100;
const ANNUAL_SAVINGS_PCT = Math.round(
  (1 - SUBSCRIPTION_PRICE_ANNUAL / (SUBSCRIPTION_PRICE_MONTHLY * 12)) * 100
);

export default function PaywallModal({ isOpen, onClose }: PaywallModalProps) {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<BillingPlan>("annual");
  const headingId = "paywall-modal-title";

  const handleUpgrade = async () => {
    setLoading(true);
    trackEvent("checkout_start", { plan });
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy={headingId} maxWidth={420}>
      <div className="text-center">
        {/* Badge */}
        <div
          className="inline-block text-white font-body text-[11px] font-bold tracking-[0.12em] uppercase px-3.5 py-[5px] rounded-full mb-[18px]"
          style={{
            background: "linear-gradient(135deg, #8B6914 0%, #A8842A 50%, #8B6914 100%)",
            backgroundSize: "200% 200%",
            animation: "shimmer 3s linear infinite",
          }}
        >
          Wordsmith Pro
        </div>

        <h2
          id={headingId}
          className="font-display font-bold text-[28px] leading-tight text-parchment-900 m-0 mb-2"
        >
          Unlock unlimited words
        </h2>
        <p className="font-body text-sm leading-normal text-parchment-600 m-0 mb-7">
          You&apos;ve hit today&apos;s free limit. Upgrade for unlimited scans and
          searches, and keep your writing unmistakably yours.
        </p>

        {/* Features */}
        <div className="text-left bg-white border border-parchment-300 rounded-xl px-5 py-[18px] mb-6">
          {PRO_FEATURES.map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-2.5 py-1.5 font-body text-sm text-parchment-800"
            >
              <span className="text-category-rare text-base">✓</span>
              {feature}
            </div>
          ))}
        </div>

        {/* Plan toggle */}
        <div
          role="radiogroup"
          aria-label="Billing plan"
          className="flex gap-2 mb-4"
        >
          <button
            type="button"
            role="radio"
            aria-checked={plan === "annual"}
            onClick={() => setPlan("annual")}
            className={`flex-1 rounded-xl border p-3 text-left transition-colors ${plan === "annual" ? "border-gold bg-gold/[0.06]" : "border-parchment-300 bg-white"}`}
          >
            <span className="block font-body text-[11px] font-bold uppercase tracking-[0.1em] text-gold">
              Annual · save {ANNUAL_SAVINGS_PCT}%
            </span>
            <span className="font-display font-black text-2xl text-parchment-900">
              ${ANNUAL_MONTHLY_EQUIV}
            </span>
            <span className="font-body text-xs text-parchment-600">
              /mo · ${SUBSCRIPTION_PRICE_ANNUAL} billed yearly
            </span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={plan === "monthly"}
            onClick={() => setPlan("monthly")}
            className={`flex-1 rounded-xl border p-3 text-left transition-colors ${plan === "monthly" ? "border-gold bg-gold/[0.06]" : "border-parchment-300 bg-white"}`}
          >
            <span className="block font-body text-[11px] font-bold uppercase tracking-[0.1em] text-parchment-500">
              Monthly
            </span>
            <span className="font-display font-black text-2xl text-parchment-900">
              ${SUBSCRIPTION_PRICE_MONTHLY}
            </span>
            <span className="font-body text-xs text-parchment-600">/mo</span>
          </button>
        </div>

        <button
          onClick={handleUpgrade}
          disabled={loading}
          className={`btn-primary w-full p-3.5 ${loading ? "bg-parchment-500 cursor-wait" : "bg-gold cursor-pointer"} text-white border-none rounded-[10px] font-body text-[15px] font-semibold tracking-[0.02em] transition-colors duration-200 mb-3`}
        >
          {loading ? "Redirecting to checkout…" : "Upgrade to Pro"}
        </button>

        <button
          onClick={onClose}
          className="bg-transparent border-none text-parchment-500 text-[13px] cursor-pointer font-body"
        >
          Maybe later
        </button>
      </div>
    </Modal>
  );
}
