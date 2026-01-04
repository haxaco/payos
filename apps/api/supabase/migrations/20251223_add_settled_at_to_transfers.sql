-- Migration: Add settled_at column to transfers table
-- Epic 17: x402 Gateway Infrastructure
-- Story: Fix settlement failures (Snag #12)
-- Date: 2025-12-23

-- ============================================
-- Add settled_at column to transfers
-- ============================================

-- Add the settled_at timestamp column
ALTER TABLE transfers 
ADD COLUMN IF NOT EXISTS settled_at timestamptz;

-- Add comment explaining the column
COMMENT ON COLUMN transfers.settled_at IS 
'Timestamp when the transfer was fully settled. Used for x402 immediate settlement and batch processing tracking.';

-- Create index for settlement queries
CREATE INDEX IF NOT EXISTS idx_transfers_settled_at 
ON transfers(settled_at) 
WHERE settled_at IS NOT NULL;

-- Create index for unsettled transfers
CREATE INDEX IF NOT EXISTS idx_transfers_unsettled 
ON transfers(status, created_at) 
WHERE status IN ('pending', 'processing') AND settled_at IS NULL;

-- Add validation: settled_at should only be set when status is 'completed'
-- (This is a soft constraint via application logic, not a database constraint)

COMMENT ON TABLE transfers IS 
'Core transfer/transaction records. Supports multiple transfer types including x402 payments, cross-border, internal, streaming, and more. Settlement timestamps track when funds are fully processed.';



