import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { SITE_URL } from "@/lib/seo";
import { bandFor } from "@/lib/slop/types";
import type { NextPageWithLayout } from "@/pages/_app";
import { withShell } from "@/components/nav/ShellLayout";

function SharedScore() {
  const router = useRouter();
  const score = Math.max(0, Math.min(100, parseInt(String(router.query.v || "0"), 10) || 0));
  const band = bandFor(score);
  const og = `${SITE_URL}/api/og-score?v=${score}&b=${band}`;
  const colors = { clean: "#1A7A6D", murky: "#D4A017", slop: "#C0392B" } as const;
  return (
    <div className="min-h-screen">
      <Head>
        <title>{`Slop Score: ${score} | Wordsmith`}</title>
        <meta name="robots" content="noindex" />
        <meta property="og:title" content={`My writing scored ${score} (${band}) on Wordsmith`} />
        <meta property="og:image" content={og} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={og} />
      </Head>
      <div className="max-w-[560px] mx-auto px-6 pt-20 pb-16 text-center">
        <div className="font-body text-[12px] font-semibold tracking-[0.22em] uppercase text-parchment-500 mb-2">Slop Score</div>
        <div className="font-display font-black leading-none mb-2" style={{ fontSize: 140, color: colors[band] }}>{score}</div>
        <div className="font-body font-bold text-lg uppercase tracking-widest mb-10" style={{ color: colors[band] }}>{band}</div>
        <Link href="/" className="btn-primary inline-block bg-gold text-white no-underline rounded-xl px-8 py-3.5 font-body text-[15px] font-semibold">
          Score your own writing
        </Link>
      </div>
    </div>
  );
}

(SharedScore as NextPageWithLayout).getLayout = withShell("lean");
export default SharedScore;
