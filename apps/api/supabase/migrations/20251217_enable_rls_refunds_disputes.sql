-- ============================================
-- Story 15.1: Enable RLS on Refunds & Disputes
-- ============================================
-- Priority: P0 (CRITICAL SECURITY)
-- Description: Implement Row-Level Security policies on refunds and disputes tables
--              to prevent cross-tenant data access.

-- ============================================
-- REFUNDS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

-- SELECT Policy: Tenants can only view their own refunds
CREATE POLICY "Tenants can view their own refunds" ON refunds
  FOR SELECT 
  USING (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

-- INSERT Policy: Tenants can only create refunds for their own data
CREATE POLICY "Tenants can insert their own refunds" ON refunds
  FOR INSERT 
  WITH CHECK (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

-- UPDATE Policy: Tenants can only update their own refunds
CREATE POLICY "Tenants can update their own refunds" ON refunds
  FOR UPDATE 
  USING (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

-- DELETE Policy: Tenants can only delete their own refunds
CREATE POLICY "Tenants can delete their own refunds" ON refunds
  FOR DELETE 
  USING (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

-- ============================================
-- DISPUTES TABLE
-- ============================================

-- Enable RLS
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- SELECT Policy: Tenants can only view their own disputes
CREATE POLICY "Tenants can view their own disputes" ON disputes
  FOR SELECT 
  USING (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

-- INSERT Policy: Tenants can only create disputes for their own data
CREATE POLICY "Tenants can insert their own disputes" ON disputes
  FOR INSERT 
  WITH CHECK (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

-- UPDATE Policy: Tenants can only update their own disputes
CREATE POLICY "Tenants can update their own disputes" ON disputes
  FOR UPDATE 
  USING (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

-- DELETE Policy: Tenants can only delete their own disputes
CREATE POLICY "Tenants can delete their own disputes" ON disputes
  FOR DELETE 
  USING (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'refunds') THEN
    RAISE EXCEPTION 'RLS not enabled on refunds table';
  END IF;
  
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'disputes') THEN
    RAISE EXCEPTION 'RLS not enabled on disputes table';
  END IF;
  
  RAISE NOTICE '✅ RLS successfully enabled on refunds and disputes tables';
END $$;






