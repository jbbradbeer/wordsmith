import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import Anthropic from "@anthropic-ai/sdk";
import { FREE_SEARCH_LIMIT } from "@/lib/constants";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

  const searchTerm = query.trim().toLowerCase().slice(0, 50); // Cap length

  // Check for authenticated user
  const supabase = createServerSupabaseClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isAnonymous = !session;

  // --- Anonymous search path ---
  if (isAnonymous) {
    const currentAnonCount = typeof anonSearchCount === "number" ? anonSearchCount : 0;

    if (currentAnonCount >= FREE_SEARCH_LIMIT) {
      return res.status(403).json({
        error: "signup_required",
        message: `You've used all ${FREE_SEARCH_LIMIT} free searches. Sign up to continue.`,
      });
    }

    try {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1200,
        messages: [
          {
            role: "user",
            content: `I'm looking for alternative, more interesting words for: "${searchTerm}"

Return ONLY valid JSON (no markdown, no backticks, no preamble) in this exact format:
{
  "original": "${searchTerm}",
  "alternatives": [
    {
      "word": "the alternative word",
      "pronunciation": "phonetic pronunciation like /f\u0259-\u02C8n\u025Bt-\u026Ak/",
      "definition": "concise definition (1 sentence)",
      "example": "a vivid example sentence using this word naturally",
      "context": "brief note on when/where this word works best",
      "category": "one of: elevated, literary, punchy, rare"
    }
  ]
}

Give me 6 alternatives, ranging from slightly more sophisticated to truly rare/unusual. Make the examples vivid and the definitions crisp. Categorize each:
- "elevated": sophisticated, polished vocabulary for professional/social settings
- "literary": evocative, bookish words that add texture to writing
- "punchy": sharp, impactful words that hit hard
- "rare": uncommon gems that make people pause and think

Only return the JSON.`,
          },
        ],
      });

      const text =
        message.content
          ?.map((c: any) => (c.type === "text" ? c.text : ""))
          .join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      return res.status(200).json({
        ...parsed,
        isAnonymous: true,
        anonSearchCount: currentAnonCount + 1,
      });
    } catch (err: any) {
      console.error("Anonymous search error:", err);
      return res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  }

  // --- Authenticated search path ---
  const userId = session.user.id;

  try {
    // Check user profile and subscription status
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_status, search_count")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return res.status(500).json({ error: "Could not load profile" });
    }

    const isPaid =
      profile.subscription_status === "active";
    const searchCount = profile.search_count || 0;

    // Enforce free tier limit
    if (!isPaid && searchCount >= FREE_SEARCH_LIMIT) {
      return res.status(403).json({
        error: "free_limit_reached",
        message: `You've used all ${FREE_SEARCH_LIMIT} free searches. Upgrade to Wordsmith Pro for unlimited access.`,
        searchCount,
        limit: FREE_SEARCH_LIMIT,
      });
    }

    // Call Anthropic API
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: `I'm looking for alternative, more interesting words for: "${searchTerm}"

Return ONLY valid JSON (no markdown, no backticks, no preamble) in this exact format:
{
  "original": "${searchTerm}",
  "alternatives": [
    {
      "word": "the alternative word",
      "pronunciation": "phonetic pronunciation like /f\u0259-\u02C8n\u025Bt-\u026Ak/",
      "definition": "concise definition (1 sentence)",
      "example": "a vivid example sentence using this word naturally",
      "context": "brief note on when/where this word works best",
      "category": "one of: elevated, literary, punchy, rare"
    }
  ]
}

Give me 6 alternatives, ranging from slightly more sophisticated to truly rare/unusual. Make the examples vivid and the definitions crisp. Categorize each:
- "elevated": sophisticated, polished vocabulary for professional/social settings
- "literary": evocative, bookish words that add texture to writing
- "punchy": sharp, impactful words that hit hard
- "rare": uncommon gems that make people pause and think

Only return the JSON.`,
        },
      ],
    });

    const text =
      message.content
        ?.map((c: any) => (c.type === "text" ? c.text : ""))
        .join("") || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    // Log the search and increment count (using service role to bypass RLS for update)
    const { getServiceSupabase } = await import("@/lib/supabase");
    const serviceClient = getServiceSupabase();

    await serviceClient.from("searches").insert({
      user_id: userId,
      query: searchTerm,
    });

    await serviceClient
      .from("profiles")
      .update({ search_count: searchCount + 1 })
      .eq("id", userId);

    return res.status(200).json({
      ...parsed,
      usage: {
        searchCount: searchCount + 1,
        limit: isPaid ? null : FREE_SEARCH_LIMIT,
        isPaid,
      },
    });
  } catch (err: any) {
    console.error("Search API error:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
