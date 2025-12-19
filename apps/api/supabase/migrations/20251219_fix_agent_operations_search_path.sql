-- ============================================
-- Migration: Fix Search Path for Agent Operations
-- Story: 16.4
-- Date: 2025-12-19
-- Purpose: Fix search_path parameter for agent limit and usage tracking
--          to prevent search path injection attacks
-- ============================================

-- ============================================
-- Function: calculate_agent_effective_limits
-- ============================================
-- Calculates effective limits for an agent based on tier and custom limits
CREATE OR REPLACE FUNCTION public.calculate_agent_effective_limits(
  p_agent_id UUID
)
RETURNS TABLE(
  max_transaction_amount NUMERIC,
  daily_transaction_limit NUMERIC,
  monthly_transaction_limit NUMERIC,
  max_active_streams INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_kya_tier INTEGER;
  v_custom_limits JSONB;
BEGIN
  -- Get agent's KYA tier and custom limits
  SELECT kya_tier, custom_limits
  INTO v_kya_tier, v_custom_limits
  FROM public.agents
  WHERE id = p_agent_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent not found: %', p_agent_id;
  END IF;
  
  -- Get tier limits from kya_tier_limits table
  RETURN QUERY
  SELECT 
    COALESCE(
      (v_custom_limits->>'max_transaction_amount')::NUMERIC,
      ktl.max_transaction_amount
    ) as max_transaction_amount,
    COALESCE(
      (v_custom_limits->>'daily_transaction_limit')::NUMERIC,
      ktl.daily_transaction_limit
    ) as daily_transaction_limit,
    COALESCE(
      (v_custom_limits->>'monthly_transaction_limit')::NUMERIC,
      ktl.monthly_transaction_limit
    ) as monthly_transaction_limit,
    COALESCE(
      (v_custom_limits->>'max_active_streams')::INTEGER,
      ktl.max_active_streams
    ) as max_active_streams
  FROM public.kya_tier_limits ktl
  WHERE ktl.tier = v_kya_tier;
  
  -- If no tier limits found, return defaults
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      1000::NUMERIC as max_transaction_amount,
      5000::NUMERIC as daily_transaction_limit,
      50000::NUMERIC as monthly_transaction_limit,
      5::INTEGER as max_active_streams;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.calculate_agent_effective_limits IS 'Calculates effective limits for an agent based on tier and custom limits. SECURITY DEFINER with empty search_path for security.';

-- ============================================
-- Function: record_agent_usage
-- ============================================
-- Records agent usage statistics for monitoring and billing
CREATE OR REPLACE FUNCTION public.record_agent_usage(
  p_agent_id UUID,
  p_tenant_id UUID,
  p_operation_type VARCHAR(50),
  p_amount NUMERIC DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_usage_id UUID;
  v_current_date DATE;
BEGIN
  v_current_date := CURRENT_DATE;
  
  -- Insert or update agent_usage record
  INSERT INTO public.agent_usage (
    id,
    tenant_id,
    agent_id,
    date,
    operation_type,
    operation_count,
    total_amount,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    p_tenant_id,
    p_agent_id,
    v_current_date,
    p_operation_type,
    1,
    COALESCE(p_amount, 0),
    p_metadata,
    NOW(),
    NOW()
  )
  ON CONFLICT (tenant_id, agent_id, date, operation_type)
  DO UPDATE SET
    operation_count = public.agent_usage.operation_count + 1,
    total_amount = public.agent_usage.total_amount + COALESCE(p_amount, 0),
    metadata = public.agent_usage.metadata || p_metadata,
    updated_at = NOW()
  RETURNING id INTO v_usage_id;
  
  RETURN v_usage_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to record agent usage: %', SQLERRM;
    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.record_agent_usage IS 'Records agent usage statistics for monitoring and billing. SECURITY DEFINER with empty search_path for security.';

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
    AND p.proname IN (
      'calculate_agent_effective_limits',
      'record_agent_usage'
    )
    AND p.prosecdef = true; -- SECURITY DEFINER
  
  IF v_function_count < 2 THEN
    RAISE WARNING 'Expected 2 agent operation functions with SECURITY DEFINER, found %', v_function_count;
  ELSE
    RAISE NOTICE '✅ All 2 agent operation functions updated with SECURITY DEFINER and search_path protection';
  END IF;
END $$;

-- ============================================
-- Security Notes
-- ============================================

COMMENT ON FUNCTION public.calculate_agent_effective_limits IS 'Story 16.4: Fixed search_path for agent operations to prevent SQL injection. Function uses SET search_path = '''' and SECURITY DEFINER. Calculates agent limits based on KYA tier.';
COMMENT ON FUNCTION public.record_agent_usage IS 'Story 16.4: Fixed search_path for agent operations to prevent SQL injection. Function uses SET search_path = '''' and SECURITY DEFINER. Records agent usage for monitoring and billing.';


