import Anthropic from "@anthropic-ai/sdk";
import { getServiceSupabase } from "./supabase";
import { buildWordPrompt } from "./word-prompt";
import { createRequestLogger } from "./logger";
import type { WordData } from "./types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function parseNdjson(text: string): WordData[] {
  const words: WordData[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const word = JSON.parse(trimmed) as WordData;
      if (word.word && word.definition) words.push(word);
    } catch {
      // partial or non-JSON line — skip
    }
  }
  return words;
}

/**
 * Content for a /words/[word] page. Reads the word_pages cache first;
 * on a miss, generates once with Claude and persists, so each seed word
 * costs a single API call ever. Returns null if generation fails.
 */
/**
 * Read-only batch lookup of cached word pages. Never generates content —
 * words without a cached row are simply absent from the result. Safe to call
 * at build time (category hubs) without spending Claude calls.
 */
export async function getCachedWordPages(
  words: string[]
): Promise<Record<string, WordData[]>> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("word_pages")
    .select("word, alternatives")
    .in("word", words);

  const pages: Record<string, WordData[]> = {};
  for (const row of data ?? []) {
    if (row.alternatives) pages[row.word] = row.alternatives as WordData[];
  }
  return pages;
}

export async function getWordPageData(word: string): Promise<WordData[] | null> {
  const log = createRequestLogger("word-pages");
  const supabase = getServiceSupabase();

  const { data } = await supabase
    .from("word_pages")
    .select("alternatives")
    .eq("word", word)
    .maybeSingle();

  if (data?.alternatives) return data.alternatives as WordData[];

  let words: WordData[];
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      messages: [{ role: "user", content: buildWordPrompt(word) }],
    });
    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    words = parseNdjson(text);
  } catch (err) {
    log.error("word page generation failed", err, { word });
    return null;
  }

  if (words.length < 4) {
    log.error("word page generation returned too few words", undefined, {
      word,
      count: words.length,
    });
    return null;
  }

  const { error } = await supabase.from("word_pages").insert({ word, alternatives: words });
  // 23505 = another request persisted it first — fine. Other errors (e.g.
  // migration 003 not yet run) are logged but don't block serving the page.
  if (error && error.code !== "23505") {
    log.error("word page persist failed", error, { word });
  }

  return words;
}
