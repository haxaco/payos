-- Card Networks and Vaulting Migration
-- Epic 53: Card Network Integration (Visa VIC, Mastercard Agent Pay)
-- Epic 54: Card Vaulting for Agents

-- ============================================
-- Epic 53: Card Network Integration
-- ============================================

-- Card network public keys cache (for Web Bot Auth verification)
CREATE TABLE IF NOT EXISTS card_network_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network TEXT NOT NULL CHECK (network IN ('visa', 'mastercard')),
  key_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  algorithm TEXT NOT NULL DEFAULT 'ed25519' CHECK (algorithm IN ('ed25519', 'rsa-sha256', 'ecdsa-p256')),
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(network, key_id)
);

CREATE INDEX idx_card_network_keys_network ON card_network_keys(network);
CREATE INDEX idx_card_network_keys_key_id ON card_network_keys(key_id);
CREATE INDEX idx_card_network_keys_valid_until ON card_network_keys(valid_until) WHERE valid_until IS NOT NULL;

-- Card agent verifications audit log
CREATE TABLE IF NOT EXISTS card_agent_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  network TEXT NOT NULL CHECK (network IN ('visa', 'mastercard')),
  agent_key_id TEXT NOT NULL,
  verified BOOLEAN NOT NULL,
  failure_reason TEXT,
  agent_provider TEXT,
  request_path TEXT,
  request_method TEXT,
  client_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_card_agent_verifications_tenant ON card_agent_verifications(tenant_id);
CREATE INDEX idx_card_agent_verifications_network ON card_agent_verifications(network);
CREATE INDEX idx_card_agent_verifications_key_id ON card_agent_verifications(agent_key_id);
CREATE INDEX idx_card_agent_verifications_created ON card_agent_verifications(created_at DESC);

-- Visa VIC payment instructions
CREATE TABLE IF NOT EXISTS visa_payment_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  instruction_id TEXT NOT NULL UNIQUE,
  merchant_ref TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  merchant_name TEXT NOT NULL,
  merchant_category_code TEXT,
  merchant_country TEXT,
  merchant_url TEXT,
  restrictions JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'cancelled', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_visa_instructions_tenant ON visa_payment_instructions(tenant_id);
CREATE INDEX idx_visa_instructions_instruction_id ON visa_payment_instructions(instruction_id);
CREATE INDEX idx_visa_instructions_status ON visa_payment_instructions(status);
CREATE INDEX idx_visa_instructions_expires ON visa_payment_instructions(expires_at);

-- Visa VTS (Token Service) tokens
CREATE TABLE IF NOT EXISTS visa_agent_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  vic_token_id TEXT NOT NULL UNIQUE,
  token_status TEXT NOT NULL DEFAULT 'active' CHECK (token_status IN ('active', 'suspended', 'deleted')),
  card_last_four TEXT NOT NULL,
  card_brand TEXT DEFAULT 'visa',
  pan_reference TEXT,
  provisioned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_visa_tokens_tenant ON visa_agent_tokens(tenant_id);
CREATE INDEX idx_visa_tokens_agent ON visa_agent_tokens(agent_id);
CREATE INDEX idx_visa_tokens_account ON visa_agent_tokens(account_id);
CREATE INDEX idx_visa_tokens_status ON visa_agent_tokens(token_status);

-- Mastercard registered agents
CREATE TABLE IF NOT EXISTS mastercard_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  mc_agent_id TEXT NOT NULL UNIQUE,
  agent_name TEXT,
  public_key TEXT,
  capabilities TEXT[] DEFAULT '{}',
  agent_status TEXT NOT NULL DEFAULT 'pending' CHECK (agent_status IN ('pending', 'active', 'suspended', 'rejected')),
  provider TEXT,
  callback_url TEXT,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mc_agents_tenant ON mastercard_agents(tenant_id);
CREATE INDEX idx_mc_agents_agent ON mastercard_agents(agent_id);
CREATE INDEX idx_mc_agents_mc_id ON mastercard_agents(mc_agent_id);
CREATE INDEX idx_mc_agents_status ON mastercard_agents(agent_status);

