// TODO: Replace with real testimonials
const TESTIMONIALS = [
  {
    quote:
      "Wordsmith finds the perfect word in seconds. It's like having a literary editor on call — my writing has never felt more precise.",
    name: "Sarah M.",
    role: "Novelist",
  },
  {
    quote:
      "The category system is brilliant. I can instantly filter between punchy copy and elevated prose depending on the project.",
    name: "James K.",
    role: "Copywriter",
  },
  {
    quote:
      "I've discovered rare, beautiful words I never knew existed. Wordsmith has become an essential part of my screenwriting process.",
    name: "Maria L.",
    role: "Screenwriter",
  },
];

export default function TestimonialsSection() {
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
          Writers Love Wordsmith
        </h2>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "20px",
        }}
      >
        {TESTIMONIALS.map((testimonial, i) => (
          <div
            key={testimonial.name}
            style={{
              background: "#FFFFFF",
              border: "1px solid #E8E2D8",
              borderRadius: "12px",
              padding: "28px 24px",
              animation: "cardIn 0.4s ease both",
              animationDelay: `${i * 0.1}s`,
            }}
          >
            <p
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "15px",
                fontStyle: "italic",
                color: "#1A1A18",
                lineHeight: 1.7,
                margin: "0 0 20px 0",
              }}
            >
              &ldquo;{testimonial.quote}&rdquo;
            </p>
            <div>
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#8B6914",
                }}
              >
                {testimonial.name}
              </span>
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "13px",
                  color: "#B8B2A8",
                  marginLeft: "8px",
                }}
              >
                {testimonial.role}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
