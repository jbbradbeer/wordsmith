-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- Server-side anonymous usage tracking. The signed ws_anon cookie enforces the
-- 3-free-search UX, but clearing cookies resets it — this table caps total
-- anonymous Claude spend per IP per day regardless of cookie state.
-- IPs are stored as keyed HMAC hashes (see hashIp in src/lib/rate-limit.ts).

CREATE TABLE IF NOT EXISTS public.anon_usage (
  ip_hash TEXT NOT NULL,
  day DATE NOT NULL,
  search_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip_hash, day)
);

-- Service-role only: RLS on, no policies.
ALTER TABLE public.anon_usage ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.try_increment_anon_count(p_ip_hash TEXT, p_limit INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Upsert today's bucket atomically; ON CONFLICT serialises concurrent calls
  INSERT INTO public.anon_usage (ip_hash, day, search_count)
  VALUES (p_ip_hash, CURRENT_DATE, 1)
  ON CONFLICT (ip_hash, day)
  DO UPDATE SET search_count = anon_usage.search_count + 1
  WHERE anon_usage.search_count < p_limit
  RETURNING search_count INTO v_count;

  IF v_count IS NULL THEN
    -- Conflict row existed and was already at/over the limit
    SELECT search_count INTO v_count
    FROM public.anon_usage
    WHERE ip_hash = p_ip_hash AND day = CURRENT_DATE;
    RETURN jsonb_build_object('allowed', false, 'search_count', COALESCE(v_count, 0));
  END IF;

  -- Cheap opportunistic cleanup of this IP's stale buckets (PK-indexed)
  DELETE FROM public.anon_usage WHERE ip_hash = p_ip_hash AND day < CURRENT_DATE - 30;

  RETURN jsonb_build_object('allowed', true, 'search_count', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.try_increment_anon_count(TEXT, INTEGER) TO service_role;