-- Mastercard MDES (Digital Enablement Service) tokens
CREATE TABLE IF NOT EXISTS mastercard_agentic_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  mc_agent_id TEXT NOT NULL REFERENCES mastercard_agents(mc_agent_id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  token_reference TEXT NOT NULL UNIQUE,
  card_last_four TEXT NOT NULL,
  card_brand TEXT DEFAULT 'mastercard',
  token_status TEXT NOT NULL DEFAULT 'active' CHECK (token_status IN ('active', 'suspended', 'expired', 'deleted')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mc_tokens_tenant ON mastercard_agentic_tokens(tenant_id);
CREATE INDEX idx_mc_tokens_agent ON mastercard_agentic_tokens(mc_agent_id);
CREATE INDEX idx_mc_tokens_account ON mastercard_agentic_tokens(account_id);
CREATE INDEX idx_mc_tokens_status ON mastercard_agentic_tokens(token_status);

-- Card network transactions (for both Visa and Mastercard)
CREATE TABLE IF NOT EXISTS card_network_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  network TEXT NOT NULL CHECK (network IN ('visa', 'mastercard')),

  -- References
  payment_intent_id TEXT NOT NULL,
  transfer_id UUID REFERENCES transfers(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,

  -- Token used
  token_id TEXT,
  token_type TEXT CHECK (token_type IN ('vts', 'mdes')),

  -- Transaction details
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  merchant_name TEXT,
  merchant_id TEXT,
  merchant_category_code TEXT,
  merchant_country TEXT,

  -- Network response
  authorization_code TEXT,
  network_reference TEXT,
  network_status TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'approved', 'declined', 'completed', 'refunded', 'disputed')),

  -- Decline/error info
  decline_code TEXT,
  decline_reason TEXT,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  authorized_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_card_txns_tenant ON card_network_transactions(tenant_id, created_at DESC);
CREATE INDEX idx_card_txns_network ON card_network_transactions(network);
CREATE INDEX idx_card_txns_intent ON card_network_transactions(payment_intent_id);
CREATE INDEX idx_card_txns_transfer ON card_network_transactions(transfer_id);
CREATE INDEX idx_card_txns_agent ON card_network_transactions(agent_id);
CREATE INDEX idx_card_txns_status ON card_network_transactions(status);

-- ============================================
-- Epic 54: Card Vaulting for Agents
-- ============================================

-- Vaulted cards (owner's cards stored for agent use)
CREATE TABLE IF NOT EXISTS vaulted_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Card storage (PCI compliant - via Stripe, etc.)
  processor TEXT NOT NULL DEFAULT 'stripe' CHECK (processor IN ('stripe', 'basis_theory', 'spreedly')),
  processor_token TEXT NOT NULL,

  -- Card details (safe to store)
  card_last_four TEXT NOT NULL,
  card_brand TEXT NOT NULL CHECK (card_brand IN ('visa', 'mastercard', 'amex', 'discover')),
  card_expiry_month INT NOT NULL CHECK (card_expiry_month BETWEEN 1 AND 12),
  card_expiry_year INT NOT NULL CHECK (card_expiry_year >= 2024),
  cardholder_name TEXT,

  -- Network tokens (for VIC / Agent Pay)
  visa_vts_token TEXT,
  visa_vts_token_expiry TIMESTAMPTZ,
  mastercard_mdes_token TEXT,
  mastercard_mdes_token_expiry TIMESTAMPTZ,

  -- Metadata
  label TEXT,  -- "Corporate Amex", "Marketing Budget"
  billing_address JSONB,
  metadata JSONB DEFAULT '{}',

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vaulted_cards_tenant ON vaulted_cards(tenant_id);
CREATE INDEX idx_vaulted_cards_account ON vaulted_cards(account_id);
CREATE INDEX idx_vaulted_cards_status ON vaulted_cards(status);
CREATE INDEX idx_vaulted_cards_brand ON vaulted_cards(card_brand);

-- Agent access to vaulted cards
CREATE TABLE IF NOT EXISTS agent_card_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  vaulted_card_id UUID NOT NULL REFERENCES vaulted_cards(id) ON DELETE CASCADE,

  -- Permissions
  can_browse BOOLEAN NOT NULL DEFAULT TRUE,       -- Use for price comparison
  can_purchase BOOLEAN NOT NULL DEFAULT TRUE,     -- Complete transactions

  -- Spending limits (null = no limit, uses card-level or agent-level)
  per_transaction_limit DECIMAL(15,2),
  daily_limit DECIMAL(15,2),
  monthly_limit DECIMAL(15,2),

  -- Category restrictions
  allowed_mccs TEXT[],    -- Only allow these merchant categories
  blocked_mccs TEXT[],    -- Block these (takes precedence)

  -- Approval workflow
  require_approval_above DECIMAL(15,2),
  auto_approve_merchants TEXT[],  -- Known/trusted merchants

  -- Time restrictions
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,

  -- Usage tracking
  daily_spent DECIMAL(15,2) NOT NULL DEFAULT 0,
  monthly_spent DECIMAL(15,2) NOT NULL DEFAULT 0,
  daily_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  monthly_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_spent DECIMAL(15,2) NOT NULL DEFAULT 0,
  transaction_count INT NOT NULL DEFAULT 0,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(agent_id, vaulted_card_id)
);

CREATE INDEX idx_agent_card_access_tenant ON agent_card_access(tenant_id);
CREATE INDEX idx_agent_card_access_agent ON agent_card_access(agent_id);
CREATE INDEX idx_agent_card_access_card ON agent_card_access(vaulted_card_id);
CREATE INDEX idx_agent_card_access_status ON agent_card_access(status);

-- Card transaction log (purchases made with vaulted cards)
CREATE TABLE IF NOT EXISTS vaulted_card_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vaulted_card_id UUID NOT NULL REFERENCES vaulted_cards(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  agent_card_access_id UUID REFERENCES agent_card_access(id) ON DELETE SET NULL,

  -- Transaction details
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  merchant_name TEXT,
  merchant_domain TEXT,
  merchant_category_code TEXT,

  -- Network details
  network TEXT NOT NULL CHECK (network IN ('visa', 'mastercard')),
  network_token_used TEXT,
  network_transaction_id TEXT,
  authorization_code TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'completed', 'refunded', 'disputed')),

  -- Approval
  required_approval BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,

  -- Decline/failure info
  decline_reason TEXT,
  decline_code TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vaulted_card_txns_tenant ON vaulted_card_transactions(tenant_id, created_at DESC);
