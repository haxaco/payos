-- Migration: Add sync_data column to wallets table
-- Date: 2026-01-21
-- Description: Adds sync_data JSONB column to store on-chain sync information

-- Add sync_data column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'wallets' AND column_name = 'sync_data'
    ) THEN
        ALTER TABLE wallets ADD COLUMN sync_data JSONB DEFAULT NULL;
        COMMENT ON COLUMN wallets.sync_data IS 'On-chain sync data including raw_balance, decimals, native_balance, nonce, is_contract, chain';
    END IF;
END $$;

-- Create index for sync queries
CREATE INDEX IF NOT EXISTS idx_wallets_last_synced_at ON wallets(last_synced_at) WHERE last_synced_at IS NOT NULL;
