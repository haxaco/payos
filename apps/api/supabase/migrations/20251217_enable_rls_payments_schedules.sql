-- ============================================
-- Story 15.2: Enable RLS on Payment Methods & Transfer Schedules
-- ============================================
-- Priority: P0 (CRITICAL SECURITY - CONTAINS BANK ACCOUNT DATA)
-- Description: Implement Row-Level Security policies on payment_methods and 
--              transfer_schedules tables. Payment methods contain highly sensitive
--              bank account, card, and wallet information.

-- ============================================
-- PAYMENT_METHODS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- SELECT Policy: Tenants can only view their own payment methods
CREATE POLICY "Tenants can view their own payment methods" ON payment_methods
  FOR SELECT 
  USING (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

-- INSERT Policy: Tenants can only create payment methods for their own data
CREATE POLICY "Tenants can insert their own payment methods" ON payment_methods
  FOR INSERT 
  WITH CHECK (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

-- UPDATE Policy: Tenants can only update their own payment methods
CREATE POLICY "Tenants can update their own payment methods" ON payment_methods
  FOR UPDATE 
  USING (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

-- DELETE Policy: Tenants can only delete their own payment methods
CREATE POLICY "Tenants can delete their own payment methods" ON payment_methods
  FOR DELETE 
  USING (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

-- ============================================
-- TRANSFER_SCHEDULES TABLE
-- ============================================

-- Enable RLS
ALTER TABLE transfer_schedules ENABLE ROW LEVEL SECURITY;

-- SELECT Policy: Tenants can only view their own transfer schedules
CREATE POLICY "Tenants can view their own transfer schedules" ON transfer_schedules
  FOR SELECT 
  USING (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

-- INSERT Policy: Tenants can only create transfer schedules for their own data
CREATE POLICY "Tenants can insert their own transfer schedules" ON transfer_schedules
  FOR INSERT 
  WITH CHECK (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

-- UPDATE Policy: Tenants can only update their own transfer schedules
CREATE POLICY "Tenants can update their own transfer schedules" ON transfer_schedules
  FOR UPDATE 
  USING (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

-- DELETE Policy: Tenants can only delete their own transfer schedules
CREATE POLICY "Tenants can delete their own transfer schedules" ON transfer_schedules
  FOR DELETE 
  USING (tenant_id = (auth.jwt() ->> 'app_tenant_id')::uuid);

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'payment_methods') THEN
    RAISE EXCEPTION 'RLS not enabled on payment_methods table';
  END IF;
  
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'transfer_schedules') THEN
    RAISE EXCEPTION 'RLS not enabled on transfer_schedules table';
  END IF;
  
  RAISE NOTICE '✅ RLS successfully enabled on payment_methods and transfer_schedules tables';
  RAISE NOTICE '🔒 CRITICAL: Bank account and card data is now protected';
END $$;