CREATE INDEX idx_vaulted_card_txns_card ON vaulted_card_transactions(vaulted_card_id);
CREATE INDEX idx_vaulted_card_txns_agent ON vaulted_card_transactions(agent_id);
CREATE INDEX idx_vaulted_card_txns_status ON vaulted_card_transactions(status);
CREATE INDEX idx_vaulted_card_txns_approval ON vaulted_card_transactions(required_approval, status) WHERE required_approval = TRUE;

-- ============================================
-- RLS Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE card_network_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_agent_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE visa_payment_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE visa_agent_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE mastercard_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE mastercard_agentic_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_network_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaulted_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_card_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaulted_card_transactions ENABLE ROW LEVEL SECURITY;

-- card_network_keys: Public read (cached keys), service role write
CREATE POLICY "card_network_keys_select" ON card_network_keys
  FOR SELECT USING (true);

CREATE POLICY "card_network_keys_insert" ON card_network_keys
  FOR INSERT WITH CHECK (true);  -- Service role only in practice

CREATE POLICY "card_network_keys_update" ON card_network_keys
  FOR UPDATE USING (true);  -- Service role only in practice

-- card_agent_verifications: Tenant isolation
CREATE POLICY "card_agent_verifications_tenant_isolation" ON card_agent_verifications
  FOR ALL USING (
    tenant_id = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'tenant_id',
      current_setting('app.current_tenant_id', true)
    )::uuid
  );

-- visa_payment_instructions: Tenant isolation
CREATE POLICY "visa_instructions_tenant_isolation" ON visa_payment_instructions
  FOR ALL USING (
    tenant_id = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'tenant_id',
      current_setting('app.current_tenant_id', true)
    )::uuid
  );

-- visa_agent_tokens: Tenant isolation
CREATE POLICY "visa_tokens_tenant_isolation" ON visa_agent_tokens
  FOR ALL USING (
    tenant_id = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'tenant_id',
      current_setting('app.current_tenant_id', true)
    )::uuid
  );

-- mastercard_agents: Tenant isolation
CREATE POLICY "mc_agents_tenant_isolation" ON mastercard_agents
  FOR ALL USING (
    tenant_id = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'tenant_id',
      current_setting('app.current_tenant_id', true)
    )::uuid
  );

-- mastercard_agentic_tokens: Tenant isolation
CREATE POLICY "mc_tokens_tenant_isolation" ON mastercard_agentic_tokens
  FOR ALL USING (
    tenant_id = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'tenant_id',
      current_setting('app.current_tenant_id', true)
    )::uuid
  );

