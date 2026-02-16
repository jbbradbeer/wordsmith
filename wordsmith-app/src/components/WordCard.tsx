import { useState } from "react";

const WORD_CATEGORIES: Record<
  string,
  { label: string; color: string; desc: string }
> = {
  elevated: { label: "Elevated", color: "#8B6914", desc: "Sophisticated & refined" },
  literary: { label: "Literary", color: "#6B4C8A", desc: "Bookish & evocative" },
  punchy: { label: "Punchy", color: "#C0392B", desc: "Sharp & impactful" },
  rare: { label: "Rare Gem", color: "#1A7A6D", desc: "Uncommon & distinctive" },
};

interface WordData {
  word: string;
  pronunciation: string;
  definition: string;
  example?: string;
  context?: string;
  category: string;
}

export default function WordCard({
  word,
  index,
}: {
  word: WordData;
  index: number;
}) {
  const [flipped, setFlipped] = useState(false);
  const cat = WORD_CATEGORIES[word.category] || WORD_CATEGORIES.elevated;

  return (
    <div
      onClick={() => setFlipped(!flipped)}
      className="cursor-pointer"
      style={{
        animation: "cardIn 0.4s ease both",
        animationDelay: `${index * 0.07}s`,
      }}
    >
      <div
        style={{
          position: "relative",
          background: flipped ? "#FDFBF7" : "#FFFFFF",
          border: `1.5px solid ${flipped ? cat.color + "40" : "#E8E2D8"}`,
          borderRadius: "10px",
          padding: "20px 22px",
          minHeight: "140px",
          transition: "all 0.3s ease",
          boxShadow: flipped
            ? `0 4px 20px ${cat.color}15`
            : "0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "10px",
          }}
        >
          <h3
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "22px",
              fontWeight: 700,
              color: "#1A1A18",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            {word.word}
          </h3>
          <span
            style={{
              fontSize: "10px",
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: cat.color,
              background: cat.color + "12",
              padding: "3px 8px",
              borderRadius: "4px",
              whiteSpace: "nowrap",
            }}
          >
            {cat.label}
          </span>
        </div>

        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "12px",
            color: "#8A8478",
            fontStyle: "italic",
            margin: "0 0 8px 0",
          }}
        >
          {word.pronunciation}
        </p>

        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "14px",
            color: "#4A4740",
            lineHeight: 1.55,
            margin: "0 0 12px 0",
          }}
        >
          {word.definition}
        </p>

        {flipped && word.example && (
          <div
            style={{
              borderTop: "1px solid #E8E2D8",
              paddingTop: "12px",
              marginTop: "4px",
              animation: "fadeUp 0.3s ease both",
            }}
          >
            <p
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "13.5px",
                color: "#5A5650",
                fontStyle: "italic",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              &ldquo;{word.example}&rdquo;
            </p>
            {word.context && (
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  color: "#9A948A",
                  marginTop: "8px",
                  marginBottom: 0,
                  lineHeight: 1.5,
                }}
              >
                &#128161; {word.context}
              </p>
            )}
          </div>
        )}

        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "10px",
            color: "#B8B2A8",
            margin: "8px 0 0 0",
            textAlign: "right",
          }}
        >
          {flipped ? "click to collapse" : "click for example"}
        </p>
      </div>
    </div>
  );
}
