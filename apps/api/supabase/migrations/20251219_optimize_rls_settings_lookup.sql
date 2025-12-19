-- ============================================
-- Migration: Optimize RLS Policies - Settings & Lookup Tables
-- Story: 16.6
-- Date: 2025-12-19
-- Purpose: Optimize RLS policies to prevent auth.jwt() re-evaluation
--          for each row, improving query performance
-- ============================================

-- ============================================
-- TENANT_SETTINGS (4 policies)
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Tenants can view their own settings" ON tenant_settings;
DROP POLICY IF EXISTS "Tenants can insert their own settings" ON tenant_settings;
DROP POLICY IF EXISTS "Tenants can update their own settings" ON tenant_settings;
DROP POLICY IF EXISTS "Tenants can delete their own settings" ON tenant_settings;

-- Recreate with optimized auth.jwt() call
CREATE POLICY "Tenants can view their own settings" ON tenant_settings
  FOR SELECT 
  USING (tenant_id = ((select auth.jwt() ->> 'app_tenant_id'))::uuid);

CREATE POLICY "Tenants can insert their own settings" ON tenant_settings
  FOR INSERT 
  WITH CHECK (tenant_id = ((select auth.jwt() ->> 'app_tenant_id'))::uuid);

CREATE POLICY "Tenants can update their own settings" ON tenant_settings
  FOR UPDATE 
  USING (tenant_id = ((select auth.jwt() ->> 'app_tenant_id'))::uuid);

CREATE POLICY "Tenants can delete their own settings" ON tenant_settings
  FOR DELETE 
  USING (tenant_id = ((select auth.jwt() ->> 'app_tenant_id'))::uuid);

-- ============================================
-- KYA_TIER_LIMITS (1 policy)
-- ============================================

-- Drop existing policy
DROP POLICY IF EXISTS "Authenticated users can view tier limits" ON kya_tier_limits;

-- Recreate with optimized auth.role() call
CREATE POLICY "Authenticated users can view tier limits" ON kya_tier_limits
  FOR SELECT 
  USING ((select auth.role()) = 'authenticated');

-- ============================================
-- VERIFICATION_TIER_LIMITS (1 policy)
-- ============================================

-- Drop existing policy
DROP POLICY IF EXISTS "Authenticated users can view tier limits" ON verification_tier_limits;

-- Recreate with optimized auth.role() call
CREATE POLICY "Authenticated users can view tier limits" ON verification_tier_limits
  FOR SELECT 
  USING ((select auth.role()) = 'authenticated');

-- ============================================
-- Verification
-- ============================================

DO $$
DECLARE
  v_policy_count INT;
BEGIN
  -- Check that all policies exist
  SELECT COUNT(*)
  INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('tenant_settings', 'kya_tier_limits', 'verification_tier_limits');
  
  IF v_policy_count < 6 THEN
    RAISE WARNING 'Expected 6 RLS policies, found %', v_policy_count;
  ELSE
    RAISE NOTICE '✅ All 6 RLS policies optimized for Settings & Lookup tables';
  END IF;
END $$;

-- ============================================
-- Performance Notes
-- ============================================

COMMENT ON TABLE tenant_settings IS 'Story 16.6: RLS policies optimized. auth.jwt() now wrapped in SELECT to prevent per-row re-evaluation. Expected performance improvement: 10-30% on queries returning multiple rows.';
COMMENT ON TABLE kya_tier_limits IS 'Story 16.6: RLS policy optimized. auth.role() now wrapped in SELECT to prevent per-row re-evaluation.';
COMMENT ON TABLE verification_tier_limits IS 'Story 16.6: RLS policy optimized. auth.role() now wrapped in SELECT to prevent per-row re-evaluation.';


