import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import Anthropic from "@anthropic-ai/sdk";
import { LRUCache } from "lru-cache";
import type { WordData } from "@/lib/types";
import { FREE_SEARCH_LIMIT } from "@/lib/constants";

// Disable Vercel response buffering so SSE events are flushed immediately
export const config = {
  api: { responseLimit: false },
};

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// In-memory cache — persists across warm serverless invocations
const wordCache = new LRUCache<string, WordData[]>({
  max: 500,
  ttl: 1000 * 60 * 60 * 24, // 24 hours
});

function writeSSEEvent(res: NextApiResponse, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function buildPrompt(searchTerm: string): string {
  return `I'm looking for alternative, more interesting words for: "${searchTerm}"

Return ONLY 6 lines of NDJSON. Each line must be a complete, self-contained JSON object.
No arrays, no wrapper, no markdown, no preamble. One object per line:

{"word":"...","pronunciation":"...","definition":"...","example":"...","context":"...","category":"..."}

Rules:
- Each line is valid JSON on its own
- "category" must be one of: elevated, literary, punchy, rare
- "pronunciation" uses phonetic notation like /fə-ˈnɛt-ɪk/
- "definition" is one crisp sentence
- "example" is a vivid sentence using the word naturally
- "context" is a brief note on when/where this word works best
- Give 6 alternatives ranging from slightly sophisticated to truly rare/unusual
- Output exactly 6 lines, nothing else`;
}

async function streamFromClaude(
  res: NextApiResponse,
  searchTerm: string
): Promise<WordData[]> {
  const words: WordData[] = [];
  let buffer = "";

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1200,
    messages: [{ role: "user", content: buildPrompt(searchTerm) }],
  });

  stream.on("text", (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop()!; // keep incomplete final line
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const word = JSON.parse(trimmed) as WordData;
        words.push(word);
        writeSSEEvent(res, "word", word);
      } catch {
        // Partial or non-JSON line — skip
      }
    }
  });

  stream.on("error", (err: Error) => {
    console.error("Stream error:", err);
    writeSSEEvent(res, "error", {
      message: "Something went wrong. Please try again.",
    });
    res.end();
  });

  await stream.finalMessage();

  // Flush any remaining content in buffer
  if (buffer.trim()) {
    try {
      const word = JSON.parse(buffer.trim()) as WordData;
      words.push(word);
      writeSSEEvent(res, "word", word);
    } catch {
      // ignore
    }
  }

  return words;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { query, anonSearchCount } = req.body;
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return res.status(400).json({ error: "A search word is required" });
  }

  const searchTerm = query.trim().toLowerCase().slice(0, 50);

  // Check for authenticated user
  const supabase = createServerSupabaseClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isAnonymous = !session;

  // --- Anonymous search path ---
  if (isAnonymous) {
    const currentAnonCount =
      typeof anonSearchCount === "number" ? anonSearchCount : 0;

    // 403 guard — must fire BEFORE SSE headers
    if (currentAnonCount >= FREE_SEARCH_LIMIT) {
      return res.status(403).json({
        error: "signup_required",
        message: `You've used all ${FREE_SEARCH_LIMIT} free searches. Sign up to continue.`,
      });
    }

    // Open SSE stream
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    try {
      // Cache hit — stream instantly
      const cached = wordCache.get(searchTerm);
      if (cached) {
        for (const word of cached) {
          writeSSEEvent(res, "word", word);
        }
        writeSSEEvent(res, "done", {
          isAnonymous: true,
          anonSearchCount: currentAnonCount + 1,
        });
        res.end();
        return;
      }

      // Cache miss — stream from Claude
      const words = await streamFromClaude(res, searchTerm);
      wordCache.set(searchTerm, words);

      writeSSEEvent(res, "done", {
        isAnonymous: true,
        anonSearchCount: currentAnonCount + 1,
      });
      res.end();
    } catch (err: any) {
      console.error("Anonymous search error:", err);
      writeSSEEvent(res, "error", {
        message: "Something went wrong. Please try again.",
      });
      res.end();
    }
    return;
  }

  // --- Authenticated search path ---
  const userId = session.user.id;

  // Fetch profile — needed for limit check (must happen before SSE headers)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("subscription_status, search_count")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return res.status(500).json({ error: "Could not load profile" });
  }

  const isPaid = profile.subscription_status === "active";
  const searchCount = profile.search_count || 0;

  // 403 guard — must fire BEFORE SSE headers
  if (!isPaid && searchCount >= FREE_SEARCH_LIMIT) {
    return res.status(403).json({
      error: "free_limit_reached",
      message: `You've used all ${FREE_SEARCH_LIMIT} free searches. Upgrade to Wordsmith Pro for unlimited access.`,
      searchCount,
      limit: FREE_SEARCH_LIMIT,
    });
  }

  // Open SSE stream
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  try {
    const { getServiceSupabase } = await import("@/lib/supabase");
    const serviceClient = getServiceSupabase();

    const donePayload = {
      usage: {
        searchCount: searchCount + 1,
        limit: isPaid ? null : FREE_SEARCH_LIMIT,
        isPaid,
      },
    };

    // Cache hit — stream instantly, still track usage
    const cached = wordCache.get(searchTerm);
    if (cached) {
      for (const word of cached) {
        writeSSEEvent(res, "word", word);
      }
      // Fire-and-forget DB writes — don't block the response
      Promise.all([
        serviceClient
          .from("searches")
          .insert({ user_id: userId, query: searchTerm }),
        serviceClient
          .from("profiles")
          .update({ search_count: searchCount + 1 })
          .eq("id", userId),
      ]).catch((err) => console.error("DB write failed (cache hit):", err));

      writeSSEEvent(res, "done", donePayload);
      res.end();
      return;
    }

    // Cache miss — stream from Claude
    const words = await streamFromClaude(res, searchTerm);
    wordCache.set(searchTerm, words);

    // Fire-and-forget DB writes — don't block the response
    Promise.all([
      serviceClient
        .from("searches")
        .insert({ user_id: userId, query: searchTerm }),
      serviceClient
        .from("profiles")
        .update({ search_count: searchCount + 1 })
        .eq("id", userId),
    ]).catch((err) => console.error("DB write failed:", err));

    writeSSEEvent(res, "done", donePayload);
    res.end();
  } catch (err: any) {
    console.error("Search API error:", err);
    writeSSEEvent(res, "error", {
      message: "Something went wrong. Please try again.",
    });
    res.end();
  }
}
