import { useState, useEffect, useCallback, ReactNode } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import Head from "next/head";
import Link from "next/link";
import AuthModal from "@/components/AuthModal";
import PaywallModal from "@/components/PaywallModal";
import CollectionCard from "@/components/collections/CollectionCard";
import Footer from "@/components/landing/Footer";
import { useUserInfo } from "@/lib/use-user-info";
import type { Collection, CollectionWord } from "@/lib/types";

/** Shared shell for the signed-out / unpaid guard screens. */
function GuardScreen({
  title,
  message,
  buttonLabel,
  onButton,
  children,
}: {
  title: string;
  message: string;
  buttonLabel: string;
  onButton: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Head>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="max-w-[720px] mx-auto px-6 py-[120px] text-center">
        <h1 className="font-display font-bold text-[32px] text-parchment-900 mb-3">
          {title}
        </h1>
        <p className="font-body text-[15px] text-parchment-600 mb-7">{message}</p>
        <button
          onClick={onButton}
          className="btn-primary bg-gold text-white border-none rounded-lg px-7 py-3 text-sm font-semibold cursor-pointer font-body"
        >
          {buttonLabel}
        </button>
        <div className="mt-5">
          <Link href="/" className="font-body text-[13px] text-parchment-600">
            &larr; Back to Wordsmith
          </Link>
        </div>
      </div>
      {children}
      <Footer />
    </div>
  );
}

