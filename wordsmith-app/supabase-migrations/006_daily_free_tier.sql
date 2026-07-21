-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- Free tier for signed-in users becomes N searches PER DAY (was N lifetime).
-- A daily allowance builds a return habit; a lifetime cap converts nobody who
-- didn't convert on day one. Anonymous users stay lifetime-capped (cost/abuse
-- control lives in anon_usage, migration 004).
--
-- Reset is lazy: search_count is treated as 0 whenever last_search_reset is
-- before today, and stamped to CURRENT_DATE on the next counted search. No cron.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_search_reset DATE;

CREATE OR REPLACE FUNCTION public.try_increment_search_count(p_user_id UUID, p_limit INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_today_count INTEGER;
BEGIN
  -- FOR UPDATE locks the row, serialising concurrent calls for the same user
  SELECT search_count, subscription_status, last_search_reset INTO v_profile
  FROM public.profiles WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'search_count', 0, 'subscription_status', 'free');
  END IF;

  -- Paid access (incl. past_due grace): unlimited, don't touch the counter
  IF v_profile.subscription_status IN ('active', 'past_due') THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'search_count', v_profile.search_count,
      'subscription_status', v_profile.subscription_status
    );
  END IF;

  -- Effective count for today — a stale reset date means the allowance renewed
  IF v_profile.last_search_reset IS NULL OR v_profile.last_search_reset < CURRENT_DATE THEN
    v_today_count := 0;
  ELSE
    v_today_count := v_profile.search_count;
  END IF;

  IF v_today_count >= p_limit THEN
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

GRANT EXECUTE ON FUNCTION public.try_increment_search_count(UUID, INTEGER) TO service_role;
