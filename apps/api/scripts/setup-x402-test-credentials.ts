#!/usr/bin/env tsx

/**
 * Automated x402 Test Credentials Setup
 * 
 * This script handles all the snags from manual setup:
 * - Loads .env automatically
 * - Creates entities in correct order
 * - Uses correct field names
 * - Funds wallet via SQL
 * - Outputs credentials to files
 * 
 * Usage:
 *   npx tsx scripts/setup-x402-test-credentials.ts [email]
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:4000';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_EMAIL = process.argv[2] || 'haxaco@gmail.com';

// Validation
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌');
  console.error('\n💡 Make sure apps/api/.env is configured correctly');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// Helper functions
function generateApiKey(environment: 'test' | 'live'): string {
  const prefix = environment === 'test' ? 'pk_test_' : 'pk_live_';
  const randomBytes = crypto.randomBytes(32).toString('base64url');
  return `${prefix}${randomBytes}`;
}

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function getKeyPrefix(key: string): string {
  return key.substring(0, 12);
}

async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    return data.status === 'healthy';
  } catch (error) {
    return false;
  }
}

async function apiRequest(endpoint: string, method: string, body: any, apiKey: string) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`API Error: ${JSON.stringify(data)}`);
  }
  
  return data.data || data;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                  ║');
  console.log('║   🚀 x402 Test Credentials - Automated Setup                    ║');
  console.log('║                                                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Pre-flight checks
  console.log('🔍 Running pre-flight checks...\n');

  console.log('   1. Checking API server...');
  const apiHealthy = await checkApiHealth();
  if (!apiHealthy) {
    console.error('   ❌ API server not responding at', API_URL);
    console.error('\n💡 Start the API server:');
    console.error('   cd apps/api && pnpm dev');
    process.exit(1);
  }
  console.log('   ✅ API server is healthy\n');

  console.log('   2. Checking Supabase connection...');
  const { error: supabaseError } = await supabase.from('accounts').select('id').limit(1);
  if (supabaseError) {
    console.error('   ❌ Cannot connect to Supabase:', supabaseError.message);
    process.exit(1);
  }
  console.log('   ✅ Supabase connected\n');

  console.log('   3. Finding user...');
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error('   ❌ Error listing users:', userError.message);
    process.exit(1);
  }

  const user = users.find(u => u.email === USER_EMAIL);
  if (!user) {
    console.error(`   ❌ User not found: ${USER_EMAIL}`);
    console.log('\n💡 Available users:');
    users.forEach(u => console.log(`   - ${u.email}`));
    process.exit(1);
  }
  console.log(`   ✅ Found user: ${user.email}\n`);

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('tenant_id, name, role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('   ❌ User profile not found or not linked to tenant');
    process.exit(1);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Step 1: Generate API key
  console.log('1️⃣  Generating API key...');
  const apiKey = generateApiKey('test');
  const keyPrefix = getKeyPrefix(apiKey);
  const keyHash = hashApiKey(apiKey);

  const { data: apiKeyRecord, error: insertError } = await supabase
    .from('api_keys')
    .insert({
      tenant_id: profile.tenant_id,
      created_by_user_id: user.id,
      name: 'x402 SDK Test Key',
      environment: 'test',
      description: 'Auto-generated for x402 SDK testing',
      key_prefix: keyPrefix,
      key_hash: keyHash,
      status: 'active',
    })
    .select()
    .single();

  if (insertError) {
    console.error('   ❌ Failed to create API key:', insertError.message);
    process.exit(1);
  }

  console.log(`   ✅ API Key: ${apiKey}\n`);

  // Step 2: Create provider account
  console.log('2️⃣  Creating provider account...');
  const providerAccount = await apiRequest('/v1/accounts', 'POST', {
    name: 'Weather API Provider (Test)',
    type: 'business',
    email: 'weather@test.payos.ai'
  }, apiKey);
  console.log(`   ✅ Provider Account ID: ${providerAccount.id}\n`);

  // Step 3: Create provider wallet (using correct field name)
  console.log('3️⃣  Creating provider wallet...');
  const providerWallet = await apiRequest('/v1/wallets', 'POST', {
    ownerAccountId: providerAccount.id, // ← Correct field name
    currency: 'USDC',
    name: 'Provider Revenue Wallet'
  }, apiKey);
  console.log(`   ✅ Provider Wallet ID: ${providerWallet.id}\n`);

  // Step 4: Create consumer account (BEFORE agent)
  console.log('4️⃣  Creating consumer account...');
  const consumerAccount = await apiRequest('/v1/accounts', 'POST', {
    name: 'AI Research Company (Test)',
    type: 'business',
    email: 'research@test.payos.ai'
  }, apiKey);
  console.log(`   ✅ Consumer Account ID: ${consumerAccount.id}\n`);

  // Step 5: Create agent (with parentAccountId)
  console.log('5️⃣  Creating agent...');
  const agent = await apiRequest('/v1/agents', 'POST', {
    parentAccountId: consumerAccount.id, // ← Required field
    name: 'Weather Research Agent (Test)',
    description: 'AI agent that researches weather data via x402 APIs',
    capabilities: ['api_calls', 'data_analysis']
  }, apiKey);
  console.log(`   ✅ Agent ID: ${agent.id}`);
  console.log(`   ✅ Agent Token: ${agent.credentials.token}\n`);

  // Step 6: Create agent wallet
  console.log('6️⃣  Creating agent wallet...');
  const agentWallet = await apiRequest('/v1/wallets', 'POST', {
    ownerAccountId: consumerAccount.id,
    currency: 'USDC',
    name: 'Agent Spending Wallet'
  }, apiKey);
  console.log(`   ✅ Agent Wallet ID: ${agentWallet.id}\n`);

  // Step 7: Fund agent wallet (direct SQL to avoid sourceAccountId requirement)
  console.log('7️⃣  Funding agent wallet with $100 USDC...');
  const { error: fundError } = await supabase
    .from('wallets')
    .update({ balance: 100.00 })
    .eq('id', agentWallet.id);

  if (fundError) {
    console.error('   ❌ Failed to fund wallet:', fundError.message);
    process.exit(1);
  }
  console.log('   ✅ Wallet funded: $100.00 USDC\n');

  // Verify funding
  const { data: fundedWallet } = await supabase
    .from('wallets')
    .select('balance')
    .eq('id', agentWallet.id)
    .single();
  
  console.log(`   ✅ Verified balance: $${fundedWallet.balance} USDC\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Prepare credentials object
  const credentials = {
    apiKey,
    apiUrl: API_URL,
    provider: {
      accountId: providerAccount.id,
      accountName: providerAccount.name,
      walletId: providerWallet.id,
      walletBalance: 0
    },
    consumer: {
      accountId: consumerAccount.id,
      accountName: consumerAccount.name,
      agentId: agent.id,
      agentName: agent.name,
      agentToken: agent.credentials.token,
      walletId: agentWallet.id,
      walletBalance: 100
    }
  };

  // Write credentials to markdown file
  console.log('📄 Writing credentials to file...');
  const credentialsMarkdown = generateCredentialsMarkdown(credentials);
  const docsDir = path.join(process.cwd(), '../../docs');
  fs.writeFileSync(
    path.join(docsDir, 'X402_TEST_CREDENTIALS.md'),
    credentialsMarkdown
  );
  console.log('   ✅ docs/X402_TEST_CREDENTIALS.md\n');

  // Write .env files for sample apps
  console.log('📝 Writing .env files for sample apps...');
  
  // Provider .env
  const providerEnv = `# x402 Provider Sample App - Auto-generated
PAYOS_API_KEY=${credentials.apiKey}
PAYOS_ACCOUNT_ID=${credentials.provider.accountId}
PAYOS_API_URL=${API_URL}
PORT=4000
`;
  const providerEnvPath = path.join(process.cwd(), '../../apps/sample-provider/.env');
  fs.writeFileSync(providerEnvPath, providerEnv);
  console.log('   ✅ apps/sample-provider/.env');

  // Consumer .env
  const consumerEnv = `# x402 Consumer Sample App - Auto-generated
PAYOS_API_KEY=${credentials.apiKey}
PAYOS_AGENT_ID=${credentials.consumer.agentId}
PAYOS_WALLET_ID=${credentials.consumer.walletId}
PAYOS_API_URL=${API_URL}
PROVIDER_API_URL=http://localhost:4000
`;
  const consumerEnvPath = path.join(process.cwd(), '../../apps/sample-consumer/.env');
  fs.writeFileSync(consumerEnvPath, consumerEnv);
  console.log('   ✅ apps/sample-consumer/.env\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Success summary
  console.log('✅ Setup Complete!\n');
  console.log('🚀 Next Steps:\n');
  console.log('   Terminal 1 - Start Provider:');
  console.log('   $ cd apps/sample-provider && pnpm dev\n');
  console.log('   Terminal 2 - Run Consumer:');
  console.log('   $ cd apps/sample-consumer && pnpm dev --free\n');
  console.log('📊 View Dashboard:');
  console.log('   http://localhost:3000/dashboard/x402\n');
}

function generateCredentialsMarkdown(credentials: any): string {
  return `# x402 SDK Test Credentials

> **Auto-generated:** ${new Date().toLocaleString()}  
> **API Server:** ${credentials.apiUrl}  
> **Dashboard:** http://localhost:3000

---

## 🔑 API Key (User-Scoped)

\`\`\`bash
PAYOS_API_KEY=${credentials.apiKey}
\`\`\`

---

## 🏢 Provider Credentials (Weather API)

| Field | Value |
|-------|-------|
| **Account Name** | ${credentials.provider.accountName} |
| **Account ID** | \`${credentials.provider.accountId}\` |
| **Wallet ID** | \`${credentials.provider.walletId}\` |
| **Wallet Balance** | $${credentials.provider.walletBalance}.00 USDC (will receive payments) |

**Environment Variables:**
\`\`\`bash
PAYOS_ACCOUNT_ID=${credentials.provider.accountId}
\`\`\`

---

## 🤖 Consumer Credentials (AI Agent)

| Field | Value |
|-------|-------|
| **Company Name** | ${credentials.consumer.accountName} |
| **Account ID** | \`${credentials.consumer.accountId}\` |
| **Agent Name** | ${credentials.consumer.agentName} |
| **Agent ID** | \`${credentials.consumer.agentId}\` |
| **Agent Token** | \`${credentials.consumer.agentToken}\` ⚠️ **SAVE THIS!** |
| **Wallet ID** | \`${credentials.consumer.walletId}\` |
| **Wallet Balance** | $${credentials.consumer.walletBalance}.00 USDC (funded for testing) |

**Environment Variables:**
\`\`\`bash
PAYOS_AGENT_ID=${credentials.consumer.agentId}
PAYOS_WALLET_ID=${credentials.consumer.walletId}
\`\`\`

---

## 🚀 Quick Start

All .env files have been created for you! Just start the apps:

### Terminal 1 - Start Provider

\`\`\`bash
cd apps/sample-provider
pnpm dev
\`\`\`

### Terminal 2 - Run Consumer

\`\`\`bash
cd apps/sample-consumer
pnpm dev --free      # Test free endpoint
pnpm dev --forecast  # Test paid endpoint (with auto-payment)
\`\`\`

---

## 📊 View in Dashboard

- **Provider View:** http://localhost:3000/dashboard/x402
- **Consumer View:** http://localhost:3000/dashboard/x402?view=consumer
- **Transactions:** http://localhost:3000/dashboard/transfers?type=x402

---

**Generated by:** \`scripts/setup-x402-test-credentials.ts\`
`;
}

// Run the script
main().catch((error) => {
  console.error('\n❌ Setup failed:', error.message);
  console.error('\n💡 Troubleshooting:');
  console.error('   1. Check API server is running: curl http://localhost:4000/health');
  console.error('   2. Verify .env file exists: cat apps/api/.env');
  console.error('   3. Check Supabase credentials are correct');
  process.exit(1);
});



