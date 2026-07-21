import { useCallback, useState } from "react";
import type { ScanResult } from "./slop/types";

interface UseAnalyze {
  result: ScanResult | null;
  setResult: (r: ScanResult | null) => void;
  loading: boolean;
  error: string | null;
  limit: "signup" | "paywall" | null;
  analyze: (text: string) => Promise<void>;
}

/** Owns the /api/analyze SSE request. Mirrors use-sse-search.ts. */
export function useAnalyze(): UseAnalyze {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState<"signup" | "paywall" | null>(null);

  const analyze = useCallback(async (text: string) => {
    setLoading(true);
    setError(null);
    setLimit(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (response.status === 403) {
        const data = await response.json();
        setLimit(data.error === "scan_limit_reached" ? "paywall" : "signup");
        setLoading(false);
        return;
      }
      if (response.status === 400 || response.status === 429) {
        const data = await response.json().catch(() => null);
        setError(
          data?.error === "too_long"
            ? `That draft is over the ${data.cap.toLocaleString()}-word limit for your plan.`
            : data?.message || data?.error || "Analysis failed. Please try again."
        );
        setLoading(false);
        return;
      }
      if (!response.ok || !response.body) throw new Error("Analysis failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop()!;
        for (const rawEvent of events) {
          let name = "", dataLine = "";
          for (const line of rawEvent.split("\n")) {
            if (line.startsWith("event: ")) name = line.slice(7).trim();
            if (line.startsWith("data: ")) dataLine = line.slice(6);
          }
          if (!dataLine) continue;
          try {
            const payload = JSON.parse(dataLine);
            if (name === "rules" || name === "result") {
              setResult(payload);
              setLoading(name === "rules"); // still waiting on the Claude pass
            }
            if (name === "error") {
              setError(payload.message || "Something went wrong.");
              setLoading(false);
            }
          } catch { /* malformed event — skip */ }
        }
      }
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }, []);

  return { result, setResult, loading, error, limit, analyze };
}
