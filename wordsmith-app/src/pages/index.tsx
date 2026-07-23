// src/pages/index.tsx — the de-slop analyzer landing (core surface)
import { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSession } from "@supabase/auth-helpers-react";
import { SITE_URL, jsonLdSerialize } from "@/lib/seo";
import { useAnalyze } from "@/lib/use-analyze";
import { useScans } from "@/lib/use-scans";
import CompanionHome from "@/components/home/CompanionHome";
import { runRules } from "@/lib/slop/rules";
import { computeScan } from "@/lib/slop/score";
import { trackEvent } from "@/lib/analytics";
import ScoreReveal from "@/components/slop/ScoreReveal";
import SpanCard from "@/components/slop/SpanCard";
import HighlightedText from "@/components/slop/HighlightedText";
import AuthModal from "@/components/AuthModal";
import PaywallModal from "@/components/PaywallModal";
import Footer from "@/components/landing/Footer";
import SlopExamples from "@/components/home/SlopExamples";
import HowItWorks from "@/components/home/HowItWorks";
import WhatItCatches from "@/components/home/WhatItCatches";
import HomePricing from "@/components/home/HomePricing";
import ClosingCta from "@/components/home/ClosingCta";

const TITLE = "Wordsmith: The AI Writing Companion That Keeps You Human";
const DESCRIPTION =
  "The AI writing companion that keeps you sounding like you, not like AI. It reads your draft, flags the tells, and never writes a word for you.";

