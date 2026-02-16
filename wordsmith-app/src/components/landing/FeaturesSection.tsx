const FEATURES = [
  {
    title: "Categorized by Style",
    description:
      "Every word tagged as Elevated, Literary, Punchy, or Rare so you can match the tone you need instantly.",
  },
  {
    title: "Context-Aware Suggestions",
    description:
      "Unlike a thesaurus, Wordsmith understands nuance and delivers alternatives that actually fit your writing.",
  },
  {
    title: "Vivid Example Sentences",
    description:
      "See every word in action with carefully crafted example sentences that show proper usage and context.",
  },
  {
    title: "Pronunciation Guides",
    description:
      "Never stumble over a new word. Every suggestion includes a clear, intuitive pronunciation guide.",
  },
  {
    title: "Built for All Writers",
    description:
      "Whether you write novels, blog posts, screenplays, or copy, Wordsmith adapts to your creative needs.",
  },
  {
    title: "Instant Results",
    description:
      "Six curated alternatives in seconds. No scrolling through hundreds of loosely related synonyms.",
  },
];

export default function FeaturesSection() {
  return (
    <section
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "80px 24px",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "48px" }}>
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#8B6914",
            display: "block",
            marginBottom: "8px",
          }}
        >
          WHY WORDSMITH
        </span>
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
          More Than a Thesaurus
        </h2>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "15px",
            color: "#8A8478",
            margin: 0,
            maxWidth: "520px",
            marginLeft: "auto",
            marginRight: "auto",
            lineHeight: 1.6,
          }}
        >
          Built specifically for writers who care about voice, tone, and
          precision.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "20px",
        }}
      >
        {FEATURES.map((feature, i) => (
          <div
            key={feature.title}
            style={{
              background: "#FFFFFF",
              border: "1px solid #E8E2D8",
              borderRadius: "12px",
              padding: "24px",
              animation: "cardIn 0.4s ease both",
              animationDelay: `${i * 0.08}s`,
            }}
          >
            <h3
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "16px",
                fontWeight: 700,
                color: "#1A1A18",
                margin: "0 0 8px 0",
              }}
            >
              {feature.title}
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
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
