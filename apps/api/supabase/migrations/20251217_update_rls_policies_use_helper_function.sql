-- ============================================
-- Update RLS Policies to Use Helper Function
-- ============================================
-- Update all RLS policies to use get_user_tenant_id() instead of
-- reading app_tenant_id directly from JWT (which doesn't exist in Supabase Auth tokens)

-- ============================================
-- REFUNDS TABLE
-- ============================================

DROP POLICY IF EXISTS "Tenants can view their own refunds" ON refunds;
DROP POLICY IF EXISTS "Tenants can insert their own refunds" ON refunds;
DROP POLICY IF EXISTS "Tenants can update their own refunds" ON refunds;
DROP POLICY IF EXISTS "Tenants can delete their own refunds" ON refunds;

CREATE POLICY "Tenants can view their own refunds" ON refunds
  FOR SELECT 
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenants can insert their own refunds" ON refunds
  FOR INSERT 
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenants can update their own refunds" ON refunds
  FOR UPDATE 
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenants can delete their own refunds" ON refunds
  FOR DELETE 
  USING (tenant_id = public.get_user_tenant_id());

-- ============================================
-- DISPUTES TABLE
-- ============================================

DROP POLICY IF EXISTS "Tenants can view their own disputes" ON disputes;
DROP POLICY IF EXISTS "Tenants can insert their own disputes" ON disputes;
DROP POLICY IF EXISTS "Tenants can update their own disputes" ON disputes;
DROP POLICY IF EXISTS "Tenants can delete their own disputes" ON disputes;

CREATE POLICY "Tenants can view their own disputes" ON disputes
  FOR SELECT 
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenants can insert their own disputes" ON disputes
  FOR INSERT 
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenants can update their own disputes" ON disputes
  FOR UPDATE 
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenants can delete their own disputes" ON disputes
  FOR DELETE 
  USING (tenant_id = public.get_user_tenant_id());

-- ============================================
-- PAYMENT_METHODS TABLE
-- ============================================

DROP POLICY IF EXISTS "Tenants can view their own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Tenants can insert their own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Tenants can update their own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Tenants can delete their own payment methods" ON payment_methods;

CREATE POLICY "Tenants can view their own payment methods" ON payment_methods
  FOR SELECT 
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenants can insert their own payment methods" ON payment_methods
  FOR INSERT 
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenants can update their own payment methods" ON payment_methods
  FOR UPDATE 
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenants can delete their own payment methods" ON payment_methods
  FOR DELETE 
  USING (tenant_id = public.get_user_tenant_id());

-- ============================================
-- TRANSFER_SCHEDULES TABLE
-- ============================================

DROP POLICY IF EXISTS "Tenants can view their own transfer schedules" ON transfer_schedules;
DROP POLICY IF EXISTS "Tenants can insert their own transfer schedules" ON transfer_schedules;
DROP POLICY IF EXISTS "Tenants can update their own transfer schedules" ON transfer_schedules;
DROP POLICY IF EXISTS "Tenants can delete their own transfer schedules" ON transfer_schedules;

CREATE POLICY "Tenants can view their own transfer schedules" ON transfer_schedules
  FOR SELECT 
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenants can insert their own transfer schedules" ON transfer_schedules
  FOR INSERT 
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenants can update their own transfer schedules" ON transfer_schedules
  FOR UPDATE 
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenants can delete their own transfer schedules" ON transfer_schedules
  FOR DELETE 
  USING (tenant_id = public.get_user_tenant_id());

-- ============================================
-- TENANT_SETTINGS TABLE
-- ============================================

DROP POLICY IF EXISTS "Tenants can view their own settings" ON tenant_settings;
DROP POLICY IF EXISTS "Tenants can insert their own settings" ON tenant_settings;
DROP POLICY IF EXISTS "Tenants can update their own settings" ON tenant_settings;
DROP POLICY IF EXISTS "Tenants can delete their own settings" ON tenant_settings;

CREATE POLICY "Tenants can view their own settings" ON tenant_settings
  FOR SELECT 
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenants can insert their own settings" ON tenant_settings
  FOR INSERT 
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenants can update their own settings" ON tenant_settings
  FOR UPDATE 
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenants can delete their own settings" ON tenant_settings
  FOR DELETE 
  USING (tenant_id = public.get_user_tenant_id());

-- ============================================
-- EXPORTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Tenants can view their own exports" ON exports;
DROP POLICY IF EXISTS "Tenants can insert their own exports" ON exports;
DROP POLICY IF EXISTS "Tenants can update their own exports" ON exports;
DROP POLICY IF EXISTS "Tenants can delete their own exports" ON exports;

CREATE POLICY "Tenants can view their own exports" ON exports
  FOR SELECT 
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenants can insert their own exports" ON exports
  FOR INSERT 
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenants can update their own exports" ON exports
  FOR UPDATE 
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenants can delete their own exports" ON exports
  FOR DELETE 
  USING (tenant_id = public.get_user_tenant_id());

-- ============================================
-- AGENT_USAGE TABLE
-- ============================================

DROP POLICY IF EXISTS "Tenants can view their own agent usage" ON agent_usage;
DROP POLICY IF EXISTS "Tenants can insert their own agent usage" ON agent_usage;
DROP POLICY IF EXISTS "Tenants can update their own agent usage" ON agent_usage;
DROP POLICY IF EXISTS "Tenants can delete their own agent usage" ON agent_usage;

CREATE POLICY "Tenants can view their own agent usage" ON agent_usage
  FOR SELECT 
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenants can insert their own agent usage" ON agent_usage
  FOR INSERT 
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenants can update their own agent usage" ON agent_usage
  FOR UPDATE 
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenants can delete their own agent usage" ON agent_usage
  FOR DELETE 
  USING (tenant_id = public.get_user_tenant_id());

