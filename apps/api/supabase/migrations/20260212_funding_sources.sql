-- ============================================
-- Epic 41: On-Ramp Integrations & Funding Sources
-- Story 41.1: Funding Source Data Model
-- ============================================

-- Funding source types
CREATE TYPE funding_source_type AS ENUM (
  'card',
  'bank_account_us',
  'bank_account_eu',
  'bank_account_latam',
  'crypto_wallet'
);

-- Funding source status lifecycle
CREATE TYPE funding_source_status AS ENUM (
  'pending',
  'verifying',
  'active',
  'failed',
  'suspended',
  'removed'
);

-- Funding transaction status
CREATE TYPE funding_transaction_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
  'refunded'
);

-- ============================================
-- Funding Sources table
-- ============================================
CREATE TABLE funding_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  account_id UUID NOT NULL REFERENCES accounts(id),

  -- Type and provider
  type funding_source_type NOT NULL,
  provider TEXT NOT NULL,  -- 'stripe', 'plaid', 'belvo', 'moonpay', 'transak', 'circle'

  -- Status
  status funding_source_status NOT NULL DEFAULT 'pending',
  verified_at TIMESTAMPTZ,

  -- Display info (safe to show)
  display_name TEXT,            -- "Visa •••• 4242" or "Chase •••• 1234"
  last_four TEXT,
  brand TEXT,                    -- 'visa', 'mastercard', 'amex', etc.

  -- Provider references
  provider_id TEXT NOT NULL,     -- External ID at provider
  provider_metadata JSONB DEFAULT '{}',

  -- Supported currencies for this source
  supported_currencies TEXT[] DEFAULT ARRAY['USD'],

  -- Limits
  daily_limit_cents BIGINT,
  monthly_limit_cents BIGINT,
  per_transaction_limit_cents BIGINT,

  -- Usage tracking
  daily_used_cents BIGINT DEFAULT 0,
  monthly_used_cents BIGINT DEFAULT 0,
  daily_reset_at TIMESTAMPTZ DEFAULT NOW(),
  monthly_reset_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  total_funded_cents BIGINT DEFAULT 0,
  funding_count INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  removed_at TIMESTAMPTZ,

  UNIQUE(tenant_id, provider, provider_id)
);

-- ============================================
-- Funding Transactions table
-- ============================================
CREATE TABLE funding_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  funding_source_id UUID NOT NULL REFERENCES funding_sources(id),
  account_id UUID NOT NULL REFERENCES accounts(id),

  -- Transaction details
  amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL,          -- Source currency (USD, BRL, MXN)

  -- Conversion (if applicable)
  converted_amount_cents BIGINT,   -- In USDC cents
  exchange_rate DECIMAL(18, 8),
  conversion_currency TEXT DEFAULT 'USDC',

  -- Status
  status funding_transaction_status NOT NULL DEFAULT 'pending',
  failure_reason TEXT,

  -- Provider tracking
  provider TEXT NOT NULL,
  provider_transaction_id TEXT,
  provider_metadata JSONB DEFAULT '{}',

  -- Fees
  provider_fee_cents BIGINT DEFAULT 0,
  platform_fee_cents BIGINT DEFAULT 0,
  conversion_fee_cents BIGINT DEFAULT 0,
  total_fee_cents BIGINT DEFAULT 0,

  -- Idempotency
  idempotency_key TEXT,

  -- Timestamps
  initiated_at TIMESTAMPTZ DEFAULT NOW(),
  processing_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, idempotency_key)
);

-- ============================================
-- Funding Fee Configurations table
-- ============================================
CREATE TABLE funding_fee_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),  -- NULL = global default

  provider TEXT NOT NULL,
  source_type funding_source_type NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',

  -- Fee structure
  percentage_fee DECIMAL(8, 4) DEFAULT 0,       -- e.g. 2.9 for 2.9%
  fixed_fee_cents BIGINT DEFAULT 0,              -- e.g. 30 for $0.30
  min_fee_cents BIGINT DEFAULT 0,
  max_fee_cents BIGINT,                          -- NULL = no cap

  -- Platform fee
  platform_percentage_fee DECIMAL(8, 4) DEFAULT 0,
  platform_fixed_fee_cents BIGINT DEFAULT 0,

  -- Waiver
  fee_waiver_active BOOLEAN DEFAULT FALSE,
  fee_waiver_expires_at TIMESTAMPTZ,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, provider, source_type, currency)
);

