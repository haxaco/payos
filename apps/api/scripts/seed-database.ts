#!/usr/bin/env tsx

/**
 * Database Seeding Script
 * 
 * Populates Supabase with realistic test data for development/testing.
 * This script is idempotent - it can be run multiple times safely.
 * 
 * Usage: pnpm seed:db
 */

import { createClient } from '@supabase/supabase-js';
import { generateApiKey, hashApiKey, getKeyPrefix } from '../src/utils/auth.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// ============================================
// Helper Functions
// ============================================

async function checkIfSeeded(): Promise<boolean> {
  const { data } = await supabase
    .from('tenants')
    .select('id')
    .eq('name', 'Acme Corporation')
    .single();
  
  return !!data;
}

async function createTenant(data: {
  name: string;
  status: string;
}) {
  console.log(`  Creating tenant: ${data.name}...`);
  
  // Check if already exists
  const { data: existing } = await supabase
    .from('tenants')
    .select('id')
    .eq('name', data.name)
    .single();
  
  if (existing) {
    console.log(`  ✓ Tenant ${data.name} already exists (${existing.id})`);
    return existing.id;
  }
  
  // Generate API keys for tenant
  const testKey = generateApiKey('test');
  const liveKey = generateApiKey('live');
  
  const { data: tenant, error } = await supabase
    .from('tenants')
    .insert({
      name: data.name,
      status: data.status,
      api_key: testKey, // Legacy field
      api_key_hash: hashApiKey(testKey), // Legacy field
      api_key_prefix: getKeyPrefix(testKey), // Legacy field (may not exist)
    })
    .select()
    .single();
  
  if (error) throw error;
  
  console.log(`  ✓ Created tenant: ${tenant.name} (${tenant.id})`);
  console.log(`    Test API Key: ${testKey}`);
  console.log(`    Live API Key: ${liveKey}`);
  
  // Create API keys in the api_keys table
  const { error: apiKeyError } = await supabase
    .from('api_keys')
    .insert([
      {
        tenant_id: tenant.id,
        name: 'Test Key',
        environment: 'test',
        key_prefix: getKeyPrefix(testKey),
        key_hash: hashApiKey(testKey),
        description: 'Auto-generated test key for development',
        created_by_user_id: null, // System generated
      },
      {
        tenant_id: tenant.id,
        name: 'Live Key',
        environment: 'live',
        key_prefix: getKeyPrefix(liveKey),
        key_hash: hashApiKey(liveKey),
        description: 'Auto-generated live key for development',
        created_by_user_id: null, // System generated
      }
    ]);
  
  if (apiKeyError) console.warn(`    ⚠ API keys not created: ${apiKeyError.message}`);
  
  return tenant.id;
}

async function createAccount(tenantId: string, account: any) {
  const { data: existing } = await supabase
    .from('accounts')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('email', account.email)
    .single();
  
  if (existing) return existing.id;
  
  const { data, error } = await supabase
    .from('accounts')
    .insert({
      tenant_id: tenantId,
      type: account.type,
      name: account.name,
      email: account.email,
      
      // Verification
      verification_tier: account.verificationTier || 0,
      verification_status: account.verificationStatus || 'unverified',
      verification_type: account.type === 'person' ? 'kyc' : 'kyb',
    })
    .select()
    .single();
  
  if (error) throw error;
  return data.id;
}

