#!/usr/bin/env tsx

/**
 * Invu POS Demo — Seed Script
 *
 * Provisions the complete Invu POS demo environment:
 * - Demo tenant ("Invu POS") with API key
 * - 12 merchant accounts from merchants.csv
 * - AI agent ("Invu Concierge Agent") with KYA Tier 1
 * - Funded wallet (10,000 USDC)
 * - Spending mandate ($2,500/day)
 * - Sample UCP checkouts (completed + pending)
 *
 * Usage:
 *   cd apps/api && pnpm tsx ../../invu-demo/seed-invu-demo.ts
 *
 * Requires:
 *   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { randomUUID, createHash } from 'crypto';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables:');
  console.error('   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ---------------------------------------------------------------------------
// CSV Loader
// ---------------------------------------------------------------------------

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

function loadCSV<T extends Record<string, string>>(filename: string): T[] {
  const path = resolve(SCRIPT_DIR, 'seed-data', filename);
  const raw = readFileSync(path, 'utf-8');
  const [headerLine, ...lines] = raw.trim().split('\n');
  const headers = headerLine.split(',');

  return lines
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const values = line.split(',');
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h.trim()] = (values[i] || '').trim();
      });
      return row as T;
    });
}

// ---------------------------------------------------------------------------
// IDs (deterministic for idempotency — valid hex UUIDs only)
// ---------------------------------------------------------------------------

const TENANT_ID  = '00000000-1a00-de00-0000-000000000001';
const AGENT_ID   = '00000000-1a00-de00-a9e0-000000000001';
const WALLET_ID  = '00000000-1a00-de00-0a11-000000000001';
const API_KEY_ID = '00000000-1a00-de00-a100-000000000001';
const MANDATE_ID = 'mandate_invu_concierge_daily';
const API_KEY    = 'pk_test_invu_demo_2026';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function merchantUUID(merchantId: string): string {
  // Deterministic UUID from merchant_id for idempotency
  const hex = Buffer.from(merchantId).toString('hex').padEnd(32, '0').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

function getKeyPrefix(key: string): string {
  return key.slice(0, 12);
}

function log(emoji: string, msg: string) {
  console.log(`${emoji}  ${msg}`);
}

/** Build a UCP order payment JSONB */
function orderPayment(handlerId: string, instrumentId: string, amount: number, currency: string) {
  return {
    handler_id: handlerId,
    instrument_id: instrumentId,
    status: 'completed',
    amount,
    currency,
  };
}

// ---------------------------------------------------------------------------
// Main Seed Logic
// ---------------------------------------------------------------------------

