-- Migration: Add wallet_id to funding_transactions
-- Purpose: Allow funding transactions to target a specific wallet for crediting
-- Epic 41 extension: Wallet-targeted funding during onboarding

ALTER TABLE funding_transactions
  ADD COLUMN wallet_id UUID REFERENCES wallets(id);

CREATE INDEX idx_funding_txns_wallet ON funding_transactions(wallet_id) WHERE wallet_id IS NOT NULL;

COMMENT ON COLUMN funding_transactions.wallet_id IS 'Optional target wallet to credit when transaction completes';
