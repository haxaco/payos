-- ============================================
-- Migration: Extend Transfers Table for x402 Payments
-- Purpose: Add x402 support to existing transfers table (no new table!)
-- Spec: https://www.x402.org/x402-whitepaper.pdf
-- ============================================

-- Add 'x402' to transfer_type enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'x402'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transfer_type')
  ) THEN
    ALTER TYPE transfer_type ADD VALUE 'x402';
    RAISE NOTICE '✅ Added x402 to transfer_type enum';
  ELSE
    RAISE NOTICE '⚠️  x402 already exists in transfer_type enum';
  END IF;
END $$;

-- Add x402_metadata column to transfers table
ALTER TABLE transfers 
ADD COLUMN IF NOT EXISTS x402_metadata JSONB DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN transfers.x402_metadata IS 'x402 protocol metadata for pay-per-call API payments (per x402.org spec). Structure: {endpoint_id, endpoint_path, payment_proof, request_id, payment_id, vendor_domain, category, asset_address, network, verified_at, expires_at}';

-- x402_metadata structure (per x402 spec):
-- {
--   "endpoint_id": "uuid",                    -- Reference to x402_endpoints.id
--   "endpoint_path": "/api/compliance/check", -- API path that was called
--   "payment_proof": "proof_xyz789",          -- Mock tx_hash (Phase 1) or real (Phase 2)
--   "request_id": "req_abc123",               -- Idempotency key (nonce)
--   "payment_id": "pay_xyz789",               -- x402 paymentId for verification
--   "vendor_domain": "api.acme.com",          -- Extracted from endpoint
--   "category": "compliance",                 -- Optional categorization
--   "asset_address": "0xA0b86991...",         -- USDC contract address
--   "network": "base-mainnet",                -- Blockchain network
--   "verified_at": "2025-12-22T10:23:00Z",    -- When payment was verified
--   "expires_at": "2025-12-22T10:25:00Z"      -- From x402 payment request
-- }

-- Create indexes for x402 queries
CREATE INDEX IF NOT EXISTS idx_transfers_type_x402 
  ON transfers(type) WHERE type = 'x402';

CREATE INDEX IF NOT EXISTS idx_transfers_x402_endpoint 
  ON transfers((x402_metadata->>'endpoint_id')) 
  WHERE type = 'x402' AND x402_metadata IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transfers_x402_request_id 
  ON transfers((x402_metadata->>'request_id')) 
  WHERE type = 'x402' AND x402_metadata IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transfers_x402_vendor 
  ON transfers((x402_metadata->>'vendor_domain')) 
  WHERE type = 'x402' AND x402_metadata IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transfers_x402_category 
  ON transfers((x402_metadata->>'category')) 
  WHERE type = 'x402' AND x402_metadata IS NOT NULL;

-- Unique constraint on request_id to prevent double-payment
CREATE UNIQUE INDEX IF NOT EXISTS idx_transfers_x402_request_id_unique 
  ON transfers(tenant_id, (x402_metadata->>'request_id')) 
  WHERE type = 'x402' AND x402_metadata->>'request_id' IS NOT NULL;

