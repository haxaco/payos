-- ============================================
-- Migration: Optimize RLS Policies - Config & Analytics
-- Story: 16.8
-- Date: 2025-12-19
-- Purpose: Optimize RLS policies on configuration and analytics tables
--          for better bulk operations and reporting performance
-- ============================================

-- ============================================
-- EXPORTS (4 policies)
-- ============================================

DROP POLICY IF EXISTS "Tenants can view their own exports" ON exports;
DROP POLICY IF EXISTS "Tenants can insert their own exports" ON exports;
DROP POLICY IF EXISTS "Tenants can update their own exports" ON exports;
DROP POLICY IF EXISTS "Tenants can delete their own exports" ON exports;

CREATE POLICY "Tenants can view their own exports" ON exports
  FOR SELECT 
  USING (tenant_id = ((select public.get_user_tenant_id())));

CREATE POLICY "Tenants can insert their own exports" ON exports
  FOR INSERT 
  WITH CHECK (tenant_id = ((select public.get_user_tenant_id())));

CREATE POLICY "Tenants can update their own exports" ON exports
  FOR UPDATE 
  USING (tenant_id = ((select public.get_user_tenant_id())));

CREATE POLICY "Tenants can delete their own exports" ON exports
  FOR DELETE 
  USING (tenant_id = ((select public.get_user_tenant_id())));

-- ============================================
-- AGENT_USAGE (4 policies)
-- ============================================

DROP POLICY IF EXISTS "Tenants can view their own agent usage" ON agent_usage;
DROP POLICY IF EXISTS "Tenants can insert their own agent usage" ON agent_usage;
DROP POLICY IF EXISTS "Tenants can update their own agent usage" ON agent_usage;
DROP POLICY IF EXISTS "Tenants can delete their own agent usage" ON agent_usage;

CREATE POLICY "Tenants can view their own agent usage" ON agent_usage
  FOR SELECT 
  USING (tenant_id = ((select public.get_user_tenant_id())));

CREATE POLICY "Tenants can insert their own agent usage" ON agent_usage
  FOR INSERT 
  WITH CHECK (tenant_id = ((select public.get_user_tenant_id())));

CREATE POLICY "Tenants can update their own agent usage" ON agent_usage
  FOR UPDATE 
  USING (tenant_id = ((select public.get_user_tenant_id())));

CREATE POLICY "Tenants can delete their own agent usage" ON agent_usage
  FOR DELETE 
  USING (tenant_id = ((select public.get_user_tenant_id())));

-- ============================================
-- Verification
-- ============================================

DO $$
DECLARE
  v_policy_count INT;
BEGIN
  -- Check that all 8 policies exist
  SELECT COUNT(*)
  INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('exports', 'agent_usage');
  
  IF v_policy_count < 8 THEN
    RAISE WARNING 'Expected 8 RLS policies, found %', v_policy_count;
  ELSE
    RAISE NOTICE '✅ All 8 RLS policies optimized for Config & Analytics tables';
  END IF;
END $$;

-- ============================================
-- Performance Notes
-- ============================================

COMMENT ON TABLE exports IS 'Story 16.8: RLS policies optimized. get_user_tenant_id() now wrapped in SELECT. MEDIUM PERFORMANCE IMPACT - important for data export operations.';
COMMENT ON TABLE agent_usage IS 'Story 16.8: RLS policies optimized. get_user_tenant_id() now wrapped in SELECT. MEDIUM PERFORMANCE IMPACT - important for analytics and reporting.';


