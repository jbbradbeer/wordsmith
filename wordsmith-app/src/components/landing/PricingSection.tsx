import {
  FREE_SEARCH_LIMIT,
  SUBSCRIPTION_PRICE_MONTHLY,
} from "@/lib/constants";

interface PricingSectionProps {
  onGetStarted: () => void;
  onUpgrade: () => void;
}

const CHECK = "\u2713";

const FREE_FEATURES = [
  `${FREE_SEARCH_LIMIT} word searches`,
  "All word categories",
  "Pronunciation guides",
  "Example sentences",
];

const PRO_FEATURES = [
  "Unlimited word searches",
  "Full search history",
  "Priority response speed",
  "Cancel anytime",
];

export default function PricingSection({
  onGetStarted,
  onUpgrade,
}: PricingSectionProps) {
  return (
    <section
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "80px 24px",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "48px" }}>
        <h2
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "clamp(28px, 4vw, 36px)",
            fontWeight: 800,
            color: "#1A1A18",
            margin: "0 0 8px 0",
            letterSpacing: "-0.02em",
          }}
        >
          Simple, Transparent Pricing
        </h2>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "15px",
            color: "#8A8478",
            margin: 0,
          }}
        >
          Start free. Upgrade when you&apos;re ready.
        </p>
      </div>

      <div
        style={{
          maxWidth: "680px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "20px",
        }}
      >
        {/* Free Card */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E8E2D8",
            borderRadius: "12px",
            padding: "32px 28px",
            animation: "cardIn 0.4s ease both",
          }}
        >
          <h3
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "20px",
              fontWeight: 700,
              color: "#1A1A18",
              margin: "0 0 4px 0",
            }}
          >
            Free
          </h3>
          <div style={{ marginBottom: "24px" }}>
            <span
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "40px",
                fontWeight: 800,
                color: "#1A1A18",
              }}
            >
              $0
            </span>
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                color: "#B8B2A8",
                marginLeft: "6px",
              }}
            >
              forever
            </span>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px 0" }}>
            {FREE_FEATURES.map((feature) => (
              <li
                key={feature}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "14px",
                  color: "#1A1A18",
                  padding: "6px 0",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span style={{ color: "#1A7A6D", fontWeight: 700 }}>
                  {CHECK}
                </span>
                {feature}
              </li>
            ))}
          </ul>
          <button
            onClick={onGetStarted}
            style={{
              width: "100%",
              background: "transparent",
              border: "2px solid #8B6914",
              borderRadius: "8px",
              padding: "12px 24px",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "14px",
              fontWeight: 600,
              color: "#8B6914",
              cursor: "pointer",
              transition: "background 0.2s ease, color 0.2s ease, opacity 0.2s ease",
            }}
          >
            Get Started Free
          </button>
        </div>

        {/* Pro Card */}
        <div
          style={{
            background: "#FFFFFF",
            border: "2px solid #8B6914",
            borderRadius: "12px",
            padding: "32px 28px",
            position: "relative",
            boxShadow: "0 4px 24px rgba(139, 105, 20, 0.1)",
            animation: "cardIn 0.4s ease both",
            animationDelay: "0.1s",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-12px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "#8B6914",
              color: "#FFFFFF",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              padding: "4px 14px",
              borderRadius: "20px",
              textTransform: "uppercase",
            }}
          >
            MOST POPULAR
          </div>
          <h3
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "20px",
              fontWeight: 700,
              color: "#1A1A18",
              margin: "0 0 4px 0",
            }}
          >
            Pro
          </h3>
          <div style={{ marginBottom: "24px" }}>
            <span
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "40px",
                fontWeight: 800,
                color: "#1A1A18",
              }}
            >
              ${SUBSCRIPTION_PRICE_MONTHLY}
            </span>
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                color: "#B8B2A8",
                marginLeft: "6px",
              }}
            >
              /month
            </span>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px 0" }}>
            {PRO_FEATURES.map((feature) => (
              <li
                key={feature}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "14px",
                  color: "#1A1A18",
                  padding: "6px 0",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span style={{ color: "#1A7A6D", fontWeight: 700 }}>
                  {CHECK}
                </span>
                {feature}
              </li>
            ))}
          </ul>
          <button
            onClick={onUpgrade}
            style={{
              width: "100%",
              background: "#8B6914",
              border: "none",
              borderRadius: "8px",
              padding: "12px 24px",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "14px",
              fontWeight: 600,
              color: "#FFFFFF",
              cursor: "pointer",
              transition: "background 0.2s ease, opacity 0.2s ease",
            }}
          >
            Upgrade to Pro
          </button>
        </div>
      </div>
    </section>
  );
}
