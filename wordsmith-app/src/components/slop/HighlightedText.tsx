import type { ReactNode } from "react";
import type { SlopSpan } from "@/lib/slop/types";

interface Props {
  text: string;
  spans: SlopSpan[];
  activeIndex: number | null;
  onSpanClick: (index: number) => void;
}

/** Read-only render of the draft with flagged spans marked. */
export default function HighlightedText({ text, spans, activeIndex, onSpanClick }: Props) {
  const parts: ReactNode[] = [];
  let cursor = 0;
  spans.forEach((span, i) => {
    if (span.start < cursor) return; // skip overlaps already rendered
    if (span.start > cursor) parts.push(<span key={`t${i}`}>{text.slice(cursor, span.start)}</span>);
    parts.push(
      <button
        key={`s${i}`}
        type="button"
        onClick={() => onSpanClick(i)}
        className={`inline bg-transparent border-none p-0 cursor-pointer font-inherit text-inherit rounded-sm ${
          activeIndex === i ? "bg-gold/30" : "bg-gold/15"
        }`}
        style={{ boxShadow: "inset 0 -2px 0 #C0392B66", font: "inherit" }}
        title="Flagged"
      >
        {text.slice(span.start, span.end)}
      </button>
    );
    cursor = span.end;
  });
  if (cursor < text.length) parts.push(<span key="tail">{text.slice(cursor)}</span>);
  return (
    <div className="font-body text-[15px] leading-relaxed text-parchment-900 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
      {parts}
    </div>
  );
}
