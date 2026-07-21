import Link from "next/link";
import type { SlopSpan } from "@/lib/slop/types";
import { isSeedWord } from "@/lib/seed-words";

/** WHY / TRY / WORDS card for a flagged span. Never offers a rewrite. */
export default function SpanCard({ span, onClose }: { span: SlopSpan; onClose: () => void }) {
  const firstWord = span.text.toLowerCase().replace(/[^a-z\s'-]/g, "").trim().split(/\s+/)[0] || "";
  const wordLink = isSeedWord(firstWord) ? `/synonyms-for/${firstWord}` : `/search`;
  return (
    <div className="bg-white border border-gold/40 rounded-xl p-5 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <span className="font-display italic text-[15px] text-parchment-900">&ldquo;{span.text}&rdquo;</span>
        <button type="button" onClick={onClose} aria-label="Close" className="bg-transparent border-none cursor-pointer text-parchment-500">✕</button>
      </div>
      <p className="font-body text-[13px] text-parchment-800 m-0 mb-1.5">
        <span className="font-bold text-gold uppercase text-[11px] tracking-wider mr-1.5">Why</span>
        {span.why}
      </p>
      <p className="font-body text-[13px] text-parchment-800 m-0 mb-1.5">
        <span className="font-bold text-gold uppercase text-[11px] tracking-wider mr-1.5">Try</span>
        {span.hint}
      </p>
      <p className="font-body text-[13px] m-0">
        <span className="font-bold text-gold uppercase text-[11px] tracking-wider mr-1.5">Words</span>
        <Link href={wordLink} className="text-gold font-semibold no-underline">
          curated alternatives →
        </Link>
      </p>
    </div>
  );
}
