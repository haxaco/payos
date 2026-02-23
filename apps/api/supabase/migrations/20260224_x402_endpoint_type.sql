-- Add 'x402' to agents endpoint_type CHECK constraint
-- Enables agents to receive payment via x402 protocol (HTTP 402 challenge/payment/retry)
-- instead of Sly's internal mandate settlement.

ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_endpoint_type_check;
ALTER TABLE agents ADD CONSTRAINT agents_endpoint_type_check
  CHECK (endpoint_type IN ('none', 'webhook', 'a2a', 'x402'));