export default function Analyzer() {
  const session = useSession();
  const { pro, stats, recent } = useScans();
  const { result, setResult, error, loading, limit, analyze } = useAnalyze();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(true);
  const [activeSpan, setActiveSpan] = useState<number | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [showPaywall, setShowPaywall] = useState(false);
  const analyzedText = useRef("");
  const analyzerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 403 from the API → the right modal
  useEffect(() => {
    if (limit === "signup") {
      setAuthMode("signup");
      setShowAuth(true);
    }
    if (limit === "paywall") setShowPaywall(true);
    if (limit) trackEvent("limit_hit", { kind: "scan" });
  }, [limit]);

  useEffect(() => {
    if (showPaywall) trackEvent("paywall_view");
  }, [showPaywall]);

  // Stripe redirects to "/" after checkout; verify the session so the user is
  // Pro the moment they land, before the webhook necessarily arrives.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") === "true") {
      const sessionId = params.get("session_id");
      window.history.replaceState({}, "", "/");
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
    // Clear the stale scan synchronously so we never render new text against
    // the previous result's spans while the SSE response is in flight.
    setResult(null);
    await analyze(draft);
  };

  // Live rules-only re-score while editing after a scan (free, client-side).
  // Invariant: result always describes analyzedText.current.
  const liveResult = useMemo(() => {
    if (!result) return result;
    if (!editing) return result;
    return computeScan(runRules(draft), [], true);
  }, [draft, editing, result]);

  useEffect(() => {
    if (result && !loading && !result.degraded) {
      trackEvent("scan_completed", { band: result.band });
    }
  }, [result, loading]);

  const shown = liveResult ?? result;

  const focusAnalyzer = () => {
    setEditing(true);
    analyzerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => textareaRef.current?.focus(), 400);
  };

  const goPro = () => {
    if (session) setShowPaywall(true);
    else {
      setAuthMode("signup");
      setShowAuth(true);
    }
  };

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

      <div className="grain fixed inset-0 z-[60] pointer-events-none" aria-hidden="true" />

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:bg-white focus:text-parchment-900 focus:px-4 focus:py-2 focus:rounded-lg focus:border focus:border-gold"
      >
        Skip to content
      </a>

      <nav
        aria-label="Site navigation"
        className="sticky top-0 z-40 h-[64px] px-6 flex justify-between items-center border-b border-gold/[.09] bg-[#f2ede2]/80 backdrop-blur-md"
      >
        <Link href="/" className="font-display font-black text-lg text-parchment-900 no-underline">
          Wordsmith
        </Link>
        <div className="flex gap-5 items-center font-body text-sm">
          <Link href="/search" className="footer-link text-parchment-700 no-underline hidden sm:inline">
            Word Search
          </Link>
          <Link href="/words" className="footer-link text-parchment-700 no-underline hidden sm:inline">
            Word Library
          </Link>
          {session ? (
            <Link href="/search" className="footer-link text-parchment-800 font-semibold no-underline">
              Account
            </Link>
          ) : (
            <button
              onClick={() => {
                setAuthMode("signin");
                setShowAuth(true);
              }}
              className="footer-link text-parchment-800 font-semibold bg-transparent border-none cursor-pointer font-body text-sm"
            >
              Sign in
            </button>
          )}
        </div>
      </nav>

      <main id="main-content">
      {session && pro && stats && <CompanionHome recent={recent} stats={stats} />}
      {session && !pro && (
        <div className="max-w-[1000px] mx-auto px-6 pt-8">
          <button
            onClick={() => setShowPaywall(true)}
            className="w-full text-left bg-parchment-100/70 border border-gold/25 rounded-2xl px-5 py-4 font-body text-[14px] text-parchment-700 cursor-pointer transition-colors hover:bg-parchment-100"
          >
            <span className="font-semibold text-parchment-900">Wordsmith Pro tracks your Slop Score over time.</span>{" "}
            See your drafts get cleaner, scan after scan. Upgrade to unlock your progress.
          </button>
        </div>
      )}

      {/* Hero + live analyzer */}
      <header ref={analyzerRef} className="max-w-[1000px] mx-auto px-6 pt-16 md:pt-20 pb-4">
        <div className="text-center mb-10">
          <h1
            className="font-display font-black text-parchment-900 tracking-[-0.03em] m-0 mb-4"
            style={{ fontSize: "clamp(40px, 7vw, 72px)", lineHeight: 1.02 }}
          >
            Sound like you.
            <br />
            Not like a <span className="italic text-gold">bot</span>.
          </h1>
          <p className="font-body text-[17px] leading-relaxed text-parchment-600 max-w-[540px] mx-auto m-0">
            Your AI writing companion. It reads every draft, flags the slop, and
            explains each tell. You rewrite in your own voice. It never writes a
            word for you.
          </p>
        </div>

        <div
          className={`grid gap-5 ${
            shown && !editing ? "md:grid-cols-[minmax(0,1fr)_300px]" : ""
          }`}
        >
          <section className="min-w-0">
            <p className="sr-only" role="status" aria-live="polite">
              {loading
                ? "Analyzing your draft."
                : error
                ? error
                : shown && !editing
                ? `Slop Score ${shown.score}, ${shown.band}.`
                : ""}
            </p>
            {editing || !shown ? (
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                aria-label="Your draft"
                placeholder="Paste your draft here. At least 100 characters, and try something that sounds a little too polished…"
                className="w-full min-h-[300px] bg-white border border-parchment-300 rounded-3xl p-6 font-body text-[15px] leading-relaxed text-parchment-900 resize-y shadow-[0_4px_28px_rgba(26,26,24,0.05)]"
              />
            ) : (
              <div className="bg-white border border-parchment-300 rounded-3xl p-6 shadow-[0_4px_28px_rgba(26,26,24,0.05)]">
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

            <div className="flex flex-wrap gap-3 mt-4 items-center">
              <button
                onClick={handleAnalyze}
                disabled={loading || draft.trim().length < 100}
                className={`btn-primary px-8 py-3.5 rounded-xl border-none font-body text-[15px] font-semibold text-white transition-colors ${
                  loading || draft.trim().length < 100
                    ? "bg-parchment-500 cursor-not-allowed"
                    : "bg-gold cursor-pointer"
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
              {editing && draft.trim().length > 0 && draft.trim().length < 100 && (
                <span className="font-body text-[13px] text-parchment-500">
                  {100 - draft.trim().length} more characters to scan
                </span>
              )}
              {error && (
                <span className="font-body text-sm text-category-punchy">{error}</span>
              )}
            </div>

            {activeSpan !== null && shown?.spans[activeSpan] && (
              <div className="mt-4">
                <SpanCard span={shown.spans[activeSpan]} onClose={() => setActiveSpan(null)} />
              </div>
            )}
          </section>

          {shown && !editing && (
            <aside className="flex flex-col gap-3">
              <ScoreReveal result={shown} />
              <p className="font-body text-[12px] text-parchment-500 text-center m-0">
                Analyzed in-flight. Your draft is never stored.
              </p>
            </aside>
          )}
        </div>
      </header>

      <SlopExamples />
      <HowItWorks />
      <WhatItCatches />
      <HomePricing onStartFree={focusAnalyzer} onGoPro={goPro} />
      <ClosingCta onStartFree={focusAnalyzer} />
      </main>

      <Footer />
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} initialMode={authMode} />
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} />
    </div>
  );
}
