-- ============================================
-- Migration: Optimize RLS Policies - Core Platform
-- Story: 16.9
-- Date: 2025-12-19
-- Purpose: Optimize RLS policies on core platform tables for better
--          authentication and security operation performance
-- ============================================

-- ============================================
-- SECURITY_EVENTS (1 policy)
-- ============================================

DROP POLICY IF EXISTS "Users can view their own security events" ON security_events;

CREATE POLICY "Users can view their own security events" ON security_events
  FOR SELECT 
  USING (user_id = ((select auth.uid())));

-- ============================================
-- COMPLIANCE_FLAGS (1 policy)
-- ============================================

DROP POLICY IF EXISTS "Tenants can view their own compliance flags" ON compliance_flags;

CREATE POLICY "Tenants can view their own compliance flags" ON compliance_flags
  FOR SELECT 
  USING (tenant_id = ((select public.get_user_tenant_id())));

-- ============================================
-- USER_PROFILES (1 policy)
-- ============================================

DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;

CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT 
  USING (user_id = ((select auth.uid())));

-- ============================================
-- TEAM_INVITES (1 policy)
-- ============================================

DROP POLICY IF EXISTS "Tenants can view their own team invites" ON team_invites;

CREATE POLICY "Tenants can view their own team invites" ON team_invites
  FOR SELECT 
  USING (tenant_id = ((select public.get_user_tenant_id())));

-- ============================================
-- API_KEYS (1 policy)
-- ============================================

DROP POLICY IF EXISTS "Tenants can view their own api keys" ON api_keys;

CREATE POLICY "Tenants can view their own api keys" ON api_keys
  FOR SELECT 
  USING (tenant_id = ((select public.get_user_tenant_id())));

-- ============================================
-- Verification
-- ============================================

DO $$
DECLARE
  v_policy_count INT;
BEGIN
  -- Check that all 5 policies exist
  SELECT COUNT(*)
  INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('security_events', 'compliance_flags', 'user_profiles', 'team_invites', 'api_keys')
    AND policyname LIKE '%view%';
  
  IF v_policy_count < 5 THEN
    RAISE WARNING 'Expected 5 RLS policies, found %', v_policy_count;
  ELSE
    RAISE NOTICE '✅ All 5 RLS policies optimized for Core Platform tables';
  END IF;
END $$;

-- ============================================
-- Performance Notes
-- ============================================

COMMENT ON TABLE security_events IS 'Story 16.9: RLS policy optimized. auth.uid() now wrapped in SELECT. MEDIUM PERFORMANCE IMPACT - important for authentication flows.';
COMMENT ON TABLE compliance_flags IS 'Story 16.9: RLS policy optimized. get_user_tenant_id() now wrapped in SELECT. MEDIUM PERFORMANCE IMPACT.';
COMMENT ON TABLE user_profiles IS 'Story 16.9: RLS policy optimized. auth.uid() now wrapped in SELECT. MEDIUM PERFORMANCE IMPACT - critical for user operations.';
COMMENT ON TABLE team_invites IS 'Story 16.9: RLS policy optimized. get_user_tenant_id() now wrapped in SELECT.';
COMMENT ON TABLE api_keys IS 'Story 16.9: RLS policy optimized. get_user_tenant_id() now wrapped in SELECT. MEDIUM PERFORMANCE IMPACT - frequently accessed.';


