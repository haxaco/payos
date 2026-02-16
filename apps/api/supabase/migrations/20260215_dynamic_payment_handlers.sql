-- Dynamic Payment Handlers
-- DB-driven payment handler registry replacing hardcoded .ts files.
-- Handlers can now be added by inserting a row instead of deploying code.

-- =============================================================================
-- 1. payment_handlers — Handler definitions
-- =============================================================================

CREATE TABLE IF NOT EXISTS payment_handlers (
  id TEXT PRIMARY KEY,                              -- 'payos_latam', 'invu'
  tenant_id UUID REFERENCES tenants(id),            -- NULL = global, set = tenant-specific
  name TEXT NOT NULL,                               -- 'com.payos.latam_settlement'
  display_name TEXT NOT NULL,                       -- 'PayOS LATAM'
  version TEXT NOT NULL,                            -- '2026-01-11'
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'deprecated')),

  -- Instrument / payment types this handler supports
  supported_types TEXT[] NOT NULL,                  -- {'pix','spei','settlement'}
  supported_currencies TEXT[] NOT NULL,             -- {'USD','USDC','BRL','MXN'}
  id_prefix TEXT NOT NULL DEFAULT '',               -- 'invu' → pi_invu_, pay_invu_

  -- Integration mode
  integration_mode TEXT NOT NULL DEFAULT 'demo'
    CHECK (integration_mode IN ('demo', 'webhook', 'custom')),
  -- demo:    simulated success (for demos / testing)
  -- webhook: forward to external URL
  -- custom:  delegate to registered TypeScript handler (e.g., PayOS with Pix/SPEI validation)

  -- Webhook config (for 'webhook' mode)
  webhook_config JSONB DEFAULT '{}',
  -- {
  --   "base_url": "https://api.invupos.com/v1",
  --   "acquire_path": "/instruments",
  --   "process_path": "/payments",
  --   "refund_path": "/refunds",
  --   "status_path": "/payments/:id/status",
  --   "auth_type": "bearer",
  --   "auth_header": "Authorization"
  -- }

  -- Discovery profile (for /.well-known/ucp)
  profile_metadata JSONB NOT NULL DEFAULT '{}',
  -- {
  --   "spec": "https://docs.invupos.com/payments/api",
  --   "config_schema": "https://api.invupos.com/schemas/handler_config.json",
  --   "instrument_schemas": ["https://api.invupos.com/schemas/pos_instrument.json"],
  --   "corridors": [ { "id": "usd-usd-invu", ... } ]
  -- }

  -- Per-type validation rules (optional)
  validation_config JSONB DEFAULT '{}',

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 2. handler_payment_instruments — Persisted instruments
-- =============================================================================

CREATE TABLE IF NOT EXISTS handler_payment_instruments (
  id TEXT PRIMARY KEY,                                    -- 'pi_invu_abc123'
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  handler_id TEXT NOT NULL REFERENCES payment_handlers(id),
  checkout_id TEXT,                                       -- optional link to checkout
  type TEXT NOT NULL,                                     -- 'invu_pos', 'card', 'pix'
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'revoked')),
  last4 TEXT,
  brand TEXT,
  reusable BOOLEAN DEFAULT false,
  data JSONB DEFAULT '{}',                                -- handler-specific data
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 3. handler_payments — Persisted payments
-- =============================================================================

CREATE TABLE IF NOT EXISTS handler_payments (
  id TEXT PRIMARY KEY,                                    -- 'pay_invu_abc123'
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  handler_id TEXT NOT NULL REFERENCES payment_handlers(id),
  instrument_id TEXT REFERENCES handler_payment_instruments(id),
  checkout_id TEXT,                                       -- optional link to checkout
  amount INTEGER NOT NULL,                                -- smallest currency unit (cents)
  currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded')),
  settlement_id TEXT,
  external_id TEXT,
  idempotency_key TEXT,
  failure_reason TEXT,
  refunded_amount INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(handler_id, idempotency_key)
);

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX idx_payment_handlers_status ON payment_handlers(status);
CREATE INDEX idx_payment_handlers_tenant ON payment_handlers(tenant_id) WHERE tenant_id IS NOT NULL;

CREATE INDEX idx_handler_instruments_tenant ON handler_payment_instruments(tenant_id);
CREATE INDEX idx_handler_instruments_handler ON handler_payment_instruments(handler_id);
CREATE INDEX idx_handler_instruments_checkout ON handler_payment_instruments(checkout_id) WHERE checkout_id IS NOT NULL;
CREATE INDEX idx_handler_instruments_status ON handler_payment_instruments(status);

