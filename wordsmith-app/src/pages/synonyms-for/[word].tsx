import type { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import Footer from "@/components/landing/Footer";
import { isSeedWord, relatedWords } from "@/lib/seed-words";
import { getWordPageData } from "@/lib/word-pages";
import { SITE_URL, jsonLdSerialize } from "@/lib/seo";
import { WORD_CATEGORIES } from "@/lib/constants";
import type { WordData } from "@/lib/types";

interface SynonymPageProps {
  word: string;
  alternatives: WordData[];
  related: string[];
}

export const getStaticPaths: GetStaticPaths = async () => ({
  // Generate on first request, then persist via word_pages (shared with
  // /words/[word]) — one Claude call per word, ever, across both routes.
  paths: [],
  fallback: "blocking",
});

export const getStaticProps: GetStaticProps<SynonymPageProps> = async ({ params }) => {
  const word = String(params?.word || "").toLowerCase();

  if (!isSeedWord(word)) {
    return { notFound: true };
  }

  const alternatives = await getWordPageData(word);
  if (!alternatives) {
    return { notFound: true, revalidate: 60 };
  }

  return { props: { word, alternatives, related: relatedWords(word, 10) } };
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function SynonymPage({ word, alternatives, related }: SynonymPageProps) {
  const canonical = `${SITE_URL}/synonyms-for/${word}`;
  const synonymList = alternatives.map((a) => a.word);
  const title = `Synonyms for "${capitalize(word)}": ${alternatives.length} Better Alternatives | Wordsmith`;
  const description = `${alternatives.length} synonyms for "${word}": ${synonymList
    .slice(0, 5)
    .join(", ")}. Each with its meaning, pronunciation, and an example sentence.`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "DefinedTermSet",
        name: `Synonyms for "${word}"`,
        url: canonical,
        hasDefinedTerm: alternatives.map((a) => ({
          "@type": "DefinedTerm",
          name: a.word,
          description: a.definition,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Wordsmith", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Word Library", item: `${SITE_URL}/words` },
          {
            "@type": "ListItem",
            position: 3,
            name: `Synonyms for ${capitalize(word)}`,
            item: canonical,
          },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen">
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdSerialize(jsonLd) }}
        />
      </Head>

      <nav aria-label="Breadcrumb" className="max-w-[720px] mx-auto px-6 pt-6">
        <ol className="list-none p-0 m-0 flex flex-wrap items-center gap-2 font-body text-xs text-parchment-500">
          <li>
            <Link href="/" className="footer-link text-parchment-600 no-underline">
              Wordsmith
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/words" className="footer-link text-parchment-600 no-underline">
              Word Library
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-gold font-semibold">
            synonyms for {word}
          </li>
        </ol>
      </nav>

      <main className="max-w-[720px] mx-auto px-6 pt-10 pb-16">
        <header className="mb-8">
          <span className="font-body text-[11px] font-semibold tracking-[0.22em] uppercase text-gold block mb-3">
            Synonyms for
          </span>
          <h1
            className="font-display font-black text-parchment-900 m-0 mb-4 tracking-[-0.03em] leading-none"
            style={{ fontSize: "clamp(44px, 8vw, 72px)" }}
          >
            &ldquo;{word}&rdquo;
          </h1>
          <p className="font-body text-[15px] leading-relaxed text-parchment-600 m-0 max-w-[560px]">
            {alternatives.length} synonyms for &ldquo;{word},&rdquo; each with its precise
            meaning and an example so you pick the one that actually fits, not just the
            nearest match.
          </p>
        </header>

        {/* Quick-scan synonym list — the thesaurus answer, above the fold */}
        <section aria-label={`Synonym list for ${word}`} className="mb-10">
          <div className="flex flex-wrap gap-2">
            {synonymList.map((w) => (
              <a
                key={w}
                href={`#${w}`}
                className="history-chip bg-parchment-200 border border-parchment-300 rounded-full px-4 py-1.5 font-body text-[14px] text-parchment-800 no-underline transition-colors duration-150"
              >
                {w}
              </a>
            ))}
          </div>
        </section>

        {/* Detailed entries */}
        <section aria-label={`Synonyms for ${word} with definitions`}>
          {alternatives.map((a) => {
            const cat = WORD_CATEGORIES[a.category] ?? WORD_CATEGORIES.elevated;
            return (
              <article
                key={a.word}
                id={a.word}
                className="bg-white border border-parchment-300 rounded-2xl p-7 mb-4 scroll-mt-6"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1.5">
                  <h2 className="font-display font-bold text-[26px] text-parchment-900 m-0">
                    {a.word}
                  </h2>
                  {a.pronunciation && (
                    <span className="font-body text-sm text-parchment-500">
                      {a.pronunciation}
                    </span>
                  )}
                  <span
                    className="font-body text-[11px] font-semibold rounded-full px-2.5 py-0.5 border ml-auto"
                    style={{
                      color: cat.color,
                      borderColor: `${cat.color}55`,
                      background: `${cat.color}0D`,
                    }}
                  >
                    {cat.label}
                  </span>
                </div>
                <p className="font-body text-[15px] text-parchment-900 leading-relaxed m-0 mb-3">
                  {a.definition}
                </p>
                {a.example && (
                  <blockquote className="font-display italic text-[15px] text-parchment-700 leading-relaxed m-0 mb-3 pl-4 border-l-2 border-gold/40">
                    &ldquo;{a.example}&rdquo;
                  </blockquote>
                )}
                {a.context && (
                  <p className="font-body text-[13px] text-parchment-600 m-0">
                    <span className="font-semibold text-gold">Best for:</span> {a.context}
                  </p>
                )}
              </article>
            );
          })}
        </section>

        {/* Cross-link to the sibling "better words" page */}
        <p className="font-body text-sm text-parchment-600 mt-6 mb-0">
          Looking to upgrade your writing, not just swap a word?{" "}
          <Link href={`/words/${word}`} className="footer-link text-gold font-semibold">
            See better words for &ldquo;{word}&rdquo; →
          </Link>
        </p>

        {/* CTA */}
        <section className="bg-gradient-to-b from-gold/[0.05] to-gold/[0.1] border border-gold/20 rounded-2xl p-8 text-center mt-8 mb-12">
          <h2 className="font-display font-extrabold text-[24px] text-parchment-900 m-0 mb-2">
            Need synonyms for another word?
          </h2>
          <p className="font-body text-sm text-parchment-600 m-0 mb-5">
            Wordsmith finds curated synonyms for any word, free to try.
          </p>
          <Link
            href="/search"
            className="btn-primary inline-block bg-gold text-white no-underline rounded-xl px-8 py-3.5 font-body text-[15px] font-semibold tracking-[0.02em]"
          >
            Try Wordsmith Free
          </Link>
        </section>

        {/* Related */}
        <section aria-label="Related words">
          <h2 className="font-body text-[11px] font-semibold tracking-[0.22em] uppercase text-gold m-0 mb-4">
            Synonyms for more words
          </h2>
          <div className="flex flex-wrap gap-2">
            {related.map((w) => (
              <Link
                key={w}
                href={`/synonyms-for/${w}`}
                className="history-chip bg-parchment-200 border border-parchment-300 rounded-full px-4 py-1.5 font-body text-[13px] text-parchment-700 no-underline transition-colors duration-150"
              >
                {w}
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
