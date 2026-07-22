import Reveal from "@/components/landing/Reveal";

// Real tells from the detector dictionary, shown as before → after.
const EXAMPLES: { slop: string; fix: string }[] = [
  { slop: "In today's fast-paced world,", fix: "Start with the actual claim." },
  { slop: "It's important to note that", fix: "Just note it." },
  { slop: "We delve into a tapestry of solutions.", fix: "Name the two things you actually did." },
  { slop: "This is a game-changer.", fix: "Say what changed, and by how much." },
  { slop: "a robust, cutting-edge platform", fix: "Robust how? New how? Show it." },
  { slop: "Moreover, it is truly seamless.", fix: "Cut the connective. Cut the intensifier." },
];

export default function SlopExamples() {
  return (
    <section className="max-w-[980px] mx-auto px-6 py-20 md:py-28">
      <Reveal>
        <h2
          className="font-display font-black text-parchment-900 tracking-[-0.02em] m-0 mb-3"
          style={{ fontSize: "clamp(28px, 4.5vw, 44px)" }}
        >
          You already know the tells.
        </h2>
        <p className="font-body text-[16px] text-parchment-600 max-w-[560px] m-0 mb-12">
          Delve. Tapestry. It's important to note. The phrases that used to sound
          polished now read as machine-made. Wordsmith flags them and hands the
          rewrite back to you.
        </p>
      </Reveal>

      <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
        {EXAMPLES.map((ex, i) => (
          <Reveal key={ex.slop} delay={i * 60}>
            <div className="flex flex-col gap-1.5 border-t border-parchment-300 pt-4">
              <span className="font-body text-[15px] text-parchment-500 line-through decoration-category-punchy/70">
                {ex.slop}
              </span>
              <span className="font-display italic text-[16px] text-parchment-900 leading-snug">
                {ex.fix}
              </span>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
