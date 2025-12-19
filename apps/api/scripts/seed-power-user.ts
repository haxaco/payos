#!/usr/bin/env tsx

/**
 * Power User Seed Script
 * 
 * Generates high-volume, realistic data based on company profiles
 * to test pagination, performance, and UI behavior at scale.
 * 
 * Usage:
 *   pnpm seed:power-user --email haxaco@gmail.com --profile crypto-native
 */

import { createClient } from '@supabase/supabase-js';
import { getProfile, type CompanyProfile } from './company-profiles.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lgsreshwntpdrthfgwos.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ============================================
// Utility Functions
// ============================================

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(decimals));
}

function randomDate(startDate: Date, endDate: Date): Date {
  const start = startDate.getTime();
  const end = endDate.getTime();
  return new Date(start + Math.random() * (end - start));
}

function applyTimePattern(
  baseDate: Date,
  weekdayBias: number,
  businessHoursBias: number
): Date {
  const date = new Date(baseDate);
  
  // Apply weekday bias
  if (Math.random() > weekdayBias) {
    // Move to weekend
    const day = date.getDay();
    if (day !== 0 && day !== 6) {
      date.setDate(date.getDate() + (6 - day));
    }
  }
  
  // Apply business hours bias
  if (Math.random() < businessHoursBias) {
    // Set to business hours (9 AM - 6 PM)
    date.setHours(randomInt(9, 18), randomInt(0, 59), randomInt(0, 59));
  } else {
    // Set to off-hours
    const hour = randomChoice([0, 1, 2, 3, 4, 5, 6, 7, 8, 19, 20, 21, 22, 23]);
    date.setHours(hour, randomInt(0, 59), randomInt(0, 59));
  }
  
  return date;
}

function generateMonthEndSpike(date: Date, isSpike: boolean): Date {
  if (!isSpike) return date;
  
  const day = date.getDate();
  // 30% chance of being on 15th or 30th (payroll days)
  if (Math.random() < 0.3) {
    const payday = Math.random() < 0.5 ? 15 : 28;
    date.setDate(payday);
  }
  
  return date;
}

// ============================================
// Name Generators
// ============================================

const FIRST_NAMES = [
  'Maria', 'Carlos', 'Ana', 'Juan', 'Sofia', 'Diego', 'Elena', 'Miguel',
  'Isabella', 'Luis', 'Carmen', 'Jose', 'Lucia', 'Antonio', 'Rosa', 'Pedro',
  'Gabriela', 'Fernando', 'Valentina', 'Ricardo', 'Daniela', 'Jorge', 'Andrea',
  'Francisco', 'Paula', 'Manuel', 'Laura', 'Rafael', 'Camila', 'David',
  'Emma', 'Oliver', 'Ava', 'William', 'Sophia', 'James', 'Isabella', 'Benjamin',
  'Mia', 'Lucas', 'Charlotte', 'Henry', 'Amelia', 'Alexander', 'Harper',
  'Wei', 'Yuki', 'Raj', 'Priya', 'Mohammed', 'Fatima', 'Chen', 'Aisha',
];

const LAST_NAMES = [
  'Garcia', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Perez',
  'Sanchez', 'Ramirez', 'Torres', 'Flores', 'Rivera', 'Silva', 'Reyes',
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson',
  'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'White', 'Harris',
  'Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Patel', 'Kumar', 'Singh', 'Kim',
  'Ahmed', 'Hassan', 'Ali', 'Khan', 'Nguyen', 'Tran', 'Le', 'Pham',
];

const BUSINESS_NAMES = [
  'Tech Solutions', 'Global Services', 'Digital Ventures', 'Smart Systems',
  'Cloud Innovations', 'Data Dynamics', 'Prime Consulting', 'Alpha Partners',
  'NextGen Labs', 'Quantum Corp', 'Vertex Group', 'Apex Industries',
  'Horizon Technologies', 'Summit Partners', 'Catalyst Ventures', 'Fusion Inc',
  'Stellar Enterprises', 'Nova Corporation', 'Zenith Services', 'Phoenix Group',
];

