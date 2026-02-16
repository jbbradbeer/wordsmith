import { useState, useRef, useEffect, useCallback } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import AuthModal from "@/components/AuthModal";
import PaywallModal from "@/components/PaywallModal";
import WordCard from "@/components/WordCard";
import UsageBar from "@/components/UsageBar";
import { FREE_SEARCH_LIMIT } from "@/lib/constants";

const CATEGORY_LEGEND = [
  { key: "elevated", label: "Elevated", color: "#8B6914" },
  { key: "literary", label: "Literary", color: "#6B4C8A" },
  { key: "punchy", label: "Punchy", color: "#C0392B" },
  { key: "rare", label: "Rare Gem", color: "#1A7A6D" },
];

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
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  // Auth & paywall state
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [showPaywall, setShowPaywall] = useState(false);

  // User state
  const [userInfo, setUserInfo] = useState<any>(null);

  const inputRef = useRef<HTMLInputElement>(null);

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

    // If not logged in, prompt auth
    if (!session) {
      setAuthMode("signup");
      setShowAuth(true);
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchTerm }),
      });

      const data = await res.json();

      if (res.status === 403 && data.error === "free_limit_reached") {
        setShowPaywall(true);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Search failed");
      }

      setResults(data);
      setHistory((prev) => {
        const updated = [searchTerm, ...prev.filter((w) => w !== searchTerm)];
        return updated.slice(0, 12);
      });

      // Update local user info with new count
      if (data.usage) {
        setUserInfo((prev: any) =>
          prev
            ? {
                ...prev,
                searchCount: data.usage.searchCount,
                isPaid: data.usage.isPaid,
                searchesRemaining: data.usage.isPaid
                  ? null
                  : Math.max(0, FREE_SEARCH_LIMIT - data.usage.searchCount),
              }
            : prev
        );
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
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

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Nav bar */}
      <nav
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: "12px",
        }}
      >
        {session ? (
          <>
            <UsageBar
              searchCount={userInfo?.searchCount || 0}
              isPaid={userInfo?.isPaid || false}
              onUpgrade={() => setShowPaywall(true)}
            />
            <div style={{ flex: 1 }} />
            {userInfo?.isPaid && (
              <button
                onClick={handleManageSubscription}
                style={{
                  background: "none",
                  border: "none",
                  color: "#B8B2A8",
                  fontSize: "12px",
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Manage
              </button>
            )}
            <span
              style={{
                fontSize: "12px",
                color: "#8A8478",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {session.user.email}
            </span>
            <button
              onClick={handleSignOut}
              style={{
                background: "none",
                border: "1px solid #E8E2D8",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "12px",
                color: "#8A8478",
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
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
              style={{
                background: "none",
                border: "none",
                color: "#8A8478",
                fontSize: "13px",
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500,
              }}
            >
              Sign in
            </button>
            <button
              onClick={() => {
                setAuthMode("signup");
                setShowAuth(true);
              }}
              style={{
                background: "#8B6914",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Get started free
            </button>
          </>
        )}
      </nav>

      {/* Header */}
      <header
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          padding: "24px 24px 8px",
          textAlign: "center",
          animation: "heroIn 0.6s ease both",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            marginBottom: "6px",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "2px",
              background: "linear-gradient(90deg, transparent, #8B6914)",
            }}
          />
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#8B6914",
            }}
          >
            A Writer&apos;s Companion
          </span>
          <div
            style={{
              width: "32px",
              height: "2px",
              background: "linear-gradient(90deg, #8B6914, transparent)",
            }}
          />
        </div>
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "clamp(36px, 6vw, 52px)",
            fontWeight: 900,
            color: "#1A1A18",
            margin: "0 0 8px 0",
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
          }}
        >
          Wordsmith
        </h1>
        <p
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "16px",
            color: "#8A8478",
            fontStyle: "italic",
            margin: "0 0 32px 0",
          }}
        >
          Trade the ordinary for the extraordinary
        </p>
      </header>

      {/* Search */}
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "0 24px" }}>
        <div
          style={{
            display: "flex",
            gap: "10px",
            background: "#FFFFFF",
            borderRadius: "12px",
            padding: "6px 6px 6px 20px",
            boxShadow:
              "0 2px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
            alignItems: "center",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Enter a word you'd like to upgrade…"
            style={{
              flex: 1,
              border: "none",
              background: "none",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "16px",
              color: "#1A1A18",
              padding: "10px 0",
              outline: "none",
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={loading || !query.trim()}
            style={{
              background: loading ? "#B8B2A8" : "#8B6914",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "8px",
              padding: "12px 24px",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "14px",
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
              transition: "background 0.2s ease",
              letterSpacing: "0.02em",
              whiteSpace: "nowrap",
            }}
          >
            {loading ? "Searching…" : "Find Words"}
          </button>
        </div>

        {/* History chips */}
        {history.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              marginTop: "14px",
              animation: "fadeUp 0.3s ease both",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                color: "#B8B2A8",
                fontWeight: 500,
                padding: "4px 2px",
                letterSpacing: "0.04em",
              }}
            >
              Recent:
            </span>
            {history.map((w) => (
              <button
                key={w}
                onClick={() => {
                  setQuery(w);
                  searchWord(w);
                }}
                style={{
                  background: "#F0EBE1",
                  border: "1px solid #E0DAD0",
                  borderRadius: "6px",
                  padding: "4px 10px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  color: "#6A6460",
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                }}
              >
                {w}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      <div
        style={{ maxWidth: "720px", margin: "0 auto", padding: "24px 24px 60px" }}
      >
        {/* Loading */}
        {loading && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "60px 20px",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", gap: "6px" }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#8B6914",
                    animation: "pulse 1.2s ease infinite",
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
            <p
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "16px",
                color: "#8A8478",
                fontStyle: "italic",
              }}
            >
              Hunting for the perfect words…
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              color: "#C0392B",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        {/* Results grid */}
        {results && !loading && (
          <div style={{ animation: "fadeUp 0.4s ease both" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "20px",
                paddingBottom: "14px",
                borderBottom: "1px solid #E0DAD0",
              }}
            >
              <p style={{ margin: 0, fontSize: "14px", color: "#8A8478" }}>
                Alternatives for{" "}
                <span
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontWeight: 700,
                    color: "#1A1A18",
                    fontSize: "18px",
                  }}
                >
                  {results.original}
                </span>
              </p>
            </div>

            {/* Category legend */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              {CATEGORY_LEGEND.map((cat) => (
                <div
                  key={cat.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "2px",
                      background: cat.color,
                    }}
                  />
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#8A8478",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {cat.label}
                  </span>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "14px",
              }}
            >
              {results.alternatives?.map((word: any, i: number) => (
                <WordCard key={word.word + i} word={word} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!results && !loading && !error && (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              animation: "fadeUp 0.5s ease both",
              animationDelay: "0.3s",
            }}
          >
            <p
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "20px",
                color: "#B8B2A8",
                fontStyle: "italic",
                margin: "0 0 16px 0",
              }}
            >
              The difference between the right word
              <br />
              and the almost right word…
            </p>
            <p
              style={{
                fontSize: "13px",
                color: "#C8C2B8",
                margin: "0 0 28px 0",
              }}
            >
              — is the difference between lightning and a lightning bug.
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {STARTER_WORDS.map((w) => (
                <button
                  key={w}
                  onClick={() => {
                    setQuery(w);
                    searchWord(w);
                  }}
                  style={{
                    background: "transparent",
                    border: "1.5px dashed #D8D2C8",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "13px",
                    color: "#8A8478",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  try &ldquo;{w}&rdquo;
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

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
