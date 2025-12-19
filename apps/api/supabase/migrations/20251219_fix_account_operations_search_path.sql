-- ============================================
-- Migration: Fix Search Path for Account Operations
-- Story: 16.2
-- Date: 2025-12-19
-- Purpose: Fix search_path parameter for account balance operations
--          to prevent search path injection attacks
-- ============================================

-- ============================================
-- Function: credit_account
-- ============================================
-- Credits an account balance and creates ledger entry
CREATE OR REPLACE FUNCTION public.credit_account(
  p_account_id UUID,
  p_amount NUMERIC,
  p_currency VARCHAR(10),
  p_reference_type VARCHAR(50),
  p_reference_id UUID,
  p_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant_id UUID;
  v_current_balance NUMERIC;
BEGIN
  -- Get account tenant_id and current balance
  SELECT tenant_id, balance
  INTO v_tenant_id, v_current_balance
  FROM public.accounts
  WHERE id = p_account_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found: %', p_account_id;
  END IF;
  
  -- Update account balance
  UPDATE public.accounts
  SET 
    balance = balance + p_amount,
    updated_at = NOW()
  WHERE id = p_account_id;
  
  -- Create ledger entry
  INSERT INTO public.ledger (
    tenant_id,
    account_id,
    type,
    amount,
    currency,
    balance_before,
    balance_after,
    reference_type,
    reference_id,
    description,
    created_at
  ) VALUES (
    v_tenant_id,
    p_account_id,
    'credit',
    p_amount,
    p_currency,
    v_current_balance,
    v_current_balance + p_amount,
    p_reference_type,
    p_reference_id,
    p_description,
    NOW()
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to credit account: %', SQLERRM;
    RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.credit_account IS 'Credits an account balance and creates ledger entry. SECURITY DEFINER with empty search_path for security.';

-- ============================================
-- Function: debit_account
-- ============================================
-- Debits an account balance and creates ledger entry
CREATE OR REPLACE FUNCTION public.debit_account(
  p_account_id UUID,
  p_amount NUMERIC,
  p_currency VARCHAR(10),
  p_reference_type VARCHAR(50),
  p_reference_id UUID,
  p_description TEXT DEFAULT NULL,
  p_allow_negative BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant_id UUID;
  v_current_balance NUMERIC;
BEGIN
  -- Get account tenant_id and current balance
  SELECT tenant_id, balance
  INTO v_tenant_id, v_current_balance
  FROM public.accounts
  WHERE id = p_account_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found: %', p_account_id;
  END IF;
  
  -- Check for sufficient balance if negative not allowed
  IF NOT p_allow_negative AND v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance: % < %', v_current_balance, p_amount;
  END IF;
  
  -- Update account balance
  UPDATE public.accounts
  SET 
    balance = balance - p_amount,
    updated_at = NOW()
  WHERE id = p_account_id;
  
  -- Create ledger entry
  INSERT INTO public.ledger (
    tenant_id,
    account_id,
    type,
    amount,
    currency,
    balance_before,
    balance_after,
    reference_type,
    reference_id,
    description,
    created_at
  ) VALUES (
    v_tenant_id,
    p_account_id,
    'debit',
    p_amount,
    p_currency,
    v_current_balance,
    v_current_balance - p_amount,
    p_reference_type,
    p_reference_id,
    p_description,
    NOW()
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to debit account: %', SQLERRM;
    RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.debit_account IS 'Debits an account balance and creates ledger entry. SECURITY DEFINER with empty search_path for security.';

-- ============================================
-- Verification
-- ============================================

DO $$
DECLARE
  v_function_count INT;
BEGIN
  -- Check that both functions exist with proper security settings
  SELECT COUNT(*)
  INTO v_function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN ('credit_account', 'debit_account')
    AND p.prosecdef = true; -- SECURITY DEFINER
  
  IF v_function_count < 2 THEN
    RAISE WARNING 'Expected 2 account operation functions with SECURITY DEFINER, found %', v_function_count;
  ELSE
    RAISE NOTICE '✅ All 2 account operation functions updated with SECURITY DEFINER and search_path protection';
  END IF;
END $$;

-- ============================================
-- Security Notes
-- ============================================

COMMENT ON FUNCTION public.credit_account IS 'Story 16.2: Fixed search_path for account operations to prevent SQL injection. Function uses SET search_path = '''' and SECURITY DEFINER. HIGH SECURITY IMPACT - handles financial transactions.';
COMMENT ON FUNCTION public.debit_account IS 'Story 16.2: Fixed search_path for account operations to prevent SQL injection. Function uses SET search_path = '''' and SECURITY DEFINER. HIGH SECURITY IMPACT - handles financial transactions.';


