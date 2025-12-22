-- ============================================
-- Migration: Rename wallet_address to payment_address
-- Purpose: Consistency with x402_endpoints table
-- ============================================

ALTER TABLE wallets RENAME COLUMN wallet_address TO payment_address;

COMMENT ON COLUMN wallets.payment_address IS 'Payment address for receiving x402 payments (on-chain or internal)';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ wallets.wallet_address renamed to payment_address for consistency';
END $$;

