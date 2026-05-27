import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { WordData } from "@/lib/types";
import { WORD_CATEGORIES } from "@/lib/constants";
import SaveToCollectionButton from "@/components/SaveToCollectionButton";

interface WordCardProps {
  word: WordData;
  index: number;
  session?: Session | null;
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
        className={`wordcard-inner relative rounded-xl px-[22px] py-5 min-h-[140px] ${
          flipped ? "bg-parchment-50" : "bg-white"
        }`}
        style={{
          border: `1.5px solid ${flipped ? cat.color + "40" : "#E8E2D8"}`,
          boxShadow: flipped
            ? `0 4px 20px ${cat.color}15`
            : "0 2px 8px rgba(26,26,24,0.06), 0 1px 3px rgba(26,26,24,0.04)",
        }}
      >
        {/* Bookmark button — top right */}
        {onAuthRequired && onUpgradeRequired && (
          <div
            className="absolute top-2.5 right-2.5 z-10"
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
          className={`flex justify-between items-start mb-2.5 ${
            onAuthRequired ? "pr-7" : ""
          }`}
        >
          <h3 className="font-display text-2xl font-bold text-parchment-900 m-0 tracking-tight">
            {word.word}
          </h3>
          <span
            className="text-[10px] font-body font-semibold tracking-[0.08em] uppercase px-2.5 py-1 rounded whitespace-nowrap"
            style={{
              color: cat.color,
              background: cat.color + "12",
              border: `1px solid ${cat.color}20`,
            }}
          >
            {cat.label}
          </span>
        </div>

        <p className="font-body text-xs text-parchment-600 italic m-0 mb-2">
          {word.pronunciation}
        </p>

        <p className="font-body text-sm text-parchment-800 leading-[1.55] m-0 mb-3">
          {word.definition}
        </p>

        {flipped && word.example && (
          <div
            className="border-t border-parchment-300 pt-3 mt-1"
            style={{ animation: "fadeUp 0.3s ease both" }}
          >
            <p className="font-display text-[13.5px] text-[#5A5650] italic leading-relaxed m-0">
              &ldquo;{word.example}&rdquo;
            </p>
            {word.context && (
              <p className="font-body text-xs text-parchment-600 mt-2 mb-0 leading-snug">
                <span aria-hidden="true">&#128161;</span> {word.context}
              </p>
            )}
          </div>
        )}

        <p className="font-body text-[11px] text-parchment-500 mt-2 mb-0 text-right" aria-hidden="true">
          {flipped ? "tap to collapse" : "tap for example"}
        </p>
      </div>
    </div>
  );
}
