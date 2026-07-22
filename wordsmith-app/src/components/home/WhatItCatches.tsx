import Reveal from "@/components/landing/Reveal";

const DETECTORS: { key: string; title: string; example: string; body: string; tint: string }[] = [
  {
    key: "aiisms",
    title: "AI-isms",
    example: "“delve into a tapestry of”",
    body: "The stock phrases language models reach for. Instantly recognizable, instantly hollow.",
    tint: "rgba(139,105,20,0.06)",
  },
  {
    key: "cliches",
    title: "Clichés",
    example: "“move the needle”",
    body: "Figurative framing that was vivid a decade ago and is wallpaper now.",
    tint: "rgba(107,76,138,0.06)",
  },
  {
    key: "hedging",
    title: "Hedging",
    example: "“it could be argued that”",
    body: "Boilerplate qualifiers and empty intensifiers that pad a sentence without adding a thing.",
    tint: "rgba(26,122,109,0.06)",
  },
  {
    key: "rhythm",
    title: "Flat rhythm",
    example: "every sentence the same length",
    body: "Uniform cadence and em-dash overuse. The metronome tell that human writing rarely has.",
    tint: "rgba(192,57,43,0.06)",
  },
];

export default function WhatItCatches() {
  return (
    <section className="max-w-[1000px] mx-auto px-6 py-20 md:py-28">
      <Reveal>
        <h2
          className="font-display font-black text-parchment-900 tracking-[-0.02em] m-0 mb-3"
          style={{ fontSize: "clamp(28px, 4.5vw, 44px)" }}
        >
          Four ways writing gives itself away.
        </h2>
        <p className="font-body text-[16px] text-parchment-600 max-w-[560px] m-0 mb-12">
          A fast rules pass catches the obvious tells the moment you paste. Then a
          deeper read finds the generic voice underneath.
        </p>
      </Reveal>

      <div className="grid gap-4 md:grid-cols-2">
        {DETECTORS.map((d, i) => (
          <Reveal key={d.key} delay={i * 70}>
            <div
              className="bento-card h-full rounded-2xl border border-parchment-300 p-7"
              style={{ background: d.tint }}
            >
              <h3 className="font-display font-bold text-[22px] text-parchment-900 m-0 mb-1.5">
                {d.title}
              </h3>
              <p className="font-display italic text-[15px] text-parchment-700 m-0 mb-3">
                {d.example}
              </p>
              <p className="font-body text-[14px] leading-relaxed text-parchment-600 m-0">
                {d.body}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
