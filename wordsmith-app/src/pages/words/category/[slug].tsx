import type { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { WORD_HUBS, getHub, type WordHub } from "@/lib/word-hubs";
import { byVolume } from "@/lib/synonym-volumes";
import { SITE_URL, jsonLdSerialize } from "@/lib/seo";
import type { NextPageWithLayout } from "@/pages/_app";
import { withShell } from "@/components/nav/ShellLayout";

interface HubPageProps {
  hub: WordHub;
  /** Hub words ordered by search demand (most-wanted first). */
  words: string[];
  otherHubs: { slug: string; title: string }[];
}

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: WORD_HUBS.map((h) => ({ params: { slug: h.slug } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<HubPageProps> = async ({ params }) => {
  const hub = getHub(String(params?.slug || ""));
  if (!hub) return { notFound: true };

  return {
    props: {
      hub,
      words: byVolume(hub.words),
      otherHubs: WORD_HUBS.filter((h) => h.slug !== hub.slug).map(({ slug, title }) => ({
        slug,
        title,
      })),
    },
  };
};

function HubPage({ hub, words, otherHubs }: HubPageProps) {
  const canonical = `${SITE_URL}/words/category/${hub.slug}`;
  const title = `${hub.title}: Synonyms for ${words.length} Common Words | Wordsmith`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ItemList",
        name: hub.title,
        url: canonical,
        itemListElement: words.map((w, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: w,
          url: `${SITE_URL}/synonyms-for/${w}`,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Wordsmith", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Word Library", item: `${SITE_URL}/words` },
          { "@type": "ListItem", position: 3, name: hub.title, item: canonical },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen">
      <Head>
        <title>{title}</title>
        <meta name="description" content={hub.description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={hub.description} />
        <meta property="og:url" content={canonical} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdSerialize(jsonLd) }}
        />
      </Head>

      <nav aria-label="Breadcrumb" className="max-w-[840px] mx-auto px-6 pt-6">
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
            {hub.title}
          </li>
        </ol>
      </nav>

      <div className="max-w-[840px] mx-auto px-6 pt-10 pb-16">
        <header className="mb-10">
          <span className="font-body text-[11px] font-semibold tracking-[0.22em] uppercase text-gold block mb-3">
            Word Library
          </span>
          <h1
            className="font-display font-black text-parchment-900 m-0 mb-4 tracking-[-0.03em]"
            style={{ fontSize: "clamp(36px, 6vw, 56px)" }}
          >
            {hub.title}
          </h1>
          <p className="font-body text-[15px] leading-relaxed text-parchment-600 m-0 max-w-[560px]">
            {hub.description}
          </p>
        </header>

        <section aria-label={`Words for ${hub.noun}`} className="mb-12">
          <div className="flex flex-wrap gap-2">
            {words.map((w) => (
              <Link
                key={w}
                href={`/synonyms-for/${w}`}
                className="history-chip bg-white border border-parchment-300 rounded-full px-4 py-1.5 font-body text-[14px] text-parchment-700 no-underline transition-colors duration-150"
              >
                {w}
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-b from-gold/[0.05] to-gold/[0.1] border border-gold/20 rounded-2xl p-8 text-center mb-12">
          <h2 className="font-display font-extrabold text-[24px] text-parchment-900 m-0 mb-2">
            Need {hub.noun} on demand?
          </h2>
          <p className="font-body text-sm text-parchment-600 m-0 mb-5">
            Wordsmith finds six curated alternatives for any word, free to try.
          </p>
          <Link
            href="/search"
            className="btn-primary inline-block bg-gold text-white no-underline rounded-xl px-8 py-3.5 font-body text-[15px] font-semibold tracking-[0.02em]"
          >
            Try Wordsmith Free
          </Link>
        </section>

        <section aria-label="More categories">
          <h2 className="font-body text-[11px] font-semibold tracking-[0.22em] uppercase text-gold m-0 mb-4">
            More categories
          </h2>
          <div className="flex flex-wrap gap-2">
            {otherHubs.map((h) => (
              <Link
                key={h.slug}
                href={`/words/category/${h.slug}`}
                className="history-chip bg-parchment-200 border border-parchment-300 rounded-full px-4 py-1.5 font-body text-[13px] text-parchment-700 no-underline transition-colors duration-150"
              >
                {h.title}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

(HubPage as NextPageWithLayout).getLayout = withShell("lean");
export default HubPage;
