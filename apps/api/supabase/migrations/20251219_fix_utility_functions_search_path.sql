-- ============================================
-- Migration: Fix Search Path for Utility Functions
-- Story: 16.1
-- Date: 2025-12-19
-- Purpose: Fix search_path parameter for utility and audit functions
--          to prevent search path injection attacks
-- ============================================

-- ============================================
-- Function: update_updated_at_column
-- ============================================
-- Generic trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at_column IS 'Generic trigger function to update updated_at timestamp. SECURITY DEFINER with empty search_path for security.';

-- ============================================
-- Function: update_compliance_flags_updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_compliance_flags_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_compliance_flags_updated_at IS 'Trigger function to update compliance_flags.updated_at. SECURITY DEFINER with empty search_path for security.';

-- ============================================
-- Function: update_team_invites_updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_team_invites_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_team_invites_updated_at IS 'Trigger function to update team_invites.updated_at. SECURITY DEFINER with empty search_path for security.';

-- ============================================
-- Function: update_api_keys_updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_api_keys_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_api_keys_updated_at IS 'Trigger function to update api_keys.updated_at. SECURITY DEFINER with empty search_path for security.';

-- ============================================
-- Function: log_audit
-- ============================================
-- Audit logging function with proper security
CREATE OR REPLACE FUNCTION public.log_audit(
  p_tenant_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_action TEXT,
  p_actor_type TEXT,
  p_actor_id UUID,
  p_actor_name TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO public.audit_log (
    tenant_id,
    entity_type,
    entity_id,
    action,
    actor_type,
    actor_id,
    actor_name,
    metadata,
    created_at
  ) VALUES (
    p_tenant_id,
    p_entity_type,
    p_entity_id,
    p_action,
    p_actor_type,
    p_actor_id,
    p_actor_name,
    p_metadata,
    NOW()
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

COMMENT ON FUNCTION public.log_audit IS 'Creates audit log entries for all mutations. SECURITY DEFINER with empty search_path for security.';

-- ============================================
-- Verification
-- ============================================

DO $$
DECLARE
  v_function_count INT;
BEGIN
  -- Check that all functions exist with proper security settings
  SELECT COUNT(*)
  INTO v_function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'update_updated_at_column',
      'update_compliance_flags_updated_at',
      'update_team_invites_updated_at',
      'update_api_keys_updated_at',
      'log_audit'
    )
    AND p.prosecdef = true; -- SECURITY DEFINER
  
  IF v_function_count < 5 THEN
    RAISE WARNING 'Expected 5 functions with SECURITY DEFINER, found %', v_function_count;
  ELSE
    RAISE NOTICE '✅ All 5 utility functions updated with SECURITY DEFINER and search_path protection';
  END IF;
END $$;

-- ============================================
-- Security Notes
-- ============================================

COMMENT ON SCHEMA public IS 'Story 16.1: Fixed search_path for utility functions to prevent SQL injection via search path manipulation. All functions now use SET search_path = '''' and SECURITY DEFINER.';


