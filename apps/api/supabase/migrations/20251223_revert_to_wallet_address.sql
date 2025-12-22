-- ============================================
-- Migration: Revert payment_address to wallet_address
-- Purpose: Better semantic clarity - wallet_address is more intuitive for wallets table
-- Reasoning: While x402_endpoints uses payment_address (where to receive payments),
--            wallets.wallet_address is clearer (the wallet's unique address/identity)
-- ============================================

ALTER TABLE wallets RENAME COLUMN payment_address TO wallet_address;

COMMENT ON COLUMN wallets.wallet_address IS 'Wallet address - on-chain address (for external/Circle wallets) or internal identifier (for PayOS wallets)';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ wallets.payment_address reverted to wallet_address for semantic clarity';
END $$;

