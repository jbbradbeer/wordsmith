-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- Persists generated content for the programmatic /words/[word] SEO pages so
-- each seed word costs exactly one Claude API call, ever.

CREATE TABLE public.word_pages (
  word TEXT PRIMARY KEY,
  alternatives JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service-role only: enable RLS with no policies.
ALTER TABLE public.word_pages ENABLE ROW LEVEL SECURITY;