const BUSINESS_SUFFIXES = ['Inc', 'LLC', 'Corp', 'Ltd', 'GmbH', 'SA', 'Pty Ltd'];

function generatePersonName(): string {
  return `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`;
}

function generateBusinessName(): string {
  return `${randomChoice(BUSINESS_NAMES)} ${randomChoice(BUSINESS_SUFFIXES)}`;
}

function generateEmail(name: string, domain: string = 'example.com'): string {
  return `${name.toLowerCase().replace(/\s+/g, '.')}@${domain}`;
}

// ============================================
// Stablecoin & Payment Method Helpers
// ============================================

const STABLECOIN_NETWORKS: Record<string, string[]> = {
  'USDC': ['Ethereum', 'Polygon', 'Solana', 'Base', 'Arbitrum', 'Optimism'],
  'USDT': ['Ethereum', 'Tron', 'Polygon', 'BSC', 'Solana'],
  'DAI': ['Ethereum', 'Polygon', 'Optimism', 'Arbitrum'],
  'PYUSD': ['Ethereum', 'Solana'],
  'EURC': ['Ethereum', 'Polygon'],
  'BUSD': ['BSC', 'Ethereum'],
  'USDP': ['Ethereum'],
  'FRAX': ['Ethereum', 'Polygon', 'Fantom'],
};

function generateWalletAddress(network: string): string {
  // Generate realistic-looking addresses
  if (network === 'Solana') {
    // Solana addresses (base58, ~44 chars)
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    return Array.from({ length: 44 }, () => randomChoice(chars.split(''))).join('');
  } else if (network === 'Tron') {
    // Tron addresses start with 'T'
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    return 'T' + Array.from({ length: 33 }, () => randomChoice(chars.split(''))).join('');
  } else {
    // EVM addresses (0x + 40 hex chars)
    const chars = '0123456789abcdef';
    return '0x' + Array.from({ length: 40 }, () => randomChoice(chars.split(''))).join('');
  }
}

function generateStablecoinWallet(stablecoin: string) {
  const networks = STABLECOIN_NETWORKS[stablecoin] || ['Ethereum'];
  const network = randomChoice(networks);
  const address = generateWalletAddress(network);
  
  return {
    type: 'wallet' as const,
    wallet_address: address,
    wallet_network: network,
    label: `${stablecoin} ${network} Wallet`,
    is_verified: Math.random() > 0.1, // 90% verified
    is_default: Math.random() > 0.7,  // 30% default
  };
}

function generateBankAccount(currency: string = 'USD') {
  const accountNumber = randomInt(100000000, 999999999).toString();
  const routingNumber = randomInt(100000000, 999999999).toString();
  
  return {
    type: 'bank_account' as const,
    bank_name: randomChoice(['Chase', 'Bank of America', 'Wells Fargo', 'Citi', 'Capital One']),
    bank_account_last_four: accountNumber.slice(-4),
    bank_routing_last_four: routingNumber.slice(-4),
    bank_currency: currency,
    bank_account_holder: generatePersonName(),
    label: `${currency} Account ${accountNumber.slice(-4)}`,
    is_verified: Math.random() > 0.15, // 85% verified
    is_default: Math.random() > 0.8,   // 20% default
  };
}

function generateCard() {
  const last4 = randomInt(1000, 9999).toString();
  const brand = randomChoice(['Visa', 'Mastercard', 'Amex']);
  
  return {
    type: 'card' as const,
    card_id: `card_${randomInt(100000000, 999999999)}`,
    card_last_four: last4,
    label: `${brand} •••• ${last4}`,
    is_verified: true,
    is_default: Math.random() > 0.85,
  };
}

// ============================================
// Main Seeding Function
// ============================================

