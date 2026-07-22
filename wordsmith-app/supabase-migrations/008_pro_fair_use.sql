-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- Pro fair-use ceilings. Previously paid (active/past_due) users bypassed the
-- daily counters entirely, so one scripted Pro account could make unbounded
-- Claude calls. Now paid users share the same lazy-daily-reset counters with a
-- much higher limit (p_paid_limit; app passes 300 searches / 100 scans a day).
-- The 3rd argument has a DEFAULT so any not-yet-deployed 2-arg caller keeps
-- working during the migration/deploy window.

DROP FUNCTION IF EXISTS public.try_increment_search_count(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.try_increment_search_count(
  p_user_id UUID,
  p_limit INTEGER,
  p_paid_limit INTEGER DEFAULT 300
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_today_count INTEGER;
  v_limit INTEGER;
BEGIN
  SELECT search_count, subscription_status, last_search_reset INTO v_profile
  FROM public.profiles WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'search_count', 0, 'subscription_status', 'free');
  END IF;

  v_limit := CASE
    WHEN v_profile.subscription_status IN ('active', 'past_due') THEN p_paid_limit
    ELSE p_limit
  END;

  IF v_profile.last_search_reset IS NULL OR v_profile.last_search_reset < CURRENT_DATE THEN
    v_today_count := 0;
  ELSE
    v_today_count := v_profile.search_count;
  END IF;

  IF v_today_count >= v_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'search_count', v_today_count,
      'subscription_status', v_profile.subscription_status
    );
  END IF;

  UPDATE public.profiles
  SET search_count = v_today_count + 1, last_search_reset = CURRENT_DATE
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'search_count', v_today_count + 1,
    'subscription_status', v_profile.subscription_status
  );
END;
$$;

DROP FUNCTION IF EXISTS public.try_increment_scan_count(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.try_increment_scan_count(
  p_user_id UUID,
  p_limit INTEGER,
  p_paid_limit INTEGER DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_today_count INTEGER;
  v_limit INTEGER;
BEGIN
  SELECT scan_count, subscription_status, last_scan_reset INTO v_profile
  FROM public.profiles WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'scan_count', 0, 'subscription_status', 'free');
  END IF;

  v_limit := CASE
    WHEN v_profile.subscription_status IN ('active', 'past_due') THEN p_paid_limit
    ELSE p_limit
  END;

  IF v_profile.last_scan_reset IS NULL OR v_profile.last_scan_reset < CURRENT_DATE THEN
    v_today_count := 0;
  ELSE
    v_today_count := v_profile.scan_count;
  END IF;

  IF v_today_count >= v_limit THEN
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

GRANT EXECUTE ON FUNCTION public.try_increment_search_count(UUID, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.try_increment_scan_count(UUID, INTEGER, INTEGER) TO service_role;
