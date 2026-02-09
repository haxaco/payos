#!/usr/bin/env tsx

/**
 * Sly Platform — Interactive Agent Shopping Demo
 *
 * A recordable live demo (~1-2 min) showing an AI agent:
 *   1. Registering on the Sly platform
 *   2. Creating a spending mandate (AP2)
 *   3. Building a shopping cart
 *   4. Completing checkout (ACP)
 *
 * Each prompt has a default answer so you can press Enter for the happy path.
 *
 * Prerequisites:
 *   - API running: pnpm --filter @sly/api dev
 *   - DB seeded:   pnpm --filter @sly/api seed:db
 *   - Packages built: pnpm build
 *
 * Usage: pnpm --filter @sly/api demo:agent-checkout
 */

import 'dotenv/config';
import * as readline from 'readline';

// ============================================
// Configuration
// ============================================

const API_URL = process.env.API_URL || 'http://localhost:4000';
const API_KEY = process.env.SLY_API_KEY || 'pk_test_haxaco_dev_key_12345';

// ============================================
// ANSI helpers
// ============================================

const ESC = '\x1b';
const dim = (s: string) => `${ESC}[2m${s}${ESC}[0m`;
const bold = (s: string) => `${ESC}[1m${s}${ESC}[0m`;
const green = (s: string) => `${ESC}[32m${s}${ESC}[0m`;
const cyan = (s: string) => `${ESC}[36m${s}${ESC}[0m`;
const yellow = (s: string) => `${ESC}[33m${s}${ESC}[0m`;
const red = (s: string) => `${ESC}[31m${s}${ESC}[0m`;
const magenta = (s: string) => `${ESC}[35m${s}${ESC}[0m`;

// ============================================
// Helpers
// ============================================

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const dollar = (n: number) => `$${n.toFixed(2)}`;

let rl: readline.Interface;
const nonInteractive = process.argv.includes('--yes') || process.argv.includes('-y') || !process.stdin.isTTY;

function ask(prompt: string, defaultValue: string): Promise<string> {
  if (nonInteractive) {
    console.log(`${prompt} ${dim(`[${defaultValue}]`)}: `);
    return Promise.resolve(defaultValue);
  }
  return new Promise((resolve) => {
    try {
      rl.question(`${prompt} ${dim(`[${defaultValue}]`)}: `, (answer) => {
        resolve(answer.trim() || defaultValue);
      });
    } catch {
      resolve(defaultValue);
    }
    // If stdin closes before answer, resolve with default
    rl.once('close', () => resolve(defaultValue));
  });
}

function printBanner() {
  console.log();
  console.log(bold('  ═══════════════════════════════════════════════════════════════'));
  console.log(bold('    Sly Platform — Live Agent Demo'));
  console.log(dim('    Watch an AI agent register, shop, and pay autonomously'));
  console.log(bold('  ═══════════════════════════════════════════════════════════════'));
  console.log();
}

function printStep(n: number, title: string) {
  console.log();
  console.log(dim('  ────────────────────────────────────────────────────────────'));
  console.log(bold(`  STEP ${n}: ${title}`));
  console.log(dim('  ────────────────────────────────────────────────────────────'));
  console.log();
}

function printCode(lines: string[]) {
  for (const line of lines) {
    console.log(`  ${cyan(line)}`);
  }
  console.log();
}

function ok(msg: string) {
  console.log(`  ${green('✓')} ${msg}`);
}

function fail(msg: string) {
  console.log(`  ${red('✗')} ${msg}`);
}

// ============================================
// Lightweight API wrapper (uses fetch directly)
// ============================================

