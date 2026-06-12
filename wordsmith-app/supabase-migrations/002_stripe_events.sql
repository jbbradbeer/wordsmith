-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- Records processed Stripe webhook event IDs so retried/duplicate deliveries
-- are acknowledged without being processed twice.

CREATE TABLE public.stripe_events (
  id TEXT PRIMARY KEY, -- Stripe event id (evt_...)
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service-role only: enable RLS with no policies so anon/authenticated
-- clients cannot read or write webhook bookkeeping.
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
