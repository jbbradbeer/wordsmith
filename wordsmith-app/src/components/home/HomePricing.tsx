import Reveal from "@/components/landing/Reveal";
import {
  SUBSCRIPTION_PRICE_MONTHLY,
  SUBSCRIPTION_PRICE_ANNUAL,
} from "@/lib/constants";
import { SCAN_WORD_CAP_FREE, SCAN_WORD_CAP_PRO } from "@/lib/slop/types";

const FREE_FEATURES = [
  "1 Slop Score scan a day",
  `Drafts up to ${SCAN_WORD_CAP_FREE.toLocaleString()} words`,
  "Every tell highlighted and explained",
  "3 word searches a day",
];

const PRO_FEATURES = [
  "Unlimited Slop Score scans",
  `Drafts up to ${SCAN_WORD_CAP_PRO.toLocaleString()} words`,
  "Unlimited word searches",
  "Save words to collections",
];

const ANNUAL_PER_MONTH = Math.round((SUBSCRIPTION_PRICE_ANNUAL / 12) * 100) / 100;

interface Props {
  onStartFree: () => void;
  onGoPro: () => void;
}

export default function HomePricing({ onStartFree, onGoPro }: Props) {
  return (
    <section id="pricing" className="max-w-[900px] mx-auto px-6 py-20 md:py-28">
      <Reveal>
        <h2
          className="font-display font-black text-parchment-900 tracking-[-0.02em] text-center m-0 mb-3"
          style={{ fontSize: "clamp(28px, 4.5vw, 44px)" }}
        >
          Free to try. Cheap to keep.
        </h2>
        <p className="font-body text-[16px] text-parchment-600 text-center max-w-[520px] mx-auto m-0 mb-12">
          Score a draft every day for nothing. Upgrade when de-slopping becomes a
          daily habit.
        </p>
      </Reveal>

      <div className="grid gap-5 md:grid-cols-2 items-stretch">
        {/* Free */}
        <Reveal>
          <div className="h-full flex flex-col bg-white border border-parchment-300 rounded-3xl p-8">
            <h3 className="font-display font-bold text-xl text-parchment-900 m-0 mb-1">Free</h3>
            <div className="mb-6">
              <span className="font-display font-black text-4xl text-parchment-900">$0</span>
            </div>
            <ul className="list-none p-0 m-0 mb-8 flex-1">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 py-1.5 font-body text-[15px] text-parchment-800">
                  <span className="text-category-rare mt-0.5">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={onStartFree}
              className="btn-outline w-full py-3 rounded-xl border border-gold text-gold font-body text-[15px] font-semibold cursor-pointer bg-transparent transition-colors"
            >
              Score a draft
            </button>
          </div>
        </Reveal>

        {/* Pro */}
        <Reveal delay={80}>
          <div className="h-full relative rounded-3xl p-[1.5px] gold-shift bg-gradient-to-br from-gold via-gold-light to-gold">
            <div className="h-full flex flex-col bg-white rounded-[22px] p-8">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-display font-bold text-xl text-parchment-900 m-0">Pro</h3>
                <span className="font-body text-[11px] font-bold uppercase tracking-[0.12em] text-gold">
                  Unlimited
                </span>
              </div>
              <div className="mb-6">
                <span className="font-display font-black text-4xl text-parchment-900">
                  ${SUBSCRIPTION_PRICE_MONTHLY}
                </span>
                <span className="font-body text-sm text-parchment-500 ml-1.5">/month</span>
                <span className="block font-body text-xs text-gold mt-1">
                  or ${ANNUAL_PER_MONTH}/mo billed yearly (${SUBSCRIPTION_PRICE_ANNUAL})
                </span>
              </div>
              <ul className="list-none p-0 m-0 mb-8 flex-1">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 py-1.5 font-body text-[15px] text-parchment-800">
                    <span className="text-gold mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={onGoPro}
                className="btn-primary w-full py-3 rounded-xl border-none bg-gold text-white font-body text-[15px] font-semibold cursor-pointer transition-colors"
              >
                Go Pro
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