async function api(
  method: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<any> {
  const url = `${API_URL}/v1${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) {
    const errMsg = json.error || json.message || res.statusText;
    throw new Error(`API ${res.status}: ${errMsg}`);
  }
  return json;
}

// ============================================
// Main Demo
// ============================================

async function demo() {
  let demoFinished = false;

  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Handle Ctrl+C / stdin close gracefully
  process.on('SIGINT', () => {
    if (!demoFinished) {
      console.log(dim('\n\n  Demo interrupted. Goodbye!\n'));
    }
    process.exit(0);
  });

  printBanner();
  console.log(dim('  Setting up...'));

  // ─── Verify API is reachable ───
  try {
    await fetch(`${API_URL}/health`);
    ok(`API connected (${API_URL})`);
  } catch {
    fail(`Cannot reach API at ${API_URL}`);
    console.log(red('  Is the API running? → pnpm --filter @sly/api dev'));
    rl.close();
    process.exit(1);
  }

  // ─── Verify auth ───
  let tenantName: string;
  try {
    // Use a lightweight call to verify the key works and get tenant info
    const res = await api('GET', '/accounts?limit=1&type=business', API_KEY);
    tenantName = res.meta?.tenant?.name || res.meta?.tenantName || 'Authenticated';
    ok(`Authenticated as ${bold(tenantName)} (${dim(API_KEY.slice(0, 18) + '...')})`);
  } catch (e: any) {
    fail(`Authentication failed: ${e.message}`);
    console.log(red('  Check SLY_API_KEY or seed the database first.'));
    rl.close();
    process.exit(1);
  }

  // ─── Find a business account ───
  let accountId: string;
  let accountName: string;
  try {
    const res = await api('GET', '/accounts?limit=1&type=business', API_KEY);
    const accounts = res.data;
    if (!accounts || accounts.length === 0) {
      throw new Error('No business accounts found. Run: pnpm --filter @sly/api seed:db');
    }
    accountId = accounts[0].id;
    accountName = accounts[0].name;
    ok(`Found business account: ${bold(accountName)}`);
  } catch (e: any) {
    fail(`Cannot find business account: ${e.message}`);
    rl.close();
    process.exit(1);
  }

  await sleep(600);

  // ══════════════════════════════════════════════
  // STEP 1: Register the Shopping Agent
  // ══════════════════════════════════════════════

  printStep(1, 'Register the Shopping Agent');

  const agentPayload = {
    accountId,
    name: 'Shopping Agent',
    description: 'AI assistant that finds and purchases products within budget',
    permissions: {
      transactions: { initiate: true, approve: false, view: true },
      streams: { initiate: false, modify: false, pause: false, terminate: false, view: false },
      accounts: { view: true, create: false },
      treasury: { view: false, rebalance: false },
    },
  };

  printCode([
    `sly.agents.create({`,
    `  accountId: '${accountId.slice(0, 8)}...',`,
    `  name: '${agentPayload.name}',`,
    `  permissions: { transactions: { initiate: true, view: true }, ... }`,
    `})`,
  ]);

  await sleep(400);

  let agentId: string;
  let agentToken: string;
  try {
    const res = await api('POST', '/agents', API_KEY, agentPayload);
    // Agent create response nests: { data: { data: agentObj, credentials: {...} } }
    const agentData = res.data?.data || res.data;
    const credentials = res.data?.credentials || res.credentials;
    agentId = agentData.id;
    agentToken = credentials.token;

    ok('Agent registered!');
    console.log(`    ${dim('ID:')}    ${agentId}`);
    console.log(`    ${dim('Token:')} ${yellow(agentToken.slice(0, 16) + '...')}  ${dim('← save this, shown only once!')}`);

    // Verify agent at KYA Tier 1 so daily limits are non-zero
    await api('POST', `/agents/${agentId}/verify`, API_KEY, { tier: 1 });
    ok('KYA Tier 1 verified (daily limit active)');
  } catch (e: any) {
    fail(`Agent creation failed: ${e.message}`);
    rl.close();
    process.exit(1);
  }

  console.log();
  console.log(dim('  Now switching to agent authentication...'));
  await sleep(800);

  // ══════════════════════════════════════════════
  // STEP 2: Set a Budget (AP2 Mandate)
  // ══════════════════════════════════════════════

  printStep(2, 'Set a Budget');

  console.log(`${magenta('🤖 Agent:')} Hi! I'm your new AI shopping assistant.`);
  console.log(`          How much would you like to budget for today?`);
  console.log();

  const budgetStr = await ask('You', '500');
  const budget = parseFloat(budgetStr) || 500;

  console.log();
  console.log(`${magenta('🤖 Agent:')} Setting up a ${bold(dollar(budget))} spending mandate...`);
  console.log();

  const mandateExternalId = `mandate_demo_${Date.now()}`;

  printCode([
    `sly.ap2.create({`,
    `  accountId: '${accountId.slice(0, 8)}...',`,
    `  agentId: '${agentId.slice(0, 8)}...',`,
    `  type: 'intent',`,
    `  authorizedAmount: ${budget},`,
    `  currency: 'USD'`,
    `})`,
  ]);

  await sleep(400);

  let mandateId: string;
  let mandateDbId: string;
  try {
    const res = await api('POST', '/ap2/mandates', API_KEY, {
      account_id: accountId,
      agent_id: agentId,
      mandate_type: 'intent',
      mandate_id: mandateExternalId,
      authorized_amount: budget,
      currency: 'USD',
    });
    mandateDbId = res.data.id;
    mandateId = res.data.mandate_id;

    ok('Mandate created!');
    console.log(`    ${dim('ID:')}     ${mandateId}`);
    console.log(`    ${dim('Budget:')} ${bold(dollar(budget))} USD`);
    console.log(`    ${dim('Status:')} ${green('active')}`);
  } catch (e: any) {
    fail(`Mandate creation failed: ${e.message}`);
    rl.close();
    process.exit(1);
  }

  await sleep(600);

  // ══════════════════════════════════════════════
  // STEP 3: Build the Cart
  // ══════════════════════════════════════════════

  printStep(3, 'Build the Cart');

  console.log(`${magenta('🤖 Agent:')} Great! Let me find some items within your budget...`);
  console.log();

  await sleep(1000);

  // Pick items that fit within the budget (budget must cover items + ~8.75% tax)
  const maxSpend = budget / 1.0875; // pre-tax max so total stays under budget
  const catalog = [
    { name: 'Sony WH-1000XM5 Headphones', price: 349.0 },
    { name: 'MacBook Pro 14" M4',          price: 1999.0 },
    { name: 'Anker USB-C Hub',             price: 45.99 },
    { name: 'Logitech MX Master 3S',       price: 99.99 },
    { name: 'Samsung T7 SSD 1TB',          price: 89.99 },
    { name: 'Apple AirPods Pro 2',         price: 249.0 },
    { name: 'Kindle Paperwhite',           price: 149.99 },
    { name: 'Raspberry Pi 5 Kit',          price: 79.99 },
    { name: 'USB-C Charging Cable 3-Pack', price: 12.99 },
  ];

  // Greedy pick: add items while they fit
  const items: { name: string; price: number; qty: number }[] = [];
  let cartTotal = 0;
  for (const product of catalog) {
    if (cartTotal + product.price <= maxSpend) {
      items.push({ name: product.name, price: product.price, qty: 1 });
      cartTotal += product.price;
    }
  }
  // Fallback: if nothing fits, take the cheapest item anyway
  if (items.length === 0) {
    const cheapest = catalog.reduce((a, b) => (a.price < b.price ? a : b));
    items.push({ name: cheapest.name, price: cheapest.price, qty: 1 });
  }

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = parseFloat((subtotal * 0.0875).toFixed(2)); // ~8.75% tax
  const total = parseFloat((subtotal + tax).toFixed(2));
  const remaining = parseFloat((budget - total).toFixed(2));

  console.log(`${magenta('🤖 Agent:')} I found some items within your budget:`);
  console.log();

  // Cart table
  const boxW = 52;
  console.log(`  ┌${'─'.repeat(boxW)}┐`);
  for (const item of items) {
    const label = `  ${item.qty}× ${item.name}`;
    const priceStr = dollar(item.price * item.qty);
    const pad = boxW - label.length - priceStr.length;
    console.log(`  │${label}${' '.repeat(Math.max(pad, 1))}${priceStr}  │`);
  }
  console.log(`  │ ${'─'.repeat(boxW - 2)} │`);

  const rows = [
    ['Subtotal', dollar(subtotal)],
    ['Tax', dollar(tax)],
    [bold('Total'), bold(dollar(total))],
    [dim('Remaining budget'), dim(dollar(remaining))],
  ];
  for (const [label, value] of rows) {
    const rawLabel = label.replace(/\x1b\[[0-9;]*m/g, '');
    const rawValue = value.replace(/\x1b\[[0-9;]*m/g, '');
    const pad = boxW - rawLabel.length - rawValue.length - 4;
    console.log(`  │  ${label}${' '.repeat(Math.max(pad, 1))}${value}  │`);
  }
  console.log(`  └${'─'.repeat(boxW)}┘`);
  console.log();

  if (remaining < 0) {
    console.log(`${magenta('🤖 Agent:')} ${red('Oops — that exceeds your budget. Let me adjust...')}`);
    console.log(dim('  (In a real scenario the agent would pick cheaper items)'));
  }

  console.log(`${magenta('🤖 Agent:')} Want me to complete the purchase?`);
  console.log();

  const confirm = await ask('You', 'yes');
  if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
    demoFinished = true;
    console.log();
    console.log(`${magenta('🤖 Agent:')} No worries — cart saved for later!`);
    console.log(dim('  Demo ended early. No checkout created.'));
    rl.close();
    process.exit(0);
  }

  // ══════════════════════════════════════════════
  // STEP 4: Complete the Purchase (ACP)
  // ══════════════════════════════════════════════

  printStep(4, 'Complete the Purchase');

  console.log(`${magenta('🤖 Agent:')} Processing your order...`);
  console.log();

  const checkoutExternalId = `chk_demo_${Date.now()}`;

  // ACP Create Checkout
  const checkoutPayload = {
    checkout_id: checkoutExternalId,
    agent_id: agentId,
    agent_name: 'Shopping Agent',
    account_id: accountId,
    merchant_id: 'merchant_electronics_store',
    merchant_name: 'TechShop Online',
    items: items.map((i) => ({
      item_id: i.name.toLowerCase().replace(/\s+/g, '-'),
      name: i.name,
      quantity: i.qty,
      unit_price: i.price,
      total_price: i.price * i.qty,
      currency: 'USDC',
    })),
    tax_amount: tax,
    shipping_amount: 0,
    discount_amount: 0,
    currency: 'USDC',
    payment_method: 'card',
    checkout_data: {
      payment_handler: 'stripe',
      card_network: 'visa',
    },
  };

  printCode([
    `sly.acp.create({ checkout_id: '${checkoutExternalId.slice(0, 16)}...', ... })`,
  ]);

  await sleep(300);

  let checkoutDbId: string;
  try {
    const res = await api('POST', '/acp/checkouts', API_KEY, checkoutPayload);
    checkoutDbId = res.data.id;
    console.log(`  ${dim('→')} ${green('✓')} Checkout ${dim(checkoutDbId)}`);
  } catch (e: any) {
    fail(`Checkout creation failed: ${e.message}`);
    rl.close();
    process.exit(1);
  }

  await sleep(400);

  // Mark checkout completed (sandbox edit — bypasses Stripe for demo)
  printCode([
    `sly.acp.complete('${checkoutDbId!.slice(0, 8)}...')  → settling payment...`,
  ]);

  await sleep(300);

  try {
    await api('PATCH', `/acp/checkouts/${checkoutDbId!}`, API_KEY, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      payment_method: 'card',
      checkout_data: {
        payment_handler: 'stripe',
        card_network: 'visa',
      },
    });
    console.log(`  ${dim('→')} ${green('✓')} Payment completed`);
  } catch (e: any) {
    fail(`Payment completion failed: ${e.message}`);
    rl.close();
    process.exit(1);
  }

  // Execute mandate payment (record spending against the budget)
  await sleep(200);
  try {
    await api('POST', `/ap2/mandates/${mandateDbId!}/execute`, API_KEY, {
      amount: total,
      currency: 'USD',
      description: `Checkout ${checkoutExternalId}`,
    });
    console.log(`  ${dim('→')} ${green('✓')} Mandate updated (${dollar(total)} used)`);
  } catch (e: any) {
    console.log(`  ${dim('→')} ${yellow('⚠')} Mandate update skipped: ${e.message}`);
  }

  console.log();
  ok('Order complete!');
  console.log(`    ${dim('Order ID:')}         ${checkoutExternalId}`);
  console.log(`    ${dim('Total charged:')}    ${bold(dollar(total))}`);
  console.log(`    ${dim('Remaining budget:')} ${dollar(remaining)}`);
  console.log();
  const itemNames = items.map((i) => bold(i.name));
  const itemList = itemNames.length === 1
    ? itemNames[0]
    : itemNames.slice(0, -1).join(', ') + ' and ' + itemNames[itemNames.length - 1];
  console.log(`${magenta('🤖 Agent:')} All done! Your ${itemList}`);
  console.log(`          ${items.length === 1 ? 'is' : 'are'} on the way. You have ${bold(dollar(remaining))} left to spend.`);

  // ══════════════════════════════════════════════
  // Summary
  // ══════════════════════════════════════════════

  demoFinished = true;

  console.log();
  console.log(bold('  ═══════════════════════════════════════════════════════════════'));
  console.log(bold('    Demo Complete'));
  console.log(bold('  ═══════════════════════════════════════════════════════════════'));
  console.log();
  console.log('  What happened:');
  console.log(`    1. AI agent registered with scoped permissions`);
  console.log(`    2. Spending mandate set (${dollar(budget)} budget)`);
  console.log(`    3. Agent built a cart within budget`);
  console.log(`    4. Checkout created and payment completed`);
  console.log();
  console.log('  View in dashboard:');
  console.log(`    Agents:    ${cyan('http://localhost:3000/dashboard/agents')}`);
  console.log(`    Checkouts: ${cyan('http://localhost:3000/dashboard/agentic-payments')}`);
  console.log();

  rl.close();
}

// ============================================
// Entry
// ============================================

demo().catch((err) => {
  console.error(red(`\n  Fatal error: ${err.message}\n`));
  process.exit(1);
});
