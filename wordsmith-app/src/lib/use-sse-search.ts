import { useCallback, useState } from "react";
import type { SearchResults, WordData } from "./types";

export interface SearchDonePayload {
  isAnonymous?: boolean;
  anonSearchCount?: number;
  usage?: { searchCount: number; isPaid: boolean };
}

interface UseSseSearchOptions {
  /** Server rejected the search: free limit hit (paywall) or anon limit hit (signup). */
  onLimitReached: (kind: "paywall" | "signup") => void;
  /** Stream completed — payload carries usage/anon counters. */
  onDone: (term: string, payload: SearchDonePayload) => void;
}

/** Owns the /api/search SSE request: streaming results, loading, and errors. */
export function useSseSearch({ onLimitReached, onDone }: UseSseSearchOptions) {
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(
    async (term: string) => {
      setLoading(true);
      setError(null);
      setResults(null);

      try {
        const response = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: term }),
        });

        // Limit responses come back as plain JSON before SSE headers are set
        if (response.status === 403) {
          const data = await response.json();
          if (data.error === "free_limit_reached" || data.error === "signup_required") {
            onLimitReached(data.error === "free_limit_reached" ? "paywall" : "signup");
            setLoading(false);
            return;
          }
        }

        if (response.status === 429) {
          const data = await response.json().catch(() => null);
          setError(data?.message || "Too many searches. Please wait a moment and try again.");
          setLoading(false);
          return;
        }

        if (!response.ok || !response.body) {
          throw new Error("Search failed");
        }

        // Initialise results so the header and legend render immediately
        setResults({ original: term, alternatives: [] });

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
                // Hide spinner and show the grid on first word
                setLoading(false);
                setResults((prev) => ({
                  original: prev?.original ?? term,
                  alternatives: [...(prev?.alternatives ?? []), payload as WordData],
                }));
              }

              if (eventName === "done") {
                onDone(term, payload as SearchDonePayload);
              }

              if (eventName === "error") {
                setError(payload.message || "Something went wrong. Please try again.");
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
    },
    [onLimitReached, onDone]
  );

  return { results, setResults, loading, error, search };
}
