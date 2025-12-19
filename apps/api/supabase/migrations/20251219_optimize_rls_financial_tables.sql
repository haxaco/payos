-- ============================================
-- Migration: Optimize RLS Policies - Financial Tables
-- Story: 16.7
-- Date: 2025-12-19
-- Purpose: Optimize RLS policies on frequently-queried financial tables
--          to improve query performance at scale
-- ============================================

-- ============================================
-- REFUNDS (4 policies)
-- ============================================

DROP POLICY IF EXISTS "Tenants can view their own refunds" ON refunds;
DROP POLICY IF EXISTS "Tenants can insert their own refunds" ON refunds;
DROP POLICY IF EXISTS "Tenants can update their own refunds" ON refunds;
DROP POLICY IF EXISTS "Tenants can delete their own refunds" ON refunds;

CREATE POLICY "Tenants can view their own refunds" ON refunds
  FOR SELECT 
  USING (tenant_id = ((select public.get_user_tenant_id())));

CREATE POLICY "Tenants can insert their own refunds" ON refunds
  FOR INSERT 
  WITH CHECK (tenant_id = ((select public.get_user_tenant_id())));

CREATE POLICY "Tenants can update their own refunds" ON refunds
  FOR UPDATE 
  USING (tenant_id = ((select public.get_user_tenant_id())));

CREATE POLICY "Tenants can delete their own refunds" ON refunds
  FOR DELETE 
  USING (tenant_id = ((select public.get_user_tenant_id())));

-- ============================================
-- DISPUTES (4 policies)
-- ============================================

DROP POLICY IF EXISTS "Tenants can view their own disputes" ON disputes;
DROP POLICY IF EXISTS "Tenants can insert their own disputes" ON disputes;
DROP POLICY IF EXISTS "Tenants can update their own disputes" ON disputes;
DROP POLICY IF EXISTS "Tenants can delete their own disputes" ON disputes;

CREATE POLICY "Tenants can view their own disputes" ON disputes
  FOR SELECT 
  USING (tenant_id = ((select public.get_user_tenant_id())));

CREATE POLICY "Tenants can insert their own disputes" ON disputes
  FOR INSERT 
  WITH CHECK (tenant_id = ((select public.get_user_tenant_id())));

CREATE POLICY "Tenants can update their own disputes" ON disputes
  FOR UPDATE 
  USING (tenant_id = ((select public.get_user_tenant_id())));

CREATE POLICY "Tenants can delete their own disputes" ON disputes
  FOR DELETE 
  USING (tenant_id = ((select public.get_user_tenant_id())));

-- ============================================
-- PAYMENT_METHODS (4 policies)
-- ============================================

DROP POLICY IF EXISTS "Tenants can view their own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Tenants can insert their own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Tenants can update their own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Tenants can delete their own payment methods" ON payment_methods;

CREATE POLICY "Tenants can view their own payment methods" ON payment_methods
  FOR SELECT 
  USING (tenant_id = ((select public.get_user_tenant_id())));

CREATE POLICY "Tenants can insert their own payment methods" ON payment_methods
  FOR INSERT 
  WITH CHECK (tenant_id = ((select public.get_user_tenant_id())));

CREATE POLICY "Tenants can update their own payment methods" ON payment_methods
  FOR UPDATE 
  USING (tenant_id = ((select public.get_user_tenant_id())));

CREATE POLICY "Tenants can delete their own payment methods" ON payment_methods
  FOR DELETE 
  USING (tenant_id = ((select public.get_user_tenant_id())));

-- ============================================
-- TRANSFER_SCHEDULES (4 policies)
-- ============================================

DROP POLICY IF EXISTS "Tenants can view their own transfer schedules" ON transfer_schedules;
DROP POLICY IF EXISTS "Tenants can insert their own transfer schedules" ON transfer_schedules;
DROP POLICY IF EXISTS "Tenants can update their own transfer schedules" ON transfer_schedules;
DROP POLICY IF EXISTS "Tenants can delete their own transfer schedules" ON transfer_schedules;

CREATE POLICY "Tenants can view their own transfer schedules" ON transfer_schedules
  FOR SELECT 
  USING (tenant_id = ((select public.get_user_tenant_id())));

CREATE POLICY "Tenants can insert their own transfer schedules" ON transfer_schedules
  FOR INSERT 
  WITH CHECK (tenant_id = ((select public.get_user_tenant_id())));

CREATE POLICY "Tenants can update their own transfer schedules" ON transfer_schedules
  FOR UPDATE 
  USING (tenant_id = ((select public.get_user_tenant_id())));

CREATE POLICY "Tenants can delete their own transfer schedules" ON transfer_schedules
  FOR DELETE 
  USING (tenant_id = ((select public.get_user_tenant_id())));

-- ============================================
-- Verification
-- ============================================

DO $$
DECLARE
  v_policy_count INT;
BEGIN
  -- Check that all 16 policies exist
  SELECT COUNT(*)
  INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('refunds', 'disputes', 'payment_methods', 'transfer_schedules');
  
  IF v_policy_count < 16 THEN
    RAISE WARNING 'Expected 16 RLS policies, found %', v_policy_count;
  ELSE
    RAISE NOTICE '✅ All 16 RLS policies optimized for Financial tables';
  END IF;
END $$;

-- ============================================
-- Performance Notes
-- ============================================

COMMENT ON TABLE refunds IS 'Story 16.7: RLS policies optimized. get_user_tenant_id() now wrapped in SELECT. HIGH PERFORMANCE IMPACT - frequently queried table.';
COMMENT ON TABLE disputes IS 'Story 16.7: RLS policies optimized. get_user_tenant_id() now wrapped in SELECT. HIGH PERFORMANCE IMPACT - frequently queried table.';
COMMENT ON TABLE payment_methods IS 'Story 16.7: RLS policies optimized. get_user_tenant_id() now wrapped in SELECT. HIGH PERFORMANCE IMPACT - frequently queried table.';
COMMENT ON TABLE transfer_schedules IS 'Story 16.7: RLS policies optimized. get_user_tenant_id() now wrapped in SELECT. MEDIUM PERFORMANCE IMPACT.';


