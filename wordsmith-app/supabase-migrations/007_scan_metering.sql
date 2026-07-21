-- supabase-migrations/007_scan_metering.sql
-- Run in Supabase SQL Editor. De-slop analyzer metering: free accounts get
-- N scans PER DAY (lazy daily reset, same pattern as migration 006); paid
-- statuses are unlimited. scan_history stores score METADATA ONLY — never
-- the analyzed text.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS scan_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_scan_reset DATE;

CREATE OR REPLACE FUNCTION public.try_increment_scan_count(p_user_id UUID, p_limit INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_today_count INTEGER;
BEGIN
  SELECT scan_count, subscription_status, last_scan_reset INTO v_profile
  FROM public.profiles WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'scan_count', 0, 'subscription_status', 'free');
  END IF;

  IF v_profile.subscription_status IN ('active', 'past_due') THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'scan_count', v_profile.scan_count,
      'subscription_status', v_profile.subscription_status
    );
  END IF;

  IF v_profile.last_scan_reset IS NULL OR v_profile.last_scan_reset < CURRENT_DATE THEN
    v_today_count := 0;
  ELSE
    v_today_count := v_profile.scan_count;
  END IF;

  IF v_today_count >= p_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'scan_count', v_today_count,
      'subscription_status', v_profile.subscription_status
    );
  END IF;

  UPDATE public.profiles
  SET scan_count = v_today_count + 1, last_scan_reset = CURRENT_DATE
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'scan_count', v_today_count + 1,
    'subscription_status', v_profile.subscription_status
  );
END;
$$;

-- Refund when the Claude pass fails after the scan was claimed.
CREATE OR REPLACE FUNCTION public.refund_scan(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET scan_count = GREATEST(0, scan_count - 1)
  WHERE id = p_user_id AND last_scan_reset = CURRENT_DATE;
END;
$$;

-- Pro scan history: metadata only, never text.
CREATE TABLE IF NOT EXISTS public.scan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  band TEXT NOT NULL,
  word_count INTEGER NOT NULL,
  breakdown JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS scan_history_user_created
  ON public.scan_history (user_id, created_at DESC);
ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY; -- service-role only

GRANT EXECUTE ON FUNCTION public.try_increment_scan_count(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_scan(UUID) TO service_role;
