import Reveal from "@/components/landing/Reveal";
import MagneticButton from "@/components/landing/MagneticButton";

export default function ClosingCta({ onStartFree }: { onStartFree: () => void }) {
  return (
    <section className="max-w-[760px] mx-auto px-6 py-24 md:py-32 text-center">
      <Reveal>
        <h2
          className="font-display font-black text-parchment-900 tracking-[-0.02em] m-0 mb-4"
          style={{ fontSize: "clamp(30px, 5vw, 52px)" }}
        >
          Anyone can generate words.
          <br />
          Sounding like yourself is the rare part.
        </h2>
        <p className="font-body text-[16px] text-parchment-600 max-w-[480px] mx-auto m-0 mb-9">
          Paste a draft and see what it’s telling on you. Your writing is never
          stored, and Wordsmith never writes a word of it.
        </p>
        <MagneticButton
          onClick={onStartFree}
          className="inline-block bg-gold text-white border-none rounded-xl px-9 py-4 font-body text-[16px] font-semibold cursor-pointer"
        >
          Get My Slop Score
        </MagneticButton>
      </Reveal>
    </section>
  );
}
