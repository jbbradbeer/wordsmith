import Reveal from "@/components/landing/Reveal";

const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: "01",
    title: "Paste your draft",
    body: "An email, an essay, a landing page. Anything you wrote and want to sound like you.",
  },
  {
    n: "02",
    title: "See your Slop Score",
    body: "Every AI tell is highlighted and scored, with a plain-English reason it reads as machine-made.",
  },
  {
    n: "03",
    title: "Rewrite in your voice",
    body: "Click any span for the fix and a word to reach for. You make every edit. The words stay yours.",
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-parchment-100/60 border-y border-parchment-300">
      <div className="max-w-[1100px] mx-auto px-6 py-20 md:py-28">
        <Reveal>
          <h2
            className="font-display font-black text-parchment-900 tracking-[-0.02em] text-center m-0 mb-14"
            style={{ fontSize: "clamp(28px, 4.5vw, 44px)" }}
          >
            It coaches. It never ghostwrites.
          </h2>
        </Reveal>

        <div className="grid gap-10 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 90}>
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="font-display font-black text-gold/15 leading-none block mb-2"
                  style={{ fontSize: "clamp(56px, 7vw, 84px)" }}
                >
                  {s.n}
                </span>
                <h3 className="font-display font-bold text-[22px] text-parchment-900 m-0 mb-2">
                  {s.title}
                </h3>
                <p className="font-body text-[15px] leading-relaxed text-parchment-600 m-0 max-w-[34ch]">
                  {s.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
