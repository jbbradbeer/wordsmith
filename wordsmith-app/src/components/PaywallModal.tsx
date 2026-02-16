import { useState } from "react";
import { FREE_SEARCH_LIMIT, SUBSCRIPTION_PRICE_MONTHLY } from "@/lib/constants";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PaywallModal({ isOpen, onClose }: PaywallModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

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
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(26, 26, 24, 0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
        animation: "fadeUp 0.2s ease both",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#FDFBF7",
          borderRadius: "16px",
          padding: "40px 32px",
          maxWidth: "420px",
          width: "100%",
          boxShadow: "0 24px 48px rgba(0,0,0,0.15)",
          textAlign: "center",
          animation: "cardIn 0.3s ease both",
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: "inline-block",
            background:
              "linear-gradient(135deg, #8B6914 0%, #A8842A 50%, #8B6914 100%)",
            backgroundSize: "200% 200%",
            animation: "shimmer 3s linear infinite",
            color: "#FFFFFF",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            padding: "5px 14px",
            borderRadius: "20px",
            marginBottom: "18px",
          }}
        >
          Wordsmith Pro
        </div>

        <h2
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "28px",
            fontWeight: 700,
            color: "#1A1A18",
            margin: "0 0 8px 0",
            lineHeight: 1.2,
          }}
        >
          Unlock unlimited words
        </h2>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "14px",
            color: "#8A8478",
            margin: "0 0 28px 0",
            lineHeight: 1.5,
          }}
        >
          You've used your {FREE_SEARCH_LIMIT} free searches. Upgrade to keep
          discovering the perfect words for your writing.
        </p>

        {/* Features */}
        <div
          style={{
            textAlign: "left",
            background: "#FFFFFF",
            border: "1px solid #E8E2D8",
            borderRadius: "12px",
            padding: "18px 20px",
            marginBottom: "24px",
          }}
        >
          {[
            "Unlimited word searches",
            "Full search history",
            "Priority response speed",
            "Cancel anytime",
          ].map((feature) => (
            <div
              key={feature}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "6px 0",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                color: "#4A4740",
              }}
            >
              <span style={{ color: "#1A7A6D", fontSize: "16px" }}>✓</span>
              {feature}
            </div>
          ))}
        </div>

        {/* Price + CTA */}
        <div style={{ marginBottom: "12px" }}>
          <span
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "36px",
              fontWeight: 900,
              color: "#1A1A18",
            }}
          >
            ${SUBSCRIPTION_PRICE_MONTHLY}
          </span>
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "14px",
              color: "#8A8478",
              marginLeft: "4px",
            }}
          >
            / month
          </span>
        </div>

        <button
          onClick={handleUpgrade}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            background: loading ? "#B8B2A8" : "#8B6914",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "10px",
            fontSize: "15px",
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
            fontFamily: "'DM Sans', sans-serif",
            letterSpacing: "0.02em",
            transition: "background 0.2s ease",
            marginBottom: "12px",
          }}
        >
          {loading ? "Redirecting to checkout..." : "Upgrade to Pro"}
        </button>

        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#B8B2A8",
            fontSize: "13px",
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
