import { useState } from "react";
import type { WordData } from "@/lib/types";
import SaveToCollectionButton from "@/components/SaveToCollectionButton";

const WORD_CATEGORIES: Record<
  string,
  { label: string; color: string; desc: string }
> = {
  elevated: { label: "Elevated", color: "#8B6914", desc: "Sophisticated & refined" },
  literary: { label: "Literary", color: "#6B4C8A", desc: "Bookish & evocative" },
  punchy: { label: "Punchy", color: "#C0392B", desc: "Sharp & impactful" },
  rare: { label: "Rare Gem", color: "#1A7A6D", desc: "Uncommon & distinctive" },
};

interface WordCardProps {
  word: WordData;
  index: number;
  session?: any;
  isPaid?: boolean;
  onAuthRequired?: () => void;
  onUpgradeRequired?: () => void;
}

export default function WordCard({
  word,
  index,
  session,
  isPaid,
  onAuthRequired,
  onUpgradeRequired,
}: WordCardProps) {
  const [flipped, setFlipped] = useState(false);
  const cat = WORD_CATEGORIES[word.category] || WORD_CATEGORIES.elevated;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      aria-label={`${word.word} — ${flipped ? "collapse" : "show example"}`}
      onClick={() => setFlipped(!flipped)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setFlipped(!flipped)}
      className="cursor-pointer"
      style={{
        animation: "cardIn 0.4s ease both",
        animationDelay: `${index * 0.07}s`,
      }}
    >
      <div
        className="wordcard-inner"
        style={{
          position: "relative",
          background: flipped ? "#FDFBF7" : "#FFFFFF",
          border: `1.5px solid ${flipped ? cat.color + "40" : "#E8E2D8"}`,
          borderRadius: "12px",
          padding: "20px 22px",
          minHeight: "140px",
          boxShadow: flipped
            ? `0 4px 20px ${cat.color}15`
            : "0 2px 8px rgba(26,26,24,0.06), 0 1px 3px rgba(26,26,24,0.04)",
        }}
      >
        {/* Bookmark button — top right */}
        {onAuthRequired && onUpgradeRequired && (
          <div
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              zIndex: 10,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <SaveToCollectionButton
              word={word}
              session={session}
              isPaid={isPaid || false}
              onAuthRequired={onAuthRequired}
              onUpgradeRequired={onUpgradeRequired}
            />
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "10px",
            paddingRight: onAuthRequired ? "28px" : "0",
          }}
        >
          <h3
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "24px",
              fontWeight: 700,
              color: "#1A1A18",
              margin: 0,
              letterSpacing: "-0.025em",
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
              border: `1px solid ${cat.color}20`,
              padding: "4px 10px",
              borderRadius: "6px",
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
                <span aria-hidden="true">&#128161;</span> {word.context}
              </p>
            )}
          </div>
        )}

        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "11px",
            color: "#A8A298",
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
