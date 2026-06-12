const PROOF_POINTS = [
  "AI-powered word discovery",
  "6 curated alternatives per search",
  "Built for serious writers",
];

export default function SocialProofBar() {
  return (
    <div
      className="max-w-[720px] mx-auto px-6 pb-6 text-center"
      style={{ animation: "fadeUp 0.5s ease both", animationDelay: "0.35s" }}
    >
      <div className="flex justify-center flex-wrap items-center gap-x-5 gap-y-2">
        {PROOF_POINTS.map((point, i) => (
          <span key={point} className="flex items-center gap-5">
            {i > 0 && (
              <span aria-hidden="true" className="w-1 h-1 rounded-full bg-gold/50" />
            )}
            <span className="font-body text-[11px] font-medium tracking-[0.14em] uppercase text-parchment-600">
              {point}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
