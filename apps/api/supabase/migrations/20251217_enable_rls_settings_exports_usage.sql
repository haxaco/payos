-- ============================================
-- Story 15.3: Enable RLS on Settings, Exports & Agent Usage
-- ============================================
-- Priority: P0 (CRITICAL SECURITY - FLAGGED BY SUPABASE)
-- Description: Implement Row-Level Security policies on tenant_settings, exports,
--              and agent_usage tables. tenant_settings was specifically flagged by
--              Supabase security scan.

-- ============================================
-- TENANT_SETTINGS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

-- SELECT Policy: Tenants can only view their own settings
CREATE POLICY "Tenants can view their own settings" ON tenant_settings
  FOR SELECT 
  USING (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

-- INSERT Policy: Tenants can only create settings for themselves
CREATE POLICY "Tenants can insert their own settings" ON tenant_settings
  FOR INSERT 
  WITH CHECK (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

-- UPDATE Policy: Tenants can only update their own settings
CREATE POLICY "Tenants can update their own settings" ON tenant_settings
  FOR UPDATE 
  USING (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

-- DELETE Policy: Tenants can only delete their own settings
CREATE POLICY "Tenants can delete their own settings" ON tenant_settings
  FOR DELETE 
  USING (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

-- ============================================
-- EXPORTS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

-- SELECT Policy: Tenants can only view their own exports
CREATE POLICY "Tenants can view their own exports" ON exports
  FOR SELECT 
  USING (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

-- INSERT Policy: Tenants can only create exports for their own data
CREATE POLICY "Tenants can insert their own exports" ON exports
  FOR INSERT 
  WITH CHECK (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

-- UPDATE Policy: Tenants can only update their own exports
CREATE POLICY "Tenants can update their own exports" ON exports
  FOR UPDATE 
  USING (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

-- DELETE Policy: Tenants can only delete their own exports
CREATE POLICY "Tenants can delete their own exports" ON exports
  FOR DELETE 
  USING (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

-- ============================================
-- AGENT_USAGE TABLE
-- ============================================

-- Enable RLS
ALTER TABLE agent_usage ENABLE ROW LEVEL SECURITY;

-- SELECT Policy: Tenants can only view their own agent usage
CREATE POLICY "Tenants can view their own agent usage" ON agent_usage
  FOR SELECT 
  USING (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

-- INSERT Policy: Tenants can only create agent usage records for their own data
CREATE POLICY "Tenants can insert their own agent usage" ON agent_usage
  FOR INSERT 
  WITH CHECK (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

-- UPDATE Policy: Tenants can only update their own agent usage
CREATE POLICY "Tenants can update their own agent usage" ON agent_usage
  FOR UPDATE 
  USING (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

-- DELETE Policy: Tenants can only delete their own agent usage
CREATE POLICY "Tenants can delete their own agent usage" ON agent_usage
  FOR DELETE 
  USING (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'tenant_settings') THEN
    RAISE EXCEPTION 'RLS not enabled on tenant_settings table';
  END IF;
  
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'exports') THEN
    RAISE EXCEPTION 'RLS not enabled on exports table';
  END IF;
  
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'agent_usage') THEN
    RAISE EXCEPTION 'RLS not enabled on agent_usage table';
  END IF;
  
  RAISE NOTICE '✅ RLS successfully enabled on tenant_settings, exports, and agent_usage tables';
  RAISE NOTICE '🛡️  Supabase security warning has been resolved';
END $$;






