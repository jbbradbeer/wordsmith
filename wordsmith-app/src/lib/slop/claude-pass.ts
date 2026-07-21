import Anthropic from "@anthropic-ai/sdk";
import type { SlopCategory, SlopSpan } from "./types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const JUDGMENT_CATEGORIES = new Set<SlopCategory>(["generic-voice", "cliche", "hedging"]);

function buildPrompt(text: string): string {
  return `You are a writing editor hunting AI-slop tells in a human draft. Find up to 12 spans that read as generic, machine-generated, or clichéd. Do NOT rewrite anything.

Categories (use exactly these): "generic-voice" (says nothing specific), "cliche" (tired figurative framing), "hedging" (empty qualification).

Return ONLY a JSON array. Each item: {"quote": "<exact substring copied verbatim from the text>", "category": "...", "why": "<one blunt sentence naming the tell>", "hint": "<one sentence telling the writer what to reach for instead — never a rewrite>"}

The quote MUST be an exact character-for-character substring. Prefer short spans (3-12 words). If the text is clean, return [].

TEXT:
${text}`;
}

/** Pure parser — exported for tests. Invalid items are dropped, never thrown. */
export function parseClaudeSpans(raw: string, text: string): SlopSpan[] {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let items: unknown;
  try {
    items = JSON.parse(cleaned);
  } catch {
    return [];
  }
  if (!Array.isArray(items)) return [];
  const spans: SlopSpan[] = [];
  for (const it of items) {
    if (typeof it !== "object" || it === null) continue;
    const { quote, category, why, hint } = it as Record<string, unknown>;
    if (typeof quote !== "string" || typeof why !== "string" || typeof hint !== "string") continue;
    if (typeof category !== "string" || !JUDGMENT_CATEGORIES.has(category as SlopCategory)) continue;
    const start = text.indexOf(quote);
    if (start === -1 || quote.length < 3) continue;
    spans.push({
      start,
      end: start + quote.length,
      text: quote,
      category: category as SlopCategory,
      why,
      hint,
      source: "claude",
    });
  }
  return spans.sort((a, b) => a.start - b.start);
}

/** One judgment call per scan. Throws on API failure — the caller degrades to rules-only. */
export async function runClaudePass(text: string): Promise<SlopSpan[]> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    messages: [{ role: "user", content: buildPrompt(text) }],
  });
  const raw = response.content[0]?.type === "text" ? response.content[0].text : "";
  return parseClaudeSpans(raw, text);
}