-- Helper function to create x402 transfer
CREATE OR REPLACE FUNCTION create_x402_transfer(
  p_tenant_id UUID,
  p_from_account_id UUID,
  p_to_account_id UUID,
  p_amount DECIMAL(10,4),
  p_currency TEXT,
  p_endpoint_id UUID,
  p_endpoint_path TEXT,
  p_request_id TEXT,
  p_category TEXT DEFAULT NULL,
  p_vendor_domain TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_transfer_id UUID;
  v_payment_proof TEXT;
  v_payment_id TEXT;
BEGIN
  -- Validate currency (stablecoins only per x402 spec)
  IF p_currency NOT IN ('USDC', 'EURC') THEN
    RAISE EXCEPTION 'Invalid currency. Only USDC and EURC are supported for x402 payments';
  END IF;
  
  -- Check for duplicate request_id (idempotency)
  IF EXISTS (
    SELECT 1 FROM public.transfers
    WHERE tenant_id = p_tenant_id
      AND type = 'x402'
      AND x402_metadata->>'request_id' = p_request_id
  ) THEN
    RAISE EXCEPTION 'Duplicate request_id. Payment already processed';
  END IF;
  
  -- Generate mock payment proof and payment ID (Phase 1)
  v_payment_proof := 'proof_' || encode(gen_random_bytes(16), 'hex');
  v_payment_id := 'pay_' || encode(gen_random_bytes(16), 'hex');
  
  -- Create transfer record
  INSERT INTO public.transfers (
    tenant_id,
    from_account_id,
    to_account_id,
    amount,
    currency,
    destination_currency,
    type,
    status,
    x402_metadata,
    created_at
  ) VALUES (
    p_tenant_id,
    p_from_account_id,
    p_to_account_id,
    p_amount,
    p_currency,
    p_currency, -- Same currency for x402
    'x402',
    'completed', -- Instant settlement in Phase 1
    jsonb_build_object(
      'endpoint_id', p_endpoint_id,
      'endpoint_path', p_endpoint_path,
      'payment_proof', v_payment_proof,
      'request_id', p_request_id,
      'payment_id', v_payment_id,
      'vendor_domain', p_vendor_domain,
      'category', p_category,
      'network', 'base-mainnet',
      'verified_at', now(),
      'expires_at', now() + interval '5 minutes'
    ),
    now()
  ) RETURNING id INTO v_transfer_id;
  
  RETURN v_transfer_id;
END;
$$;

COMMENT ON FUNCTION create_x402_transfer IS 'Create an x402 payment transfer with proper metadata and validation';

-- Helper function to get x402 transfers for an endpoint
CREATE OR REPLACE FUNCTION get_x402_transfers_by_endpoint(
  p_endpoint_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  from_account_id UUID,
  to_account_id UUID,
  amount DECIMAL(10,4),
  currency TEXT,
  status TEXT,
  request_id TEXT,
  payment_proof TEXT,
  vendor_domain TEXT,
  category TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.from_account_id,
    t.to_account_id,
    t.amount,
    t.currency,
    t.status,
    t.x402_metadata->>'request_id' as request_id,
    t.x402_metadata->>'payment_proof' as payment_proof,
    t.x402_metadata->>'vendor_domain' as vendor_domain,
    t.x402_metadata->>'category' as category,
    t.created_at
  FROM public.transfers t
  WHERE t.type = 'x402'
    AND t.x402_metadata->>'endpoint_id' = p_endpoint_id::text
  ORDER BY t.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION get_x402_transfers_by_endpoint IS 'Get x402 transfers for a specific endpoint';

-- Helper function to get x402 transfers for a wallet
CREATE OR REPLACE FUNCTION get_x402_transfers_by_wallet(
  p_wallet_account_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  from_account_id UUID,
  to_account_id UUID,
  amount DECIMAL(10,4),
  currency TEXT,
  status TEXT,
  endpoint_path TEXT,
  request_id TEXT,
  vendor_domain TEXT,
  category TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.from_account_id,
    t.to_account_id,
    t.amount,
    t.currency,
    t.status,
    t.x402_metadata->>'endpoint_path' as endpoint_path,
    t.x402_metadata->>'request_id' as request_id,
    t.x402_metadata->>'vendor_domain' as vendor_domain,
    t.x402_metadata->>'category' as category,
    t.created_at
  FROM public.transfers t
  WHERE t.type = 'x402'
    AND t.from_account_id = p_wallet_account_id
  ORDER BY t.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION get_x402_transfers_by_wallet IS 'Get x402 transfers made from a specific wallet';

-- Verification
DO $$
DECLARE
  v_has_x402_type BOOLEAN;
  v_has_metadata_column BOOLEAN;
BEGIN
  -- Check if x402 type exists
  SELECT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'x402'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transfer_type')
  ) INTO v_has_x402_type;
  
  -- Check if x402_metadata column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transfers'
    AND column_name = 'x402_metadata'
  ) INTO v_has_metadata_column;
  
  IF v_has_x402_type AND v_has_metadata_column THEN
    RAISE NOTICE '✅ transfers table extended for x402 payments';
    RAISE NOTICE '✅ x402 type added to transfer_type enum';
    RAISE NOTICE '✅ x402_metadata column added';
    RAISE NOTICE '✅ Indexes created for x402 queries';
    RAISE NOTICE '✅ Unique constraint on request_id (idempotency)';
    RAISE NOTICE '✅ Helper functions created';
    RAISE NOTICE '✅ NO separate x402_transactions table (reusing transfers)';
  ELSE
    RAISE WARNING '⚠️  Migration incomplete. Check logs.';
  END IF;
END $$;

