import { MouseEvent, useEffect, useRef, useState } from "react";

const CYCLE_WORDS = [
  "extraordinary",
  "resplendent",
  "luminous",
  "ineffable",
  "mellifluous",
  "indelible",
  "incandescent",
];

const CYCLE_MS = 2600;

function KineticWord() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % CYCLE_WORDS.length);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      {/* Static word for screen readers; the cycling one is decorative */}
      <span className="sr-only">extraordinary</span>
      <span
        key={CYCLE_WORDS[index]}
        aria-hidden="true"
        className="inline-block font-bold not-italic text-gold"
        style={{ animation: "wordIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) both" }}
      >
        {CYCLE_WORDS[index]}
      </span>
    </>
  );
}

/** Kinetic-typography hero with a cursor-reactive ink wash and paper grain. */
export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);

  const handleMove = (e: MouseEvent<HTMLElement>) => {
    const el = sectionRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  return (
    <header
      ref={sectionRef}
      onMouseMove={handleMove}
      className="relative overflow-hidden text-center"
    >
      {/* Cursor-reactive ink wash */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(560px circle at var(--mx, 50%) var(--my, 20%), rgba(139, 105, 20, 0.13), transparent 62%)",
        }}
      />
      {/* Paper grain */}
      <div aria-hidden="true" className="grain absolute inset-0" />

      <div className="relative max-w-[840px] mx-auto px-6 pt-14 pb-6">
        <div
          className="flex items-center justify-center gap-2.5 mb-4"
          style={{ animation: "heroIn 0.6s ease both" }}
        >
          <div className="w-11 h-0.5 bg-gradient-to-r from-transparent to-gold" />
          <span className="font-body text-[11px] font-semibold tracking-[0.24em] uppercase text-gold">
            A Writer&apos;s Companion
          </span>
          <div className="w-11 h-0.5 bg-gradient-to-r from-gold to-transparent" />
        </div>

        <h1
          className="font-display font-black text-parchment-900 m-0 tracking-[-0.035em] leading-[0.95]"
          style={{
            fontSize: "clamp(52px, 10vw, 96px)",
            animation: "heroIn 0.7s ease both",
            animationDelay: "0.08s",
          }}
        >
          Wordsmith
        </h1>

        <p
          className="font-display italic text-parchment-700 mt-5 mb-2 mx-auto max-w-[600px] leading-snug"
          style={{
            fontSize: "clamp(20px, 3.4vw, 30px)",
            animation: "heroIn 0.7s ease both",
            animationDelay: "0.18s",
          }}
        >
          Trade the ordinary
          <br />
          for the <KineticWord />
        </p>
      </div>
    </header>
  );
}