-- card_network_transactions: Tenant isolation
CREATE POLICY "card_txns_tenant_isolation" ON card_network_transactions
  FOR ALL USING (
    tenant_id = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'tenant_id',
      current_setting('app.current_tenant_id', true)
    )::uuid
  );

-- vaulted_cards: Tenant isolation
CREATE POLICY "vaulted_cards_tenant_isolation" ON vaulted_cards
  FOR ALL USING (
    tenant_id = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'tenant_id',
      current_setting('app.current_tenant_id', true)
    )::uuid
  );

-- agent_card_access: Tenant isolation
CREATE POLICY "agent_card_access_tenant_isolation" ON agent_card_access
  FOR ALL USING (
    tenant_id = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'tenant_id',
      current_setting('app.current_tenant_id', true)
    )::uuid
  );

-- vaulted_card_transactions: Tenant isolation
CREATE POLICY "vaulted_card_txns_tenant_isolation" ON vaulted_card_transactions
  FOR ALL USING (
    tenant_id = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'tenant_id',
      current_setting('app.current_tenant_id', true)
    )::uuid
  );

-- ============================================
-- Functions
-- ============================================

-- Function to reset daily spending limits
CREATE OR REPLACE FUNCTION reset_agent_card_daily_spending()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE agent_card_access
  SET
    daily_spent = 0,
    daily_reset_at = NOW(),
    updated_at = NOW()
  WHERE daily_reset_at < NOW() - INTERVAL '1 day';
END;
$$;

-- Function to reset monthly spending limits
CREATE OR REPLACE FUNCTION reset_agent_card_monthly_spending()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE agent_card_access
  SET
    monthly_spent = 0,
    monthly_reset_at = NOW(),
    updated_at = NOW()
  WHERE monthly_reset_at < NOW() - INTERVAL '1 month';
END;
$$;

