import { useRef, useState } from "react";
import Link from "next/link";
import type { Collection, CollectionWord } from "@/lib/types";
import { WORD_CATEGORIES } from "@/lib/constants";

interface CollectionCardProps {
  collection: Collection;
  isExpanded: boolean;
  words: CollectionWord[];
  isLoadingWords: boolean;
  onToggle: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onRemoveWord: (wordId: string) => void;
}

function WordRow({ word, onRemove }: { word: CollectionWord; onRemove: () => void }) {
  const cat = WORD_CATEGORIES[word.category] || WORD_CATEGORIES.elevated;
  return (
    <div className="flex items-start gap-3 px-5 py-3 border-b border-parchment-100">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-display font-bold text-base text-parchment-900">
            {word.word}
          </span>
          <span className="font-body italic text-[11px] text-parchment-600">
            {word.pronunciation}
          </span>
          <span
            className="font-body text-[9px] font-semibold tracking-[0.06em] uppercase px-1.5 py-0.5 rounded-[3px]"
            style={{ color: cat.color, background: `${cat.color}12` }}
          >
            {cat.label}
          </span>
        </div>
        <p
          className="font-body text-[13px] text-parchment-700 leading-snug m-0 overflow-hidden"
          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
        >
          {word.definition}
        </p>
      </div>
      <button
        aria-label={`Remove ${word.word}`}
        onClick={onRemove}
        className="bg-transparent border-none cursor-pointer p-1 text-xs text-parchment-400 hover:text-category-punchy flex-shrink-0 mt-0.5 transition-colors duration-150"
      >
        ✕
      </button>
    </div>
  );
}

/** One collection: header row, inline rename, delete confirmation, word list. */
export default function CollectionCard({
  collection,
  isExpanded,
  words,
  isLoadingWords,
  onToggle,
  onRename,
  onDelete,
  onRemoveWord,
}: CollectionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(collection.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const cancelingRef = useRef(false);

  const submitRename = () => {
    if (cancelingRef.current) {
      cancelingRef.current = false;
      return;
    }
    setIsEditing(false);
    const name = editName.trim();
    if (name && name !== collection.name) onRename(name);
  };

  return (
    <div
      className={`bg-white border-[1.5px] rounded-[10px] overflow-hidden transition-colors duration-200 ${isExpanded ? "border-gold/25" : "border-parchment-300"}`}
      style={{ animation: "fadeUp 0.3s ease both" }}
    >
      {/* Header row */}
      <div
        role={isEditing ? undefined : "button"}
        tabIndex={isEditing ? undefined : 0}
        aria-expanded={isEditing ? undefined : isExpanded}
        aria-label={isEditing ? undefined : `${collection.name}, ${collection.word_count} words`}
        onClick={() => !isEditing && onToggle()}
        onKeyDown={(e) =>
          !isEditing && (e.key === "Enter" || e.key === " ") && onToggle()
        }
        className={`flex items-center gap-3 px-5 py-4 ${isEditing ? "cursor-default" : "cursor-pointer"}`}
      >
        <span
          aria-hidden="true"
          className={`text-xs text-parchment-500 flex-shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
        >
          &#9654;
        </span>

        {isEditing ? (
          <input
            autoFocus
            aria-label={`Rename collection: ${collection.name}`}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitRename();
              if (e.key === "Escape") {
                cancelingRef.current = true;
                setEditName(collection.name);
                setIsEditing(false);
              }
            }}
            onBlur={submitRename}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 font-display font-bold text-lg text-parchment-900 border border-gold rounded-md px-2 py-1 bg-parchment-50"
          />
        ) : (
          <h3 className="flex-1 min-w-0 truncate font-display font-bold text-lg text-parchment-900 m-0">
            {collection.name}
          </h3>
        )}

        <span className="font-body text-xs text-parchment-500 bg-parchment-200 px-2.5 py-[3px] rounded-xl flex-shrink-0">
          {collection.word_count} {collection.word_count === 1 ? "word" : "words"}
        </span>

        {!isEditing && (
          <button
            aria-label={`Rename ${collection.name}`}
            onClick={(e) => {
              e.stopPropagation();
              setEditName(collection.name);
              setIsEditing(true);
            }}
            className="bg-transparent border-none cursor-pointer p-1 text-sm text-parchment-500 flex-shrink-0"
          >
            <span aria-hidden="true">✏️</span>
          </button>
        )}

        <button
          aria-label={`Delete ${collection.name}`}
          onClick={(e) => {
            e.stopPropagation();
            setConfirmingDelete((prev) => !prev);
          }}
          className="bg-transparent border-none cursor-pointer p-1 text-sm text-parchment-500 flex-shrink-0"
        >
          <span aria-hidden="true">🗑️</span>
        </button>
      </div>

      {/* Delete confirmation */}
      {confirmingDelete && (
        <div
          className="flex items-center gap-2.5 px-5 py-2.5 bg-[#FDF2F2] border-t border-parchment-200 font-body text-[13px]"
          style={{ animation: "fadeUp 0.15s ease both" }}
        >
          <span className="flex-1 text-category-punchy">
            Delete &ldquo;{collection.name}&rdquo; and all its words?
          </span>
          <button
            onClick={() => {
              setConfirmingDelete(false);
              onDelete();
            }}
            className="bg-category-punchy text-white border-none rounded-md px-3.5 py-[5px] text-xs font-semibold cursor-pointer font-body"
          >
            Delete
          </button>
          <button
            onClick={() => setConfirmingDelete(false)}
            className="bg-transparent border border-parchment-300 rounded-md px-3.5 py-[5px] text-xs text-parchment-600 cursor-pointer font-body"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Expanded word list */}
      {isExpanded && (
        <div className="border-t border-parchment-200" style={{ animation: "fadeUp 0.2s ease both" }}>
          {isLoadingWords ? (
            <div
              aria-live="polite"
              aria-busy="true"
              className="p-5 text-center font-body text-[13px] text-parchment-500"
            >
              Loading words…
            </div>
          ) : words.length === 0 ? (
            <div className="p-5 text-center font-body italic text-[13px] text-parchment-500">
              No words saved yet.{" "}
              <Link href="/" className="text-gold underline">
                Find some
              </Link>
            </div>
          ) : (
            words.map((w) => (
              <WordRow key={w.id} word={w} onRemove={() => onRemoveWord(w.id)} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
