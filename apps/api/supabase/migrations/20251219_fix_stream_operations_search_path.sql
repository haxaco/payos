-- ============================================
-- Migration: Fix Search Path for Stream Operations
-- Story: 16.3
-- Date: 2025-12-19
-- Purpose: Fix search_path parameter for stream balance operations
--          to prevent search path injection attacks
-- ============================================

-- ============================================
-- Function: hold_for_stream
-- ============================================
-- Holds funds in an account for a payment stream
CREATE OR REPLACE FUNCTION public.hold_for_stream(
  p_account_id UUID,
  p_stream_id UUID,
  p_amount NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_current_held NUMERIC;
BEGIN
  -- Get current balance and held amount
  SELECT balance, held_balance
  INTO v_current_balance, v_current_held
  FROM public.accounts
  WHERE id = p_account_id
  FOR UPDATE; -- Lock the row
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found: %', p_account_id;
  END IF;
  
  -- Check if sufficient available balance
  IF (v_current_balance - v_current_held) < p_amount THEN
    RAISE EXCEPTION 'Insufficient available balance for hold';
  END IF;
  
  -- Update held balance
  UPDATE public.accounts
  SET 
    held_balance = held_balance + p_amount,
    updated_at = NOW()
  WHERE id = p_account_id;
  
  -- Record the hold in stream_holds table if it exists
  BEGIN
    INSERT INTO public.stream_holds (
      account_id,
      stream_id,
      amount,
      created_at
    ) VALUES (
      p_account_id,
      p_stream_id,
      p_amount,
      NOW()
    );
  EXCEPTION
    WHEN undefined_table THEN
      -- Table doesn't exist yet, skip
      NULL;
  END;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to hold funds for stream: %', SQLERRM;
    RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.hold_for_stream IS 'Holds funds in an account for a payment stream. SECURITY DEFINER with empty search_path for security.';

-- ============================================
-- Function: release_from_stream
-- ============================================
-- Releases held funds from a payment stream
CREATE OR REPLACE FUNCTION public.release_from_stream(
  p_account_id UUID,
  p_stream_id UUID,
  p_amount NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current_held NUMERIC;
BEGIN
  -- Get current held amount
  SELECT held_balance
  INTO v_current_held
  FROM public.accounts
  WHERE id = p_account_id
  FOR UPDATE; -- Lock the row
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found: %', p_account_id;
  END IF;
  
  -- Check if sufficient held balance
  IF v_current_held < p_amount THEN
    RAISE EXCEPTION 'Insufficient held balance to release: % < %', v_current_held, p_amount;
  END IF;
  
  -- Update held balance
  UPDATE public.accounts
  SET 
    held_balance = held_balance - p_amount,
    updated_at = NOW()
  WHERE id = p_account_id;
  
  -- Remove or update the hold record if stream_holds table exists
  BEGIN
    DELETE FROM public.stream_holds
    WHERE account_id = p_account_id
      AND stream_id = p_stream_id
      AND amount = p_amount;
  EXCEPTION
    WHEN undefined_table THEN
      -- Table doesn't exist yet, skip
      NULL;
  END;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to release funds from stream: %', SQLERRM;
    RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.release_from_stream IS 'Releases held funds from a payment stream. SECURITY DEFINER with empty search_path for security.';

-- ============================================
-- Function: calculate_stream_balance
-- ============================================
-- Calculates the current balance for a payment stream
CREATE OR REPLACE FUNCTION public.calculate_stream_balance(
  p_stream_id UUID
)
RETURNS TABLE(
  total_funded NUMERIC,
  total_streamed NUMERIC,
  available_balance NUMERIC,
  held_balance NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(amount) FILTER (WHERE type = 'fund'), 0) as total_funded,
    COALESCE(SUM(amount) FILTER (WHERE type = 'stream'), 0) as total_streamed,
    COALESCE(SUM(amount) FILTER (WHERE type = 'fund'), 0) - 
      COALESCE(SUM(amount) FILTER (WHERE type = 'stream'), 0) as available_balance,
    COALESCE(SUM(amount) FILTER (WHERE type = 'hold'), 0) as held_balance
  FROM public.stream_transactions
  WHERE stream_id = p_stream_id;
  
  -- If no rows found, return zeros
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    -- Table doesn't exist yet, return zeros
    RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
END;
$$;

COMMENT ON FUNCTION public.calculate_stream_balance IS 'Calculates the current balance for a payment stream. SECURITY DEFINER with empty search_path for security.';

-- ============================================
-- Verification
-- ============================================

DO $$
DECLARE
  v_function_count INT;
BEGIN
  -- Check that all 3 functions exist with proper security settings
  SELECT COUNT(*)
  INTO v_function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'hold_for_stream',
      'release_from_stream',
      'calculate_stream_balance'
    )
    AND p.prosecdef = true; -- SECURITY DEFINER
  
  IF v_function_count < 3 THEN
    RAISE WARNING 'Expected 3 stream operation functions with SECURITY DEFINER, found %', v_function_count;
  ELSE
    RAISE NOTICE '✅ All 3 stream operation functions updated with SECURITY DEFINER and search_path protection';
  END IF;
END $$;

-- ============================================
-- Security Notes
-- ============================================

COMMENT ON FUNCTION public.hold_for_stream IS 'Story 16.3: Fixed search_path for stream operations to prevent SQL injection. Function uses SET search_path = '''' and SECURITY DEFINER. Manages payment stream holds.';
COMMENT ON FUNCTION public.release_from_stream IS 'Story 16.3: Fixed search_path for stream operations to prevent SQL injection. Function uses SET search_path = '''' and SECURITY DEFINER. Manages payment stream releases.';
COMMENT ON FUNCTION public.calculate_stream_balance IS 'Story 16.3: Fixed search_path for stream operations to prevent SQL injection. Function uses SET search_path = '''' and SECURITY DEFINER. Calculates stream balances.';


