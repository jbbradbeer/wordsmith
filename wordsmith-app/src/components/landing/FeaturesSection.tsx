import Reveal from "./Reveal";
import { WORD_CATEGORIES } from "@/lib/constants";

const FEATURES = [
  {
    title: "Context-Aware Suggestions",
    description:
      "Unlike a thesaurus, Wordsmith understands nuance and delivers alternatives that actually fit your writing.",
  },
  {
    title: "Vivid Example Sentences",
    description:
      "See every word in action with carefully crafted example sentences that show proper usage and context.",
  },
  {
    title: "Pronunciation Guides",
    description:
      "Never stumble over a new word. Every suggestion includes a clear, intuitive pronunciation guide.",
  },
  {
    title: "Built for All Writers",
    description:
      "Novels, blog posts, screenplays, or copy. Wordsmith adapts to your creative needs.",
  },
  {
    title: "Instant Results",
    description:
      "Six curated alternatives in seconds. No scrolling through hundreds of loosely related synonyms.",
  },
];

export default function FeaturesSection() {
  return (
    <section className="max-w-[940px] mx-auto px-6 py-20">
      <Reveal className="text-center mb-12">
        <span className="font-body text-[11px] font-semibold tracking-[0.22em] uppercase text-gold block mb-2">
          Why Wordsmith
        </span>
        <h2
          className="font-display font-extrabold text-parchment-900 tracking-[-0.02em] m-0 mb-2"
          style={{ fontSize: "clamp(28px, 4vw, 38px)" }}
        >
          More Than a Thesaurus
        </h2>
        <p className="font-body text-[15px] text-parchment-600 leading-relaxed max-w-[520px] mx-auto m-0">
          Built specifically for writers who care about voice, tone, and precision.
        </p>
      </Reveal>

      {/* Bento grid — featured cell with live category chips, the rest orbit it */}
      <div className="grid gap-4 md:grid-cols-6">
        <Reveal className="md:col-span-4">
          <div className="bento-card h-full bg-white border border-parchment-300 rounded-2xl p-8">
            <h3 className="font-display font-bold text-[22px] text-parchment-900 m-0 mb-2.5">
              Categorized by Style
            </h3>
            <p className="font-body text-[15px] leading-relaxed text-parchment-600 m-0 mb-6 max-w-[440px]">
              Every word is tagged so you can match the tone you need instantly,
              from boardroom-polished to once-a-century rare.
            </p>
            <div className="flex flex-wrap gap-2.5">
              {Object.entries(WORD_CATEGORIES).map(([key, cat]) => (
                <span
                  key={key}
                  className="font-body text-xs font-semibold rounded-full px-3.5 py-1.5 border transition-transform duration-200 hover:-translate-y-0.5 cursor-default"
                  style={{
                    color: cat.color,
                    borderColor: `${cat.color}55`,
                    background: `${cat.color}0D`,
                  }}
                >
                  {cat.label}
                </span>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={100} className="md:col-span-2">
          <div className="bento-card h-full bg-white border border-parchment-300 rounded-2xl p-6">
            <h3 className="font-display font-bold text-base text-parchment-900 m-0 mb-2">
              {FEATURES[0].title}
            </h3>
            <p className="font-body text-sm leading-relaxed text-parchment-600 m-0">
              {FEATURES[0].description}
            </p>
          </div>
        </Reveal>

        {FEATURES.slice(1).map((feature, i) => (
          <Reveal key={feature.title} delay={i * 90} className="md:col-span-3">
            <div className="bento-card h-full bg-white border border-parchment-300 rounded-2xl p-6">
              <h3 className="font-display font-bold text-base text-parchment-900 m-0 mb-2">
                {feature.title}
              </h3>
              <p className="font-body text-sm leading-relaxed text-parchment-600 m-0">
                {feature.description}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
