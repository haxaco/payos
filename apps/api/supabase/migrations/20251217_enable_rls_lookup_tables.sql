-- ============================================
-- Story 15.4: Secure Lookup Tables
-- ============================================
-- Priority: P0 (CRITICAL SECURITY)
-- Description: Secure kya_tier_limits and verification_tier_limits lookup tables.
--              These tables don't contain tenant-specific data, but should only be
--              readable by authenticated users and writable only by system admins
--              (service role).

-- ============================================
-- KYA_TIER_LIMITS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE kya_tier_limits ENABLE ROW LEVEL SECURITY;

-- SELECT Policy: Allow all authenticated users to read tier limits
-- This is needed for agents to check their limits
CREATE POLICY "Authenticated users can view KYA tier limits" ON kya_tier_limits
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- INSERT/UPDATE/DELETE Policies: Deny all regular users
-- Only service role (Supabase admin) can modify these lookup tables
-- No explicit policy needed - absence of policy = DENY by default

-- ============================================
-- VERIFICATION_TIER_LIMITS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE verification_tier_limits ENABLE ROW LEVEL SECURITY;

-- SELECT Policy: Allow all authenticated users to read tier limits
-- This is needed for accounts to check their limits
CREATE POLICY "Authenticated users can view verification tier limits" ON verification_tier_limits
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- INSERT/UPDATE/DELETE Policies: Deny all regular users
-- Only service role (Supabase admin) can modify these lookup tables
-- No explicit policy needed - absence of policy = DENY by default

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'kya_tier_limits') THEN
    RAISE EXCEPTION 'RLS not enabled on kya_tier_limits table';
  END IF;
  
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'verification_tier_limits') THEN
    RAISE EXCEPTION 'RLS not enabled on verification_tier_limits table';
  END IF;
  
  RAISE NOTICE '✅ RLS successfully enabled on lookup tables';
  RAISE NOTICE '📖 kya_tier_limits: Read-only for authenticated users';
  RAISE NOTICE '📖 verification_tier_limits: Read-only for authenticated users';
  RAISE NOTICE '🔒 Only service role can modify lookup tables';
END $$;