async function createTransfer(tenantId: string, transfer: any) {
  const { data, error } = await supabase
    .from('transfers')
    .insert({
      tenant_id: tenantId,
      from_account_id: transfer.senderAccountId,
      from_account_name: transfer.senderName,
      to_account_id: transfer.recipientAccountId,
      to_account_name: transfer.recipientName,
      amount: transfer.amount,
      currency: transfer.currency || 'USD',
      status: transfer.status || 'completed',
      type: transfer.type || 'cross_border',
      description: transfer.description,
      initiated_by_type: 'user',
      initiated_by_id: transfer.senderAccountId, // Using sender account as initiator
      initiated_by_name: transfer.senderName,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // Create ledger entries
  if (data.status === 'completed') {
    await supabase.from('ledger_entries').insert([
      {
        tenant_id: tenantId,
        account_id: transfer.senderAccountId,
        transfer_id: data.id,
        amount: -transfer.amount,
        currency: transfer.currency || 'USD',
        entry_type: 'debit',
        description: `Transfer to ${transfer.recipientName || 'recipient'}`,
      },
      {
        tenant_id: tenantId,
        account_id: transfer.recipientAccountId,
        transfer_id: data.id,
        amount: transfer.amount,
        currency: transfer.currency || 'USD',
        entry_type: 'credit',
        description: `Transfer from ${transfer.senderName || 'sender'}`,
      }
    ]);
  }
  
  return data.id;
}

async function createPaymentMethod(tenantId: string, accountId: string, paymentMethod: any) {
  const { data: existing } = await supabase
    .from('payment_methods')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('account_id', accountId)
    .eq('bank_account_last_four', paymentMethod.last4)
    .single();
  
  if (existing) return existing.id;
  
  const { data, error } = await supabase
    .from('payment_methods')
    .insert({
      tenant_id: tenantId,
      account_id: accountId,
      type: paymentMethod.type || 'card',
      label: `${paymentMethod.brand || 'Card'} ****${paymentMethod.last4}`,
      is_default: paymentMethod.isDefault || false,
      is_verified: paymentMethod.status === 'active',
      bank_account_last_four: paymentMethod.last4,
      bank_account_holder: paymentMethod.holderName,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data.id;
}

async function createAgent(tenantId: string, accountId: string, agent: any) {
  const { data: existing } = await supabase
    .from('agents')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('parent_account_id', accountId)
    .eq('name', agent.name)
    .single();
  
  if (existing) return existing.id;
  
  // Generate agent token
  const agentToken = generateApiKey('agent');
  
  const { data, error } = await supabase
    .from('agents')
    .insert({
      tenant_id: tenantId,
      parent_account_id: accountId,
      name: agent.name,
      description: agent.description || '',
      status: agent.status || 'active',
      type: agent.type || 'custom',
      kya_tier: agent.kyaTier || 0,
      kya_status: agent.kyaStatus || 'unverified',
      x402_enabled: agent.x402Enabled !== undefined ? agent.x402Enabled : true,
      total_volume: agent.totalVolume || 0,
      total_transactions: agent.totalTransactions || 0,
      auth_token_prefix: getKeyPrefix(agentToken),
      auth_token_hash: hashApiKey(agentToken),
    })
    .select()
    .single();
  
  if (error) throw error;
  console.log(`    ✓ Agent "${agent.name}" token: ${agentToken}`);
  return data.id;
}

async function createStream(tenantId: string, stream: any) {
  // Convert monthly amount to flow rate per second
  // $2000/month = 2000 / (30 * 24 * 60 * 60) = ~0.000771604 per second
  const secondsInMonth = 30 * 24 * 60 * 60;
  const flowRatePerSecond = stream.amountPerInterval / secondsInMonth;
  
  const { data, error } = await supabase
    .from('streams')
    .insert({
      tenant_id: tenantId,
      sender_account_id: stream.senderAccountId,
      sender_account_name: stream.senderName,
      receiver_account_id: stream.recipientAccountId,
      receiver_account_name: stream.recipientName,
      flow_rate_per_second: flowRatePerSecond,
      flow_rate_per_month: stream.amountPerInterval,
      currency: stream.currency || 'USDC',
      status: stream.status || 'active',
      initiated_by_type: 'user',
      initiated_by_id: stream.senderAccountId,
      initiated_by_name: stream.senderName,
      managed_by_type: 'user',
      managed_by_id: stream.senderAccountId,
      managed_by_name: stream.senderName,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data.id;
}

async function createComplianceFlag(tenantId: string, flag: any) {
  const { data: existing } = await supabase
    .from('compliance_flags')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('flag_type', flag.flagType)
    .eq('account_id', flag.accountId || null)
    .eq('transfer_id', flag.transferId || null)
    .maybeSingle();
  
  if (existing) return existing.id;
  
  // Calculate due date
  const daysToAdd = ['high', 'critical'].includes(flag.riskLevel) ? 7 : 14;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + daysToAdd);
  
  const { data, error } = await supabase
    .from('compliance_flags')
    .insert({
      tenant_id: tenantId,
      flag_type: flag.flagType,
      risk_level: flag.riskLevel,
      status: flag.status || 'open',
      account_id: flag.accountId,
      transfer_id: flag.transferId,
      reason_code: flag.reasonCode,
      reasons: flag.reasons,
      description: flag.description,
      ai_analysis: flag.aiAnalysis || {},
      due_date: dueDate.toISOString(),
    })
    .select()
    .single();
  
  if (error) throw error;
  return data.id;
}

// ============================================
// Seed Data Definitions
// ============================================

const TENANT_ACME = {
  name: 'Acme Corporation',
  status: 'active'
};

const TENANT_TECHCORP = {
  name: 'TechCorp Inc',
  status: 'active'
};

const TENANT_DEMO = {
  name: 'Demo Organization',
  status: 'active'
};

// Account data for Acme Corp
const ACME_ACCOUNTS = [
  {
    type: 'person',
    name: 'Maria Garcia',
    email: 'maria.garcia@example.com',
    verificationTier: 2,
    verificationStatus: 'verified',
  },
  {
    type: 'person',
    name: 'Carlos Martinez',
    email: 'carlos.martinez@example.com',
    verificationTier: 1,
    verificationStatus: 'verified',
  },
  {
    type: 'person',
    name: 'Ana Silva',
    email: 'ana.silva@example.com',
    verificationTier: 2,
    verificationStatus: 'verified',
  },
  {
    type: 'person',
    name: 'Juan Perez',
    email: 'juan.perez@example.com',
    verificationTier: 1,
    verificationStatus: 'verified',
  },
  {
    type: 'person',
    name: 'Sofia Rodriguez',
    email: 'sofia.rodriguez@example.com',
    verificationTier: 3,
    verificationStatus: 'verified',
  },
  {
    type: 'business',
    name: 'TechCorp Inc',
    email: 'accounting@techcorp.example.com',
    verificationTier: 2,
    verificationStatus: 'verified',
  },
  {
    type: 'business',
    name: 'StartupXYZ',
    email: 'finance@startupxyz.example.com',
    verificationTier: 1,
    verificationStatus: 'unverified',
  },
];

// ============================================
// Main Seeding Function
// ============================================

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');
  
  // Check if already seeded
  const isSeeded = await checkIfSeeded();
  if (isSeeded) {
    console.log('⚠️  Database appears to be already seeded.');
    console.log('   To re-seed, manually delete test tenants first.\n');
    
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, name')
      .in('name', ['Acme Corporation', 'TechCorp Inc', 'Demo Organization']);
    
    if (tenants) {
      console.log('📋 Existing test tenants:');
      tenants.forEach(t => console.log(`   - ${t.name} (${t.slug})`));
    }
    
    return;
  }
  
  try {
    // ============================================
    // 1. Create Tenants
    // ============================================
    console.log('1️⃣  Creating tenants...');
    const acmeTenantId = await createTenant(TENANT_ACME);
    const techcorpTenantId = await createTenant(TENANT_TECHCORP);
    const demoTenantId = await createTenant(TENANT_DEMO);
    console.log('');
    
    // ============================================
    // 2. Create Accounts for Acme Corp
    // ============================================
    console.log('2️⃣  Creating accounts for Acme Corp...');
    const acmeAccountIds: Record<string, string> = {};
    
    for (const account of ACME_ACCOUNTS) {
      const accountId = await createAccount(acmeTenantId, account);
      // Use first part of email before '.' as key (maria.garcia@example.com -> maria)
      const key = account.email.split('@')[0].split('.')[0];
      acmeAccountIds[key] = accountId;
      console.log(`  ✓ Created account: ${account.name} (key: ${key})`);
    }
    console.log('');
    
    // ============================================
    // 3. Create Transfers for Acme Corp
    // ============================================
    console.log('3️⃣  Creating transfers for Acme Corp...');
    
    const transfers = [
      {
        senderAccountId: acmeAccountIds['accounting'],
        recipientAccountId: acmeAccountIds['maria'],
        amount: 2000,
        status: 'completed',
        description: 'Monthly contractor payment',
        senderName: 'TechCorp Inc',
        recipientName: 'Maria Garcia',
      },
      {
        senderAccountId: acmeAccountIds['accounting'],
        recipientAccountId: acmeAccountIds['ana'],
        amount: 2500,
        status: 'completed',
        description: 'Monthly contractor payment',
        senderName: 'TechCorp Inc',
        recipientName: 'Ana Silva',
      },
      {
        senderAccountId: acmeAccountIds['finance'],
        recipientAccountId: acmeAccountIds['juan'],
        amount: 2200,
        status: 'completed',  // Note: Transfer completed, may have compliance flags
        description: 'Contractor payment',
        senderName: 'StartupXYZ',
        recipientName: 'Juan Perez',
      },
      {
        senderAccountId: acmeAccountIds['maria'],
        recipientAccountId: acmeAccountIds['carlos'],
        amount: 150,
        status: 'completed',
        description: 'Personal transfer',
        senderName: 'Maria Garcia',
        recipientName: 'Carlos Martinez',
      },
      {
        senderAccountId: acmeAccountIds['accounting'],
        recipientAccountId: acmeAccountIds['sofia'],
        amount: 3500,
        status: 'pending',
        description: 'Consultant payment',
        senderName: 'TechCorp Inc',
        recipientName: 'Sofia Rodriguez',
      },
    ];
    
    for (const transfer of transfers) {
      await createTransfer(acmeTenantId, transfer);
      console.log(`  ✓ Created transfer: $${transfer.amount} (${transfer.status})`);
    }
    console.log('');
    
    // ============================================
    // 4. Create Payment Methods
    // ============================================
    console.log('4️⃣  Creating payment methods...');
    
    await createPaymentMethod(acmeTenantId, acmeAccountIds['maria'], {
      type: 'card',
      status: 'active',
      isDefault: true,
      last4: '4521',
      brand: 'Visa',
      expMonth: 12,
      expYear: 2027,
      holderName: 'Maria Garcia',
    });
    console.log('  ✓ Card for Maria Garcia (4521)');
    
    await createPaymentMethod(acmeTenantId, acmeAccountIds['carlos'], {
      type: 'card',
      status: 'frozen',
      isDefault: true,
      last4: '2847',
      brand: 'Mastercard',
      expMonth: 3,
      expYear: 2026,
      holderName: 'Carlos Martinez',
    });
    console.log('  ✓ Card for Carlos Martinez (2847) - FROZEN');
    
    await createPaymentMethod(acmeTenantId, acmeAccountIds['accounting'], {
      type: 'card',
      status: 'active',
      isDefault: true,
      last4: '8834',
      brand: 'Visa',
      expMonth: 8,
      expYear: 2028,
      holderName: 'TechCorp Inc',
    });
    console.log('  ✓ Card for TechCorp Inc (8834)');
    
    await createPaymentMethod(acmeTenantId, acmeAccountIds['ana'], {
      type: 'card',
      status: 'active',
      isDefault: true,
      last4: '9182',
      brand: 'Mastercard',
      expMonth: 6,
      expYear: 2027,
      holderName: 'Ana Silva',
    });
    console.log('  ✓ Card for Ana Silva (9182)');
    console.log('');
    
    // ============================================
    // 5. Create Agents
    // ============================================
    console.log('5️⃣  Creating agents...');
    
    await createAgent(acmeTenantId, acmeAccountIds['maria'], {
      name: 'Maria Payment Agent',
      description: 'Handles payment processing for Maria',
      type: 'payment',
      status: 'active',
      kyaTier: 2,
      kyaStatus: 'verified',
      x402Enabled: true,
      totalVolume: 125430.50,
      totalTransactions: 247,
    });
    
    await createAgent(acmeTenantId, acmeAccountIds['accounting'], {
      name: 'TechCorp Treasury Agent',
      description: 'Manages treasury operations for TechCorp',
      type: 'treasury',
      status: 'active',
      kyaTier: 2,
      kyaStatus: 'verified',
      x402Enabled: true,
      totalVolume: 1857250.00,
      totalTransactions: 1523,
    });
    
    await createAgent(acmeTenantId, acmeAccountIds['accounting'], {
      name: 'TechCorp Compliance Agent',
      description: 'Monitors compliance for TechCorp transactions',
      type: 'compliance',
      status: 'paused',
      kyaTier: 1,
      kyaStatus: 'unverified',
      x402Enabled: false,
      totalVolume: 0,
      totalTransactions: 0,
    });
    console.log('');
    
    // ============================================
    // 6. Create Streams
    // ============================================
    console.log('6️⃣  Creating payment streams...');
    
    await createStream(acmeTenantId, {
      senderAccountId: acmeAccountIds['accounting'],
      senderName: 'TechCorp Inc',
      recipientAccountId: acmeAccountIds['maria'],
      recipientName: 'Maria Garcia',
      amountPerInterval: 2000,
      status: 'active',
    });
    console.log('  ✓ Stream: TechCorp → Maria ($2,000/month)');
    
    await createStream(acmeTenantId, {
      senderAccountId: acmeAccountIds['accounting'],
      senderName: 'TechCorp Inc',
      recipientAccountId: acmeAccountIds['ana'],
      recipientName: 'Ana Silva',
      amountPerInterval: 2500,
      status: 'active',
    });
    console.log('  ✓ Stream: TechCorp → Ana ($2,500/month)');
    console.log('');
    
    // ============================================
    // 7. Create Compliance Flags
    // ============================================
    console.log('7️⃣  Creating compliance flags...');
    
    // Get some transfer IDs for flagging
    const { data: recentTransfers } = await supabase
      .from('transfers')
      .select('id, from_account_id, to_account_id, amount')
      .eq('tenant_id', acmeTenantId)
      .limit(3);
    
    if (recentTransfers && recentTransfers.length > 0) {
      // Flag 1: High risk transaction (velocity check)
      await createComplianceFlag(acmeTenantId, {
        flagType: 'transaction',
        riskLevel: 'high',
        status: 'open',
        transferId: recentTransfers[0].id,
        reasonCode: 'velocity_check',
        reasons: [
          'High transaction velocity detected',
          'New account relationship',
          'Amount above typical threshold',
        ],
        description: 'Account showing unusual velocity patterns with multiple new recipients in short timeframe.',
        aiAnalysis: {
          risk_score: 78,
          risk_explanation: 'This transaction pattern matches characteristics of both legitimate business scaling and potential structuring. The velocity of new recipient additions warrants manual review.',
          pattern_matches: [
            { description: 'Legitimate business scaling', percentage: 65 },
            { description: 'Potential structuring activity', percentage: 15 },
          ],
          suggested_actions: [
            { action: 'Verify business relationship documentation', completed: false },
            { action: 'Review account holder communication history', completed: false },
            { action: 'Check for similar patterns in network', completed: false },
          ],
          confidence_level: 82,
        },
      });
      console.log('  ✓ Flag: High risk - Velocity check');
      
      // Flag 2: Medium risk transaction (amount threshold)
      if (recentTransfers.length > 1) {
        await createComplianceFlag(acmeTenantId, {
          flagType: 'transaction',
          riskLevel: 'medium',
          status: 'pending_review',
          transferId: recentTransfers[1].id,
          reasonCode: 'amount_threshold',
          reasons: [
            'Amount just below reporting threshold',
            'First transaction in this corridor',
          ],
          description: 'Transaction amount is just below $2,500 monitoring threshold, which may indicate structuring.',
          aiAnalysis: {
            risk_score: 62,
            risk_explanation: 'While amount-based structuring is a concern, this could also be legitimate first-time payment. Customer profile suggests regular contractor payments.',
            pattern_matches: [
              { description: 'Legitimate contractor payment', percentage: 70 },
              { description: 'Structuring attempts', percentage: 10 },
            ],
            suggested_actions: [
              { action: 'Request invoice or contract', completed: true },
              { action: 'Monitor for repeated similar amounts', completed: false },
            ],
            confidence_level: 75,
          },
        });
        console.log('  ✓ Flag: Medium risk - Amount threshold');
      }
    }
    
    // Flag 3: Account-level flag (new account with immediate high activity)
    await createComplianceFlag(acmeTenantId, {
      flagType: 'account',
      riskLevel: 'medium',
      status: 'under_investigation',
      accountId: acmeAccountIds['finance'],
      reasonCode: 'new_account_velocity',
      reasons: [
        'Account created recently with immediate high activity',
        'KYC verification tier below activity level',
      ],
      description: 'New account showing high transaction volume relative to verification tier.',
      aiAnalysis: {
        risk_score: 58,
        risk_explanation: 'New business accounts often show rapid activity, but verification tier should match activity level for AML compliance.',
        pattern_matches: [
          { description: 'Normal business onboarding', percentage: 75 },
          { description: 'Shell company activity', percentage: 5 },
        ],
        suggested_actions: [
          { action: 'Request KYB documentation', completed: true },
          { action: 'Verify business registration', completed: true },
          { action: 'Upgrade to Tier 2 KYB', completed: false },
        ],
        confidence_level: 88,
      },
    });
    console.log('  ✓ Flag: Medium risk - New account velocity');
    
    // Flag 4: Low risk pattern (monitoring)
    await createComplianceFlag(acmeTenantId, {
      flagType: 'pattern',
      riskLevel: 'low',
      status: 'open',
      reasonCode: 'new_corridor_monitoring',
      reasons: [
        'First transaction in new geographic corridor',
        'Standard monitoring for new routes',
      ],
      description: 'Monitoring flag for first-time transactions in new geographic corridors.',
      aiAnalysis: {
        risk_score: 25,
        risk_explanation: 'Standard compliance monitoring for new corridor. No immediate concerns detected.',
        pattern_matches: [
          { description: 'Business expansion', percentage: 85 },
          { description: 'Sanctions risk', percentage: 2 },
        ],
        suggested_actions: [
          { action: 'Monitor transaction patterns for 30 days', completed: false },
        ],
        confidence_level: 92,
      },
    });
    console.log('  ✓ Flag: Low risk - New corridor monitoring');
    
    // Flag 5: Critical risk (escalated)
    if (recentTransfers && recentTransfers.length > 2) {
      await createComplianceFlag(acmeTenantId, {
        flagType: 'transaction',
        riskLevel: 'critical',
        status: 'escalated',
        transferId: recentTransfers[2].id,
        reasonCode: 'sanctions_potential_match',
        reasons: [
          'Name similarity to sanctions list entry',
          'Geographic risk indicators present',
          'Requires senior compliance review',
        ],
        description: 'Potential sanctions match requires immediate senior compliance review and possible account freeze.',
        aiAnalysis: {
          risk_score: 92,
          risk_explanation: 'High-confidence potential match to OFAC sanctions list. Immediate review required before processing.',
          pattern_matches: [
            { description: 'False positive name match', percentage: 45 },
            { description: 'Sanctions list match', percentage: 40 },
          ],
          suggested_actions: [
            { action: 'Freeze transaction immediately', completed: true },
            { action: 'Escalate to senior compliance officer', completed: true },
            { action: 'Run enhanced due diligence', completed: false },
            { action: 'File SAR if confirmed', completed: false },
          ],
          confidence_level: 88,
        },
      });
      console.log('  ✓ Flag: Critical risk - Potential sanctions match (ESCALATED)');
    }
    
    console.log('');
    
    // ============================================
    // Summary
    // ============================================
    console.log('✅ Database seeding completed successfully!\n');
    
    console.log('📊 Summary:');
    console.log(`   Tenants: 3`);
    console.log(`   Accounts: ${ACME_ACCOUNTS.length}`);
    console.log(`   Transfers: ${transfers.length}`);
    console.log(`   Payment Methods: 4`);
    console.log(`   Agents: 3`);
    console.log(`   Streams: 2`);
    console.log(`   Compliance Flags: 5`);
    console.log('');
    
    console.log('🔑 To test the API, use one of these tenant API keys shown above.');
    console.log('');
    
  } catch (error: any) {
    console.error('\n❌ Seeding failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// ============================================
// Execute
// ============================================

seedDatabase().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

