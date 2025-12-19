-- ============================================
-- Add RLS Policies to Accounts Table
-- ============================================
-- The accounts table is the core tenant-scoped table but was missing
-- tenant isolation policies. Adding standard 4-policy pattern.

-- Enable RLS (if not already enabled)
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Drop existing service role policy (too permissive)
DROP POLICY IF EXISTS "Service role full access to accounts" ON accounts;

-- ============================================
-- Standard Tenant-Scoped Policies
-- ============================================

-- SELECT Policy: Tenants can only view their own accounts
CREATE POLICY "Tenants can view their own accounts" ON accounts
  FOR SELECT 
  USING (tenant_id = public.get_user_tenant_id());

-- INSERT Policy: Tenants can only create accounts for themselves
CREATE POLICY "Tenants can insert their own accounts" ON accounts
  FOR INSERT 
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- UPDATE Policy: Tenants can only update their own accounts
CREATE POLICY "Tenants can update their own accounts" ON accounts
  FOR UPDATE 
  USING (tenant_id = public.get_user_tenant_id());

-- DELETE Policy: Tenants can only delete their own accounts
CREATE POLICY "Tenants can delete their own accounts" ON accounts
  FOR DELETE 
  USING (tenant_id = public.get_user_tenant_id());

-- ============================================
-- Service Role Access (for admin operations)
-- ============================================
-- Re-add service role policy with proper naming
-- This allows the service role key to bypass RLS for admin operations

CREATE POLICY "Service role bypass for accounts" ON accounts
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');


