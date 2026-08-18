import type { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { GUIDES, getGuide, isGuidePublished, GUIDE_TODO_MARKER, type Guide } from "@/lib/guides";
import { SITE_URL, jsonLdSerialize } from "@/lib/seo";
import type { NextPageWithLayout } from "@/pages/_app";
import { withShell } from "@/components/nav/ShellLayout";

interface GuidePageProps {
  guide: Guide;
  published: boolean;
}

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: GUIDES.map((g) => ({ params: { slug: g.slug } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<GuidePageProps> = async ({ params }) => {
  const guide = getGuide(String(params?.slug || ""));
  if (!guide) return { notFound: true };
  return { props: { guide, published: isGuidePublished(guide) } };
};

/** Renders placeholder briefs distinctly so a half-finished page is obvious. */
function SectionBody({ body }: { body: string }) {
  if (body.includes(GUIDE_TODO_MARKER)) {
    return (
      <p className="font-body text-[14px] leading-relaxed text-parchment-500 italic border-l-2 border-parchment-300 pl-4 m-0">
        Draft brief: {body.replace(`${GUIDE_TODO_MARKER}:`, "").trim()}
      </p>
    );
  }
  return (
    <p className="font-body text-[15px] leading-relaxed text-parchment-800 m-0">{body}</p>
  );
}

function GuidePage({ guide, published }: GuidePageProps) {
  const canonical = `${SITE_URL}/guides/${guide.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: guide.h1,
        description: guide.metaDescription,
        url: canonical,
        author: { "@type": "Organization", name: "Wordsmith" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Wordsmith", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE_URL}/guides` },
          { "@type": "ListItem", position: 3, name: guide.h1, item: canonical },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen">
      <Head>
        <title>{guide.title}</title>
        <meta name="description" content={guide.metaDescription} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={guide.title} />
        <meta property="og:description" content={guide.metaDescription} />
        <meta property="og:url" content={canonical} />
        {/* Unwritten guides stay out of the index until James replaces the briefs */}
        {!published && <meta name="robots" content="noindex,follow" />}
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
          <li aria-current="page" className="text-gold font-semibold">
            Guides
          </li>
        </ol>
      </nav>

      <article className="max-w-[720px] mx-auto px-6 pt-10 pb-16">
        <header className="mb-10">
          <span className="font-body text-[11px] font-semibold tracking-[0.22em] uppercase text-gold block mb-3">
            Writing Guide
          </span>
          <h1
            className="font-display font-black text-parchment-900 m-0 mb-4 tracking-[-0.03em] leading-none"
            style={{ fontSize: "clamp(36px, 6vw, 56px)" }}
          >
            {guide.h1}
          </h1>
          <SectionBody body={guide.intro} />
        </header>

        {guide.sections.map((s) => (
          <section key={s.heading} className="mb-8">
            <h2 className="font-display font-bold text-[24px] text-parchment-900 m-0 mb-3">
              {s.heading}
            </h2>
            <SectionBody body={s.body} />
          </section>
        ))}

        {/* CTA — product-intent pages route to the Slop Score scanner */}
        <section className="bg-gradient-to-b from-gold/[0.05] to-gold/[0.1] border border-gold/20 rounded-2xl p-8 text-center mt-12">
          <h2 className="font-display font-extrabold text-[24px] text-parchment-900 m-0 mb-2">
            Does your draft sound like AI?
          </h2>
          <p className="font-body text-sm text-parchment-600 m-0 mb-5">
            Paste it into Slop Score and find out in seconds — free.
          </p>
          <Link
            href="/score"
            className="btn-primary inline-block bg-gold text-white no-underline rounded-xl px-8 py-3.5 font-body text-[15px] font-semibold tracking-[0.02em]"
          >
            Scan my writing
          </Link>
        </section>
      </article>
    </div>
  );
}

(GuidePage as NextPageWithLayout).getLayout = withShell("lean");
export default GuidePage;
