import Reveal from "./Reveal";
import MagneticButton from "./MagneticButton";

interface CtaSectionProps {
  onGetStarted: () => void;
}

export default function CtaSection({ onGetStarted }: CtaSectionProps) {
  return (
    <section className="bg-gradient-to-b from-gold/[0.04] to-gold/[0.09] py-24 px-6">
      <Reveal className="max-w-[640px] mx-auto text-center">
        <h2
          className="font-display font-extrabold text-parchment-900 tracking-[-0.02em] m-0 mb-4 leading-tight"
          style={{ fontSize: "clamp(30px, 5vw, 44px)" }}
        >
          Find the word you&apos;ve been{" "}
          <em className="text-gold not-italic font-display italic">searching</em> for.
        </h2>
        <p className="font-body text-base text-parchment-600 leading-relaxed m-0 mb-9">
          Join writers who have traded the ordinary for the extraordinary.
        </p>
        <MagneticButton
          onClick={onGetStarted}
          className="btn-primary bg-gold text-white border-none rounded-xl px-10 py-4 font-body text-base font-semibold cursor-pointer tracking-[0.02em] shadow-[0_6px_24px_rgba(139,105,20,0.3)]"
        >
          Start Writing Better
        </MagneticButton>
        <p className="font-body text-xs text-parchment-500 mt-4 m-0">
          No credit card required. 3 free searches included.
        </p>
      </Reveal>
    </section>
  );
}