async function seedPowerUser(email: string, profileName: string, customMonths?: number) {
  const startTime = Date.now();
  
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║        Power User Seed Data Generator v1.0            ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  // Load profile
  const profile = getProfile(profileName);
  const monthsToSeed = customMonths || profile.timeSpanMonths;
  const monthlyGrowth = profile.monthlyTransferGrowth.slice(-monthsToSeed); // Take most recent N months
  
  console.log(`📋 Profile: ${profile.name}`);
  console.log(`   Industry: ${profile.industry}`);
  console.log(`   Time Span: ${monthsToSeed} months${customMonths ? ` (custom, profile default: ${profile.timeSpanMonths})` : ''}`);
  console.log(`   Target Volume: ${monthlyGrowth.reduce((a, b) => a + b, 0).toLocaleString()} transfers\n`);
  
  // ============================================
  // Step 1: Find User & Tenant
  // ============================================
  console.log('📊 Step 1/6: Finding user and tenant...');
  
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error('❌ Failed to list users:', userError);
    process.exit(1);
  }
  
  const user = users.find(u => u.email === email);
  if (!user) {
    console.error(`❌ User not found: ${email}`);
    process.exit(1);
  }
  
  console.log(`   ✅ Found user: ${user.email} (${user.id})`);
  
  // Get user's tenant
  const { data: userProfile, error: profileError } = await supabase
    .from('user_profiles')
    .select('tenant_id, tenants(name)')
    .eq('id', user.id)
    .single();
  
  if (profileError || !userProfile) {
    console.error('❌ Failed to get user profile:', profileError);
    process.exit(1);
  }
  
  const tenantId = userProfile.tenant_id;
  const tenantName = (userProfile.tenants as any).name;
  console.log(`   ✅ Tenant: ${tenantName} (${tenantId})\n`);
  
  // ============================================
  // Step 2: Create Accounts
  // ============================================
  console.log('📊 Step 2/6: Creating accounts...');
  
  const allAccounts: any[] = [];
  let accountsCreated = 0;
  
  // Create Person Accounts
  console.log(`   Creating ${profile.accounts.person} person accounts...`);
  const now = new Date();
  const accountCreationStart = new Date(now);
  accountCreationStart.setMonth(accountCreationStart.getMonth() - profile.timeSpanMonths);
  
  for (let i = 0; i < profile.accounts.person; i++) {
    const name = generatePersonName();
    const email = generateEmail(name);
    // Distribute account creation across the time span
    const accountCreatedAt = randomDate(accountCreationStart, now);
    
    const { data: account, error } = await supabase
      .from('accounts')
      .insert({
        tenant_id: tenantId,
        type: 'person',
        name,
        email,
        verification_status: randomChoice(['verified', 'verified', 'verified', 'pending', 'unverified']),
        verification_tier: randomInt(0, 3),
        balance_total: randomFloat(100, 50000),
        balance_available: randomFloat(100, 50000),
        currency: 'USD',
        created_at: accountCreatedAt.toISOString(),
      })
      .select()
      .single();
    
    if (!error && account) {
      allAccounts.push(account);
      accountsCreated++;
    }
  }
  console.log(`   ✅ Created ${accountsCreated} person accounts`);
  
  // Create Business Accounts
  console.log(`   Creating ${profile.accounts.business} business accounts...`);
  accountsCreated = 0;
  for (let i = 0; i < profile.accounts.business; i++) {
    const name = generateBusinessName();
    const email = generateEmail(name, 'company.com');
    // Distribute account creation across the time span
    const accountCreatedAt = randomDate(accountCreationStart, now);
    
    const { data: account, error } = await supabase
      .from('accounts')
      .insert({
        tenant_id: tenantId,
        type: 'business',
        name,
        email,
        verification_status: randomChoice(['verified', 'verified', 'pending', 'unverified']),
        verification_tier: randomInt(0, 3),
        balance_total: randomFloat(10000, 500000),
        balance_available: randomFloat(10000, 500000),
        currency: 'USD',
        created_at: accountCreatedAt.toISOString(),
      })
      .select()
      .single();
    
    if (!error && account) {
      allAccounts.push(account);
      accountsCreated++;
      
      // Add beneficial owners for businesses
      const numOwners = randomInt(1, 4);
      for (let j = 0; j < numOwners; j++) {
        const ownerName = generatePersonName();
        await supabase
          .from('beneficial_owners')
          .insert({
            account_id: account.id,
            name: ownerName,
            email: generateEmail(ownerName),
            ownership_percentage: randomFloat(10, 60, 1),
            is_verified: Math.random() > 0.3,
          });
      }
    }
  }
  console.log(`   ✅ Created ${accountsCreated} business accounts (with beneficial owners)`);
  
  // Create Agent Accounts
  console.log(`   Creating ${profile.accounts.agent} agent accounts...`);
  accountsCreated = 0;
  for (let i = 0; i < profile.accounts.agent; i++) {
    const name = `${generateBusinessName()} Agent`;
    const email = generateEmail(name, 'agent.com');
    const parentAccount = randomChoice(allAccounts.filter(a => a.type === 'business'));
    
    const { data: account, error } = await supabase
      .from('accounts')
      .insert({
        tenant_id: tenantId,
        type: 'agent',
        name,
        email,
        parent_account_id: parentAccount?.id,
        verification_status: 'verified',
        verification_tier: 1,
        balance_total: randomFloat(1000, 100000),
        balance_available: randomFloat(1000, 100000),
        currency: 'USD',
      })
      .select()
      .single();
    
    if (!error && account) {
      allAccounts.push(account);
      accountsCreated++;
    }
  }
  console.log(`   ✅ Created ${accountsCreated} agent accounts\n`);
  
  // ============================================
  // Step 3: Create Payment Methods
  // ============================================
  console.log('📊 Step 3/6: Creating payment methods...');
  
  const totalPaymentMethods = Math.floor(allAccounts.length * 1.7); // Average 1.7 per account
  const walletCount = Math.floor(totalPaymentMethods * (profile.paymentMethods.digitalWallets.percentage / 100));
  const bankCount = Math.floor(totalPaymentMethods * (profile.paymentMethods.bankAccounts / 100));
  const cardCount = totalPaymentMethods - walletCount - bankCount;
  
  let methodsCreated = 0;
  
  // Create digital wallets (stablecoins)
  console.log(`   Creating ${walletCount} digital wallet payment methods...`);
  const walletDist = profile.paymentMethods.digitalWallets.distribution;
  for (let i = 0; i < walletCount; i++) {
    // Pick stablecoin based on distribution
    const rand = Math.random() * 100;
    let cumulative = 0;
    let stablecoin = 'USDC';
    
    for (const [coin, percentage] of Object.entries(walletDist)) {
      cumulative += percentage;
      if (rand < cumulative) {
        if (coin === 'OTHER') {
          stablecoin = randomChoice(['BUSD', 'USDP', 'FRAX', 'TUSD']);
        } else {
          stablecoin = coin;
        }
        break;
      }
    }
    
    const account = randomChoice(allAccounts);
    const wallet = generateStablecoinWallet(stablecoin);
    
    // Payment methods created after account, but within reasonable time
    const accountCreatedAt = new Date(account.created_at || now);
    const methodCreatedAt = randomDate(accountCreatedAt, now);
    
    const { error } = await supabase
      .from('payment_methods')
      .insert({
        tenant_id: tenantId,
        account_id: account.id,
        ...wallet,
        created_at: methodCreatedAt.toISOString(),
      });
    
    if (!error) {
      methodsCreated++;
    } else if (i < 3) {
      console.error('Wallet insert error (sample):', error);
    }
  }
  console.log(`   ✅ Created ${methodsCreated} stablecoin wallets`);
  
  // Create bank accounts
  console.log(`   Creating ${bankCount} bank account payment methods...`);
  methodsCreated = 0;
  for (let i = 0; i < bankCount; i++) {
    const account = randomChoice(allAccounts);
    const bank = generateBankAccount();
    
    // Payment methods created after account, but within reasonable time
    const accountCreatedAt = new Date(account.created_at || now);
    const methodCreatedAt = randomDate(accountCreatedAt, now);
    
    const { error } = await supabase
      .from('payment_methods')
      .insert({
        tenant_id: tenantId,
        account_id: account.id,
        ...bank,
        created_at: methodCreatedAt.toISOString(),
      });
    
    if (!error) {
      methodsCreated++;
    } else if (i < 3) {
      console.error('Bank insert error (sample):', error);
    }
  }
  console.log(`   ✅ Created ${methodsCreated} bank accounts`);
  
  // Create cards
  console.log(`   Creating ${cardCount} card payment methods...`);
  methodsCreated = 0;
  for (let i = 0; i < cardCount; i++) {
    const account = randomChoice(allAccounts);
    const card = generateCard();
    
    // Payment methods created after account, but within reasonable time
    const accountCreatedAt = new Date(account.created_at || now);
    const methodCreatedAt = randomDate(accountCreatedAt, now);
    
    const { error } = await supabase
      .from('payment_methods')
      .insert({
        tenant_id: tenantId,
        account_id: account.id,
        ...card,
        created_at: methodCreatedAt.toISOString(),
      });
    
    if (!error) {
      methodsCreated++;
    } else if (i < 3) {
      console.error('Card insert error (sample):', error);
    }
  }
  console.log(`   ✅ Created ${methodsCreated} cards\n`);
  
  // ============================================
  // Step 4: Create Account Relationships
  // ============================================
  console.log('📊 Step 4/6: Creating account relationships...');
  
  const businesses = allAccounts.filter(a => a.type === 'business');
  const persons = allAccounts.filter(a => a.type === 'person');
  const agents = allAccounts.filter(a => a.type === 'agent');
  
  let relationshipsCreated = 0;
  
  // Contractors (business → person)
  const contractorCount = Math.floor(businesses.length * 2.5);
  console.log(`   Creating ${contractorCount} contractor relationships...`);
  for (let i = 0; i < contractorCount; i++) {
    const business = randomChoice(businesses);
    const contractor = randomChoice(persons);
    
    const { error } = await supabase
      .from('account_relationships')
      .insert({
        tenant_id: tenantId,
        account_id: business.id,
        related_account_id: contractor.id,
        relationship_type: 'contractor',
        status: 'active',
      });
    
    if (!error) relationshipsCreated++;
  }
  console.log(`   ✅ Created ${relationshipsCreated} contractor relationships`);
  
  // Vendors
  relationshipsCreated = 0;
  const vendorCount = Math.floor(businesses.length * 1.5);
  console.log(`   Creating ${vendorCount} vendor relationships...`);
  for (let i = 0; i < vendorCount; i++) {
    const business = randomChoice(businesses);
    const vendor = randomChoice(businesses.filter(b => b.id !== business.id));
    
    if (vendor) {
      const { error } = await supabase
        .from('account_relationships')
        .insert({
          tenant_id: tenantId,
          account_id: business.id,
          related_account_id: vendor.id,
          relationship_type: 'vendor',
          status: 'active',
        });
      
      if (!error) relationshipsCreated++;
    }
  }
  console.log(`   ✅ Created ${relationshipsCreated} vendor relationships\n`);
  
  // ============================================
  // Step 5: Create Historical Transfers
  // ============================================
  console.log('📊 Step 5/6: Creating historical transfers...');
  console.log(`   Time span: ${monthsToSeed} months\n`);
  
  let totalTransfers = 0;
  const now = new Date();
  
  // Calculate which months to seed (most recent N months)
  for (let monthOffset = monthsToSeed - 1; monthOffset >= 0; monthOffset--) {
    const monthVolume = monthlyGrowth[monthsToSeed - 1 - monthOffset];
    const monthStart = new Date(now);
    monthStart.setMonth(monthStart.getMonth() - monthOffset);
    monthStart.setDate(1);
    
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);
    
    console.log(`   Month -${monthOffset}: Creating ${monthVolume} transfers...`);
    
    for (let i = 0; i < monthVolume; i++) {
      // Pick transaction type
      // Database only allows: cross_border, internal, stream_start, stream_withdraw, stream_cancel, wrap, unwrap
      const typeRand = Math.random() * 100;
      let cumulative = 0;
      let transactionType = 'cross_border';
      let transactionCategory = 'crossBorder'; // For amount sizing
      
      for (const [type, percentage] of Object.entries(profile.transactionTypes)) {
        cumulative += percentage;
        if (typeRand < cumulative) {
          transactionCategory = type;
          // Map profile types to database types
          if (type === 'crossBorder') {
            transactionType = 'cross_border';
          } else if (type === 'internal' || type === 'payroll' || type === 'vendor' || type === 'refund' || type === 'other') {
            transactionType = 'internal';
          } else {
            transactionType = 'internal'; // Default to internal
          }
          break;
        }
      }
      
      // Pick accounts
      const fromAccount = randomChoice(allAccounts);
      const toAccount = randomChoice(allAccounts.filter(a => a.id !== fromAccount.id));
      
      if (!toAccount) continue;
      
      // Generate timestamp with patterns
      let timestamp = randomDate(monthStart, monthEnd);
      timestamp = applyTimePattern(timestamp, profile.patterns.weekdayBias, profile.patterns.businessHoursBias);
      timestamp = generateMonthEndSpike(timestamp, profile.patterns.monthEndSpikes);
      
      // Pick corridor
      const corridor = randomChoice(profile.geography.corridors);
      // Generate corridor_id for database queries (format: US-ARG, US-COL, etc.)
      const corridorId = `${corridor.from}-${corridor.to}`;
      
      // Generate amount (varies by category)
      let amount: number;
      if (transactionCategory === 'payroll') {
        amount = randomFloat(1000, 10000); // $1K-$10K
      } else if (transactionCategory === 'vendor') {
        amount = randomFloat(5000, 100000); // $5K-$100K
      } else if (transactionCategory === 'refund') {
        amount = randomFloat(50, 5000); // $50-$5K
      } else {
        amount = randomFloat(100, 50000); // $100-$50K
      }
      
      // Status
      const status = randomChoice([
        'completed', 'completed', 'completed', 'completed', 'completed',
        'completed', 'completed', 'completed', 'completed', // 85%
        'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', // 8%
        'processing', 'processing', 'processing', 'processing', 'processing', // 5%
        'failed', 'cancelled', // 2%
      ]);
      
      const { error } = await supabase
        .from('transfers')
        .insert({
          tenant_id: tenantId,
          from_account_id: fromAccount.id,
          from_account_name: fromAccount.name,
          to_account_id: toAccount.id,
          to_account_name: toAccount.name,
          amount,
          currency: corridor.from,
          destination_currency: corridor.to,
          fx_rate: corridor.from === corridor.to ? 1.0 : randomFloat(0.8, 1.2, 4),
          corridor_id: corridorId, // For corridor volume queries
          status,
          type: transactionType,
          initiated_by_type: 'user',
          initiated_by_id: fromAccount.id,
          initiated_by_name: fromAccount.name,
          created_at: timestamp.toISOString(),
        });
      
      if (!error) {
        totalTransfers++;
      } else {
        console.error('Transfer insert error:', error);
      }
    }
    
    console.log(`   ✅ Month -${monthOffset}: ${monthVolume} transfers created`);
  }
  
  console.log(`\n   📊 Total transfers created: ${totalTransfers.toLocaleString()}\n`);
  
  // ============================================
  // Step 6: Create Supporting Data
  // ============================================
  console.log('📊 Step 6/6: Creating supporting data...');
  
  // Streams
  const streamCount = 50;
  console.log(`   Creating ${streamCount} payment streams...`);
  let streamsCreated = 0;
  
  for (let i = 0; i < streamCount; i++) {
    const fromAccount = randomChoice(businesses);
    const toAccount = randomChoice([...persons, ...businesses].filter(a => a.id !== fromAccount.id));
    
    if (toAccount) {
      const { error } = await supabase
        .from('streams')
        .insert({
          tenant_id: tenantId,
          from_account_id: fromAccount.id,
          to_account_id: toAccount.id,
          amount: randomFloat(1000, 100000),
          currency: 'USD',
          flow_rate: randomFloat(100, 10000),
          stream_type: randomChoice(['recurring', 'scheduled', 'on_demand']),
          status: randomChoice(['active', 'active', 'active', 'paused', 'completed']),
        });
      
      if (!error) streamsCreated++;
    }
  }
  console.log(`   ✅ Created ${streamsCreated} streams`);
  
  // Disputes
  const disputeCount = 40;
  console.log(`   Creating ${disputeCount} disputes...`);
  let disputesCreated = 0;
  
  // Get some recent transfers for disputes
  const { data: recentTransfers } = await supabase
    .from('transfers')
    .select('id')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(100);
  
  if (recentTransfers && recentTransfers.length > 0) {
    for (let i = 0; i < Math.min(disputeCount, recentTransfers.length); i++) {
      const transfer = recentTransfers[i];
      
      const { error } = await supabase
        .from('disputes')
        .insert({
          tenant_id: tenantId,
          transfer_id: transfer.id,
          reason: randomChoice(['fraud', 'unauthorized', 'service_issue', 'duplicate', 'amount_incorrect']),
          status: randomChoice(['open', 'under_review', 'under_review', 'resolved', 'rejected']),
          amount: randomFloat(100, 10000),
          currency: 'USD',
          description: 'Dispute created during seed data generation',
        });
      
      if (!error) disputesCreated++;
    }
  }
  console.log(`   ✅ Created ${disputesCreated} disputes`);
  
  // ============================================
  // Complete!
  // ============================================
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║          Power User Seed Complete!                    ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  console.log('📊 Summary:');
  console.log(`   Profile: ${profile.name}`);
  console.log(`   Tenant: ${tenantName}`);
  console.log(`   User: ${email}`);
  console.log(`   Time period: ${monthsToSeed} months`);
  console.log(`   Accounts created: ${allAccounts.length}`);
  console.log(`   Payment methods created: ${totalPaymentMethods}`);
  console.log(`   Transfers created: ${totalTransfers.toLocaleString()}`);
  console.log(`   Streams created: ${streamsCreated}`);
  console.log(`   Disputes created: ${disputesCreated}`);
  console.log(`   Duration: ${duration}s\n`);
  
  if (customMonths && customMonths < profile.timeSpanMonths) {
    const remaining = profile.timeSpanMonths - monthsToSeed;
    console.log('💡 To continue seeding:');
    console.log(`   Run again with --months ${Math.min(remaining, 3)} to add more historical data\n`);
  }
  
  console.log('✅ You can now:');
  console.log(`   1. Login with: ${email}`);
  console.log('   2. Test pagination with large datasets');
  console.log('   3. Verify performance with high volume');
  console.log(`   4. Explore ${monthsToSeed} months of historical data\n`);
}

// ============================================
// CLI Entry Point
// ============================================

async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  let email = 'haxaco@gmail.com';
  let profileName = 'crypto-native';
  let customMonths: number | undefined;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      email = args[i + 1];
      i++;
    } else if (args[i] === '--profile' && args[i + 1]) {
      profileName = args[i + 1];
      i++;
    } else if (args[i] === '--months' && args[i + 1]) {
      customMonths = parseInt(args[i + 1], 10);
      i++;
    }
  }
  
  await seedPowerUser(email, profileName, customMonths);
}

main().catch(console.error);