CREATE INDEX idx_handler_payments_tenant ON handler_payments(tenant_id);
CREATE INDEX idx_handler_payments_handler ON handler_payments(handler_id);
CREATE INDEX idx_handler_payments_checkout ON handler_payments(checkout_id) WHERE checkout_id IS NOT NULL;
CREATE INDEX idx_handler_payments_status ON handler_payments(status);
CREATE INDEX idx_handler_payments_idempotency ON handler_payments(handler_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_handler_payments_created ON handler_payments(created_at DESC);

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE payment_handlers ENABLE ROW LEVEL SECURITY;
ALTER TABLE handler_payment_instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE handler_payments ENABLE ROW LEVEL SECURITY;

-- payment_handlers: global rows (tenant_id IS NULL) readable by all, tenant-specific by owner
CREATE POLICY "Anyone can read global handlers"
  ON payment_handlers FOR SELECT
  USING (tenant_id IS NULL);

CREATE POLICY "Tenants can read their own handlers"
  ON payment_handlers FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Tenants can manage their own handlers"
  ON payment_handlers FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- handler_payment_instruments
CREATE POLICY "Tenants can view their own instruments"
  ON handler_payment_instruments FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Tenants can create instruments"
  ON handler_payment_instruments FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Tenants can update their own instruments"
  ON handler_payment_instruments FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- handler_payments
CREATE POLICY "Tenants can view their own payments"
  ON handler_payments FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Tenants can create payments"
  ON handler_payments FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Tenants can update their own payments"
  ON handler_payments FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- =============================================================================
-- Triggers for updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_payment_handler_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_payment_handler_updated_at
  BEFORE UPDATE ON payment_handlers
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_handler_updated_at();

CREATE TRIGGER trigger_handler_instrument_updated_at
  BEFORE UPDATE ON handler_payment_instruments
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_handler_updated_at();

CREATE TRIGGER trigger_handler_payment_updated_at
  BEFORE UPDATE ON handler_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_handler_updated_at();

-- =============================================================================
-- Seed Data: PayOS LATAM (custom) + Invu POS (demo)
-- =============================================================================

INSERT INTO payment_handlers (
  id, tenant_id, name, display_name, version, status,
  supported_types, supported_currencies, id_prefix,
  integration_mode, webhook_config, profile_metadata, metadata
) VALUES
(
  'payos_latam',
  NULL,  -- global
  'com.payos.latam_settlement',
  'PayOS LATAM Settlement',
  '2026-01-11',
  'active',
  ARRAY['pix', 'spei', 'settlement'],
  ARRAY['USD', 'USDC', 'BRL', 'MXN'],
  'payos',
  'custom',   -- delegates to payos.ts code handler
  '{}',
  '{
    "spec": "https://docs.payos.com/ucp/handlers/payment",
    "config_schema": "https://api.payos.com/ucp/schemas/handler_config.json",
    "instrument_schemas": [
      "https://api.payos.com/ucp/schemas/pix_instrument.json",
      "https://api.payos.com/ucp/schemas/spei_instrument.json"
    ],
    "corridors": [
      {
        "id": "usd-brl-pix",
        "name": "USD to Brazil (Pix)",
        "source_currency": "USD",
        "destination_currency": "BRL",
        "destination_country": "BR",
        "rail": "pix",
        "estimated_settlement": "< 1 minute"
      },
      {
        "id": "usdc-brl-pix",
        "name": "USDC to Brazil (Pix)",
        "source_currency": "USDC",
        "destination_currency": "BRL",
        "destination_country": "BR",
        "rail": "pix",
        "estimated_settlement": "< 1 minute"
      },
      {
        "id": "usd-mxn-spei",
        "name": "USD to Mexico (SPEI)",
        "source_currency": "USD",
        "destination_currency": "MXN",
        "destination_country": "MX",
        "rail": "spei",
        "estimated_settlement": "< 30 minutes"
      },
      {
        "id": "usdc-mxn-spei",
        "name": "USDC to Mexico (SPEI)",
        "source_currency": "USDC",
        "destination_currency": "MXN",
        "destination_country": "MX",
        "rail": "spei",
        "estimated_settlement": "< 30 minutes"
      }
    ]
  }',
  '{}'
),
(
  'invu',
  NULL,  -- global
  'com.invupos.payments',
  'Invu POS',
  '2026-02-01',
  'active',
  ARRAY['invu_pos', 'card', 'cash'],
  ARRAY['USD', 'PAB'],
  'invu',
  'demo',   -- simulated success for demos
  '{}',
  '{
    "spec": "https://docs.invupos.com/payments/api",
    "config_schema": "https://api.invupos.com/schemas/handler_config.json",
    "instrument_schemas": [
      "https://api.invupos.com/schemas/pos_instrument.json"
    ],
    "corridors": [
      {
        "id": "usd-usd-invu",
        "name": "USD via Invu POS",
        "source_currency": "USD",
        "destination_currency": "USD",
        "destination_country": "PA",
        "rail": "invu_pos",
        "estimated_settlement": "instant"
      },
      {
        "id": "pab-pab-invu",
        "name": "PAB via Invu POS",
        "source_currency": "PAB",
        "destination_currency": "PAB",
        "destination_country": "PA",
        "rail": "invu_pos",
        "estimated_settlement": "instant"
      }
    ]
  }',
  '{"partner": "invu_pos", "country": "PA"}'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  display_name = EXCLUDED.display_name,
  version = EXCLUDED.version,
  status = EXCLUDED.status,
  supported_types = EXCLUDED.supported_types,
  supported_currencies = EXCLUDED.supported_currencies,
  id_prefix = EXCLUDED.id_prefix,
  integration_mode = EXCLUDED.integration_mode,
  profile_metadata = EXCLUDED.profile_metadata,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE payment_handlers IS 'DB-driven payment handler registry. Each row defines a payment handler that can be referenced in UCP checkouts.';
COMMENT ON TABLE handler_payment_instruments IS 'Persisted payment instruments acquired during checkout (replaces in-memory Map).';
COMMENT ON TABLE handler_payments IS 'Persisted payment records from handler processing (replaces in-memory Map).';

COMMENT ON COLUMN payment_handlers.integration_mode IS 'demo = simulated success, webhook = forward to URL, custom = delegate to TypeScript code handler';
COMMENT ON COLUMN payment_handlers.id_prefix IS 'Prefix for generated IDs (e.g., "invu" → pi_invu_..., pay_invu_...)';
COMMENT ON COLUMN payment_handlers.profile_metadata IS 'JSONB published in /.well-known/ucp for handler discovery';
