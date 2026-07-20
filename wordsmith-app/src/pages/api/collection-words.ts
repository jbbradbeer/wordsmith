import type { NextApiRequest, NextApiResponse } from "next";
import { getServiceSupabase } from "@/lib/supabase";
import { withSubscription } from "@/lib/api";
import { missingEnv } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit";
import type { User } from "@supabase/supabase-js";

const WRITES_PER_MINUTE = 30;

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user: User
) {
  if (missingEnv("supabase").length > 0) {
    return res.status(503).json({ error: "server_misconfigured" });
  }

  if (req.method !== "GET") {
    const limit = checkRateLimit(`collection-words:${user.id}`, WRITES_PER_MINUTE, 60_000);
    if (!limit.allowed) {
      res.setHeader("Retry-After", String(limit.retryAfterSeconds));
      return res.status(429).json({ error: "rate_limited" });
    }
  }

  const serviceClient = getServiceSupabase();
  const userId = user.id;

  // GET: List words in a collection
  if (req.method === "GET") {
    const collectionId = req.query.collectionId as string;

    if (!collectionId) {
      return res.status(400).json({ error: "collectionId is required" });
    }

    // Verify collection ownership
    const { data: collection } = await serviceClient
      .from("collections")
      .select("id")
      .eq("id", collectionId)
      .eq("user_id", userId)
      .single();

    if (!collection) {
      return res.status(404).json({ error: "Collection not found" });
    }

    const { data: words, error } = await serviceClient
      .from("collection_words")
      .select("*")
      .eq("collection_id", collectionId)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: "Failed to fetch words" });
    }

    return res.status(200).json(words || []);
  }

  // POST: Save a word to a collection
  if (req.method === "POST") {
    const { collectionId, word, pronunciation, definition, example, context, category } =
      req.body;

    if (!collectionId || !word) {
      return res
        .status(400)
        .json({ error: "collectionId and word are required" });
    }

    if (typeof word !== "string" || word.length > 100) {
      return res.status(400).json({ error: "Invalid word" });
    }

    // Verify collection ownership
    const { data: collection } = await serviceClient
      .from("collections")
      .select("id")
      .eq("id", collectionId)
      .eq("user_id", userId)
      .single();

    if (!collection) {
      return res.status(404).json({ error: "Collection not found" });
    }

    // Check if word already exists in this collection
    const { count: existingCount } = await serviceClient
      .from("collection_words")
      .select("*", { count: "exact", head: true })
      .eq("collection_id", collectionId)
      .eq("word", word);

    if ((existingCount || 0) > 0) {
      return res.status(200).json({ saved: true, alreadyExists: true });
    }

    // Insert the word
    const { error } = await serviceClient.from("collection_words").insert({
      collection_id: collectionId,
      word: String(word).slice(0, 100),
      pronunciation: pronunciation ? String(pronunciation).slice(0, 100) : null,
      definition: definition ? String(definition).slice(0, 500) : null,
      example: example ? String(example).slice(0, 500) : null,
      context: context ? String(context).slice(0, 300) : null,
      category: category ? String(category).slice(0, 50) : null,
    });

    if (error) {
      return res.status(500).json({ error: "Failed to save word" });
    }

    // Update collection's updated_at
    await serviceClient
      .from("collections")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", collectionId);

    return res.status(201).json({ saved: true, alreadyExists: false });
  }

  // DELETE: Remove a word from a collection
  if (req.method === "DELETE") {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Word id is required" });
    }

    // Verify ownership through collection join
    const { data: wordRow } = await serviceClient
      .from("collection_words")
      .select("id, collection_id")
      .eq("id", id)
      .single();

    if (!wordRow) {
      return res.status(404).json({ error: "Word not found" });
    }

    const { data: collection } = await serviceClient
      .from("collections")
      .select("id")
      .eq("id", wordRow.collection_id)
      .eq("user_id", userId)
      .single();

    if (!collection) {
      return res.status(404).json({ error: "Word not found" });
    }

    const { error } = await serviceClient
      .from("collection_words")
      .delete()
      .eq("id", id);

    if (error) {
      return res.status(500).json({ error: "Failed to remove word" });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withSubscription(handler);
