const STEPS = [
  {
    number: 1,
    title: "Enter a Word",
    description:
      "Type any word you want to elevate. Common words, overused phrases, or anything that needs a fresh alternative.",
  },
  {
    number: 2,
    title: "Get Curated Alternatives",
    description:
      "Our AI analyzes context and tone to deliver six handpicked alternatives, each categorized by style and voice.",
  },
  {
    number: 3,
    title: "Elevate Your Writing",
    description:
      "Choose the perfect word with confidence. See example sentences, pronunciation guides, and style categories.",
  },
];

export default function HowItWorks() {
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
          How It Works
        </h2>
        <p
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "16px",
            color: "#8A8478",
            fontStyle: "italic",
            margin: 0,
          }}
        >
          Three steps to better writing
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "32px",
        }}
      >
        {STEPS.map((step, i) => (
          <div
            key={step.number}
            style={{
              textAlign: "center",
              animation: "cardIn 0.4s ease both",
              animationDelay: `${i * 0.1}s`,
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                border: "2px solid #8B6914",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <span
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "#8B6914",
                }}
              >
                {step.number}
              </span>
            </div>
            <h3
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "18px",
                fontWeight: 700,
                color: "#1A1A18",
                margin: "0 0 8px 0",
              }}
            >
              {step.title}
            </h3>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                lineHeight: 1.6,
                color: "#8A8478",
                margin: 0,
              }}
            >
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
