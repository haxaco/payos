#!/usr/bin/env tsx

/**
 * UCP Sample Data Seeding Script
 *
 * Populates the database with sample UCP checkout sessions and orders
 * for testing the UCP UI implementation.
 *
 * Usage: pnpm --filter @payos/api seed:ucp
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ============================================
// Sample Data
// ============================================

const sampleLineItems = [
  [
    {
      id: 'item_001',
      name: 'Wireless Bluetooth Headphones',
      description: 'Premium noise-cancelling headphones with 30hr battery',
      quantity: 1,
      unit_price: 14999,
      total_price: 14999,
      image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200',
      product_url: 'https://example.com/products/headphones',
    },
    {
      id: 'item_002',
      name: 'USB-C Charging Cable',
      description: '2m braided cable, fast charging',
      quantity: 2,
      unit_price: 1499,
      total_price: 2998,
      image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200',
      product_url: 'https://example.com/products/cable',
    },
  ],
  [
    {
      id: 'item_003',
      name: 'Mechanical Keyboard',
      description: 'RGB backlit, Cherry MX switches',
      quantity: 1,
      unit_price: 12999,
      total_price: 12999,
      image_url: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=200',
      product_url: 'https://example.com/products/keyboard',
    },
  ],
  [
    {
      id: 'item_004',
      name: 'Smart Watch Pro',
      description: 'Health tracking, GPS, 5 day battery',
      quantity: 1,
      unit_price: 29999,
      total_price: 29999,
      image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200',
      product_url: 'https://example.com/products/watch',
    },
    {
      id: 'item_005',
      name: 'Watch Band - Sport',
      description: 'Silicone band, multiple colors',
      quantity: 3,
      unit_price: 2499,
      total_price: 7497,
      image_url: 'https://images.unsplash.com/photo-1434056886845-dbbe98c0b7a1?w=200',
      product_url: 'https://example.com/products/band',
    },
  ],
  [
    {
      id: 'item_006',
      name: 'Laptop Stand',
      description: 'Adjustable aluminum stand',
      quantity: 1,
      unit_price: 4999,
      total_price: 4999,
      image_url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=200',
      product_url: 'https://example.com/products/stand',
    },
  ],
  [
    {
      id: 'item_007',
      name: 'Wireless Mouse',
      description: 'Ergonomic design, 2.4GHz wireless',
      quantity: 1,
      unit_price: 3999,
      total_price: 3999,
      image_url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=200',
      product_url: 'https://example.com/products/mouse',
    },
    {
      id: 'item_008',
      name: 'Mouse Pad XL',
      description: 'Extended size, stitched edges',
      quantity: 1,
      unit_price: 1999,
      total_price: 1999,
      image_url: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=200',
      product_url: 'https://example.com/products/mousepad',
    },
  ],
];

const sampleBuyers = [
  { email: 'alice@example.com', name: 'Alice Johnson', phone: '+1-555-0101' },
  { email: 'bob@example.com', name: 'Bob Smith', phone: '+1-555-0102' },
  { email: 'carol@example.com', name: 'Carol Williams', phone: '+1-555-0103' },
  { email: 'david@example.com', name: 'David Brown', phone: '+1-555-0104' },
  { email: 'emma@example.com', name: 'Emma Davis', phone: '+1-555-0105' },
];

const sampleAddresses = [
  {
    line1: '123 Main Street',
    line2: 'Apt 4B',
    city: 'San Francisco',
    state: 'CA',
    postal_code: '94102',
    country: 'US',
  },
  {
    line1: '456 Oak Avenue',
    city: 'New York',
    state: 'NY',
    postal_code: '10001',
    country: 'US',
  },
  {
    line1: '789 Pine Road',
    line2: 'Suite 100',
    city: 'Austin',
    state: 'TX',
    postal_code: '78701',
    country: 'US',
  },
  {
    line1: '321 Elm Street',
    city: 'Seattle',
    state: 'WA',
    postal_code: '98101',
    country: 'US',
  },
  {
    line1: '654 Maple Drive',
    city: 'Miami',
    state: 'FL',
    postal_code: '33101',
    country: 'US',
  },
];

const checkoutStatuses = [
  'incomplete',
  'requires_escalation',
  'ready_for_complete',
  'completed',
  'completed',
  'completed',
  'canceled',
] as const;

const orderStatuses = ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'] as const;

function calculateTotals(lineItems: any[]) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.total_price, 0);
  const tax = Math.round(subtotal * 0.0875); // 8.75% tax
  const shipping = 599; // $5.99 shipping
  const total = subtotal + tax + shipping;

  return [
    { type: 'subtotal', amount: subtotal, label: 'Subtotal' },
    { type: 'tax', amount: tax, label: 'Tax (8.75%)' },
    { type: 'shipping', amount: shipping, label: 'Standard Shipping' },
    { type: 'total', amount: total, label: 'Total' },
  ];
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysAgo: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
  return date;
}

// ============================================
// CLI Arguments
// ============================================

function parseArgs(): { tenantId?: string; force: boolean } {
  const args = process.argv.slice(2);
  let tenantId: string | undefined;
  let force = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--tenant-id' && args[i + 1]) {
      tenantId = args[++i];
    } else if (args[i] === '--force') {
      force = true;
    }
  }

  return { tenantId, force };
}

// ============================================
// Seeding Functions
// ============================================

async function getTenantId(specifiedId?: string): Promise<string> {
  if (specifiedId) {
    // Verify the specified tenant exists
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', specifiedId)
      .single();

    if (error || !tenant) {
      console.error(`❌ Tenant not found with ID: ${specifiedId}`);
      process.exit(1);
    }

    console.log(`📦 Using tenant: ${tenant.name} (${tenant.id})`);
    return tenant.id;
  }

  // Default: Get the first tenant (Demo Fintech or similar)
  const { data: tenants, error } = await supabase.from('tenants').select('id, name').limit(1);

  if (error || !tenants?.length) {
    console.error('❌ No tenants found. Please run seed:db first.');
    process.exit(1);
  }

  console.log(`📦 Using tenant: ${tenants[0].name} (${tenants[0].id})`);
  return tenants[0].id;
}

async function clearExistingData(tenantId: string): Promise<void> {
  console.log('\n🗑️  Clearing existing UCP data...');

  // Delete orders first (they reference checkouts)
  const { count: ordersDeleted, error: orderError } = await supabase
    .from('ucp_orders')
    .delete({ count: 'exact' })
    .eq('tenant_id', tenantId);

  if (orderError) {
    console.error(`  ❌ Failed to delete orders: ${orderError.message}`);
  } else {
    console.log(`  ✓ Deleted ${ordersDeleted || 0} orders`);
  }

  // Then delete checkouts
  const { count: checkoutsDeleted, error: checkoutError } = await supabase
    .from('ucp_checkout_sessions')
    .delete({ count: 'exact' })
    .eq('tenant_id', tenantId);

  if (checkoutError) {
    console.error(`  ❌ Failed to delete checkouts: ${checkoutError.message}`);
  } else {
    console.log(`  ✓ Deleted ${checkoutsDeleted || 0} checkouts`);
  }
}

async function seedCheckoutSessions(tenantId: string): Promise<string[]> {
  console.log('\n📝 Seeding UCP Checkout Sessions...');

  const checkoutIds: string[] = [];

  for (let i = 0; i < 10; i++) {
    const lineItems = randomElement(sampleLineItems);
    const buyer = randomElement(sampleBuyers);
    const address = randomElement(sampleAddresses);
    const status = randomElement(checkoutStatuses);
    const totals = calculateTotals(lineItems);
    const createdAt = randomDate(30);

    const paymentInstruments =
      status === 'completed' || status === 'ready_for_complete'
        ? [
            {
              id: `pi_${randomUUID().slice(0, 8)}`,
              handler: 'payos',
              type: 'pix',
              last4: '1234',
              created_at: createdAt.toISOString(),
            },
          ]
        : [];

    const messages =
      status === 'requires_escalation'
        ? [
            {
              type: 'error',
              code: 'MISSING_PAYMENT_METHOD',
              severity: 'recoverable',
              path: '$.payment_instruments',
              content: 'Please add a payment method to continue',
              content_type: 'plain',
            },
          ]
        : status === 'incomplete'
          ? [
              {
                type: 'warning',
                code: 'INCOMPLETE_SHIPPING',
                severity: 'recoverable',
                path: '$.shipping_address',
                content: 'Shipping address required for physical goods',
                content_type: 'plain',
              },
            ]
          : [];

    const checkout = {
      id: randomUUID(),
      tenant_id: tenantId,
      status,
      currency: 'USD',
      line_items: lineItems,
      totals,
      buyer: status !== 'incomplete' ? buyer : null,
      shipping_address: status !== 'incomplete' ? address : null,
      billing_address: status !== 'incomplete' ? address : null,
      payment_config: { handlers: ['payos', 'stripe'], default_handler: 'payos' },
      payment_instruments: paymentInstruments,
      selected_instrument_id: paymentInstruments.length ? paymentInstruments[0].id : null,
      messages,
      continue_url: 'https://example.com/order-confirmation',
      cancel_url: 'https://example.com/cart',
      links: [
        { rel: 'terms', href: 'https://example.com/terms' },
        { rel: 'privacy', href: 'https://example.com/privacy' },
      ],
      metadata: { source: 'agent', agent_id: `agent_${i + 1}` },
      expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours from now
      created_at: createdAt.toISOString(),
      updated_at: createdAt.toISOString(),
    };

    const { data, error } = await supabase.from('ucp_checkout_sessions').insert(checkout).select('id').single();

    if (error) {
      console.error(`  ❌ Failed to create checkout: ${error.message}`);
    } else {
      console.log(`  ✓ Created checkout ${status}: ${data.id.slice(0, 8)}...`);
      checkoutIds.push(data.id);
    }
  }

  return checkoutIds;
}

async function seedOrders(tenantId: string, checkoutIds: string[]): Promise<void> {
  console.log('\n📦 Seeding UCP Orders...');

  // Get completed checkouts
  const { data: completedCheckouts } = await supabase
    .from('ucp_checkout_sessions')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed');

  if (!completedCheckouts?.length) {
    console.log('  ⚠️ No completed checkouts found for orders');
    return;
  }

  for (const checkout of completedCheckouts) {
    const status = randomElement(orderStatuses.filter((s) => s !== 'cancelled' && s !== 'refunded'));
    const createdAt = new Date(checkout.created_at);

    const events: any[] = [
      {
        id: `evt_${randomUUID().slice(0, 8)}`,
        type: 'confirmed',
        timestamp: createdAt.toISOString(),
        description: 'Order confirmed and payment received',
      },
    ];

    if (status === 'processing' || status === 'shipped' || status === 'delivered') {
      events.push({
        id: `evt_${randomUUID().slice(0, 8)}`,
        type: 'processing',
        timestamp: new Date(createdAt.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        description: 'Order is being prepared',
      });
    }

    if (status === 'shipped' || status === 'delivered') {
      events.push({
        id: `evt_${randomUUID().slice(0, 8)}`,
        type: 'shipped',
        timestamp: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        description: 'Package shipped via UPS',
        tracking_number: `1Z999AA${Math.floor(Math.random() * 10000000)}`,
        carrier: 'UPS',
        tracking_url: 'https://www.ups.com/track',
      });
    }

    if (status === 'delivered') {
      events.push({
        id: `evt_${randomUUID().slice(0, 8)}`,
        type: 'delivered',
        timestamp: new Date(createdAt.getTime() + 72 * 60 * 60 * 1000).toISOString(),
        description: 'Package delivered',
      });
    }

    const order = {
      id: randomUUID(),
      tenant_id: tenantId,
      checkout_id: checkout.id,
      status,
      currency: checkout.currency,
      line_items: checkout.line_items,
      totals: checkout.totals,
      buyer: checkout.buyer,
      shipping_address: checkout.shipping_address,
      billing_address: checkout.billing_address,
      payment: {
        handler_id: 'payos',
        instrument_id: checkout.payment_instruments?.[0]?.id || 'pi_default',
        status: 'completed',
        amount: checkout.totals.find((t: any) => t.type === 'total')?.amount || 0,
        currency: checkout.currency,
      },
      expectations: [
        {
          id: `exp_${randomUUID().slice(0, 8)}`,
          type: 'delivery',
          description: 'Standard shipping (3-5 business days)',
          estimated_date: new Date(createdAt.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
      ],
      events,
      adjustments: [],
      permalink_url: `https://example.com/orders/${checkout.id}`,
      metadata: checkout.metadata,
      created_at: createdAt.toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('ucp_orders').insert(order).select('id').single();

    if (error) {
      console.error(`  ❌ Failed to create order: ${error.message}`);
    } else {
      console.log(`  ✓ Created order ${status}: ${data.id.slice(0, 8)}...`);

      // Update checkout with order_id
      await supabase.from('ucp_checkout_sessions').update({ order_id: data.id }).eq('id', checkout.id);
    }
  }
}

async function seedAdditionalOrders(tenantId: string): Promise<void> {
  console.log('\n📦 Seeding additional UCP Orders (various statuses)...');

  // Create some orders with different statuses including refunded and cancelled
  const additionalStatuses = ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

  for (const status of additionalStatuses) {
    const lineItems = randomElement(sampleLineItems);
    const buyer = randomElement(sampleBuyers);
    const address = randomElement(sampleAddresses);
    const totals = calculateTotals(lineItems);
    const createdAt = randomDate(14);

    // First create a checkout
    const checkout = {
      id: randomUUID(),
      tenant_id: tenantId,
      status: 'completed',
      currency: 'USD',
      line_items: lineItems,
      totals,
      buyer,
      shipping_address: address,
      billing_address: address,
      payment_config: { handlers: ['payos'] },
      payment_instruments: [{ id: `pi_${randomUUID().slice(0, 8)}`, handler: 'payos', type: 'card' }],
      messages: [],
      expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      created_at: createdAt.toISOString(),
      updated_at: createdAt.toISOString(),
    };

    const { data: checkoutData, error: checkoutError } = await supabase
      .from('ucp_checkout_sessions')
      .insert(checkout)
      .select('id')
      .single();

    if (checkoutError) continue;

    const events: any[] = [
      {
        id: `evt_${randomUUID().slice(0, 8)}`,
        type: 'confirmed',
        timestamp: createdAt.toISOString(),
        description: 'Order confirmed',
      },
    ];

    const adjustments: any[] = [];

    if (status === 'refunded') {
      adjustments.push({
        id: `adj_${randomUUID().slice(0, 8)}`,
        type: 'refund',
        amount: totals.find((t) => t.type === 'total')?.amount || 0,
        currency: 'USD',
        reason: 'Customer requested refund',
        created_at: new Date(createdAt.getTime() + 48 * 60 * 60 * 1000).toISOString(),
      });
    }

    if (status === 'cancelled') {
      events.push({
        id: `evt_${randomUUID().slice(0, 8)}`,
        type: 'cancelled',
        timestamp: new Date(createdAt.getTime() + 1 * 60 * 60 * 1000).toISOString(),
        description: 'Order cancelled by customer',
      });
    }

    const order = {
      id: randomUUID(),
      tenant_id: tenantId,
      checkout_id: checkoutData.id,
      status,
      currency: 'USD',
      line_items: lineItems,
      totals,
      buyer,
      shipping_address: address,
      billing_address: address,
      payment: {
        handler_id: 'payos',
        status: status === 'refunded' ? 'refunded' : 'completed',
        amount: totals.find((t) => t.type === 'total')?.amount || 0,
        currency: 'USD',
      },
      expectations: [],
      events,
      adjustments,
      created_at: createdAt.toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('ucp_orders').insert(order).select('id').single();

    if (error) {
      console.error(`  ❌ Failed to create ${status} order: ${error.message}`);
    } else {
      console.log(`  ✓ Created order ${status}: ${data.id.slice(0, 8)}...`);
      await supabase.from('ucp_checkout_sessions').update({ order_id: data.id }).eq('id', checkoutData.id);
    }
  }
}

// ============================================
// Main
// ============================================

async function main() {
  console.log('🚀 UCP Sample Data Seeding Script\n');
  console.log('='.repeat(50));
  console.log('\nUsage: pnpm --filter @payos/api seed:ucp [--tenant-id <id>] [--force]');
  console.log('  --tenant-id <id>  Specify tenant ID (default: first tenant)');
  console.log('  --force           Clear existing data before seeding\n');

  const { tenantId: specifiedTenantId, force } = parseArgs();

  try {
    const tenantId = await getTenantId(specifiedTenantId);

    // Check if data already exists
    const { count: checkoutCount } = await supabase
      .from('ucp_checkout_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    if (checkoutCount && checkoutCount > 0) {
      if (force) {
        await clearExistingData(tenantId);
        // Proceed with seeding
        const checkoutIds = await seedCheckoutSessions(tenantId);
        await seedOrders(tenantId, checkoutIds);
        await seedAdditionalOrders(tenantId);
      } else {
        console.log(`\n⚠️  Found ${checkoutCount} existing UCP checkouts.`);
        console.log('   Skipping checkout seeding to avoid duplicates.');
        console.log('   Use --force to clear existing data and reseed.');
      }
    } else {
      const checkoutIds = await seedCheckoutSessions(tenantId);
      await seedOrders(tenantId, checkoutIds);
      await seedAdditionalOrders(tenantId);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ UCP sample data seeding complete!\n');
    console.log('📊 Summary:');

    const { count: finalCheckouts } = await supabase
      .from('ucp_checkout_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    const { count: finalOrders } = await supabase
      .from('ucp_orders')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    console.log(`   - UCP Checkout Sessions: ${finalCheckouts}`);
    console.log(`   - UCP Orders: ${finalOrders}`);
    console.log('\n🔗 Visit the dashboard to view:');
    console.log('   - /dashboard/agentic-payments/ucp/hosted-checkouts');
    console.log('   - /dashboard/agentic-payments/ucp/orders');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();
