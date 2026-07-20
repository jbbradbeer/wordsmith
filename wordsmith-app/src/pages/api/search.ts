import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { getServiceSupabase } from "@/lib/supabase";
import { getAnonCount, setAnonCount } from "@/lib/anon-cookie";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createRequestLogger, type RequestLogger } from "@/lib/logger";
import { buildWordPrompt } from "@/lib/word-prompt";
import Anthropic from "@anthropic-ai/sdk";
import { LRUCache } from "lru-cache";
import type { WordData } from "@/lib/types";
import { FREE_SEARCH_LIMIT } from "@/lib/constants";
import { missingEnv } from "@/lib/env";

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

const RATE_LIMIT_WINDOW_MS = 60_000;
const ANON_SEARCHES_PER_MINUTE = 10;
const USER_SEARCHES_PER_MINUTE = 30;

function rateLimited(
  res: NextApiResponse,
  retryAfterSeconds: number
): void {
  res.setHeader("Retry-After", String(retryAfterSeconds));
  res.status(429).json({
    error: "rate_limited",
    message: "Too many searches. Please wait a moment and try again.",
  });
}

function writeSSEEvent(res: NextApiResponse, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

async function streamFromClaude(
  res: NextApiResponse,
  searchTerm: string,
  log: RequestLogger
): Promise<WordData[]> {
  const words: WordData[] = [];
  let buffer = "";

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1200,
    messages: [{ role: "user", content: buildWordPrompt(searchTerm) }],
  });

  stream.on("text", (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop()!;
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
    log.error("Claude stream error", err, { term: searchTerm });
    writeSSEEvent(res, "error", {
      message: "Something went wrong. Please try again.",
    });
    res.end();
  });

  await stream.finalMessage();

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

function openSSE(res: NextApiResponse) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Search only needs Anthropic + Supabase + the cookie secret — not Stripe.
  // Surface the exact missing var so a misconfigured deploy is self-diagnosing
  // instead of returning an opaque 500.
  const missing = missingEnv("anthropic", "supabase", "cookie");
  if (missing.length > 0) {
    const log = createRequestLogger("/api/search");
    log.error("search unavailable — missing env vars", undefined, { missing });
    return res.status(503).json({
      error: "server_misconfigured",
      message: "Search is temporarily unavailable. Please try again later.",
      missing,
    });
  }

  const { query } = req.body;
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return res.status(400).json({ error: "A search word is required" });
  }

  const searchTerm = query.trim().toLowerCase().slice(0, 50);

  if (!/^[a-z\s'-]+$/.test(searchTerm)) {
    return res.status(400).json({ error: "Search term must contain only letters" });
  }

  const supabase = createServerSupabaseClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const log = createRequestLogger("/api/search", session?.user.id);

  // --- Anonymous search path ---
  if (!session) {
    const ipLimit = checkRateLimit(
      `ip:${getClientIp(req)}`,
      ANON_SEARCHES_PER_MINUTE,
      RATE_LIMIT_WINDOW_MS
    );
    if (!ipLimit.allowed) {
      return rateLimited(res, ipLimit.retryAfterSeconds);
    }

    const currentAnonCount = getAnonCount(req);

    if (currentAnonCount >= FREE_SEARCH_LIMIT) {
      return res.status(403).json({
        error: "signup_required",
        message: `You've used all ${FREE_SEARCH_LIMIT} free searches. Sign up to continue.`,
      });
    }

    // Increment cookie before opening SSE (headers must be set before flushHeaders)
    setAnonCount(res, currentAnonCount + 1);

    openSSE(res);

    try {
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

      const words = await streamFromClaude(res, searchTerm, log);
      wordCache.set(searchTerm, words);

      writeSSEEvent(res, "done", {
        isAnonymous: true,
        anonSearchCount: currentAnonCount + 1,
      });
      res.end();
      log.info("anon search complete", { term: searchTerm, latencyMs: log.latencyMs() });
    } catch (err: unknown) {
      log.error("anonymous search failed", err, { term: searchTerm });
      writeSSEEvent(res, "error", {
        message: "Something went wrong. Please try again.",
      });
      res.end();
    }
    return;
  }

  // --- Authenticated search path ---
  const userId = session.user.id;

  const userLimit = checkRateLimit(
    `user:${userId}`,
    USER_SEARCHES_PER_MINUTE,
    RATE_LIMIT_WINDOW_MS
  );
  if (!userLimit.allowed) {
    return rateLimited(res, userLimit.retryAfterSeconds);
  }

  const serviceClient = getServiceSupabase();

  // Atomic check-and-increment — prevents concurrent request bypass
  const { data: rpcResult, error: rpcError } = await serviceClient.rpc(
    "try_increment_search_count",
    { p_user_id: userId, p_limit: FREE_SEARCH_LIMIT }
  );

  if (rpcError || !rpcResult) {
    log.error("try_increment_search_count RPC failed", rpcError);
    return res.status(500).json({ error: "Could not process search" });
  }

  if (!rpcResult.allowed) {
    return res.status(403).json({
      error: "free_limit_reached",
      message: `You've used all ${FREE_SEARCH_LIMIT} free searches. Upgrade to Wordsmith Pro for unlimited access.`,
      searchCount: rpcResult.search_count,
      limit: FREE_SEARCH_LIMIT,
    });
  }

  const isPaid = rpcResult.subscription_status === "active";
  const newSearchCount: number = rpcResult.search_count;

  openSSE(res);

  try {
    const donePayload = {
      usage: {
        searchCount: newSearchCount,
        limit: isPaid ? null : FREE_SEARCH_LIMIT,
        isPaid,
      },
    };

    const cached = wordCache.get(searchTerm);
    if (cached) {
      for (const word of cached) {
        writeSSEEvent(res, "word", word);
      }
      Promise.resolve(
        serviceClient.from("searches").insert({ user_id: userId, query: searchTerm })
      ).catch((err) => log.error("search history write failed (cache hit)", err));

      writeSSEEvent(res, "done", donePayload);
      res.end();
      return;
    }

    const words = await streamFromClaude(res, searchTerm, log);
    wordCache.set(searchTerm, words);

    Promise.resolve(
      serviceClient.from("searches").insert({ user_id: userId, query: searchTerm })
    ).catch((err) => log.error("search history write failed", err));

    writeSSEEvent(res, "done", donePayload);
    res.end();
    log.info("search complete", { term: searchTerm, latencyMs: log.latencyMs() });
  } catch (err: unknown) {
    log.error("search failed", err, { term: searchTerm });
    writeSSEEvent(res, "error", {
      message: "Something went wrong. Please try again.",
    });
    res.end();
  }
}
