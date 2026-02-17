-- =============================================================================
-- Migration: Add 'connected_account' integration mode
-- =============================================================================
-- Adds a new integration_mode for payment_handlers that bridges to
-- tenant-connected payment providers (Stripe, PayPal, Circle) via
-- the connected_accounts table and Epic 48 handler registry.
-- =============================================================================

-- 1. Relax the CHECK constraint to allow 'connected_account'
ALTER TABLE payment_handlers
  DROP CONSTRAINT IF EXISTS payment_handlers_integration_mode_check;

ALTER TABLE payment_handlers
  ADD CONSTRAINT payment_handlers_integration_mode_check
  CHECK (integration_mode IN ('demo', 'webhook', 'custom', 'connected_account'));

-- 2. Seed global handler rows for Stripe, PayPal, Circle
--    These are global (tenant_id IS NULL) so every tenant can reference them.
--    At payment time, DatabaseHandler bridges to the tenant's connected_accounts credentials.
INSERT INTO payment_handlers (
  id, tenant_id, name, display_name, version, status,
  supported_types, supported_currencies, id_prefix,
  integration_mode, metadata
) VALUES
(
  'stripe', NULL,
  'com.stripe.payments', 'Stripe',
  '2026-02-16', 'active',
  ARRAY['card','bank_transfer'], ARRAY['USD','EUR','BRL','MXN'],
  'stripe', 'connected_account',
  '{"connected_handler_type":"stripe"}'::jsonb
),
(
  'paypal', NULL,
  'com.paypal.payments', 'PayPal',
  '2026-02-16', 'active',
  ARRAY['card','wallet'], ARRAY['USD','EUR','BRL','MXN'],
  'paypal', 'connected_account',
  '{"connected_handler_type":"paypal"}'::jsonb
),
(
  'circle', NULL,
  'com.circle.payments', 'Circle',
  '2026-02-16', 'active',
  ARRAY['card','bank_transfer','usdc'], ARRAY['USD','USDC'],
  'circle', 'connected_account',
  '{"connected_handler_type":"circle"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  integration_mode = EXCLUDED.integration_mode,
  metadata = EXCLUDED.metadata,
  supported_types = EXCLUDED.supported_types,
  supported_currencies = EXCLUDED.supported_currencies,
  updated_at = NOW();
