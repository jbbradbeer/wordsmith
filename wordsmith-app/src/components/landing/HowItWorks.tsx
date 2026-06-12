import Reveal from "./Reveal";

const STEPS = [
  {
    number: "01",
    title: "Enter a Word",
    description:
      "Type any word you want to elevate. Common words, overused phrases, or anything that needs a fresh alternative.",
  },
  {
    number: "02",
    title: "Get Curated Alternatives",
    description:
      "Our AI analyzes context and tone to deliver six handpicked alternatives, each categorized by style and voice.",
  },
  {
    number: "03",
    title: "Elevate Your Writing",
    description:
      "Choose the perfect word with confidence. See example sentences, pronunciation guides, and style categories.",
  },
];

export default function HowItWorks() {
  return (
    <section className="max-w-[900px] mx-auto px-6 py-20">
      <Reveal className="text-center mb-14">
        <h2
          className="font-display font-extrabold text-parchment-900 tracking-[-0.02em] m-0 mb-2"
          style={{ fontSize: "clamp(28px, 4vw, 38px)" }}
        >
          How It Works
        </h2>
        <p className="font-display italic text-base text-parchment-600 m-0">
          Three steps to better writing
        </p>
      </Reveal>

      <div className="grid gap-10 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <Reveal key={step.number} delay={i * 120}>
            <div className="relative pt-10 text-center">
              <span
                aria-hidden="true"
                className="absolute top-0 left-1/2 -translate-x-1/2 font-display font-black text-gold select-none leading-none"
                style={{ fontSize: "88px", opacity: 0.1 }}
              >
                {step.number}
              </span>
              <h3 className="relative font-display font-bold text-lg text-parchment-900 m-0 mb-2">
                {step.title}
              </h3>
              <p className="relative font-body text-sm leading-relaxed text-parchment-600 m-0">
                {step.description}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
