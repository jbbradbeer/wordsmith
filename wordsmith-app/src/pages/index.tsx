// src/pages/index.tsx — the de-slop analyzer (new core surface)
import { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSession } from "@supabase/auth-helpers-react";
import { SITE_URL, jsonLdSerialize } from "@/lib/seo";
import { useAnalyze } from "@/lib/use-analyze";
import { runRules } from "@/lib/slop/rules";
import { computeScan } from "@/lib/slop/score";
import { trackEvent } from "@/lib/analytics";
import ScoreBadge from "@/components/slop/ScoreBadge";
import SpanCard from "@/components/slop/SpanCard";
import HighlightedText from "@/components/slop/HighlightedText";
import AuthModal from "@/components/AuthModal";
import PaywallModal from "@/components/PaywallModal";
import Footer from "@/components/landing/Footer";

const TITLE = "Wordsmith — De-slop your writing. Get your Slop Score.";
const DESCRIPTION =
  "Paste your draft. Wordsmith flags AI-slop tells — stock phrases, hedging, flat rhythm — explains each one, and helps you rewrite in your own voice. It never writes for you.";

export default function Analyzer() {
  const session = useSession();
  const { result, error, loading, limit, analyze } = useAnalyze();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(true);
  const [activeSpan, setActiveSpan] = useState<number | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const analyzedText = useRef("");

  // 403 from the API → the right modal
  useEffect(() => {
    if (limit === "signup") setShowAuth(true);
    if (limit === "paywall") setShowPaywall(true);
    if (limit) trackEvent("limit_hit", { kind: "scan" });
  }, [limit]);

  // Funnel: fire once each time the paywall becomes visible
  useEffect(() => {
    if (showPaywall) trackEvent("paywall_view");
  }, [showPaywall]);

  // Check for upgrade success in URL (Stripe redirects to "/" — moved here from search.tsx)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") === "true") {
      const sessionId = params.get("session_id");
      window.history.replaceState({}, "", "/");

      // The redirect can beat Stripe's webhook — verify the session directly
      // so the user is Pro the moment they land back
      if (sessionId) {
        fetch("/api/checkout-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data?.activated) trackEvent("upgrade_complete");
          })
          .catch((err) => console.error("Checkout verification failed:", err));
      }
    }
  }, []);

  const handleAnalyze = async () => {
    trackEvent("scan_started", { auth: session ? "authed" : "anon" });
    analyzedText.current = draft;
    setEditing(false);
    setActiveSpan(null);
    await analyze(draft);
  };

  // Live rules-only re-score while the user edits after a scan (free, client-side)
  const liveResult = useMemo(() => {
    if (!result || editing === false || draft === analyzedText.current) return result;
    return computeScan(runRules(draft), [], true);
  }, [draft, editing, result]);

  useEffect(() => {
    if (result && !loading && !result.degraded) {
      trackEvent("scan_completed", { band: result.band });
    }
  }, [result, loading]);

  const shown = liveResult ?? result;

  return (
    <div className="min-h-screen">
      <Head>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href={`${SITE_URL}/`} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={`${SITE_URL}/`} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdSerialize({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Wordsmith",
              url: SITE_URL,
              description: DESCRIPTION,
              applicationCategory: "Productivity",
            }),
          }}
        />
      </Head>

      <nav
        aria-label="Site navigation"
        className="sticky top-0 z-40 px-6 py-4 flex justify-between items-center border-b border-gold/[.09] bg-[#f2ede2]/75 backdrop-blur-md"
      >
        <span className="font-display font-black text-parchment-900">Wordsmith</span>
        <div className="flex gap-4 items-center">
          <Link href="/search" className="font-body text-sm text-parchment-700 no-underline">
            Word Search
          </Link>
          <Link href="/words" className="font-body text-sm text-parchment-700 no-underline">
            Word Library
          </Link>
        </div>
      </nav>

      <main className="max-w-[980px] mx-auto px-6 pt-14 pb-16">
        <header className="text-center mb-10">
          <h1
            className="font-display font-black text-parchment-900 m-0 mb-4 tracking-[-0.03em]"
            style={{ fontSize: "clamp(38px, 6vw, 64px)" }}
          >
            Sound like you. Not like a bot.
          </h1>
          <p className="font-body text-[16px] text-parchment-600 max-w-[560px] mx-auto m-0">
            Paste your draft. Wordsmith flags the slop — stock phrases, hedging, flat
            rhythm — explains every tell, and you rewrite it in your own voice.
            It never writes a word for you.
          </p>
        </header>

        <div className="grid gap-6" style={{ gridTemplateColumns: shown ? "1fr 260px" : "1fr" }}>
          <section>
            {editing || !shown ? (
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Paste your draft here (at least 100 characters)…"
                className="w-full min-h-[320px] bg-white border border-parchment-300 rounded-2xl p-6 font-body text-[15px] leading-relaxed text-parchment-900 resize-y"
              />
            ) : (
              <div className="bg-white border border-parchment-300 rounded-2xl p-6">
                <HighlightedText
                  text={analyzedText.current}
                  spans={shown.spans}
                  activeIndex={activeSpan}
                  onSpanClick={(i) => {
                    setActiveSpan(i);
                    trackEvent("span_clicked");
                  }}
                />
              </div>
            )}

            <div className="flex gap-3 mt-4 items-center">
              <button
                onClick={handleAnalyze}
                disabled={loading || draft.trim().length < 100}
                className={`btn-primary px-8 py-3 rounded-xl border-none font-body text-[15px] font-semibold text-white ${
                  loading ? "bg-parchment-500 cursor-wait" : "bg-gold cursor-pointer"
                }`}
              >
                {loading ? "Analyzing…" : shown ? "Re-analyze" : "Get my Slop Score"}
              </button>
              {shown && !editing && (
                <button
                  onClick={() => {
                    setEditing(true);
                    setActiveSpan(null);
                  }}
                  className="bg-transparent border border-parchment-300 rounded-xl px-5 py-3 font-body text-[14px] text-parchment-700 cursor-pointer"
                >
                  Edit draft
                </button>
              )}
              {error && <span className="font-body text-sm text-category-punchy">{error}</span>}
            </div>

            {activeSpan !== null && shown?.spans[activeSpan] && (
              <div className="mt-4">
                <SpanCard span={shown.spans[activeSpan]} onClose={() => setActiveSpan(null)} />
              </div>
            )}
          </section>

          {shown && (
            <aside className="flex flex-col gap-4 items-center">
              <ScoreBadge result={shown} />
              <p className="font-body text-[12px] text-parchment-500 text-center m-0">
                Your draft is analyzed in-flight and never stored.
              </p>
            </aside>
          )}
        </div>
      </main>

      <Footer />
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} initialMode="signup" />
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} />
    </div>
  );
}
