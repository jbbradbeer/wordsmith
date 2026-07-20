-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- 1. past_due keeps paid access (Stripe is still retrying the card — don't
--    lock out a paying user on the first failed charge).
-- 2. Paid users no longer burn search_count — previously the counter kept
--    incrementing, so a canceled subscriber was left with zero free searches.

CREATE OR REPLACE FUNCTION public.try_increment_search_count(p_user_id UUID, p_limit INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  -- FOR UPDATE locks the row, serialising concurrent calls for the same user
  SELECT search_count, subscription_status INTO v_profile
  FROM public.profiles WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'search_count', 0, 'subscription_status', 'free');
  END IF;

  -- Paid access (incl. past_due grace): unlimited, and don't consume the free counter
  IF v_profile.subscription_status IN ('active', 'past_due') THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'search_count', v_profile.search_count,
      'subscription_status', v_profile.subscription_status
    );
  END IF;

  IF v_profile.search_count >= p_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'search_count', v_profile.search_count,
      'subscription_status', v_profile.subscription_status
    );
  END IF;

  UPDATE public.profiles SET search_count = search_count + 1 WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'search_count', v_profile.search_count + 1,
    'subscription_status', v_profile.subscription_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.try_increment_search_count(UUID, INTEGER) TO service_role;
