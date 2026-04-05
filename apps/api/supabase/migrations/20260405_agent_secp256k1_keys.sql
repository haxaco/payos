-- Agent secp256k1 / EVM Signing Keys
--
-- Extends the agent_signing_keys table to support secp256k1 (Ethereum EOA)
-- keys for x402 spec compliance. Each agent now gets a managed EVM keypair
-- whose private key is encrypted in credential-vault and whose address is
-- derived from the public key.
--
-- The existing ed25519 / rsa-sha256 keys (used for card-network HTTP Message
-- Signatures) continue to work alongside the new secp256k1 keys. One agent
-- can have multiple signing keys if we drop the existing per-agent unique
-- constraint. For now we keep the constraint and use a separate row
-- convention where the most recent active key per agent takes precedence,
-- or we relax the constraint.

-- 1. Extend the algorithm CHECK constraint to allow secp256k1
ALTER TABLE agent_signing_keys
  DROP CONSTRAINT IF EXISTS agent_signing_keys_algorithm_check;

ALTER TABLE agent_signing_keys
  ADD CONSTRAINT agent_signing_keys_algorithm_check
  CHECK (algorithm IN ('ed25519', 'rsa-sha256', 'secp256k1'));

-- 2. Drop the per-agent uniqueness so an agent can hold BOTH a card-network
--    key (ed25519/rsa) and an EVM key (secp256k1) at the same time.
ALTER TABLE agent_signing_keys
  DROP CONSTRAINT IF EXISTS agent_signing_keys_agent_id_key;

-- 3. Enforce one-per-(agent, algorithm) instead
CREATE UNIQUE INDEX IF NOT EXISTS agent_signing_keys_agent_algo_uniq
  ON agent_signing_keys (agent_id, algorithm)
  WHERE status = 'active';

-- 4. Add an ethereum_address column for secp256k1 keys (derived from public_key).
--    Nullable because ed25519/rsa keys don't have an EVM address.
ALTER TABLE agent_signing_keys
  ADD COLUMN IF NOT EXISTS ethereum_address TEXT;

-- Index for reverse lookup (find agent by EOA address)
CREATE INDEX IF NOT EXISTS agent_signing_keys_eth_addr_idx
  ON agent_signing_keys (ethereum_address)
  WHERE ethereum_address IS NOT NULL;

COMMENT ON COLUMN agent_signing_keys.ethereum_address IS
  'Derived EVM address for secp256k1 keys. Used as the payer address in '
  'x402 EIP-3009 / Permit2 signatures. NULL for ed25519/rsa keys.';