export default function Collections() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const { userInfo, setUserInfo } = useUserInfo();

  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [words, setWords] = useState<Record<string, CollectionWord[]>>({});
  const [wordsLoading, setWordsLoading] = useState<string | null>(null);

  // Surfaced when a rename/delete/remove fails — replaces the old alert() calls
  const [actionError, setActionError] = useState<string | null>(null);

  // Auth/paywall modals
  const [showAuth, setShowAuth] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  // Auto-dismiss the action error toast
  useEffect(() => {
    if (!actionError) return;
    const timer = setTimeout(() => setActionError(null), 6000);
    return () => clearTimeout(timer);
  }, [actionError]);

  // Fetch collections
  const fetchCollections = useCallback(async () => {
    if (!session || !userInfo?.isPaid) return;
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/collections");
      if (!res.ok) throw new Error("Failed to fetch collections");
      const data = await res.json();
      if (Array.isArray(data)) {
        setCollections(data);
      }
    } catch (err) {
      console.error("Failed to fetch collections:", err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [session, userInfo?.isPaid]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  // Fetch words for a collection
  const fetchWords = async (collectionId: string) => {
    if (words[collectionId] || wordsLoading === collectionId) return; // Already loaded or fetch in flight
    setWordsLoading(collectionId);
    try {
      const res = await fetch(`/api/collection-words?collectionId=${collectionId}`);
      if (!res.ok) throw new Error("Failed to fetch words");
      const data = await res.json();
      setWords((prev) => ({ ...prev, [collectionId]: data }));
    } catch (err) {
      console.error("Failed to fetch words:", err);
      setActionError("Couldn't load the words in that collection. Please try again.");
    } finally {
      setWordsLoading(null);
    }
  };

  const handleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      fetchWords(id);
    }
  };

  const handleRename = async (id: string, name: string) => {
    try {
      const res = await fetch("/api/collections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name }),
      });
      if (res.ok) {
        setCollections((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
      } else {
        const data = await res.json().catch(() => null);
        setActionError(data?.error || "Couldn't rename the collection.");
      }
    } catch {
      setActionError("Couldn't rename the collection. Please try again.");
    }
  };

  const handleDelete = async (id: string) => {
    const name = collections.find((c) => c.id === id)?.name ?? "this collection";
    if (!window.confirm(`Delete the collection "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch("/api/collections", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Delete failed");
      setCollections((prev) => prev.filter((c) => c.id !== id));
      if (expandedId === id) setExpandedId(null);
      setWords((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch {
      setActionError("Couldn't delete the collection. Please try again.");
    }
  };

  const handleRemoveWord = async (wordId: string, collectionId: string) => {
    try {
      const res = await fetch("/api/collection-words", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: wordId }),
      });
      if (!res.ok) throw new Error("Remove failed");
      setWords((prev) => ({
        ...prev,
        [collectionId]: (prev[collectionId] || []).filter((w) => w.id !== wordId),
      }));
      setCollections((prev) =>
        prev.map((c) =>
          c.id === collectionId
            ? { ...c, word_count: Math.max(0, c.word_count - 1) }
            : c
        )
      );
    } catch {
      setActionError("Couldn't remove that word. Please try again.");
    }
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
      setActionError("Couldn't open the billing portal. Please try again.");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserInfo(null);
    setCollections([]);
    setWords({});
  };

  // Auth guard: if not logged in, show auth prompt
  if (!session) {
    return (
      <GuardScreen
        title="My Collections"
        message="Sign in to access your saved word collections."
        buttonLabel="Sign in"
        onButton={() => setShowAuth(true)}
      >
        <AuthModal
          isOpen={showAuth}
          onClose={() => setShowAuth(false)}
          initialMode="signin"
        />
      </GuardScreen>
    );
  }

  // Paywall guard: if logged in but not paid
  if (userInfo && !userInfo.isPaid) {
    return (
      <GuardScreen
        title="Collections"
        message="Save and organize your favorite word discoveries with Wordsmith Pro."
        buttonLabel="Upgrade to Pro"
        onButton={() => setShowPaywall(true)}
      >
        <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} />
      </GuardScreen>
    );
  }

  return (
    <div className="min-h-screen">
      <Head>
        <meta name="robots" content="noindex" />
      </Head>

      {/* Nav bar */}
      <nav className="max-w-[800px] mx-auto px-6 py-4 flex items-center gap-3">
        <Link href="/" className="font-body text-xs text-parchment-600 no-underline">
          Search
        </Link>
        <span className="font-body text-xs font-semibold text-gold">Collections</span>
        <div className="flex-1" />
        <button
          onClick={handleManageSubscription}
          className="btn-ghost bg-transparent border-none text-parchment-500 text-xs cursor-pointer font-body"
        >
          Manage
        </button>
        <span className="font-body text-xs text-parchment-600">{session.user.email}</span>
        <button
          onClick={handleSignOut}
          className="bg-transparent border border-parchment-300 rounded-md px-3 py-1.5 text-xs text-parchment-600 cursor-pointer font-body"
        >
          Sign out
        </button>
      </nav>

      {/* Header */}
      <header className="max-w-[720px] mx-auto px-6 pt-6 pb-2 text-center">
        <h1
          className="font-display font-black text-parchment-900 m-0 mb-2 tracking-[-0.03em] leading-[1.1]"
          style={{ fontSize: "clamp(28px, 5vw, 40px)" }}
        >
          My Collections
        </h1>
        <p className="font-body text-sm text-parchment-600 m-0 mb-8">
          Your saved words, organized by project or mood.
        </p>
      </header>

      {/* Collections */}
      <div className="max-w-[720px] mx-auto px-6 pb-[60px]">
        {loading ? (
          <div
            aria-live="polite"
            aria-busy="true"
            className="text-center px-5 py-[60px] font-body text-sm text-parchment-500"
          >
            Loading collections…
          </div>
        ) : loadError ? (
          <div role="alert" className="text-center px-5 py-[60px]">
            <p className="font-body text-sm text-category-punchy m-0 mb-4">
              Couldn&apos;t load your collections.
            </p>
            <button
              onClick={fetchCollections}
              className="btn-primary bg-gold text-white border-none rounded-lg px-6 py-2.5 text-sm font-semibold cursor-pointer font-body"
            >
              Try again
            </button>
          </div>
        ) : collections.length === 0 ? (
          /* Empty state */
          <div className="text-center px-5 py-[60px]" style={{ animation: "fadeUp 0.5s ease both" }}>
            <div className="w-16 h-16 rounded-full bg-parchment-200 flex items-center justify-center mx-auto mb-5">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#B8B2A8"
                strokeWidth="1.5"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="font-display italic text-xl text-parchment-600 m-0 mb-2">
              No collections yet
            </p>
            <p className="font-body text-sm text-parchment-500 m-0 mb-6">
              Search for words and save your favorites to start building collections.
            </p>
            <Link
              href="/"
              className="btn-primary inline-block bg-gold text-white rounded-lg px-6 py-2.5 text-sm font-semibold no-underline font-body"
            >
              Start searching
            </Link>
          </div>
        ) : (
          /* Collection cards */
          <div className="flex flex-col gap-3">
            {collections.map((collection) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                isExpanded={expandedId === collection.id}
                words={words[collection.id] || []}
                isLoadingWords={wordsLoading === collection.id}
                onToggle={() => handleExpand(collection.id)}
                onRename={(name) => handleRename(collection.id, name)}
                onDelete={() => handleDelete(collection.id)}
                onRemoveWord={(wordId) => handleRemoveWord(wordId, collection.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Action error toast */}
      {actionError && (
        <div
          role="alert"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-parchment-900 text-parchment-100 font-body text-sm rounded-full pl-5 pr-2 py-2 shadow-xl"
          style={{ animation: "fadeUp 0.25s ease both" }}
        >
          {actionError}
          <button
            onClick={() => setActionError(null)}
            aria-label="Dismiss"
            className="bg-transparent border-none text-parchment-400 hover:text-white cursor-pointer text-sm p-1.5"
          >
            ✕
          </button>
        </div>
      )}

      <Footer />
    </div>
  );
}
