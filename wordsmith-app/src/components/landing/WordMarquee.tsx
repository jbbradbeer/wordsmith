const LEXICON: Array<{ word: string; gloss: string }> = [
  { word: "petrichor", gloss: "the scent of rain on dry earth" },
  { word: "susurrus", gloss: "a soft murmuring or rustling" },
  { word: "apricity", gloss: "the warmth of the sun in winter" },
  { word: "vellichor", gloss: "the wistfulness of old bookshops" },
  { word: "psithurism", gloss: "the sound of wind through trees" },
  { word: "halcyon", gloss: "golden; idyllically calm" },
  { word: "limerence", gloss: "the euphoria of new love" },
  { word: "sesquipedalian", gloss: "given to very long words" },
];

function Strip() {
  return (
    <>
      {LEXICON.map(({ word, gloss }) => (
        <span key={word} className="flex items-baseline gap-3 px-7 whitespace-nowrap">
          <span className="font-display font-bold text-[17px] text-gold">{word}</span>
          <span className="font-body text-[13px] italic text-parchment-600">{gloss}</span>
          <span aria-hidden="true" className="text-parchment-400 text-xs pl-4">
            &#10086;
          </span>
        </span>
      ))}
    </>
  );
}

/** Infinite strip of rare words — pauses on hover so the curious can read. */
export default function WordMarquee() {
  return (
    <div
      className="marquee border-y border-gold/10 py-4 my-4"
      role="presentation"
      aria-hidden="true"
    >
      <div className="marquee-track">
        <Strip />
        <Strip />
      </div>
    </div>
  );
}
