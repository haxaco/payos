-- Migration: Add card network handler types
-- Epic 53: Card Network Integration
-- Adds visa_vic and mastercard_agent_pay as valid handler types

-- Drop the existing check constraint
ALTER TABLE connected_accounts
DROP CONSTRAINT IF EXISTS connected_accounts_handler_type_check;

-- Add new check constraint with card network types
ALTER TABLE connected_accounts
ADD CONSTRAINT connected_accounts_handler_type_check
CHECK (handler_type IN ('stripe', 'paypal', 'payos_native', 'circle', 'visa_vic', 'mastercard_agent_pay'));

-- Update the comment to reflect new types
COMMENT ON COLUMN connected_accounts.handler_type IS 'Type of payment handler: stripe, paypal, payos_native, circle, visa_vic, mastercard_agent_pay';
