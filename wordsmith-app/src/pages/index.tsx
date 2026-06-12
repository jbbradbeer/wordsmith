import { useState, useRef, useEffect, useCallback } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import Head from "next/head";
import Link from "next/link";
import AuthModal from "@/components/AuthModal";
import PaywallModal from "@/components/PaywallModal";
import WordCard from "@/components/WordCard";
import UsageBar from "@/components/UsageBar";
import { FREE_SEARCH_LIMIT, WORD_CATEGORIES, ANON_COUNT_KEY } from "@/lib/constants";
import type { WordData, SearchResults, UserInfo } from "@/lib/types";

// Landing page components
import Hero from "@/components/landing/Hero";
import SocialProofBar from "@/components/landing/SocialProofBar";
import WordMarquee from "@/components/landing/WordMarquee";
import HowItWorks from "@/components/landing/HowItWorks";
import FeaturesSection from "@/components/landing/FeaturesSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import PricingSection from "@/components/landing/PricingSection";
import CtaSection from "@/components/landing/CtaSection";
import Footer from "@/components/landing/Footer";
import WordRain from "@/components/WordRain";
import { useKonami } from "@/lib/use-konami";
import { SITE_URL } from "@/lib/seo";
import { SUBSCRIPTION_PRICE_MONTHLY } from "@/lib/constants";

const LANDING_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Wordsmith",
  url: SITE_URL,
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  description:
    "AI-powered word discovery for writers — six curated alternatives for any word, categorized by style with definitions, pronunciation, and examples.",
  offers: [
    { "@type": "Offer", price: "0", priceCurrency: "USD", name: "Free" },
    {
      "@type": "Offer",
      price: String(SUBSCRIPTION_PRICE_MONTHLY),
      priceCurrency: "USD",
      name: "Pro (monthly)",
    },
  ],
};

// Derive the category legend from the single source of truth
const CATEGORY_LEGEND = Object.entries(WORD_CATEGORIES).map(([key, v]) => ({
  key,
  label: v.label,
  color: v.color,
}));

const STARTER_WORDS = [
  "good",
  "walk",
  "said",
  "happy",
  "angry",
  "think",
  "beautiful",
  "fast",
];

