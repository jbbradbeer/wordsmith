import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { getServiceSupabase } from "@/lib/supabase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabase = createServerSupabaseClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const serviceClient = getServiceSupabase();

  // Check subscription status
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("subscription_status")
    .eq("id", session.user.id)
    .single();

  if (profile?.subscription_status !== "active") {
    return res.status(403).json({ error: "subscription_required" });
  }

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

    // Get word counts for each collection
    const collectionsWithCounts = await Promise.all(
      (collections || []).map(async (collection) => {
        const { count } = await serviceClient
          .from("collection_words")
          .select("*", { count: "exact", head: true })
          .eq("collection_id", collection.id);

        let containsWord: boolean | undefined;
        if (checkWord) {
          const { count: wordCount } = await serviceClient
            .from("collection_words")
            .select("*", { count: "exact", head: true })
            .eq("collection_id", collection.id)
            .eq("word", checkWord);
          containsWord = (wordCount || 0) > 0;
        }

        return {
          ...collection,
          word_count: count || 0,
          ...(checkWord !== undefined ? { containsWord } : {}),
        };
      })
    );

    return res.status(200).json(collectionsWithCounts);
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
