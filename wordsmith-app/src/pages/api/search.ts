import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { getServiceSupabase } from "@/lib/supabase";
import { getAnonCount, setAnonCount } from "@/lib/anon-cookie";
import { checkRateLimit, getClientIp, hashIp } from "@/lib/rate-limit";
import { createRequestLogger, type RequestLogger } from "@/lib/logger";
import { buildWordPrompt } from "@/lib/word-prompt";
import Anthropic from "@anthropic-ai/sdk";
import { LRUCache } from "lru-cache";
import type { WordData } from "@/lib/types";
import { FREE_SEARCH_LIMIT, PRO_SEARCH_LIMIT_DAILY } from "@/lib/constants";
import { missingEnv } from "@/lib/env";
import { hasActiveAccess } from "@/lib/subscription";

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
// Daily per-IP cap is deliberately looser than the 3-search cookie limit —
// offices/CGNAT share IPs; this bounds cost abuse, not the free-tier UX.
const ANON_SEARCHES_PER_IP_PER_DAY = 15;
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

type ServiceClient = ReturnType<typeof getServiceSupabase>;

/**
 * Two-level result cache. L1 is the per-instance LRU; L2 is the word_pages
 * table (the same generate-once store behind /words/[word]), so a term is a
 * single Claude call ever across all serverless instances.
 */
async function getCachedWords(
  serviceClient: ServiceClient,
  term: string
): Promise<WordData[] | null> {
  const mem = wordCache.get(term);
  if (mem) return mem;
  const { data } = await serviceClient
    .from("word_pages")
    .select("alternatives")
    .eq("word", term)
    .maybeSingle();
  if (data?.alternatives) {
    const words = data.alternatives as WordData[];
    wordCache.set(term, words);
    return words;
  }
  return null;
}

function persistWords(
  serviceClient: ServiceClient,
  term: string,
  words: WordData[],
  log: RequestLogger
): void {
  wordCache.set(term, words);
  // Quality gate mirrors word-pages.ts: don't persist truncated generations
  if (words.length < 4) return;
  Promise.resolve(serviceClient.from("word_pages").insert({ word: term, alternatives: words }))
    .then(({ error }) => {
      // 23505 = another request persisted it first — fine
      if (error && error.code !== "23505") {
        log.error("search cache persist failed", error, { term });
      }
    })
    .catch((err) => log.error("search cache persist failed", err, { term }));
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
  // getUser() revalidates the JWT with the auth server; getSession() would
  // trust the cookie's embedded claims unverified.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const log = createRequestLogger("/api/search", user?.id);

  // --- Anonymous search path ---
  if (!user) {
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

    // Server-side backstop: the cookie resets with a cleared browser, so cap
    // total anonymous searches per IP per day in the DB (Claude cost bound).
    // Fails open if the migration hasn't run — the cookie stays the primary UX.
    const anonService = getServiceSupabase();
    const { data: anonRpc, error: anonRpcError } = await anonService.rpc(
      "try_increment_anon_count",
      { p_ip_hash: hashIp(getClientIp(req)), p_limit: ANON_SEARCHES_PER_IP_PER_DAY }
    );
    if (anonRpcError) {
      log.error("try_increment_anon_count RPC failed (failing open)", anonRpcError);
    } else if (anonRpc && !anonRpc.allowed) {
      return res.status(403).json({
        error: "signup_required",
        message: "Daily free search limit reached for this network. Sign up to continue.",
      });
    }

    // Increment cookie before opening SSE (headers must be set before flushHeaders)
    setAnonCount(res, currentAnonCount + 1);

    openSSE(res);

    try {
      const cached = await getCachedWords(anonService, searchTerm);
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
      persistWords(anonService, searchTerm, words, log);

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
  const userId = user.id;

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
    {
      p_user_id: userId,
      p_limit: FREE_SEARCH_LIMIT,
      p_paid_limit: PRO_SEARCH_LIMIT_DAILY,
    }
  );

  if (rpcError || !rpcResult) {
    log.error("try_increment_search_count RPC failed", rpcError);
    return res.status(500).json({ error: "Could not process search" });
  }

  if (!rpcResult.allowed) {
    if (hasActiveAccess(rpcResult.subscription_status)) {
      // Pro fair-use ceiling, not a paywall — resets at midnight UTC
      res.setHeader("Retry-After", "3600");
      return res.status(429).json({
        error: "rate_limited",
        message: `You've hit today's fair-use limit of ${PRO_SEARCH_LIMIT_DAILY} searches. It resets tomorrow.`,
      });
    }
    return res.status(403).json({
      error: "free_limit_reached",
      message: `You've used all ${FREE_SEARCH_LIMIT} free searches for today. Upgrade to Wordsmith Pro for unlimited access.`,
      searchCount: rpcResult.search_count,
      limit: FREE_SEARCH_LIMIT,
    });
  }

  const isPaid = hasActiveAccess(rpcResult.subscription_status);
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

    const cached = await getCachedWords(serviceClient, searchTerm);
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
    persistWords(serviceClient, searchTerm, words, log);

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
