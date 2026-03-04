import { useState, useRef, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import type { WordData, Collection } from "@/lib/types";

interface SaveToCollectionButtonProps {
  word: WordData;
  session: Session | null | undefined;
  isPaid: boolean;
  onAuthRequired: () => void;
  onUpgradeRequired: () => void;
}

export default function SaveToCollectionButton({
  word,
  session,
  isPaid,
  onAuthRequired,
  onUpgradeRequired,
}: SaveToCollectionButtonProps) {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [savedTo, setSavedTo] = useState<Set<string>>(new Set());
  // Track in-flight saves to prevent double-submit on rapid clicks
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Track if word is saved in any collection
  const isSaved = savedTo.size > 0;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Fetch collections when popover opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/collections?checkWord=${encodeURIComponent(word.word)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCollections(data);
          const alreadyIn = new Set<string>();
          data.forEach((c: Collection) => {
            if (c.containsWord) alreadyIn.add(c.id);
          });
          setSavedTo(alreadyIn);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, word.word]);

  // Focus input when visible
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, collections]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session) {
      onAuthRequired();
      return;
    }
    if (!isPaid) {
      onUpgradeRequired();
      return;
    }
    setOpen(!open);
  };

  const saveToCollection = async (collectionId: string) => {
    // Guard: already saved or save in flight
    if (savedTo.has(collectionId) || saving.has(collectionId)) return;

    setSaving((prev) => new Set(prev).add(collectionId));
    try {
      const res = await fetch("/api/collection-words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionId,
          word: word.word,
          pronunciation: word.pronunciation,
          definition: word.definition,
          example: word.example,
          context: word.context,
          category: word.category,
        }),
      });
      const data = await res.json();
      if (data.saved) {
        setSavedTo((prev) => new Set(prev).add(collectionId));
        setFeedback(data.alreadyExists ? "Already saved" : "Saved!");
        setTimeout(() => setFeedback(null), 1500);
      }
    } catch {
      setFeedback("Error saving");
      setTimeout(() => setFeedback(null), 1500);
    } finally {
      setSaving((prev) => {
        const next = new Set(prev);
        next.delete(collectionId);
        return next;
      });
    }
  };

  const createAndSave = async () => {
    if (!newName.trim() || creating) return;
    setCreating(true);

    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();

      if (res.status === 409) {
        setFeedback("Name taken");
        setTimeout(() => setFeedback(null), 1500);
        return;
      }

      if (data.id) {
        setCollections((prev) => [{ ...data, containsWord: false }, ...prev]);
        setNewName("");
        // Save the word to the new collection immediately
        await saveToCollection(data.id);
      }
    } catch {
      setFeedback("Error creating");
      setTimeout(() => setFeedback(null), 1500);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      ref={popoverRef}
      style={{ position: "relative", display: "inline-block" }}
    >
      {/* Bookmark icon */}
      <button
        onClick={handleClick}
        aria-label={
          !session
            ? "Sign up to save words"
            : !isPaid
            ? "Upgrade to save words"
            : isSaved
            ? "Saved — manage collections"
            : "Save to collection"
        }
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 0.15s ease",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={isSaved ? "#8B6914" : "none"}
          stroke={isSaved ? "#8B6914" : "#B8B2A8"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: "fill 0.2s ease, stroke 0.2s ease" }}
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {/* Popover */}
      {open && (
        <div
          role="dialog"
          aria-label="Save to collection"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: "6px",
            width: "220px",
            background: "#FFFFFF",
            border: "1px solid #E8E2D8",
            borderRadius: "10px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            zIndex: 100,
            animation: "popIn 0.15s ease both",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "10px 14px 8px",
              borderBottom: "1px solid #F0EBE1",
            }}
          >
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#8A8478",
              }}
            >
              Save to collection
            </span>
          </div>

          {/* Feedback */}
          {feedback && (
            <div
              style={{
                padding: "6px 14px",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "12px",
                color: feedback === "Error saving" || feedback === "Error creating" || feedback === "Name taken"
                  ? "#C0392B"
                  : "#1A7A6D",
                fontWeight: 500,
                background: feedback.includes("Error") || feedback === "Name taken"
                  ? "#FDF2F2"
                  : "#F0FAF7",
              }}
            >
              {feedback}
            </div>
          )}

          {/* Collection list */}
          <div
            style={{
              maxHeight: "180px",
              overflowY: "auto",
            }}
          >
            {loading ? (
              <div
                aria-live="polite"
                aria-busy="true"
                style={{
                  padding: "16px 14px",
                  textAlign: "center",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  color: "#B8B2A8",
                }}
              >
                Loading…
              </div>
            ) : collections.length === 0 ? (
              <div
                style={{
                  padding: "14px",
                  textAlign: "center",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  color: "#B8B2A8",
                }}
              >
                No collections yet
              </div>
            ) : (
              collections.map((collection) => {
                const isInCollection = savedTo.has(collection.id);
                const isSavingToCollection = saving.has(collection.id);
                return (
                  <button
                    key={collection.id}
                    onClick={() => saveToCollection(collection.id)}
                    disabled={isInCollection || isSavingToCollection}
                    aria-pressed={isInCollection}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      width: "100%",
                      padding: "8px 14px",
                      background: isInCollection ? "#FDFBF7" : "transparent",
                      border: "none",
                      cursor: isInCollection || isSavingToCollection ? "default" : "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "13px",
                      color: isInCollection ? "#B8B2A8" : "#4A4740",
                      textAlign: "left",
                      transition: "background 0.1s ease",
                    }}
                  >
                    {isInCollection ? (
                      <span style={{ color: "#1A7A6D", fontSize: "14px", flexShrink: 0 }}>
                        ✓
                      </span>
                    ) : (
                      <span
                        style={{
                          width: "14px",
                          height: "14px",
                          border: "1.5px solid #D8D2C8",
                          borderRadius: "3px",
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {collection.name}
                    </span>
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: "11px",
                        color: "#B8B2A8",
                        flexShrink: 0,
                      }}
                    >
                      {collection.word_count}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* New collection input */}
          <div
            style={{
              padding: "8px 10px",
              borderTop: "1px solid #F0EBE1",
              display: "flex",
              gap: "6px",
              alignItems: "center",
            }}
          >
            <input
              ref={inputRef}
              type="text"
              aria-label="New collection name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createAndSave()}
              placeholder="New collection…"
              onClick={(e) => e.stopPropagation()}
              style={{
                flex: 1,
                border: "1px solid #E8E2D8",
                borderRadius: "6px",
                padding: "6px 8px",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "12px",
                color: "#4A4740",
                background: "#FDFBF7",
              }}
            />
            <button
              onClick={createAndSave}
              disabled={!newName.trim() || creating}
              style={{
                background: newName.trim() ? "#8B6914" : "#E8E2D8",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "6px",
                width: "28px",
                height: "28px",
                fontSize: "16px",
                cursor: newName.trim() ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 0.15s ease",
              }}
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
