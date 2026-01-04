-- Migration: Multi-Protocol Foundation
-- Epic 17, Story 17.0a
-- Enables x402, AP2, ACP protocols to share unified transfer model

-- ============================================
-- 1. Rename x402_metadata to protocol_metadata
-- ============================================

-- Check if column exists before renaming (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'transfers' 
    AND column_name = 'x402_metadata'
  ) THEN
    ALTER TABLE transfers RENAME COLUMN x402_metadata TO protocol_metadata;
  END IF;
END $$;

COMMENT ON COLUMN transfers.protocol_metadata IS 
  'Protocol-specific metadata for agentic payments (x402, AP2, ACP). Structure varies by transfer.type. Schema: {protocol: "x402"|"ap2"|"acp", ...protocol_specific_fields}';

-- ============================================
-- 2. Add new transfer types for AP2 and ACP
-- ============================================

-- Drop existing constraint and recreate with new types
ALTER TABLE transfers DROP CONSTRAINT IF EXISTS transfers_type_check;

ALTER TABLE transfers ADD CONSTRAINT transfers_type_check CHECK (
  type IN (
    -- Existing types
    'cross_border', 
    'internal', 
    'stream_start', 
    'stream_withdraw', 
    'stream_cancel', 
    'wrap', 
    'unwrap', 
    'deposit', 
    'withdrawal',
    -- Agentic payment protocols
    'x402',  -- Coinbase/Cloudflare HTTP 402
    'ap2',   -- Google Agent Payment Protocol
    'acp'    -- Stripe/OpenAI Agentic Commerce Protocol
  )
);

-- ============================================
-- 3. Add index for protocol-based queries
-- ============================================

CREATE INDEX IF NOT EXISTS idx_transfers_protocol_type 
ON transfers(type) 
WHERE type IN ('x402', 'ap2', 'acp');

-- ============================================
-- 4. Update existing x402 transfers to include protocol field
-- ============================================

-- Add protocol field to existing x402 metadata (if not already present)
UPDATE transfers 
SET protocol_metadata = protocol_metadata || '{"protocol": "x402"}'::jsonb
WHERE type = 'x402' 
  AND protocol_metadata IS NOT NULL 
  AND protocol_metadata->>'protocol' IS NULL;

