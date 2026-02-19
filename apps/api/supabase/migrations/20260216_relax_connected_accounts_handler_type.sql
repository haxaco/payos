-- Relax handler_type CHECK constraint on connected_accounts
-- Allow DB-driven payment handler types (e.g., 'invu', 'payos_latam')
-- to be connected alongside the original hardcoded types.

ALTER TABLE connected_accounts
  DROP CONSTRAINT IF EXISTS connected_accounts_handler_type_check;

ALTER TABLE connected_accounts
  ADD CONSTRAINT connected_accounts_handler_type_check
  CHECK (handler_type IS NOT NULL AND length(handler_type) >= 1);
