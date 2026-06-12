import { useState, useEffect, useCallback } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import Head from "next/head";
import Link from "next/link";
import AuthModal from "@/components/AuthModal";
import PaywallModal from "@/components/PaywallModal";
import Footer from "@/components/landing/Footer";
import type { Collection, CollectionWord, UserInfo } from "@/lib/types";
import { WORD_CATEGORIES } from "@/lib/constants";

export default function Collections() {
  const session = useSession();
  const supabase = useSupabaseClient();

  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [words, setWords] = useState<Record<string, CollectionWord[]>>({});
  const [wordsLoading, setWordsLoading] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Auth/paywall modals
  const [showAuth, setShowAuth] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  // User info
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  // Fetch user info
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

  // Fetch collections
  const fetchCollections = useCallback(async () => {
    if (!session || !userInfo?.isPaid) return;
    setLoading(true);
    try {
      const res = await fetch("/api/collections");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCollections(data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch collections:", err);
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
      const res = await fetch(
        `/api/collection-words?collectionId=${collectionId}`
      );
      if (res.ok) {
        const data = await res.json();
        setWords((prev) => ({ ...prev, [collectionId]: data }));
      }
    } catch (err) {
      console.error("Failed to fetch words:", err);
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

  const handleRename = async (id: string) => {
    if (!editName.trim()) {
      setEditingId(null);
      return;
    }
    try {
      const res = await fetch("/api/collections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: editName.trim() }),
      });
      if (res.ok) {
        setCollections((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, name: editName.trim() } : c
          )
        );
      } else {
        const data = await res.json();
        alert(data.error || "Failed to rename");
      }
    } catch {
      alert("Failed to rename collection");
    }
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/collections", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setCollections((prev) => prev.filter((c) => c.id !== id));
        if (expandedId === id) setExpandedId(null);
        const newWords = { ...words };
        delete newWords[id];
        setWords(newWords);
      }
    } catch {
      alert("Failed to delete collection");
    }
    setDeletingId(null);
  };

  const handleRemoveWord = async (wordId: string, collectionId: string) => {
    try {
      const res = await fetch("/api/collection-words", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: wordId }),
      });
      if (res.ok) {
        setWords((prev) => ({
          ...prev,
          [collectionId]: (prev[collectionId] || []).filter(
            (w) => w.id !== wordId
          ),
        }));
        // Update word count
        setCollections((prev) =>
          prev.map((c) =>
            c.id === collectionId
              ? { ...c, word_count: Math.max(0, c.word_count - 1) }
              : c
          )
        );
      }
    } catch {
      alert("Failed to remove word");
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
      <div style={{ minHeight: "100vh" }}>
      <Head>
        <meta name="robots" content="noindex" />
      </Head>
        <div
          style={{
            maxWidth: "720px",
            margin: "0 auto",
            padding: "120px 24px",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "32px",
              fontWeight: 700,
              color: "#1A1A18",
              marginBottom: "12px",
            }}
          >
            My Collections
          </h1>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "15px",
              color: "#8A8478",
              marginBottom: "28px",
            }}
          >
            Sign in to access your saved word collections.
          </p>
          <button
            onClick={() => setShowAuth(true)}
            style={{
              background: "#8B6914",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "8px",
              padding: "12px 28px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Sign in
          </button>
          <div style={{ marginTop: "20px" }}>
            <Link
              href="/"
              style={{
                color: "#8A8478",
                fontSize: "13px",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              &larr; Back to Wordsmith
            </Link>
          </div>
        </div>
        <AuthModal
          isOpen={showAuth}
          onClose={() => setShowAuth(false)}
          initialMode="signin"
        />
        <Footer />
      </div>
    );
  }

  // Paywall guard: if logged in but not paid
  if (userInfo && !userInfo.isPaid) {
    return (
      <div style={{ minHeight: "100vh" }}>
      <Head>
        <meta name="robots" content="noindex" />
      </Head>
        <div
          style={{
            maxWidth: "720px",
            margin: "0 auto",
            padding: "120px 24px",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "32px",
              fontWeight: 700,
              color: "#1A1A18",
              marginBottom: "12px",
            }}
          >
            Collections
          </h1>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "15px",
              color: "#8A8478",
              marginBottom: "28px",
            }}
          >
            Save and organize your favorite word discoveries with Wordsmith Pro.
          </p>
          <button
            onClick={() => setShowPaywall(true)}
            style={{
              background: "#8B6914",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "8px",
              padding: "12px 28px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Upgrade to Pro
          </button>
          <div style={{ marginTop: "20px" }}>
            <Link
              href="/"
              style={{
                color: "#8A8478",
                fontSize: "13px",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              &larr; Back to Wordsmith
            </Link>
          </div>
        </div>
        <PaywallModal
          isOpen={showPaywall}
          onClose={() => setShowPaywall(false)}
        />
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <Head>
        <meta name="robots" content="noindex" />
      </Head>
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
        <Link
          href="/"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "12px",
            color: "#8A8478",
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
          Search
        </Link>
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "12px",
            fontWeight: 600,
            color: "#8B6914",
          }}
        >
          Collections
        </span>
        <div style={{ flex: 1 }} />
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
      </nav>

      {/* Header */}
      <header
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          padding: "24px 24px 8px",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "clamp(28px, 5vw, 40px)",
            fontWeight: 900,
            color: "#1A1A18",
            margin: "0 0 8px 0",
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
          }}
        >
          My Collections
        </h1>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "14px",
            color: "#8A8478",
            margin: "0 0 32px 0",
          }}
        >
          Your saved words, organized by project or mood.
        </p>
      </header>

      {/* Collections */}
      <div
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          padding: "0 24px 60px",
        }}
      >
        {loading ? (
          <div
            aria-live="polite"
            aria-busy="true"
            style={{
              textAlign: "center",
              padding: "60px 20px",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "14px",
              color: "#B8B2A8",
            }}
          >
            Loading collections\u2026
          </div>
        ) : collections.length === 0 ? (
          /* Empty state */
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              animation: "fadeUp 0.5s ease both",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "#F0EBE1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
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
            <p
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "20px",
                color: "#8A8478",
                fontStyle: "italic",
                margin: "0 0 8px 0",
              }}
            >
              No collections yet
            </p>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                color: "#B8B2A8",
                margin: "0 0 24px 0",
              }}
            >
              Search for words and save your favorites to start building
              collections.
            </p>
            <Link
              href="/"
              style={{
                display: "inline-block",
                background: "#8B6914",
                color: "#FFFFFF",
                borderRadius: "8px",
                padding: "10px 24px",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Start searching
            </Link>
          </div>
        ) : (
          /* Collection cards */
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {collections.map((collection) => {
              const isExpanded = expandedId === collection.id;
              const isEditing = editingId === collection.id;
              const isDeleting = deletingId === collection.id;
              const collectionWords = words[collection.id] || [];

              return (
                <div
                  key={collection.id}
                  style={{
                    background: "#FFFFFF",
                    border: `1.5px solid ${isExpanded ? "#8B691440" : "#E8E2D8"}`,
                    borderRadius: "10px",
                    overflow: "hidden",
                    transition: "border-color 0.2s ease",
                    animation: "fadeUp 0.3s ease both",
                  }}
                >
                  {/* Collection header */}
                  <div
                    role={isEditing ? undefined : "button"}
                    tabIndex={isEditing ? undefined : 0}
                    aria-expanded={isEditing ? undefined : isExpanded}
                    aria-label={isEditing ? undefined : `${collection.name}, ${collection.word_count} words`}
                    onClick={() => !isEditing && handleExpand(collection.id)}
                    onKeyDown={(e) => !isEditing && (e.key === "Enter" || e.key === " ") && handleExpand(collection.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "16px 20px",
                      cursor: isEditing ? "default" : "pointer",
                    }}
                  >
                    {/* Expand arrow */}
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#B8B2A8",
                        transition: "transform 0.2s ease",
                        transform: isExpanded
                          ? "rotate(90deg)"
                          : "rotate(0deg)",
                        flexShrink: 0,
                      }}
                    >
                      &#9654;
                    </span>

                    {/* Name */}
                    {isEditing ? (
                      <input
                        autoFocus
                        aria-label={`Rename collection: ${collection.name}`}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            handleRename(collection.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        onBlur={() => handleRename(collection.id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          flex: 1,
                          fontFamily: "'Playfair Display', Georgia, serif",
                          fontSize: "18px",
                          fontWeight: 700,
                          color: "#1A1A18",
                          border: "1px solid #8B6914",
                          borderRadius: "6px",
                          padding: "4px 8px",
                          background: "#FDFBF7",
                        }}
                      />
                    ) : (
                      <h3
                        style={{
                          flex: 1,
                          fontFamily: "'Playfair Display', Georgia, serif",
                          fontSize: "18px",
                          fontWeight: 700,
                          color: "#1A1A18",
                          margin: 0,
                        }}
                      >
                        {collection.name}
                      </h3>
                    )}

                    {/* Word count */}
                    <span
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: "12px",
                        color: "#B8B2A8",
                        background: "#F0EBE1",
                        padding: "3px 10px",
                        borderRadius: "12px",
                        flexShrink: 0,
                      }}
                    >
                      {collection.word_count}{" "}
                      {collection.word_count === 1 ? "word" : "words"}
                    </span>

                    {/* Edit button */}
                    {!isEditing && (
                      <button
                        aria-label={`Rename ${collection.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(collection.id);
                          setEditName(collection.name);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "4px",
                          fontSize: "14px",
                          color: "#B8B2A8",
                          flexShrink: 0,
                        }}
                      >
                        <span aria-hidden="true">✏️</span>
                      </button>
                    )}

                    {/* Delete button */}
                    <button
                      aria-label={`Delete ${collection.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingId(
                          isDeleting ? null : collection.id
                        );
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px",
                        fontSize: "14px",
                        color: "#B8B2A8",
                        flexShrink: 0,
                      }}
                    >
                      <span aria-hidden="true">🗑️</span>
                    </button>
                  </div>

                  {/* Delete confirmation */}
                  {isDeleting && (
                    <div
                      style={{
                        padding: "10px 20px",
                        background: "#FDF2F2",
                        borderTop: "1px solid #F0EBE1",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: "13px",
                        animation: "fadeUp 0.15s ease both",
                      }}
                    >
                      <span style={{ color: "#C0392B", flex: 1 }}>
                        Delete &ldquo;{collection.name}&rdquo; and all its
                        words?
                      </span>
                      <button
                        onClick={() => handleDelete(collection.id)}
                        style={{
                          background: "#C0392B",
                          color: "#FFFFFF",
                          border: "none",
                          borderRadius: "6px",
                          padding: "5px 14px",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        style={{
                          background: "none",
                          border: "1px solid #E8E2D8",
                          borderRadius: "6px",
                          padding: "5px 14px",
                          fontSize: "12px",
                          color: "#8A8478",
                          cursor: "pointer",
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Expanded words */}
                  {isExpanded && (
                    <div
                      style={{
                        borderTop: "1px solid #F0EBE1",
                        animation: "fadeUp 0.2s ease both",
                      }}
                    >
                      {wordsLoading === collection.id ? (
                        <div
                          aria-live="polite"
                          aria-busy="true"
                          style={{
                            padding: "20px",
                            textAlign: "center",
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: "13px",
                            color: "#B8B2A8",
                          }}
                        >
                          Loading words\u2026
                        </div>
                      ) : collectionWords.length === 0 ? (
                        <div
                          style={{
                            padding: "20px",
                            textAlign: "center",
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: "13px",
                            color: "#B8B2A8",
                            fontStyle: "italic",
                          }}
                        >
                          No words saved yet.{" "}
                          <Link
                            href="/"
                            style={{ color: "#8B6914", textDecoration: "underline" }}
                          >
                            Find some
                          </Link>
                        </div>
                      ) : (
                        collectionWords.map((w) => {
                          const cat =
                            WORD_CATEGORIES[w.category] ||
                            WORD_CATEGORIES.elevated;
                          return (
                            <div
                              key={w.id}
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: "12px",
                                padding: "12px 20px",
                                borderBottom: "1px solid #F8F5EF",
                              }}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    marginBottom: "4px",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontFamily:
                                        "'Playfair Display', Georgia, serif",
                                      fontSize: "16px",
                                      fontWeight: 700,
                                      color: "#1A1A18",
                                    }}
                                  >
                                    {w.word}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      color: "#8A8478",
                                      fontStyle: "italic",
                                      fontFamily: "'DM Sans', sans-serif",
                                    }}
                                  >
                                    {w.pronunciation}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "9px",
                                      fontFamily: "'DM Sans', sans-serif",
                                      fontWeight: 600,
                                      letterSpacing: "0.06em",
                                      textTransform: "uppercase",
                                      color: cat.color,
                                      background: cat.color + "12",
                                      padding: "2px 6px",
                                      borderRadius: "3px",
                                    }}
                                  >
                                    {cat.label}
                                  </span>
                                </div>
                                <p
                                  style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: "13px",
                                    color: "#6A6460",
                                    margin: 0,
                                    lineHeight: 1.4,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                  }}
                                >
                                  {w.definition}
                                </p>
                              </div>
                              <button
                                aria-label={`Remove ${w.word}`}
                                onClick={() =>
                                  handleRemoveWord(w.id, collection.id)
                                }
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  padding: "4px",
                                  fontSize: "12px",
                                  color: "#C8C2B8",
                                  flexShrink: 0,
                                  marginTop: "2px",
                                  transition: "color 0.15s ease",
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