export default function Home() {
  const session = useSession();
  const supabase = useSupabaseClient();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  // Auth & paywall state
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [showPaywall, setShowPaywall] = useState(false);

  // User state
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  // Anonymous search tracking
  const [anonSearchCount, setAnonSearchCount] = useState(0);

  // Easter egg — Konami code or the footer fleuron summons the secret lexicon
  const [logophileMode, setLogophileMode] = useState(false);
  useKonami(() => setLogophileMode(true));

  const inputRef = useRef<HTMLInputElement>(null);

  // Hydrate anonymous search count from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(ANON_COUNT_KEY);
      if (stored) {
        setAnonSearchCount(parseInt(stored, 10) || 0);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  // Fetch user info on session change
  const fetchUserInfo = useCallback(async () => {
    if (!session) {
      setUserInfo(null);
      return;
    }
    try {
      const res = await fetch("/api/user");
      if (res.ok) {
        const data = await res.json();
        setUserInfo(data);
      }
    } catch (err) {
      console.error("Failed to fetch user info:", err);
    }
  }, [session]);

  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  // Transfer anonymous search count (from server cookie) to profile on login
  useEffect(() => {
    if (!session) return;

    fetch("/api/user", { method: "POST" })
      .then(() => {
        // Clear local display state now that it's been merged into the profile
        try { localStorage.removeItem(ANON_COUNT_KEY); } catch { /* unavailable */ }
        setAnonSearchCount(0);
        fetchUserInfo();
      })
      .catch((err) => console.error("Failed to transfer anon count:", err));
  }, [session, fetchUserInfo]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Check for upgrade success in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") === "true") {
      // Refresh user info to get updated subscription
      fetchUserInfo();
      window.history.replaceState({}, "", "/");
    }
  }, [fetchUserInfo]);

  const searchWord = async (word: string) => {
    if (!word.trim()) return;
    const searchTerm = word.trim().toLowerCase();

    // If not logged in, check anonymous limit before making any request
    if (!session) {
      if (anonSearchCount >= FREE_SEARCH_LIMIT) {
        setAuthMode("signup");
        setShowAuth(true);
        return;
      }
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchTerm }),
      });

      // 403s are returned as plain JSON (before SSE headers are set on the server)
      if (response.status === 403) {
        const data = await response.json();
        if (data.error === "free_limit_reached") {
          setShowPaywall(true);
          setLoading(false);
          return;
        }
        if (data.error === "signup_required") {
          setAuthMode("signup");
          setShowAuth(true);
          setLoading(false);
          return;
        }
      }

      if (!response.ok || !response.body) {
        throw new Error("Search failed");
      }

      // Initialise results so the header and legend render immediately
      setResults({ original: searchTerm, alternatives: [] });

      // Consume the SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const rawEvents = sseBuffer.split("\n\n");
        sseBuffer = rawEvents.pop()!; // keep incomplete trailing event

        for (const rawEvent of rawEvents) {
          if (!rawEvent.trim()) continue;

          let eventName = "";
          let dataLine = "";
          for (const line of rawEvent.split("\n")) {
            if (line.startsWith("event: ")) eventName = line.slice(7).trim();
            if (line.startsWith("data: ")) dataLine = line.slice(6);
          }
          if (!dataLine) continue;

          try {
            const payload = JSON.parse(dataLine);

            if (eventName === "word") {
              // Hide spinner and show results grid on first word
              setLoading(false);
              setResults((prev: any) => ({
                ...prev,
                alternatives: [...(prev?.alternatives ?? []), payload],
              }));
            }

            if (eventName === "done") {
              setHistory((prev) => {
                const updated = [
                  searchTerm,
                  ...prev.filter((w) => w !== searchTerm),
                ];
                return updated.slice(0, 12);
              });
              if (
                payload.isAnonymous &&
                typeof payload.anonSearchCount === "number"
              ) {
                setAnonSearchCount(payload.anonSearchCount);
                try {
                  localStorage.setItem(
                    ANON_COUNT_KEY,
                    String(payload.anonSearchCount)
                  );
                } catch {
                  // localStorage unavailable
                }
              }
              if (payload.usage) {
                setUserInfo((prev: any) =>
                  prev
                    ? {
                        ...prev,
                        searchCount: payload.usage.searchCount,
                        isPaid: payload.usage.isPaid,
                        searchesRemaining: payload.usage.isPaid
                          ? null
                          : Math.max(
                              0,
                              FREE_SEARCH_LIMIT - payload.usage.searchCount
                            ),
                      }
                    : prev
                );
              }
            }

            if (eventName === "error") {
              setError(
                payload.message || "Something went wrong. Please try again."
              );
              setLoading(false);
            }
          } catch {
            // Malformed SSE event — skip
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    searchWord(query);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserInfo(null);
    setResults(null);
    setHistory([]);
  };

  const handleManageSubscription = async () => {
    try {
      const res = await fetch("/api/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Portal error:", err);
    }
  };

  const handleGetStarted = () => {
    setAuthMode("signup");
    setShowAuth(true);
  };

  const handleUpgrade = () => {
    if (!session) {
      setAuthMode("signup");
      setShowAuth(true);
    } else {
      setShowPaywall(true);
    }
  };

  // Show landing sections when there are no results displayed
  const showLandingSections = !results && !loading && !error;

  return (
    <div className="min-h-screen">
      <Head>
        <link rel="canonical" href={`${SITE_URL}/`} />
        <meta property="og:url" content={`${SITE_URL}/`} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(LANDING_JSON_LD) }}
        />
      </Head>

      {/* Nav bar */}
      <nav
        aria-label="Site navigation"
        className="sticky top-0 z-40 px-6 py-4 flex justify-end items-center gap-3 border-b border-gold/[.09] bg-[#f2ede2]/75 backdrop-blur-md"
      >
        {session ? (
          <>
            <UsageBar
              searchCount={userInfo?.searchCount || 0}
              isPaid={userInfo?.isPaid || false}
              onUpgrade={() => setShowPaywall(true)}
            />
            <div className="flex-1" />
            {userInfo?.isPaid && (
              <Link
                href="/collections"
                className="font-body text-xs font-semibold text-gold no-underline cursor-pointer"
              >
                Collections
              </Link>
            )}
            {userInfo?.isPaid && (
              <button
                onClick={handleManageSubscription}
                className="btn-ghost bg-transparent border-none text-parchment-500 text-xs cursor-pointer font-body transition-colors duration-200"
              >
                Manage
              </button>
            )}
            <span className="font-body text-xs text-parchment-600">
              {session.user.email}
            </span>
            <button
              onClick={handleSignOut}
              className="bg-transparent border border-parchment-300 rounded px-3 py-1.5 text-xs text-parchment-600 cursor-pointer font-body transition-all duration-200"
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                setAuthMode("signin");
                setShowAuth(true);
              }}
              className="btn-ghost bg-transparent border-none text-parchment-600 text-[13px] cursor-pointer font-body font-medium transition-colors duration-200"
            >
              Sign in
            </button>
            <button
              onClick={() => {
                setAuthMode("signup");
                setShowAuth(true);
              }}
              className="btn-primary bg-gold text-white border-none rounded-lg px-4 py-2 text-[13px] font-semibold cursor-pointer font-body transition-colors duration-200"
            >
              Get started free
            </button>
          </>
        )}
      </nav>

      {/* Kinetic hero */}
      <Hero />

      {/* Social Proof Bar */}
      <SocialProofBar />

      {/* Search */}
      <div className="max-w-[720px] mx-auto px-6">
        <div
          className="search-box flex gap-2.5 bg-white rounded-2xl pl-[22px] pr-2 py-2 items-center"
          style={{ boxShadow: "0 4px 28px rgba(26,26,24,0.09), 0 1px 4px rgba(26,26,24,0.06)" }}
        >
          <label htmlFor="word-search" className="sr-only">
            Enter a word to find alternatives
          </label>
          <input
            id="word-search"
            ref={inputRef}
            type="search"
            name="q"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Enter a word you'd like to upgrade…"
            className="flex-1 border-none bg-transparent font-body text-base text-parchment-900 py-2.5 outline-none"
          />
          <button
            onClick={handleSubmit}
            disabled={loading || !query.trim()}
            className={`btn-primary ${loading ? "bg-parchment-500 cursor-wait" : "bg-gold cursor-pointer"} text-white border-none rounded-[10px] px-7 py-3 font-body text-[15px] font-semibold transition-colors duration-200 tracking-[0.02em] whitespace-nowrap`}
          >
            {loading ? "Searching…" : "Find Words"}
          </button>
        </div>

        {/* Anonymous usage indicator */}
        {!session && anonSearchCount > 0 && (
          <div className="text-center mt-2.5 font-body text-xs text-parchment-500">
            {anonSearchCount >= FREE_SEARCH_LIMIT ? (
              <span>
                You&apos;ve used all {FREE_SEARCH_LIMIT} free searches.{" "}
                <button
                  onClick={handleGetStarted}
                  className="bg-transparent border-none text-gold font-semibold cursor-pointer underline p-0 font-body text-xs"
                >
                  Sign up
                </button>{" "}
                for more.
              </span>
            ) : (
              <span>
                {FREE_SEARCH_LIMIT - anonSearchCount} free{" "}
                {FREE_SEARCH_LIMIT - anonSearchCount === 1 ? "search" : "searches"}{" "}
                remaining.{" "}
                <button
                  onClick={handleGetStarted}
                  className="bg-transparent border-none text-gold font-semibold cursor-pointer underline p-0 font-body text-xs"
                >
                  Sign up
                </button>{" "}
                for unlimited access.
              </span>
            )}
          </div>
        )}

        {/* History chips */}
        {history.length > 0 && (
          <div
            className="flex flex-wrap gap-1.5 mt-3.5"
            style={{ animation: "fadeUp 0.3s ease both" }}
          >
            <span className="text-[11px] text-parchment-500 font-medium px-0.5 py-1 tracking-[0.04em]">
              Recent:
            </span>
            {history.map((w) => (
              <button
                key={w}
                onClick={() => {
                  setQuery(w);
                  searchWord(w);
                }}
                className="history-chip bg-parchment-200 border border-[#E0DAD0] rounded-full px-3 py-[5px] font-body text-xs text-parchment-700 cursor-pointer transition-colors duration-150"
              >
                {w}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Screen-reader live region for search status and anonymous count */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {loading
          ? "Searching for word alternatives…"
          : error
          ? error
          : results
          ? `Found ${results.alternatives?.length ?? 0} alternatives for ${results.original}${!session && anonSearchCount > 0 ? `. ${Math.max(0, FREE_SEARCH_LIMIT - anonSearchCount)} free searches remaining.` : ""}`
          : ""}
      </div>

      {/* Results */}
      <div className="max-w-[720px] mx-auto px-6 pt-6 pb-[60px]">
        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center px-5 py-[60px] gap-4">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-gold"
                  style={{
                    animation: "pulse 1.2s ease infinite",
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
            <p className="font-display text-[17px] text-parchment-600 italic">
              Hunting for the perfect words…
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="text-center px-5 py-[40px] text-category-punchy font-body text-sm"
          >
            {error}
          </div>
        )}

        {/* Results grid */}
        {results && !loading && (
          <div style={{ animation: "fadeUp 0.4s ease both" }}>
            <div className="flex items-center gap-3 mb-5 pb-3.5 border-b border-[#E0DAD0]">
              <p className="m-0 text-[15px] text-parchment-600">
                Alternatives for{" "}
                <span className="font-display font-bold text-parchment-900 text-xl">
                  {results.original}
                </span>
              </p>
            </div>

            {/* Category legend */}
            <div className="flex flex-wrap gap-3 mb-5">
              {CATEGORY_LEGEND.map((cat) => (
                <div key={cat.key} className="flex items-center gap-[5px]">
                  <div
                    className="w-2 h-2 rounded-[2px]"
                    style={{ background: cat.color }}
                  />
                  <span className="text-[11px] text-parchment-600 tracking-[0.02em]">
                    {cat.label}
                  </span>
                </div>
              ))}
            </div>

            <div
              className="grid gap-3.5"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}
            >
              {results.alternatives?.map((word: WordData, i: number) => (
                <WordCard
                  key={word.word + i}
                  word={word}
                  index={i}
                  session={session}
                  isPaid={userInfo?.isPaid || false}
                  onAuthRequired={() => {
                    setAuthMode("signup");
                    setShowAuth(true);
                  }}
                  onUpgradeRequired={() => setShowPaywall(true)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!results && !loading && !error && (
          <div
            className="text-center px-5 py-[60px]"
            style={{ animation: "fadeUp 0.5s ease both", animationDelay: "0.3s" }}
          >
            <p className="font-display text-[22px] text-parchment-500 italic m-0 mb-4">
              The difference between the right word
              <br />
              and the almost right word…
            </p>
            <p className="text-[13px] text-[#A8A298] m-0 mb-7">
              — is the difference between lightning and a lightning bug.
            </p>

            <div className="flex flex-wrap justify-center gap-2">
              {STARTER_WORDS.map((w) => (
                <button
                  key={w}
                  onClick={() => {
                    setQuery(w);
                    searchWord(w);
                  }}
                  className="starter-word bg-transparent border-[1.5px] border-dashed border-parchment-400 rounded-full px-[18px] py-2 font-body text-[13px] text-parchment-600 cursor-pointer transition-all duration-200"
                >
                  try &ldquo;{w}&rdquo;
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Landing Page Sections — shown when no results are displayed */}
      {showLandingSections && (
        <>
          <WordMarquee />
          <HowItWorks />
          <FeaturesSection />
          <TestimonialsSection />
          <PricingSection
            onGetStarted={handleGetStarted}
            onUpgrade={handleUpgrade}
          />
          <CtaSection onGetStarted={handleGetStarted} />
        </>
      )}

      {/* Footer — always visible */}
      <Footer onSecret={() => setLogophileMode(true)} />

      {/* Logophile mode — the secret lexicon */}
      {logophileMode && <WordRain onDone={() => setLogophileMode(false)} />}

      {/* Modals */}
      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        initialMode={authMode}
      />
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
      />
    </div>
  );
}
