import { FREE_SEARCH_LIMIT, SUBSCRIPTION_PRICE_MONTHLY } from "@/lib/constants";
import Reveal from "./Reveal";
import MagneticButton from "./MagneticButton";

interface PricingSectionProps {
  onGetStarted: () => void;
  onUpgrade: () => void;
}

const CHECK = "✓";

const FREE_FEATURES = [
  `${FREE_SEARCH_LIMIT} word searches`,
  "All word categories",
  "Pronunciation guides",
  "Example sentences",
];

const PRO_FEATURES = [
  "Unlimited word searches",
  "Full search history",
  "Priority response speed",
  "Cancel anytime",
];

export default function PricingSection({ onGetStarted, onUpgrade }: PricingSectionProps) {
  return (
    <section className="max-w-[900px] mx-auto px-6 py-20">
      <Reveal className="text-center mb-12">
        <h2
          className="font-display font-extrabold text-parchment-900 tracking-[-0.02em] m-0 mb-2"
          style={{ fontSize: "clamp(28px, 4vw, 38px)" }}
        >
          Simple, Transparent Pricing
        </h2>
        <p className="font-body text-[15px] text-parchment-600 m-0">
          Start free. Upgrade when you&apos;re ready.
        </p>
      </Reveal>

      <div className="max-w-[700px] mx-auto grid gap-5 md:grid-cols-2 items-stretch">
        {/* Free — the quiet option */}
        <Reveal>
          <div className="h-full bg-white/60 border border-parchment-300 rounded-2xl p-8 flex flex-col">
            <h3 className="font-display font-bold text-xl text-parchment-900 m-0 mb-1">Free</h3>
            <div className="mb-6">
              <span className="font-display font-extrabold text-[40px] text-parchment-900">$0</span>
              <span className="font-body text-sm text-parchment-500 ml-1.5">forever</span>
            </div>
            <ul className="list-none p-0 m-0 mb-7 flex-1">
              {FREE_FEATURES.map((feature) => (
                <li
                  key={feature}
                  className="font-body text-sm text-parchment-900 py-1.5 flex items-center gap-2.5"
                >
                  <span className="text-category-rare font-bold">{CHECK}</span>
                  {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={onGetStarted}
              className="btn-outline w-full bg-transparent border-2 border-gold rounded-lg px-6 py-3 font-body text-sm font-semibold text-gold cursor-pointer transition-colors duration-200"
            >
              Get Started Free
            </button>
          </div>
        </Reveal>

        {/* Pro — center stage with animated gold border */}
        <Reveal delay={120}>
          <div className="gold-shift h-full rounded-2xl p-[2px] bg-gradient-to-br from-gold via-gold-light to-gold shadow-[0_8px_36px_rgba(139,105,20,0.22)]">
            <div className="relative h-full bg-white rounded-[14px] p-8 flex flex-col">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-white font-body text-[11px] font-bold tracking-[0.1em] uppercase px-3.5 py-1 rounded-full whitespace-nowrap">
                Most Popular
              </div>
              <h3 className="font-display font-bold text-xl text-parchment-900 m-0 mb-1">Pro</h3>
              <div className="mb-6">
                <span className="font-display font-extrabold text-[40px] text-parchment-900">
                  ${SUBSCRIPTION_PRICE_MONTHLY}
                </span>
                <span className="font-body text-sm text-parchment-500 ml-1.5">/month</span>
              </div>
              <ul className="list-none p-0 m-0 mb-7 flex-1">
                {PRO_FEATURES.map((feature) => (
                  <li
                    key={feature}
                    className="font-body text-sm text-parchment-900 py-1.5 flex items-center gap-2.5"
                  >
                    <span className="text-category-rare font-bold">{CHECK}</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <MagneticButton
                onClick={onUpgrade}
                className="btn-primary w-full bg-gold border-none rounded-lg px-6 py-3 font-body text-sm font-semibold text-white cursor-pointer"
              >
                Upgrade to Pro
              </MagneticButton>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