-- ============================================
-- Indexes
-- ============================================

-- Funding sources
CREATE INDEX idx_funding_sources_tenant ON funding_sources(tenant_id);
CREATE INDEX idx_funding_sources_account ON funding_sources(account_id);
CREATE INDEX idx_funding_sources_status ON funding_sources(status) WHERE status = 'active';
CREATE INDEX idx_funding_sources_provider ON funding_sources(provider);

-- Funding transactions
CREATE INDEX idx_funding_txns_tenant ON funding_transactions(tenant_id);
CREATE INDEX idx_funding_txns_source ON funding_transactions(funding_source_id);
CREATE INDEX idx_funding_txns_account ON funding_transactions(account_id);
CREATE INDEX idx_funding_txns_status ON funding_transactions(status);
CREATE INDEX idx_funding_txns_provider_id ON funding_transactions(provider_transaction_id);
CREATE INDEX idx_funding_txns_idempotency ON funding_transactions(tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_funding_txns_initiated ON funding_transactions(initiated_at DESC);

-- Fee configs
CREATE INDEX idx_funding_fee_configs_tenant ON funding_fee_configs(tenant_id);
CREATE INDEX idx_funding_fee_configs_provider ON funding_fee_configs(provider, source_type);

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE funding_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE funding_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE funding_fee_configs ENABLE ROW LEVEL SECURITY;

-- Funding sources: tenant isolation
CREATE POLICY funding_sources_tenant_isolation ON funding_sources
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Funding transactions: tenant isolation
CREATE POLICY funding_txns_tenant_isolation ON funding_transactions
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Fee configs: tenant or global
CREATE POLICY funding_fee_configs_access ON funding_fee_configs
  FOR ALL USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR tenant_id IS NULL
  );

-- Service role bypass
GRANT ALL ON funding_sources TO service_role;
GRANT ALL ON funding_transactions TO service_role;
GRANT ALL ON funding_fee_configs TO service_role;

-- ============================================
-- Updated_at triggers
-- ============================================

CREATE TRIGGER set_funding_sources_updated_at
  BEFORE UPDATE ON funding_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_funding_transactions_updated_at
  BEFORE UPDATE ON funding_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_funding_fee_configs_updated_at
  BEFORE UPDATE ON funding_fee_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Helper functions
-- ============================================

-- Reset daily usage counters
CREATE OR REPLACE FUNCTION reset_funding_source_daily_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE funding_sources
  SET daily_used_cents = 0,
      daily_reset_at = NOW()
  WHERE daily_reset_at < NOW() - INTERVAL '1 day'
    AND status = 'active';
END;
$$;

-- Reset monthly usage counters
CREATE OR REPLACE FUNCTION reset_funding_source_monthly_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE funding_sources
  SET monthly_used_cents = 0,
      monthly_reset_at = NOW()
  WHERE monthly_reset_at < NOW() - INTERVAL '1 month'
    AND status = 'active';
END;
$$;

-- Insert default global fee configurations
INSERT INTO funding_fee_configs (tenant_id, provider, source_type, currency, percentage_fee, fixed_fee_cents, min_fee_cents, max_fee_cents) VALUES
  -- Stripe card fees
  (NULL, 'stripe', 'card', 'USD', 2.9000, 30, 0, NULL),
  -- Stripe ACH fees
  (NULL, 'stripe', 'bank_account_us', 'USD', 0.8000, 0, 0, 500),
  -- Stripe SEPA fees
  (NULL, 'stripe', 'bank_account_eu', 'EUR', 0.0000, 35, 0, NULL),
  -- Belvo Pix fees
  (NULL, 'belvo', 'bank_account_latam', 'BRL', 1.0000, 0, 0, NULL),
  -- Belvo SPEI fees
  (NULL, 'belvo', 'bank_account_latam', 'MXN', 0.5000, 0, 0, NULL),
  -- MoonPay fees
  (NULL, 'moonpay', 'card', 'USD', 4.5000, 0, 0, NULL),
  (NULL, 'moonpay', 'crypto_wallet', 'USD', 1.0000, 0, 0, NULL),
  -- Transak fees
  (NULL, 'transak', 'card', 'USD', 5.0000, 0, 0, NULL),
  -- Direct USDC deposit (network gas only - tracked differently)
  (NULL, 'circle', 'crypto_wallet', 'USDC', 0.0000, 1, 0, NULL);
