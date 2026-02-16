export default function SocialProofBar() {
  return (
    <div
      style={{
        maxWidth: "720px",
        margin: "0 auto",
        padding: "0 24px 24px",
        textAlign: "center",
        animation: "fadeUp 0.5s ease both",
        animationDelay: "0.4s",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "24px",
        }}
      >
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px",
            color: "#8A8478",
          }}
        >
          <strong style={{ color: "#6A6460", fontWeight: 600 }}>
            AI-powered
          </strong>{" "}
          word discovery
        </span>
        <span style={{ color: "#E8E2D8" }}>|</span>
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px",
            color: "#8A8478",
          }}
        >
          <strong style={{ color: "#6A6460", fontWeight: 600 }}>
            6 curated
          </strong>{" "}
          alternatives per search
        </span>
        <span style={{ color: "#E8E2D8" }}>|</span>
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px",
            color: "#8A8478",
          }}
        >
          Built for{" "}
          <strong style={{ color: "#6A6460", fontWeight: 600 }}>
            serious writers
          </strong>
        </span>
      </div>
    </div>
  );
}
