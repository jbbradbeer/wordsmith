import { useState } from "react";
import { FREE_SEARCH_LIMIT, SUBSCRIPTION_PRICE_MONTHLY } from "@/lib/constants";
import Modal from "./Modal";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRO_FEATURES = [
  "Unlimited word searches",
  "Save words to collections",
  "Full search history",
  "Priority response speed",
  "Cancel anytime",
];

export default function PaywallModal({ isOpen, onClose }: PaywallModalProps) {
  const [loading, setLoading] = useState(false);
  const headingId = "paywall-modal-title";

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
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
          You&apos;ve used your {FREE_SEARCH_LIMIT} free searches for today. Upgrade for
          unlimited access and keep discovering the perfect words for your writing.
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

        {/* Price + CTA */}
        <div className="mb-3">
          <span className="font-display font-black text-4xl text-parchment-900">
            ${SUBSCRIPTION_PRICE_MONTHLY}
          </span>
          <span className="font-body text-sm text-parchment-600 ml-1">/ month</span>
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
