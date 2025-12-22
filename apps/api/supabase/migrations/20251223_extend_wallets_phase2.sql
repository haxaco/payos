-- ============================================
-- Migration: Extend Wallets Table for Phase 2
-- Purpose: Support internal, Circle, and external wallets
-- Note: Accounts can have MULTIPLE wallets
-- ============================================

-- Add wallet type classification
ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS wallet_type TEXT NOT NULL DEFAULT 'internal'
  CHECK (wallet_type IN ('internal', 'circle_custodial', 'circle_mpc', 'external'));

ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS custody_type TEXT NOT NULL DEFAULT 'custodial'
  CHECK (custody_type IN ('custodial', 'mpc', 'self'));

-- Add external provider fields
ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'payos';

ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS provider_wallet_id TEXT;

ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS provider_wallet_set_id TEXT;

ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS provider_entity_id TEXT;

ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS provider_metadata JSONB DEFAULT NULL;

-- Add verification fields (for "Add Existing" flow)
ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'verified'
  CHECK (verification_status IN ('unverified', 'pending', 'verified', 'failed'));

ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS verification_method TEXT;

ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ DEFAULT now();

-- Add on-chain details
ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS blockchain TEXT DEFAULT 'base';

ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS token_contract TEXT;

-- Add sync fields
ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN DEFAULT false;

-- Add compliance fields (for Phase 2+)
ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'not_required'
  CHECK (kyc_status IN ('not_required', 'pending', 'verified', 'rejected'));

ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS aml_cleared BOOLEAN DEFAULT true;

ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS sanctions_status TEXT DEFAULT 'not_screened'
  CHECK (sanctions_status IN ('not_screened', 'clear', 'flagged', 'blocked'));

ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS risk_score INTEGER CHECK (risk_score IS NULL OR (risk_score >= 0 AND risk_score <= 100));

-- Add comments
COMMENT ON COLUMN wallets.wallet_type IS 'Type: internal (PayOS), circle_custodial, circle_mpc, external';
COMMENT ON COLUMN wallets.custody_type IS 'Custody model: custodial (provider holds keys), mpc (multi-party), self (user holds keys)';
COMMENT ON COLUMN wallets.provider IS 'Wallet provider: payos, circle, coinbase, external';
COMMENT ON COLUMN wallets.provider_wallet_id IS 'External wallet ID from provider (e.g., Circle wallet ID)';
COMMENT ON COLUMN wallets.provider_wallet_set_id IS 'Circle wallet set ID (required for Circle wallets)';
COMMENT ON COLUMN wallets.provider_entity_id IS 'Circle entity/customer ID';
COMMENT ON COLUMN wallets.provider_metadata IS 'Provider-specific metadata (JSON)';
COMMENT ON COLUMN wallets.verification_status IS 'Ownership verification: unverified, pending, verified, failed';
COMMENT ON COLUMN wallets.verification_method IS 'How ownership was verified: signature, kyc_linked, api_verified';
COMMENT ON COLUMN wallets.verified_at IS 'Timestamp of verification';
COMMENT ON COLUMN wallets.blockchain IS 'Blockchain network: base, eth, polygon, avax, sol';
COMMENT ON COLUMN wallets.token_contract IS 'Stablecoin contract address on the blockchain';
COMMENT ON COLUMN wallets.last_synced_at IS 'Last time balance was synced from external source';
COMMENT ON COLUMN wallets.sync_enabled IS 'Auto-sync balance with on-chain/provider?';
COMMENT ON COLUMN wallets.kyc_status IS 'KYC verification status for wallet owner';
COMMENT ON COLUMN wallets.aml_cleared IS 'Anti-money laundering clearance';
COMMENT ON COLUMN wallets.sanctions_status IS 'Sanctions screening status';
COMMENT ON COLUMN wallets.risk_score IS 'Risk assessment score (0-100)';

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_wallets_wallet_type ON wallets(wallet_type);
CREATE INDEX IF NOT EXISTS idx_wallets_provider ON wallets(provider);
CREATE INDEX IF NOT EXISTS idx_wallets_provider_wallet_id ON wallets(provider_wallet_id) 
  WHERE provider_wallet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wallets_verification ON wallets(verification_status);
CREATE INDEX IF NOT EXISTS idx_wallets_blockchain ON wallets(blockchain);
CREATE INDEX IF NOT EXISTS idx_wallets_kyc ON wallets(kyc_status) WHERE kyc_status != 'not_required';

-- Index for finding all wallets for an account (multiple wallets per account)
CREATE INDEX IF NOT EXISTS idx_wallets_account_multi ON wallets(owner_account_id, wallet_type);

-- Rename payment_address to wallet_address for clarity (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'wallets' AND column_name = 'payment_address') THEN
    ALTER TABLE wallets RENAME COLUMN payment_address TO wallet_address;
  END IF;
END $$;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Wallet schema extended for Phase 2';
  RAISE NOTICE '✅ Added wallet_type: internal, circle_custodial, circle_mpc, external';
  RAISE NOTICE '✅ Added custody_type: custodial, mpc, self';
  RAISE NOTICE '✅ Added provider fields for Circle integration';
  RAISE NOTICE '✅ Added verification fields for "Add Existing" flow';
  RAISE NOTICE '✅ Added compliance fields (kyc, aml, sanctions)';
  RAISE NOTICE '✅ Accounts can have MULTIPLE wallets';
END $$;

