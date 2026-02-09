-- Allow text-based checkout IDs (chk_ prefix) and order IDs (ord_ prefix)
-- The service layer generates chk_/ord_ prefixed text IDs but the schema used UUID.
-- This migration converts to TEXT to match.

-- 1. Drop the FK from checkout_sessions.order_id → ucp_orders.id
ALTER TABLE ucp_checkout_sessions DROP CONSTRAINT IF EXISTS fk_checkout_order;

-- 2. Drop the FK from ucp_orders.checkout_id → ucp_checkout_sessions.id
ALTER TABLE ucp_orders DROP CONSTRAINT IF EXISTS ucp_orders_checkout_id_fkey;

-- 3. Convert columns from UUID to TEXT
ALTER TABLE ucp_checkout_sessions ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE ucp_checkout_sessions ALTER COLUMN id SET DEFAULT NULL;
ALTER TABLE ucp_checkout_sessions ALTER COLUMN order_id TYPE TEXT USING order_id::TEXT;

ALTER TABLE ucp_orders ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE ucp_orders ALTER COLUMN id SET DEFAULT NULL;
ALTER TABLE ucp_orders ALTER COLUMN checkout_id TYPE TEXT USING checkout_id::TEXT;

-- 4. Re-add FKs with TEXT types
ALTER TABLE ucp_orders
  ADD CONSTRAINT ucp_orders_checkout_id_fkey
  FOREIGN KEY (checkout_id) REFERENCES ucp_checkout_sessions(id);

ALTER TABLE ucp_checkout_sessions
  ADD CONSTRAINT fk_checkout_order
  FOREIGN KEY (order_id) REFERENCES ucp_orders(id);
