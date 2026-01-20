-- UCP Checkout Sessions Schema
-- Phase 2: Checkout Capability for UCP Full Integration
-- @see https://ucp.dev/specification/checkout/

-- =============================================================================
-- UCP Checkout Sessions Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS ucp_checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Status state machine
  -- incomplete: Cart being built, missing required fields
  -- requires_escalation: Needs buyer input (address, payment method, etc.)
  -- ready_for_complete: All required fields present, can complete
  -- complete_in_progress: Completion started, processing payment
  -- completed: Successfully completed, order created
  -- canceled: Checkout abandoned or canceled
  status TEXT NOT NULL DEFAULT 'incomplete'
    CHECK (status IN (
      'incomplete',
      'requires_escalation',
      'ready_for_complete',
      'complete_in_progress',
      'completed',
      'canceled'
    )),

  -- Cart - Currency and line items
  currency TEXT NOT NULL,
  line_items JSONB NOT NULL DEFAULT '[]',
  -- Example line_item:
  -- {
  --   "id": "item_123",
  --   "name": "Product Name",
  --   "description": "Optional description",
  --   "quantity": 2,
  --   "unit_price": 1999,  -- in smallest currency unit (cents)
  --   "total_price": 3998,
  --   "image_url": "https://...",
  --   "product_url": "https://..."
  -- }

  -- Totals - Computed amounts
  totals JSONB NOT NULL DEFAULT '[]',
  -- Example totals:
  -- [
  --   { "type": "subtotal", "amount": 3998, "label": "Subtotal" },
  --   { "type": "tax", "amount": 320, "label": "Tax (8%)" },
  --   { "type": "shipping", "amount": 500, "label": "Standard Shipping" },
  --   { "type": "discount", "amount": -500, "label": "Promo: SAVE5" },
  --   { "type": "total", "amount": 4318, "label": "Total" }
  -- ]

  -- Buyer information
  buyer JSONB,
  -- Example buyer:
  -- {
  --   "email": "buyer@example.com",
  --   "name": "John Doe",
  --   "phone": "+1234567890"
  -- }

  -- Addresses
  shipping_address JSONB,
  billing_address JSONB,
  -- Example address:
  -- {
  --   "line1": "123 Main St",
  --   "line2": "Apt 4",
  --   "city": "San Francisco",
  --   "state": "CA",
  --   "postal_code": "94105",
  --   "country": "US"
  -- }

  -- Payment configuration
  payment_config JSONB NOT NULL DEFAULT '{"handlers": ["payos"]}',
  -- Example payment_config:
  -- {
  --   "handlers": ["payos", "stripe", "google_pay"],
  --   "default_handler": "payos",
  --   "capture_method": "automatic"
  -- }

  -- Payment instruments (acquired during checkout)
  payment_instruments JSONB DEFAULT '[]',
  -- Example payment_instrument:
  -- {
  --   "id": "pi_123",
  --   "handler": "payos",
  --   "type": "pix",
  --   "last4": "1234",
  --   "created_at": "2026-01-20T..."
  -- }

  -- Selected instrument for payment
  selected_instrument_id TEXT,

  -- Messages (errors, warnings, info)
  messages JSONB DEFAULT '[]',
  -- Example message:
  -- {
  --   "type": "error",
  --   "code": "MISSING_SHIPPING_ADDRESS",
  --   "severity": "recoverable",
  --   "path": "$.shipping_address",
  --   "content": "Shipping address is required for physical goods",
  --   "content_type": "plain"
  -- }

  -- Handoff URL (where to redirect buyer after checkout)
  continue_url TEXT,
  cancel_url TEXT,

  -- Links (terms, privacy, support)
  links JSONB NOT NULL DEFAULT '[]',
  -- Example links:
  -- [
  --   { "rel": "terms", "href": "https://..." },
  --   { "rel": "privacy", "href": "https://..." },
  --   { "rel": "support", "href": "https://..." }
  -- ]

  -- Metadata for merchant-specific data
  metadata JSONB DEFAULT '{}',

  -- Reference to created order (after completion)
  order_id UUID,

  -- Timestamps
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '6 hours',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- UCP Orders Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS ucp_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  checkout_id UUID NOT NULL REFERENCES ucp_checkout_sessions(id),

  -- Order status
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN (
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'refunded'
    )),

  -- Order details (immutable after creation)
  currency TEXT NOT NULL,
  line_items JSONB NOT NULL,
  totals JSONB NOT NULL,
  buyer JSONB,
  shipping_address JSONB,
  billing_address JSONB,

  -- Payment info
  payment JSONB NOT NULL,
  -- Example payment:
  -- {
  --   "handler_id": "payos",
  --   "instrument_id": "pi_123",
  --   "status": "completed",
  --   "settlement_id": "stl_456",
  --   "amount": 4318,
  --   "currency": "USD"
  -- }

  -- Fulfillment expectations (delivery promises)
  expectations JSONB DEFAULT '[]',
  -- Example expectation:
  -- {
  --   "id": "exp_123",
  --   "type": "delivery",
  --   "description": "Standard shipping",
  --   "estimated_date": "2026-01-25",
  --   "tracking_url": "https://..."
  -- }

  -- Fulfillment events (shipment tracking - append-only)
  events JSONB DEFAULT '[]',
  -- Example event:
  -- {
  --   "id": "evt_123",
  --   "type": "shipped",
  --   "timestamp": "2026-01-21T...",
  --   "description": "Package shipped via UPS",
  --   "tracking_number": "1Z999...",
  --   "carrier": "UPS"
  -- }

  -- Adjustments (refunds, returns, etc.)
  adjustments JSONB DEFAULT '[]',
  -- Example adjustment:
  -- {
  --   "id": "adj_123",
  --   "type": "refund",
  --   "amount": 1999,
  --   "reason": "Item returned",
  --   "created_at": "2026-01-22T..."
  -- }

  -- Permanent link to this order
  permalink_url TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key from checkout to order (after orders table exists)
