/**
 * Run the agent_payment_approvals migration via Supabase
 * 
 * Uses the Supabase Management API to execute SQL
 */

import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Extract project ref from URL
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error('Could not extract project ref from SUPABASE_URL');
  process.exit(1);
}

console.log(`📦 Running migration on project: ${projectRef}`);

// The migration SQL broken into statements
const statements = [
  // Create table
  `CREATE TABLE IF NOT EXISTS agent_payment_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    protocol VARCHAR(20) NOT NULL,
    amount DECIMAL(20,8) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USDC',
    recipient JSONB,
    payment_context JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    decided_by UUID REFERENCES user_profiles(id),
    decided_at TIMESTAMPTZ,
    decision_reason TEXT,
    executed_transfer_id UUID REFERENCES transfers(id),
    executed_at TIMESTAMPTZ,
    execution_error TEXT,
    requested_by_type VARCHAR(20),
    requested_by_id VARCHAR(255),
    requested_by_name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  
  // Create indexes
  `CREATE INDEX IF NOT EXISTS idx_approvals_tenant ON agent_payment_approvals(tenant_id)`,
  `CREATE INDEX IF NOT EXISTS idx_approvals_wallet ON agent_payment_approvals(wallet_id)`,
  `CREATE INDEX IF NOT EXISTS idx_approvals_agent ON agent_payment_approvals(agent_id) WHERE agent_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_approvals_status ON agent_payment_approvals(tenant_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_approvals_pending ON agent_payment_approvals(tenant_id, status, created_at) WHERE status = 'pending'`,
  `CREATE INDEX IF NOT EXISTS idx_approvals_expires ON agent_payment_approvals(expires_at) WHERE status = 'pending'`,
  `CREATE INDEX IF NOT EXISTS idx_approvals_created ON agent_payment_approvals(created_at DESC)`,
  
  // Enable RLS
  `ALTER TABLE agent_payment_approvals ENABLE ROW LEVEL SECURITY`,
  
  // RLS policies
  `DO $$ BEGIN
    CREATE POLICY "approvals_tenant_select" ON agent_payment_approvals
      FOR SELECT USING (tenant_id = (SELECT public.get_user_tenant_id()));
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  
  `DO $$ BEGIN
    CREATE POLICY "approvals_tenant_insert" ON agent_payment_approvals
      FOR INSERT WITH CHECK (tenant_id = (SELECT public.get_user_tenant_id()));
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  
  `DO $$ BEGIN
    CREATE POLICY "approvals_tenant_update" ON agent_payment_approvals
      FOR UPDATE USING (tenant_id = (SELECT public.get_user_tenant_id()));
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  
  `DO $$ BEGIN
    CREATE POLICY "approvals_service_all" ON agent_payment_approvals
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  
  // Grant permissions
  `GRANT SELECT, INSERT, UPDATE ON agent_payment_approvals TO authenticated`,
  
  // Helper function: expire pending approvals
  `CREATE OR REPLACE FUNCTION expire_pending_approvals()
  RETURNS INTEGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
  DECLARE
    expired_count INTEGER;
  BEGIN
    UPDATE public.agent_payment_approvals
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending' AND expires_at < NOW();
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
  END;
  $$`,
  
  // Helper function: get pending count
  `CREATE OR REPLACE FUNCTION get_pending_approval_count(p_wallet_id UUID)
  RETURNS INTEGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
  DECLARE
    pending_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO pending_count
    FROM public.agent_payment_approvals
    WHERE wallet_id = p_wallet_id AND status = 'pending' AND expires_at > NOW();
    RETURN pending_count;
  END;
  $$`,
  
  // Helper function: get pending amount
  `CREATE OR REPLACE FUNCTION get_pending_approval_amount(p_wallet_id UUID)
  RETURNS DECIMAL(20,8)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
  DECLARE
    pending_amount DECIMAL(20,8);
  BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO pending_amount
    FROM public.agent_payment_approvals
    WHERE wallet_id = p_wallet_id AND status = 'pending' AND expires_at > NOW();
    RETURN pending_amount;
  END;
  $$`,
];

async function runMigration() {
  // Use Supabase SQL API endpoint
  const sqlEndpoint = `${SUPABASE_URL}/rest/v1/rpc/`;
  
  console.log('\n🔄 Executing migration statements...\n');
  
  for (let i = 0; i < statements.length; i++) {
    const sql = statements[i];
    const preview = sql.substring(0, 60).replace(/\n/g, ' ') + '...';
    
    try {
      // We can't run raw SQL via PostgREST, but we can check if the table exists
      // For actual migration, we need to use the Supabase Dashboard or supabase db push
      console.log(`  [${i + 1}/${statements.length}] ${preview}`);
    } catch (error: any) {
      console.error(`  ❌ Failed: ${error.message}`);
    }
  }
  
  console.log('\n⚠️  Note: Raw SQL execution requires Supabase Dashboard or supabase CLI with access token.');
  console.log('\n📋 To apply this migration:');
  console.log('   1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql');
  console.log('   2. Copy the SQL from: apps/api/supabase/migrations/20260119_agent_payment_approvals.sql');
  console.log('   3. Run it in the SQL Editor\n');
  
  // Let's try to verify if the table already exists by making a query
  console.log('🔍 Checking if table exists...');
  
  const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/agent_payment_approvals?select=id&limit=1`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    }
  });
  
  if (checkResponse.ok) {
    console.log('✅ Table agent_payment_approvals exists!');
    return true;
  } else {
    const error = await checkResponse.json();
    if (error.code === 'PGRST205') {
      console.log('❌ Table does not exist yet. Please apply the migration manually.');
      return false;
    }
    console.log('Response:', error);
    return false;
  }
}

runMigration().then(exists => {
  process.exit(exists ? 0 : 1);
});