-- Function to check if an agent can make a purchase
CREATE OR REPLACE FUNCTION check_agent_card_purchase(
  p_agent_id UUID,
  p_vaulted_card_id UUID,
  p_amount DECIMAL,
  p_merchant_category_code TEXT DEFAULT NULL
)
RETURNS TABLE (
  allowed BOOLEAN,
  reason TEXT,
  requires_approval BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_access agent_card_access%ROWTYPE;
  v_card vaulted_cards%ROWTYPE;
BEGIN
  -- Get access record
  SELECT * INTO v_access
  FROM agent_card_access
  WHERE agent_id = p_agent_id
    AND vaulted_card_id = p_vaulted_card_id
    AND status = 'active';

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'No active access to this card'::TEXT, FALSE;
    RETURN;
  END IF;

  -- Check can_purchase permission
  IF NOT v_access.can_purchase THEN
    RETURN QUERY SELECT FALSE, 'Purchase permission not granted'::TEXT, FALSE;
    RETURN;
  END IF;

  -- Check time validity
  IF v_access.valid_from > NOW() THEN
    RETURN QUERY SELECT FALSE, 'Access not yet valid'::TEXT, FALSE;
    RETURN;
  END IF;

  IF v_access.valid_until IS NOT NULL AND v_access.valid_until < NOW() THEN
    RETURN QUERY SELECT FALSE, 'Access has expired'::TEXT, FALSE;
    RETURN;
  END IF;

  -- Check per-transaction limit
  IF v_access.per_transaction_limit IS NOT NULL AND p_amount > v_access.per_transaction_limit THEN
    RETURN QUERY SELECT FALSE, 'Exceeds per-transaction limit'::TEXT, FALSE;
    RETURN;
  END IF;

  -- Check daily limit
  IF v_access.daily_limit IS NOT NULL AND (v_access.daily_spent + p_amount) > v_access.daily_limit THEN
    RETURN QUERY SELECT FALSE, 'Exceeds daily limit'::TEXT, FALSE;
    RETURN;
  END IF;

  -- Check monthly limit
  IF v_access.monthly_limit IS NOT NULL AND (v_access.monthly_spent + p_amount) > v_access.monthly_limit THEN
    RETURN QUERY SELECT FALSE, 'Exceeds monthly limit'::TEXT, FALSE;
    RETURN;
  END IF;

  -- Check MCC restrictions
  IF p_merchant_category_code IS NOT NULL THEN
    -- Blocked MCCs take precedence
    IF v_access.blocked_mccs IS NOT NULL AND p_merchant_category_code = ANY(v_access.blocked_mccs) THEN
      RETURN QUERY SELECT FALSE, 'Merchant category blocked'::TEXT, FALSE;
      RETURN;
    END IF;

    -- Check allowed MCCs if specified
    IF v_access.allowed_mccs IS NOT NULL AND array_length(v_access.allowed_mccs, 1) > 0 THEN
      IF NOT (p_merchant_category_code = ANY(v_access.allowed_mccs)) THEN
        RETURN QUERY SELECT FALSE, 'Merchant category not allowed'::TEXT, FALSE;
        RETURN;
      END IF;
    END IF;
  END IF;

  -- Check if approval is required
  IF v_access.require_approval_above IS NOT NULL AND p_amount > v_access.require_approval_above THEN
    RETURN QUERY SELECT TRUE, 'Approval required'::TEXT, TRUE;
    RETURN;
  END IF;

  -- Get card and check status
  SELECT * INTO v_card
  FROM vaulted_cards
  WHERE id = p_vaulted_card_id
    AND status = 'active';

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Card not active'::TEXT, FALSE;
    RETURN;
  END IF;

  -- All checks passed
  RETURN QUERY SELECT TRUE, NULL::TEXT, FALSE;
END;
$$;

-- Function to record a card transaction and update spending
CREATE OR REPLACE FUNCTION record_agent_card_transaction(
  p_tenant_id UUID,
  p_agent_id UUID,
  p_vaulted_card_id UUID,
  p_amount DECIMAL,
  p_currency TEXT,
  p_merchant_name TEXT,
  p_merchant_category_code TEXT,
  p_network TEXT,
  p_requires_approval BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id UUID;
  v_access_id UUID;
BEGIN
  -- Get access record ID
  SELECT id INTO v_access_id
  FROM agent_card_access
  WHERE agent_id = p_agent_id
    AND vaulted_card_id = p_vaulted_card_id
    AND status = 'active';

  -- Create transaction
  INSERT INTO vaulted_card_transactions (
    tenant_id,
    vaulted_card_id,
    agent_id,
    agent_card_access_id,
    amount,
    currency,
    merchant_name,
    merchant_category_code,
    network,
    status,
    required_approval
  ) VALUES (
    p_tenant_id,
    p_vaulted_card_id,
    p_agent_id,
    v_access_id,
    p_amount,
    p_currency,
    p_merchant_name,
    p_merchant_category_code,
    p_network,
    CASE WHEN p_requires_approval THEN 'pending' ELSE 'approved' END,
    p_requires_approval
  )
  RETURNING id INTO v_transaction_id;

  -- Update spending (only if not requiring approval)
  IF NOT p_requires_approval AND v_access_id IS NOT NULL THEN
    UPDATE agent_card_access
    SET
      daily_spent = daily_spent + p_amount,
      monthly_spent = monthly_spent + p_amount,
      total_spent = total_spent + p_amount,
      transaction_count = transaction_count + 1,
      updated_at = NOW()
    WHERE id = v_access_id;
  END IF;

  RETURN v_transaction_id;
END;
$$;

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE card_network_keys IS 'Cache of public keys from Visa TAP and Mastercard Agent directories for signature verification';
COMMENT ON TABLE card_agent_verifications IS 'Audit log of Web Bot Auth signature verifications';
COMMENT ON TABLE visa_payment_instructions IS 'Visa VIC payment instructions created for agent transactions';
COMMENT ON TABLE visa_agent_tokens IS 'Visa Token Service (VTS) tokens provisioned for agents';
COMMENT ON TABLE mastercard_agents IS 'Registered Mastercard Agent Pay agents';
COMMENT ON TABLE mastercard_agentic_tokens IS 'Mastercard MDES tokens for agent transactions';
COMMENT ON TABLE card_network_transactions IS 'Transactions processed through card networks (Visa/Mastercard)';
COMMENT ON TABLE vaulted_cards IS 'Securely stored cards for agent use (PCI tokens via Stripe/etc)';
COMMENT ON TABLE agent_card_access IS 'Agent permissions and limits for vaulted cards';
COMMENT ON TABLE vaulted_card_transactions IS 'Transactions made by agents using vaulted cards';