ALTER TABLE ucp_checkout_sessions
  ADD CONSTRAINT fk_checkout_order
  FOREIGN KEY (order_id) REFERENCES ucp_orders(id);

-- =============================================================================
-- Indexes
-- =============================================================================

-- Checkout sessions indexes
CREATE INDEX idx_ucp_checkout_tenant ON ucp_checkout_sessions(tenant_id);
CREATE INDEX idx_ucp_checkout_status ON ucp_checkout_sessions(status);
CREATE INDEX idx_ucp_checkout_created ON ucp_checkout_sessions(created_at DESC);
CREATE INDEX idx_ucp_checkout_expires ON ucp_checkout_sessions(expires_at) WHERE status NOT IN ('completed', 'canceled');

-- Orders indexes
CREATE INDEX idx_ucp_orders_tenant ON ucp_orders(tenant_id);
CREATE INDEX idx_ucp_orders_checkout ON ucp_orders(checkout_id);
CREATE INDEX idx_ucp_orders_status ON ucp_orders(status);
CREATE INDEX idx_ucp_orders_created ON ucp_orders(created_at DESC);

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE ucp_checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ucp_orders ENABLE ROW LEVEL SECURITY;

-- Checkout sessions policies
CREATE POLICY "Tenants can view their own checkout sessions"
  ON ucp_checkout_sessions FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Tenants can create checkout sessions"
  ON ucp_checkout_sessions FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Tenants can update their own checkout sessions"
  ON ucp_checkout_sessions FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Orders policies
CREATE POLICY "Tenants can view their own orders"
  ON ucp_orders FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Tenants can create orders"
  ON ucp_orders FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Tenants can update their own orders"
  ON ucp_orders FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- =============================================================================
-- Triggers for updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_ucp_checkout_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ucp_checkout_updated_at
  BEFORE UPDATE ON ucp_checkout_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_ucp_checkout_updated_at();

CREATE OR REPLACE FUNCTION update_ucp_order_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ucp_order_updated_at
  BEFORE UPDATE ON ucp_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_ucp_order_updated_at();

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE ucp_checkout_sessions IS 'UCP checkout sessions for shopping cart and payment flow';
COMMENT ON TABLE ucp_orders IS 'UCP orders created from completed checkouts';

COMMENT ON COLUMN ucp_checkout_sessions.status IS 'Checkout state: incomplete, requires_escalation, ready_for_complete, complete_in_progress, completed, canceled';
COMMENT ON COLUMN ucp_checkout_sessions.line_items IS 'Array of line items in the cart';
COMMENT ON COLUMN ucp_checkout_sessions.totals IS 'Computed totals including subtotal, tax, shipping, discounts';
COMMENT ON COLUMN ucp_checkout_sessions.messages IS 'Errors, warnings, and info messages for the checkout';
COMMENT ON COLUMN ucp_checkout_sessions.payment_instruments IS 'Payment instruments acquired during checkout';

COMMENT ON COLUMN ucp_orders.expectations IS 'Delivery promises and fulfillment expectations';
COMMENT ON COLUMN ucp_orders.events IS 'Fulfillment events like shipped, delivered (append-only)';
COMMENT ON COLUMN ucp_orders.adjustments IS 'Order adjustments like refunds and returns';
