#!/usr/bin/env tsx
/**
 * Generate x402 Test Data
 * 
 * Creates sample providers, consumers, wallets, endpoints, and transactions
 * for testing the x402 payment gateway functionality.
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
config({ path: resolve(__dirname, '../.env') });

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log('🚀 Starting x402 test data generation...\n');
  
  try {
    // Get or create tenant
    let { data: tenants, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .limit(1);
    
    let tenant;
    if (tenantError || !tenants || tenants.length === 0) {
      console.log('📝 No tenant found, creating one...');
      const { data: newTenant, error: createError } = await supabase
        .from('tenants')
        .insert({
          name: 'Haxaco Demo',
          status: 'active'
        })
        .select()
        .single();
      
      if (createError || !newTenant) {
        console.error('❌ Failed to create tenant:', createError);
        process.exit(1);
      }
      tenant = newTenant;
    } else {
      tenant = tenants[0];
    }
    
    const tenantId = tenant.id;
    console.log(`✅ Using tenant: ${tenant.name} (${tenantId})\n`);
    
    // ============================================
    // 0. CLEANUP EXISTING TEST DATA (if any)
    // ============================================
    console.log('🧹 Cleaning up existing x402 test data...');
    
    // Delete existing x402 transactions
    await supabase
      .from('transfers')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('type', 'x402');
    
    // Delete existing x402 endpoints
    await supabase
      .from('x402_endpoints')
      .delete()
      .eq('tenant_id', tenantId);
    
    // Delete existing test wallets (by matching test account names)
    const { data: existingAccounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('name', ['WeatherAPI Provider', 'AI Startup Inc', 'WeatherNow Mobile']);
    
    if (existingAccounts && existingAccounts.length > 0) {
      const accountIds = existingAccounts.map(a => a.id);
      
      // Delete wallets
      await supabase
        .from('wallets')
        .delete()
        .in('owner_account_id', accountIds);
      
      // Delete accounts
      await supabase
        .from('accounts')
        .delete()
        .in('id', accountIds);
    }
    
    console.log('✅ Cleanup complete\n');
    
    // ============================================
    // 1. CREATE PROVIDER ACCOUNT & WALLET
    // ============================================
    console.log('📦 Creating provider account...');
    
    const { data: providerAccount, error: providerError } = await supabase
      .from('accounts')
      .insert({
        tenant_id: tenantId,
        name: 'WeatherAPI Provider',
        type: 'business',
        currency: 'USDC',
        balance_total: 0,
        balance_available: 0,
        verification_status: 'verified',
        verification_tier: 2
      })
      .select()
      .single();
    
    if (providerError) {
      console.error('❌ Error creating provider account:', providerError);
      process.exit(1);
    }
    
    console.log(`✅ Provider account created: ${providerAccount.id}`);
    
    // Create provider wallet
    const { data: providerWallet, error: providerWalletError } = await supabase
      .from('wallets')
      .insert({
        tenant_id: tenantId,
        owner_account_id: providerAccount.id,
        currency: 'USDC',
        balance: 0,
        status: 'active',
        wallet_address: '0x' + Array.from({ length: 40 }, () => 
          Math.floor(Math.random() * 16).toString(16)).join('')
      })
      .select()
      .single();
    
    if (providerWalletError) {
      console.error('❌ Error creating provider wallet:', providerWalletError);
      process.exit(1);
    }
    
    console.log(`✅ Provider wallet created: ${providerWallet.id}\n`);
    
    // ============================================
    // 2. CREATE CONSUMER ACCOUNTS & WALLETS
    // ============================================
    console.log('👥 Creating consumer accounts...');
    
    // Consumer 1
    const { data: consumer1, error: consumer1Error } = await supabase
      .from('accounts')
      .insert({
        tenant_id: tenantId,
        name: 'AI Startup Inc',
        type: 'business',
        currency: 'USDC',
        balance_total: 0,
        balance_available: 0,
        verification_status: 'verified',
        verification_tier: 2
      })
      .select()
      .single();
    
    if (consumer1Error) {
      console.error('❌ Error creating consumer 1:', consumer1Error);
      process.exit(1);
    }
    
    const { data: wallet1, error: wallet1Error } = await supabase
      .from('wallets')
      .insert({
        tenant_id: tenantId,
        owner_account_id: consumer1.id,
        currency: 'USDC',
        balance: 100.00,
        status: 'active',
        wallet_address: '0x' + Array.from({ length: 40 }, () => 
          Math.floor(Math.random() * 16).toString(16)).join('')
      })
      .select()
      .single();
    
    if (wallet1Error) {
      console.error('❌ Error creating wallet 1:', wallet1Error);
      process.exit(1);
    }
    
    console.log(`✅ Consumer 1 created: ${consumer1.id} / Wallet: ${wallet1.id}`);
    
    // Consumer 2
    const { data: consumer2, error: consumer2Error } = await supabase
      .from('accounts')
      .insert({
        tenant_id: tenantId,
        name: 'WeatherNow Mobile',
        type: 'business',
        currency: 'USDC',
        balance_total: 0,
        balance_available: 0,
        verification_status: 'verified',
        verification_tier: 2
      })
      .select()
      .single();
    
    if (consumer2Error) {
      console.error('❌ Error creating consumer 2:', consumer2Error);
      process.exit(1);
    }
    
    const { data: wallet2, error: wallet2Error } = await supabase
      .from('wallets')
      .insert({
        tenant_id: tenantId,
        owner_account_id: consumer2.id,
        currency: 'USDC',
        balance: 250.00,
        status: 'active',
        wallet_address: '0x' + Array.from({ length: 40 }, () => 
          Math.floor(Math.random() * 16).toString(16)).join('')
      })
      .select()
      .single();
    
    if (wallet2Error) {
      console.error('❌ Error creating wallet 2:', wallet2Error);
      process.exit(1);
    }
    
    console.log(`✅ Consumer 2 created: ${consumer2.id} / Wallet: ${wallet2.id}\n`);
    
    // ============================================
    // 3. CREATE x402 ENDPOINTS
    // ============================================
    console.log('🔌 Creating x402 endpoints...');
    
    const paymentAddress = `internal://payos/${tenantId}/${providerAccount.id}`;
    
    // Endpoint 1: Premium Weather
    const { data: endpoint1, error: endpoint1Error } = await supabase
      .from('x402_endpoints')
      .insert({
        tenant_id: tenantId,
        account_id: providerAccount.id,
        name: 'Weather API Premium',
        path: '/api/weather-premium',
        method: 'GET',
        description: 'Real-time premium weather data with 15-minute forecasts',
        base_price: 0.01,
        currency: 'USDC',
        payment_address: paymentAddress,
        network: 'base-mainnet',
        status: 'active',
        total_calls: 0,
        total_revenue: 0,
        volume_discounts: [
          { threshold: 1000, priceMultiplier: 0.8 },
          { threshold: 10000, priceMultiplier: 0.6 }
        ]
      })
      .select()
      .single();
    
    if (endpoint1Error) {
      console.error('❌ Error creating endpoint 1:', endpoint1Error);
      process.exit(1);
    }
    
    console.log(`✅ Endpoint 1: ${endpoint1.name} (${endpoint1.id})`);
    
    // Endpoint 2: Historical Weather
    const { data: endpoint2, error: endpoint2Error } = await supabase
      .from('x402_endpoints')
      .insert({
        tenant_id: tenantId,
        account_id: providerAccount.id,
        name: 'Historical Weather API',
        path: '/api/weather-history',
        method: 'GET',
        description: 'Access to 10 years of historical weather data',
        base_price: 0.005,
        currency: 'USDC',
        payment_address: paymentAddress,
        network: 'base-mainnet',
        status: 'active',
        total_calls: 0,
        total_revenue: 0
      })
      .select()
      .single();
    
    if (endpoint2Error) {
      console.error('❌ Error creating endpoint 2:', endpoint2Error);
      process.exit(1);
    }
    
    console.log(`✅ Endpoint 2: ${endpoint2.name} (${endpoint2.id})`);
    
    // Endpoint 3: Weather Alerts (paused)
    const { data: endpoint3, error: endpoint3Error } = await supabase
      .from('x402_endpoints')
      .insert({
        tenant_id: tenantId,
        account_id: providerAccount.id,
        name: 'Weather Alerts API',
        path: '/api/weather-alerts',
        method: 'POST',
        description: 'Subscribe to real-time severe weather alerts',
        base_price: 0.02,
        currency: 'USDC',
        payment_address: paymentAddress,
        network: 'base-mainnet',
        status: 'paused',
        total_calls: 0,
        total_revenue: 0
      })
      .select()
      .single();
    
    if (endpoint3Error) {
      console.error('❌ Error creating endpoint 3:', endpoint3Error);
      process.exit(1);
    }
    
    console.log(`✅ Endpoint 3: ${endpoint3.name} (${endpoint3.id})\n`);
    
    // ============================================
    // 4. CREATE x402 TRANSACTIONS
    // ============================================
    console.log('💸 Creating x402 transactions...');
    
    const transactions = [
      // Premium API calls
      ...Array.from({ length: 8 }, (_, i) => ({
        tenant_id: tenantId,
        type: 'x402',
        status: 'completed',
        from_account_id: i % 2 === 0 ? consumer1.id : consumer2.id,
        to_account_id: providerAccount.id,
        amount: 0.01,
        currency: 'USDC',
        description: 'x402 payment: Weather API Premium',
        initiated_by_type: 'system',
        initiated_by_id: i % 2 === 0 ? wallet1.id : wallet2.id,
        initiated_by_name: i % 2 === 0 ? 'AI Startup Inc' : 'WeatherNow Mobile',
        x402_metadata: {
          endpoint_id: endpoint1.id,
          endpoint_path: '/api/weather-premium',
          endpoint_method: 'GET',
          wallet_id: i % 2 === 0 ? wallet1.id : wallet2.id,
          request_id: 'req_' + Math.random().toString(36).substring(2, 15),
          timestamp: Math.floor((Date.now() - (i * 24 * 60 * 60 * 1000)) / 1000).toString(),
          price_calculated: 0.01,
          settlement_fee: 0.0003,
          settlement_net_amount: 0.0097
        },
        created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
      })),
      // Historical API calls
      ...Array.from({ length: 3 }, (_, i) => ({
        tenant_id: tenantId,
        type: 'x402',
        status: 'completed',
        from_account_id: consumer1.id,
        to_account_id: providerAccount.id,
        amount: 0.005,
        currency: 'USDC',
        description: 'x402 payment: Historical Weather API',
        initiated_by_type: 'system',
        initiated_by_id: wallet1.id,
        initiated_by_name: 'AI Startup Inc',
        x402_metadata: {
          endpoint_id: endpoint2.id,
          endpoint_path: '/api/weather-history',
          endpoint_method: 'GET',
          wallet_id: wallet1.id,
          request_id: 'req_' + Math.random().toString(36).substring(2, 15),
          timestamp: Math.floor((Date.now() - ((i + 10) * 24 * 60 * 60 * 1000)) / 1000).toString(),
          price_calculated: 0.005,
          settlement_fee: 0.00015,
          settlement_net_amount: 0.00485
        },
        created_at: new Date(Date.now() - (i + 10) * 24 * 60 * 60 * 1000).toISOString()
      }))
    ];
    
    const { error: txError } = await supabase
      .from('transfers')
      .insert(transactions);
    
    if (txError) {
      console.error('❌ Error creating transactions:', txError);
      process.exit(1);
    }
    
    console.log(`✅ Created ${transactions.length} transactions\n`);
    
    // ============================================
    // 5. UPDATE STATS
    // ============================================
    console.log('📊 Updating endpoint stats...');
    
    await supabase
      .from('x402_endpoints')
      .update({ total_calls: 8, total_revenue: 0.08 })
      .eq('id', endpoint1.id);
    
    await supabase
      .from('x402_endpoints')
      .update({ total_calls: 3, total_revenue: 0.015 })
      .eq('id', endpoint2.id);
    
    console.log('✅ Stats updated\n');
    
    console.log('✅ Test data generated successfully!');
    console.log('\n🌐 You can now test the x402 dashboard at:');
    console.log('   http://localhost:3000/dashboard/x402\n');
    console.log('📋 Summary:');
    console.log(`   - Provider: ${providerAccount.name}`);
    console.log(`   - Consumers: ${consumer1.name}, ${consumer2.name}`);
    console.log(`   - Endpoints: 3 (2 active, 1 paused)`);
    console.log(`   - Transactions: ${transactions.length}`);
    console.log();
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

main();
