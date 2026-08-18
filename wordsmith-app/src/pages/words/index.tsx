import Head from "next/head";
import Link from "next/link";
import { SEED_WORDS } from "@/lib/seed-words";
import { WORD_HUBS } from "@/lib/word-hubs";
import { SITE_URL } from "@/lib/seo";
import type { NextPageWithLayout } from "@/pages/_app";
import { withShell } from "@/components/nav/ShellLayout";

const TITLE = `Word Library: Better Words for ${SEED_WORDS.length} Common Words | Wordsmith`;
const DESCRIPTION =
  "Browse curated alternatives for the most overused words in English: elevated, literary, punchy, and rare replacements with definitions and examples.";

function WordLibrary() {
  const sorted = [...SEED_WORDS].sort();
  const groups = sorted.reduce<Record<string, string[]>>((acc, word) => {
    const letter = word[0].toUpperCase();
    (acc[letter] = acc[letter] || []).push(word);
    return acc;
  }, {});

  return (
    <div className="min-h-screen">
      <Head>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href={`${SITE_URL}/words`} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={`${SITE_URL}/words`} />
      </Head>

      <div className="max-w-[840px] mx-auto px-6 pt-12 pb-16">
        <header className="mb-12 text-center">
          <h1
            className="font-display font-black text-parchment-900 m-0 mb-4 tracking-[-0.03em]"
            style={{ fontSize: "clamp(36px, 6vw, 56px)" }}
          >
            The Word Library
          </h1>
          <p className="font-body text-[15px] leading-relaxed text-parchment-600 m-0 max-w-[540px] mx-auto">
            The most overused words in English, each with six curated alternatives:
            elevated, literary, punchy, and rare.
          </p>
        </header>

        <section aria-label="Browse by category" className="mb-12">
          <h2 className="font-body text-[11px] font-semibold tracking-[0.22em] uppercase text-gold m-0 mb-4 text-center">
            Browse by category
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {WORD_HUBS.map((h) => (
              <Link
                key={h.slug}
                href={`/words/category/${h.slug}`}
                className="history-chip bg-white border border-gold/30 rounded-full px-5 py-2 font-body text-[14px] font-semibold text-parchment-800 no-underline transition-colors duration-150"
              >
                {h.title}
              </Link>
            ))}
          </div>
        </section>

        {Object.entries(groups).map(([letter, words]) => (
          <section key={letter} className="mb-8">
            <h2 className="font-display font-bold text-xl text-gold m-0 mb-3 border-b border-parchment-300 pb-1.5">
              {letter}
            </h2>
            <div className="flex flex-wrap gap-2">
              {words.map((w) => (
                <Link
                  key={w}
                  href={`/synonyms-for/${w}`}
                  className="history-chip bg-white border border-parchment-300 rounded-full px-4 py-1.5 font-body text-[13px] text-parchment-700 no-underline transition-colors duration-150"
                >
                  {w}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

(WordLibrary as NextPageWithLayout).getLayout = withShell("lean");
export default WordLibrary;
