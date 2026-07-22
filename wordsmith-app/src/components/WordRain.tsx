import { useEffect, useState } from "react";

const RARE_WORDS = [
  "petrichor",
  "susurrus",
  "vellichor",
  "apricity",
  "psithurism",
  "limerence",
  "halcyon",
  "mellifluous",
  "ineffable",
  "serendipity",
  "quixotic",
  "ephemeral",
  "sonorous",
  "luminescent",
  "labyrinthine",
  "pulchritude",
  "sibylline",
  "eloquence",
];

const INK_COLORS = ["#8B6914", "#6B4C8A", "#C0392B", "#1A7A6D"];

interface Drop {
  id: number;
  word: string;
  left: number; // vw
  delay: number; // s
  duration: number; // s
  size: number; // px
  color: string;
  tilt: number; // deg
}

const RAIN_LIFETIME_MS = 9000;

interface WordRainProps {
  onDone: () => void;
}

/** Logophile mode — the secret lexicon rains down the page. */
export default function WordRain({ onDone }: WordRainProps) {
  const [drops, setDrops] = useState<Drop[]>([]);

  useEffect(() => {
    setDrops(
      Array.from({ length: 26 }, (_, id) => ({
        id,
        word: RARE_WORDS[Math.floor(Math.random() * RARE_WORDS.length)],
        left: Math.random() * 94,
        delay: Math.random() * 3,
        duration: 3.5 + Math.random() * 3,
        size: 15 + Math.random() * 19,
        color: INK_COLORS[Math.floor(Math.random() * INK_COLORS.length)],
        tilt: -14 + Math.random() * 28,
      }))
    );
    const timer = setTimeout(onDone, RAIN_LIFETIME_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden" aria-hidden="true">
      {drops.map((d) => (
        <span
          key={d.id}
          className="absolute top-0 font-display font-bold italic"
          style={{
            left: `${d.left}vw`,
            fontSize: `${d.size}px`,
            color: d.color,
            // CSS var consumed by the rainFall keyframes
            ["--tilt" as string]: `${d.tilt}deg`,
            animation: `rainFall ${d.duration}s linear ${d.delay}s both`,
          }}
        >
          {d.word}
        </span>
      ))}

      <div
        role="status"
        className="fixed bottom-8 left-1/2 bg-parchment-900 text-parchment-100 font-body text-sm rounded-full px-6 py-3 shadow-xl"
        style={{ animation: "toastIn 0.4s ease both", transform: "translateX(-50%)" }}
      >
        <span aria-hidden="true">&#129718;</span> You found the secret lexicon. Logophile
        mode engaged.
      </div>
    </div>
  );
}
