interface CtaSectionProps {
  onGetStarted: () => void;
}

export default function CtaSection({ onGetStarted }: CtaSectionProps) {
  return (
    <section
      style={{
        background:
          "linear-gradient(180deg, rgba(139, 105, 20, 0.04) 0%, rgba(139, 105, 20, 0.08) 100%)",
        padding: "80px 24px",
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "clamp(28px, 4vw, 36px)",
            fontWeight: 800,
            color: "#1A1A18",
            margin: "0 0 12px 0",
            letterSpacing: "-0.02em",
          }}
        >
          Ready to Elevate Your Writing?
        </h2>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "16px",
            color: "#8A8478",
            margin: "0 0 32px 0",
            lineHeight: 1.6,
          }}
        >
          Join writers who have traded the ordinary for the extraordinary.
        </p>
        <button
          onClick={onGetStarted}
          style={{
            background: "#8B6914",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "10px",
            padding: "16px 40px",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "16px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "background 0.2s ease, opacity 0.2s ease",
            letterSpacing: "0.02em",
            boxShadow: "0 4px 16px rgba(139, 105, 20, 0.25)",
          }}
        >
          Start Writing Better
        </button>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "12px",
            color: "#B8B2A8",
            marginTop: "16px",
          }}
        >
          No credit card required. 3 free searches included.
        </p>
      </div>
    </section>
  );
}
