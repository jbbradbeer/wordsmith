import Reveal from "./Reveal";

// TODO: Replace with real testimonials
const TESTIMONIALS = [
  {
    quote:
      "Wordsmith finds the perfect word in seconds. It's like having a literary editor on call — my writing has never felt more precise.",
    name: "Sarah M.",
    role: "Novelist",
  },
  {
    quote:
      "The category system is brilliant. I can instantly filter between punchy copy and elevated prose depending on the project.",
    name: "James K.",
    role: "Copywriter",
  },
  {
    quote:
      "I've discovered rare, beautiful words I never knew existed. Wordsmith has become an essential part of my screenwriting process.",
    name: "Maria L.",
    role: "Screenwriter",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="max-w-[940px] mx-auto px-6 py-20">
      <Reveal className="text-center mb-12">
        <h2
          className="font-display font-extrabold text-parchment-900 tracking-[-0.02em] m-0"
          style={{ fontSize: "clamp(28px, 4vw, 38px)" }}
        >
          Writers Love Wordsmith
        </h2>
      </Reveal>

      <div className="grid gap-10 md:grid-cols-3">
        {TESTIMONIALS.map((t, i) => (
          <Reveal key={t.name} delay={i * 120}>
            <figure className="relative m-0 pt-8 border-t-2 border-gold/30">
              <span
                aria-hidden="true"
                className="absolute -top-2 left-0 font-display font-black text-gold leading-none select-none"
                style={{ fontSize: "64px", opacity: 0.18 }}
              >
                &ldquo;
              </span>
              <blockquote className="relative font-display italic text-[16px] leading-relaxed text-parchment-900 m-0 mb-5">
                {t.quote}
              </blockquote>
              <figcaption className="font-body text-sm m-0">
                <span className="font-semibold text-gold">{t.name}</span>
                <span className="text-parchment-500 ml-2">{t.role}</span>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