async function main() {
  console.log('');
  console.log('='.repeat(60));
  console.log('  INVU POS DEMO — SEED SCRIPT');
  console.log('='.repeat(60));
  console.log('');

  // -- 1. Tenant -------------------------------------------------------
  // tenants schema: id, name, api_key, api_key_hash, status, settings, api_key_prefix

  log('>', 'Creating demo tenant: Invu POS...');

  const { error: tenantError } = await supabase.from('tenants').upsert(
    {
      id: TENANT_ID,
      name: 'Invu POS',
      api_key: API_KEY,
      api_key_hash: hashApiKey(API_KEY),
      api_key_prefix: getKeyPrefix(API_KEY),
      status: 'active',
      settings: {
        type: 'business',
        country: 'PA',
        demo: true,
        partner: 'invu_pos',
        contact: 'Rafi Turgman',
        website: 'https://invupos.com',
        email: 'demo@invu-pos.com',
      },
    },
    { onConflict: 'id' }
  );

  if (tenantError) {
    console.error('  Failed to create tenant:', tenantError.message);
  } else {
    log('+', 'Tenant "Invu POS" ready');
  }

  // -- 1b. API Key (api_keys table) ------------------------------------
  // api_keys schema: id, tenant_id, name, description, environment, key_prefix, key_hash, status, ...
  // Unique constraint is on key_prefix

  log('>', 'Creating API key in api_keys table...');

  const { error: apiKeyError } = await supabase.from('api_keys').upsert(
    {
      id: API_KEY_ID,
      tenant_id: TENANT_ID,
      name: 'Invu Demo Test Key',
      description: 'Demo API key for Invu POS integration',
      environment: 'test',
      key_prefix: getKeyPrefix(API_KEY),
      key_hash: hashApiKey(API_KEY),
      status: 'active',
    },
    { onConflict: 'id' }
  );

  if (apiKeyError) {
    log('?', `API key: ${apiKeyError.message} (may already exist)`);
  } else {
    log('+', `API key ready: ${API_KEY}`);
  }

  // -- 1c. Dashboard User (Supabase Auth + user_profiles) ----------------

  const DEMO_EMAIL = 'demo@invu-pos.com';
  const DEMO_PASSWORD = 'InvuDemo2026';

  log('>', `Creating dashboard user: ${DEMO_EMAIL}...`);

  // Check if user already exists
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const existingUser = users.find((u: any) => u.email === DEMO_EMAIL);
  let dashUserId: string;

  if (existingUser) {
    dashUserId = existingUser.id;
    log('=', `User ${DEMO_EMAIL} already exists`);
  } else {
    const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { name: 'Invu Demo Admin' },
    });

    if (userError) {
      console.error('  Failed to create user:', userError.message);
      dashUserId = '';
    } else {
      dashUserId = newUser.user.id;
      log('+', `User created: ${DEMO_EMAIL}`);
    }
  }

  if (dashUserId) {
    const { error: profileError } = await supabase.from('user_profiles').upsert(
      {
        id: dashUserId,
        tenant_id: TENANT_ID,
        role: 'owner',
        name: 'Invu Demo Admin',
      },
      { onConflict: 'id' }
    );

    if (profileError) {
      console.error('  Failed to link user to tenant:', profileError.message);
    } else {
      log('+', `Dashboard user linked to tenant (role: owner)`);
    }
  }

  // -- 2. Merchant Accounts --------------------------------------------
  // accounts schema: id, tenant_id, type, name, email, verification_tier, verification_status,
  //   balance_total, balance_available, currency, metadata, ...
  // NO 'country' or 'status' columns — country goes in metadata

  log('>', 'Loading merchants from CSV...');
  const merchants = loadCSV('merchants.csv');
  log('>', `Found ${merchants.length} merchants`);

  for (const m of merchants) {
    const accountId = merchantUUID(m.merchant_id);
    const { error } = await supabase.from('accounts').upsert(
      {
        id: accountId,
        tenant_id: TENANT_ID,
        name: m.merchant_name,
        type: 'business',
        currency: m.currency,
        metadata: {
          invu_merchant_id: m.merchant_id,
          merchant_type: m.merchant_type,
          country: m.country,
          city: m.city,
          description: m.description,
          pos_provider: 'invu',
        },
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.error(`    ${m.merchant_name}: ${error.message}`);
    } else {
      log('  +', `${m.merchant_name} (${m.city}, ${m.country})`);
    }
  }

  // -- 3. Products (store in metadata) ---------------------------------

  log('>', 'Loading products from CSV...');
  const products = loadCSV('products.csv');
  log('>', `Found ${products.length} products across ${merchants.length} merchants`);

  const productsByMerchant: Record<string, typeof products> = {};
  for (const p of products) {
    if (!productsByMerchant[p.merchant_id]) {
      productsByMerchant[p.merchant_id] = [];
    }
    productsByMerchant[p.merchant_id].push(p);
  }

  for (const [merchantId, catalog] of Object.entries(productsByMerchant)) {
    const accountId = merchantUUID(merchantId);
    const { error } = await supabase
      .from('accounts')
      .update({
        metadata: {
          invu_merchant_id: merchantId,
          catalog: catalog.map((p) => ({
            id: p.product_id,
            name: p.product_name,
            description: p.description,
            category: p.category,
            unit_price_cents: parseInt(p.unit_price_cents, 10),
            currency: p.currency,
          })),
        },
      })
      .eq('id', accountId);

    if (error) {
      console.error(`    Catalog for ${merchantId}: ${error.message}`);
    } else {
      log('  +', `${merchantId}: ${catalog.length} products loaded`);
    }
  }

  // -- 4. AI Agent ------------------------------------------------------
  // agents schema: id (UUID), tenant_id, parent_account_id, name, description,
  //   status, kya_tier, kya_status, kya_verified_at, permissions, metadata, ...

  log('>', 'Creating Invu Concierge Agent...');

  const { error: agentError } = await supabase.from('agents').upsert(
    {
      id: AGENT_ID,
      tenant_id: TENANT_ID,
      parent_account_id: merchantUUID('invu_merch_001'),
      name: 'Invu Concierge Agent',
      description:
        'AI-powered ordering agent for Invu POS merchants. Can browse menus, place orders, and complete payments autonomously.',
      status: 'active',
      kya_tier: 1,
      kya_status: 'verified',
      kya_verified_at: new Date().toISOString(),
      permissions: {
        transactions: { initiate: true, approve: false, view: true },
        streams: { initiate: false, modify: false, pause: false, terminate: false, view: true },
        accounts: { view: true, create: false },
        treasury: { view: false, rebalance: false },
      },
      metadata: {
        demo: true,
        use_case: 'restaurant_ordering',
        partner: 'invu_pos',
      },
    },
    { onConflict: 'id' }
  );

  if (agentError) {
    console.error('  Failed to create agent:', agentError.message);
  } else {
    log('+', 'Agent "Invu Concierge Agent" ready (KYA Tier 1)');
  }

  // -- 5. Agent Wallet --------------------------------------------------
  // wallets schema: id, tenant_id, owner_account_id, managed_by_agent_id, balance, currency,
  //   status, name, purpose, wallet_type, custody_type (NOT NULL), provider (NOT NULL),
  //   verification_status (NOT NULL), ...
  // NO 'metadata' column

  log('>', 'Creating agent wallet...');

  const { error: walletError } = await supabase.from('wallets').upsert(
    {
      id: WALLET_ID,
      tenant_id: TENANT_ID,
      owner_account_id: merchantUUID('invu_merch_001'),
      managed_by_agent_id: AGENT_ID,
      name: 'Invu Concierge Wallet',
      wallet_type: 'internal',
      custody_type: 'platform',
      provider: 'internal',
      verification_status: 'verified',
      currency: 'USDC',
      balance: 10000.0,
      status: 'active',
      purpose: 'Agent spending wallet for Invu POS demo ordering',
    },
    { onConflict: 'id' }
  );

  if (walletError) {
    console.error('  Failed to create wallet:', walletError.message);
  } else {
    log('+', 'Wallet funded with 10,000 USDC');
  }

  // -- 6. Spending Mandate ----------------------------------------------
  // ap2_mandates schema: id, tenant_id, account_id, mandate_id, mandate_type, agent_id (varchar),
  //   agent_name, authorized_amount, currency, used_amount, remaining_amount, execution_count,
  //   mandate_data (JSONB), status, expires_at, metadata, ...
  // NO 'description' column — use mandate_data JSONB

  log('>', 'Creating spending mandate...');

  const { error: mandateError } = await supabase.from('ap2_mandates').upsert(
    {
      id: randomUUID(),
      tenant_id: TENANT_ID,
      mandate_id: MANDATE_ID,
      agent_id: AGENT_ID,
      agent_name: 'Invu Concierge Agent',
      account_id: merchantUUID('invu_merch_001'),
      mandate_type: 'payment',
      authorized_amount: 2500.0,
      used_amount: 0,
      execution_count: 0,
      currency: 'USD',
      status: 'active',
      mandate_data: {
        description: 'Daily spending mandate for Invu demo -- agent can order up to $2,500/day',
      },
      metadata: { demo: true, partner: 'invu_pos' },
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: 'mandate_id' }
  );

  if (mandateError) {
    console.error('  Failed to create mandate:', mandateError.message);
  } else {
    log('+', 'Mandate ready: $2,500 authorized');
  }

  // -- 7. Sample UCP Checkouts ------------------------------------------

  log('>', 'Creating sample UCP checkouts...');

  // Helper: build checkout with correct schema
  function checkoutRow(opts: {
    id: string;
    status: string;
    lineItems: any[];
    totals: any[];
    buyer: any;
    instruments: any[];
    selectedInstrumentId: string | null;
    orderId: string | null;
    metadata: Record<string, unknown>;
    checkoutType: string;
  }) {
    return {
      id: opts.id,
      tenant_id: TENANT_ID,
      status: opts.status,
      currency: 'USD',
      line_items: opts.lineItems,
      totals: opts.totals,
      buyer: opts.buyer,
      payment_config: { handlers: ['invu'] },
      payment_instruments: opts.instruments,
      selected_instrument_id: opts.selectedInstrumentId,
      agent_id: AGENT_ID,
      order_id: opts.orderId,
      metadata: { ...opts.metadata, checkout_type: opts.checkoutType },
      messages: [],
      links: [],
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  const DEMO_INSTRUMENT = {
    id: 'pi_invu_demo_001',
    handler: 'invu',
    type: 'invu_pos',
    brand: 'Invu POS',
    created_at: new Date().toISOString(),
  };

  const BATCH_INSTRUMENT = {
    id: 'pi_invu_demo_batch',
    handler: 'invu',
    type: 'invu_pos',
    brand: 'Invu POS',
    created_at: new Date().toISOString(),
  };

  // Checkout 1: Completed single-restaurant order (La Cevicheria del Rey)
  const checkout1Id = 'chk_invu_demo_cevicheria_001';
  const order1Id = 'ord_invu_demo_cevicheria_001';
  const ck1Items = [
    { id: 'prod_cev_001', name: 'Ceviche Clasico', description: 'Fresh corvina ceviche with lime and cilantro', quantity: 2, unit_price: 1450, total_price: 2900 },
    { id: 'prod_cev_003', name: 'Arroz con Mariscos', description: 'Seafood rice with prawns and calamari', quantity: 1, unit_price: 1650, total_price: 1650 },
    { id: 'prod_cev_005', name: 'Limonada de Coco', description: 'Fresh coconut lemonade', quantity: 2, unit_price: 550, total_price: 1100 },
  ];
  const ck1Totals = [
    { type: 'subtotal', amount: 5650, label: 'Subtotal' },
    { type: 'tax', amount: 395, label: 'ITBMS 7%' },
    { type: 'total', amount: 6045, label: 'Total' },
  ];
  const ck1Buyer = { email: 'corporate@invupos.com', name: 'Invu Corporate Catering' };

  // Insert checkout first WITHOUT order_id (FK constraint), then order, then link them
  const { error: ck1Error } = await supabase.from('ucp_checkout_sessions').upsert(
    checkoutRow({
      id: checkout1Id,
      status: 'completed',
      lineItems: ck1Items,
      totals: ck1Totals,
      buyer: ck1Buyer,
      instruments: [DEMO_INSTRUMENT],
      selectedInstrumentId: DEMO_INSTRUMENT.id,
      orderId: null,  // insert without FK first
      metadata: { merchant_id: 'invu_merch_002', merchant_name: 'La Cevicheria del Rey', demo: true },
      checkoutType: 'digital',
    }),
    { onConflict: 'id' }
  );
  if (ck1Error) console.error('    Checkout 1:', ck1Error.message);

  const { error: ord1Error } = await supabase.from('ucp_orders').upsert(
    {
      id: order1Id,
      tenant_id: TENANT_ID,
      checkout_id: checkout1Id,
      status: 'confirmed',
      currency: 'USD',
      line_items: ck1Items,
      totals: ck1Totals,
      buyer: ck1Buyer,
      payment: orderPayment('invu', DEMO_INSTRUMENT.id, 6045, 'USD'),
      agent_id: AGENT_ID,
      metadata: { merchant_id: 'invu_merch_002', merchant_name: 'La Cevicheria del Rey', demo: true },
    },
    { onConflict: 'id' }
  );
  if (ord1Error) console.error('    Order 1:', ord1Error.message);

  // Now link checkout → order
  await supabase.from('ucp_checkout_sessions').update({ order_id: order1Id }).eq('id', checkout1Id);
  log('  +', 'Checkout 1: La Cevicheria del Rey -- $60.45 (completed)');

  // Checkout 2: Completed batch orders (3 restaurants)
  const batchMerchants = [
    {
      merchant_id: 'invu_merch_001',
      merchant_name: 'Krispy Kreme Panama',
      items: [
        { id: 'prod_kk_001', name: 'Original Glazed Dozen', quantity: 3, unit_price: 1299, total_price: 3897 },
        { id: 'prod_kk_004', name: 'Iced Latte', quantity: 5, unit_price: 450, total_price: 2250 },
      ],
    },
    {
      merchant_id: 'invu_merch_003',
      merchant_name: 'Cafe Unido',
      items: [
        { id: 'prod_cu_001', name: 'Geisha Pourover', quantity: 4, unit_price: 950, total_price: 3800 },
        { id: 'prod_cu_004', name: 'Croissant de Almendra', quantity: 4, unit_price: 425, total_price: 1700 },
      ],
    },
    {
      merchant_id: 'invu_merch_005',
      merchant_name: 'El Trapiche',
      items: [
        { id: 'prod_trap_001', name: 'Sancocho Panameno', quantity: 6, unit_price: 1050, total_price: 6300 },
        { id: 'prod_trap_004', name: 'Hojaldre', quantity: 10, unit_price: 250, total_price: 2500 },
      ],
    },
  ];

  let batchIdx = 0;
  for (const batch of batchMerchants) {
    batchIdx++;
    const ckId = `chk_invu_demo_batch_${String(batchIdx).padStart(3, '0')}`;
    const ordId = `ord_invu_demo_batch_${String(batchIdx).padStart(3, '0')}`;
    const subtotal = batch.items.reduce((s, i) => s + i.total_price, 0);
    const tax = Math.round(subtotal * 0.07);
    const total = subtotal + tax;
    const totals = [
      { type: 'subtotal', amount: subtotal, label: 'Subtotal' },
      { type: 'tax', amount: tax, label: 'ITBMS 7%' },
      { type: 'total', amount: total, label: 'Total' },
    ];
    const buyer = { email: 'corporate@invupos.com', name: 'Invu Corporate Catering' };

    // Insert checkout WITHOUT order_id first (FK constraint)
    const { error: ckErr } = await supabase.from('ucp_checkout_sessions').upsert(
      checkoutRow({
        id: ckId,
        status: 'completed',
        lineItems: batch.items,
        totals,
        buyer,
        instruments: [BATCH_INSTRUMENT],
        selectedInstrumentId: BATCH_INSTRUMENT.id,
        orderId: null,
        metadata: { merchant_id: batch.merchant_id, merchant_name: batch.merchant_name, demo: true, batch: true },
        checkoutType: 'digital',
      }),
      { onConflict: 'id' }
    );

    const { error: ordErr } = await supabase.from('ucp_orders').upsert(
      {
        id: ordId,
        tenant_id: TENANT_ID,
        checkout_id: ckId,
        status: 'confirmed',
        currency: 'USD',
        line_items: batch.items,
        totals,
        buyer,
        payment: orderPayment('invu', BATCH_INSTRUMENT.id, total, 'USD'),
        agent_id: AGENT_ID,
        metadata: { merchant_id: batch.merchant_id, merchant_name: batch.merchant_name, demo: true, batch: true },
      },
      { onConflict: 'id' }
    );

    // Link checkout → order
    await supabase.from('ucp_checkout_sessions').update({ order_id: ordId }).eq('id', ckId);

    if (ckErr || ordErr) {
      console.error(`    Batch checkout ${batch.merchant_name}: ${ckErr?.message || ordErr?.message}`);
    } else {
      log('  +', `Batch: ${batch.merchant_name} -- $${(total / 100).toFixed(2)} (completed)`);
    }
  }

  // Checkout 3: Pending order (Hotel Tantalo room service)
  const checkout3Id = 'chk_invu_demo_tantalo_001';
  const { error: ck3Error } = await supabase.from('ucp_checkout_sessions').upsert(
    checkoutRow({
      id: checkout3Id,
      status: 'incomplete',
      lineItems: [
        { id: 'prod_ht_002', name: 'Brunch Plate', description: 'Weekend brunch -- eggs chorizo plantain toast', quantity: 2, unit_price: 1650, total_price: 3300 },
        { id: 'prod_ht_005', name: 'Espresso Martini', description: 'Vodka espresso with Cafe Unido beans', quantity: 2, unit_price: 1400, total_price: 2800 },
      ],
      totals: [
        { type: 'subtotal', amount: 6100, label: 'Subtotal' },
        { type: 'tax', amount: 427, label: 'ITBMS 7%' },
        { type: 'total', amount: 6527, label: 'Total' },
      ],
      buyer: { email: 'guest@hotel-tantalo.com', name: 'Hotel Guest -- Room 405' },
      instruments: [],
      selectedInstrumentId: null,
      orderId: null,
      metadata: { merchant_id: 'invu_merch_012', merchant_name: 'Hotel Tantalo', room_number: '405', demo: true },
      checkoutType: 'service',
    }),
    { onConflict: 'id' }
  );

  if (ck3Error) {
    console.error('    Checkout 3:', ck3Error.message);
  } else {
    log('  ?', 'Checkout 3: Hotel Tantalo room service -- $65.27 (pending)');
  }

  // -- Summary ----------------------------------------------------------

  console.log('');
  console.log('='.repeat(60));
  console.log('  INVU POS DEMO SEEDED SUCCESSFULLY');
  console.log('='.repeat(60));
  console.log('');
  console.log('  Tenant:     Invu POS');
  console.log(`  Tenant ID:  ${TENANT_ID}`);
  console.log(`  API Key:    ${API_KEY}`);
  console.log(`  Merchants:  ${merchants.length}`);
  console.log(`  Products:   ${products.length}`);
  console.log(`  Agent:      Invu Concierge Agent (${AGENT_ID})`);
  console.log(`  Wallet:     10,000 USDC (${WALLET_ID})`);
  console.log(`  Mandate:    $2,500/day (${MANDATE_ID})`);
  console.log('  Checkouts:  4 completed + 1 pending');
  console.log('');
  console.log('  Dashboard Login:');
  console.log(`    Email:    ${DEMO_EMAIL}`);
  console.log(`    Password: ${DEMO_PASSWORD}`);
  console.log('');
}

main().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
