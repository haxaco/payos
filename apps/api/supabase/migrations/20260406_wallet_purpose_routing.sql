-- Unified Wallet Architecture: purpose-based routing + wallet type expansion
--
-- Adds 'smart_wallet' and 'tempo' to wallet_type so smart wallets and
-- Tempo MPP wallets are first-class entries in the wallets table.
-- Standardizes the 'purpose' column for routing: each protocol's payment
-- endpoint resolves the agent's wallet by purpose, falling back to 'default'.

-- Expand wallet_type enum
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS wallets_wallet_type_check;
ALTER TABLE wallets ADD CONSTRAINT wallets_wallet_type_check
  CHECK (wallet_type IN (
    'internal',          -- Sly-internal ledger (no on-chain presence)
    'circle_custodial',  -- Circle-managed (key held by Circle)
    'circle_mpc',        -- Circle MPC (key sharded)
    'external',          -- BYOW (agent owns the key, Sly verified ownership)
    'smart_wallet',      -- Coinbase Smart Wallet (ERC-4337, owned by agent's EOA)
    'tempo'              -- Tempo network wallet (MPP streaming)
  ));

-- Document the purpose convention
COMMENT ON COLUMN wallets.purpose IS
  'Routing purpose for wallet selection. Values: '
  'default = primary wallet (used when no specific purpose matches), '
  'x402 = reserved for x402 EIP-3009 signing, '
  'mpp = reserved for Tempo MPP streaming, '
  'treasury = account-level treasury, '
  'byow = agent-owned external wallet, '
  'internal = Sly-internal ledger. '
  'The wallet router tries exact purpose match first, then falls back to default.';

-- Index on purpose for fast routing lookups
CREATE INDEX IF NOT EXISTS wallets_purpose_agent_idx
  ON wallets (managed_by_agent_id, purpose)
  WHERE status = 'active';
