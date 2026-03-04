import type { NextApiRequest, NextApiResponse } from "next";
import { getServiceSupabase } from "@/lib/supabase";
import { withSubscription } from "@/lib/api";
import { validateEnv } from "@/lib/env";
import type { Session } from "@supabase/supabase-js";

validateEnv();

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: Session
) {
  const serviceClient = getServiceSupabase();
  const userId = session.user.id;

  // GET: List collections with word counts
  if (req.method === "GET") {
    const checkWord = req.query.checkWord as string | undefined;

    const { data: collections, error } = await serviceClient
      .from("collections")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: "Failed to fetch collections" });
    }

    const collectionIds = (collections || []).map((c) => c.id);

    if (collectionIds.length === 0) {
      return res.status(200).json([]);
    }

    // Replace N+1 queries with 2 queries total (run in parallel)
    const wordCountsPromise = serviceClient
      .from("collection_words")
      .select("collection_id")
      .in("collection_id", collectionIds);

    const checkWordPromise = checkWord
      ? serviceClient
          .from("collection_words")
          .select("collection_id")
          .eq("word", checkWord)
          .in("collection_id", collectionIds)
      : Promise.resolve({ data: [] as { collection_id: string }[], error: null });

    const [wordCountsResult, checkWordResult] = await Promise.all([
      wordCountsPromise,
      checkWordPromise,
    ]);

    // Compute counts in JS — O(total words), avoids N DB round-trips
    const wordCounts: Record<string, number> = {};
    for (const row of wordCountsResult.data || []) {
      wordCounts[row.collection_id] = (wordCounts[row.collection_id] || 0) + 1;
    }

    const containsWordIn = new Set<string>(
      (checkWordResult.data || []).map((r) => r.collection_id)
    );

    const result = (collections || []).map((c) => ({
      ...c,
      word_count: wordCounts[c.id] || 0,
      ...(checkWord !== undefined ? { containsWord: containsWordIn.has(c.id) } : {}),
    }));

    return res.status(200).json(result);
  }

  // POST: Create a new collection
  if (req.method === "POST") {
    const { name } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Collection name is required" });
    }

    const trimmedName = name.trim().slice(0, 50);

    const { data, error } = await serviceClient
      .from("collections")
      .insert({ user_id: userId, name: trimmedName })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res
          .status(409)
          .json({ error: "A collection with this name already exists" });
      }
      return res.status(500).json({ error: "Failed to create collection" });
    }

    return res.status(201).json({ ...data, word_count: 0 });
  }

  // PATCH: Rename a collection
  if (req.method === "PATCH") {
    const { id, name } = req.body;

    if (!id || !name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Collection id and name are required" });
    }

    const trimmedName = name.trim().slice(0, 50);

    // Verify ownership
    const { data: existing } = await serviceClient
      .from("collections")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (!existing) {
      return res.status(404).json({ error: "Collection not found" });
    }

    const { error } = await serviceClient
      .from("collections")
      .update({ name: trimmedName })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      if (error.code === "23505") {
        return res
          .status(409)
          .json({ error: "A collection with this name already exists" });
      }
      return res.status(500).json({ error: "Failed to rename collection" });
    }

    return res.status(200).json({ success: true });
  }

  // DELETE: Delete a collection
  if (req.method === "DELETE") {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Collection id is required" });
    }

    // Verify ownership
    const { data: existing } = await serviceClient
      .from("collections")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (!existing) {
      return res.status(404).json({ error: "Collection not found" });
    }

    const { error } = await serviceClient
      .from("collections")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      return res.status(500).json({ error: "Failed to delete collection" });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withSubscription(handler);
