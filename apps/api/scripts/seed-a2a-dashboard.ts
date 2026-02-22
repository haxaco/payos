/**
 * Seed script for A2A Dashboard (Story 57.11)
 *
 * Creates diverse A2A tasks with matching transfers, sessions,
 * and messages to validate the dashboard UI.
 *
 * Usage: cd apps/api && source .env && npx tsx scripts/seed-a2a-dashboard.ts
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Haxaco Development tenant
const TENANT_ID = 'dad4308f-f9b6-4529-a406-7c2bdf3c6071';

// Accounts under this tenant (for transfer from/to)
const ACCOUNTS = {
  business: 'f0e7d0eb-68d3-479a-9853-516ed7b83927',   // Business Account
  payroll: '52ed3387-9a58-41b0-a902-87bfc683d46c',     // Payroll Account
  personal: 'acf063fe-d2da-4e47-a3fa-7ec796978e26',    // Personal Checking
};

// Agents under Haxaco Development tenant
const AGENTS = {
  shopping: { id: '15eec2cd-8e75-4e95-abb5-73df9c7bfcd6', name: 'AI Shopping Agent' },
  payout: { id: 'e00258e2-1a5e-4a33-8da2-53df488c9cfe', name: 'Smart Payout Agent' },
  procurement: { id: '466e58f0-2801-424c-93cd-5af1cc5c09e7', name: 'Procurement Bot' },
  travel: { id: '4cd237b7-b314-4a38-9964-bd91bf3134bb', name: 'Acme Corporate Travel Agent' },
  remittance: { id: 'b8abb7a4-cd6a-4ec7-b681-4a466235a1ee', name: 'Remittance Optimizer Agent' },
  billpay: { id: '5402de88-f150-44fd-8e4e-d90c9a9ae1d9', name: 'Smart Bill Pay Agent' },
};

function makeTransfer(opts: {
  amount: number;
  currency: string;
  description: string;
  status: string;
  agentId: string;
  agentName: string;
  createdAt: string;
}) {
  return {
    id: randomUUID(),
    tenant_id: TENANT_ID,
    type: 'cross_border',
    status: opts.status,
    from_account_id: ACCOUNTS.business,
    from_account_name: 'Business Account',
    to_account_id: ACCOUNTS.payroll,
    to_account_name: 'Payroll Account',
    initiated_by_type: 'agent',
    initiated_by_id: opts.agentId,
    initiated_by_name: opts.agentName,
    amount: opts.amount,
    currency: opts.currency,
    fee_amount: 0,
    fee_breakdown: [],
    description: opts.description,
    created_at: opts.createdAt,
  };
}

async function seed() {
  console.log('Cleaning up previous A2A seed data...');

  // Delete old seeded a2a data for this tenant (messages/artifacts cascade via task_id)
  const { data: oldTasks } = await supabase
    .from('a2a_tasks')
    .select('id')
    .eq('tenant_id', TENANT_ID);
  const oldIds = (oldTasks || []).map(t => t.id);
  if (oldIds.length > 0) {
    await supabase.from('a2a_artifacts').delete().in('task_id', oldIds);
    await supabase.from('a2a_messages').delete().in('task_id', oldIds);
    await supabase.from('a2a_tasks').delete().eq('tenant_id', TENANT_ID);
    console.log(`  Deleted ${oldIds.length} old tasks + messages + artifacts`);
  }

  console.log('\nSeeding A2A dashboard data...\n');

  const tenantId = TENANT_ID;
  const now = new Date();
  const h = (hours: number) => new Date(now.getTime() - hours * 3600_000).toISOString();

  // =========================================================================
  // Create transfers with amounts matching what agents discuss
  // =========================================================================
  const transfers = [
    makeTransfer({ amount: 6250, currency: 'USDC', description: 'PO-2026-0847: 500x SKU-7821 from Acme Supplier', status: 'completed', agentId: AGENTS.procurement.id, agentName: AGENTS.procurement.name, createdAt: h(46) }),
    makeTransfer({ amount: 6250, currency: 'USDC', description: 'Invoice INV-ACME-2026-1234 payment', status: 'completed', agentId: AGENTS.procurement.id, agentName: AGENTS.procurement.name, createdAt: h(42) }),
    makeTransfer({ amount: 6250, currency: 'USDC', description: 'Supplier receipt confirmation', status: 'completed', agentId: AGENTS.procurement.id, agentName: AGENTS.procurement.name, createdAt: h(38) }),
    makeTransfer({ amount: 5000, currency: 'USDC', description: 'FX quote lock: USDC→BRL', status: 'completed', agentId: AGENTS.remittance.id, agentName: AGENTS.remittance.name, createdAt: h(11) }),
    makeTransfer({ amount: 5000, currency: 'USDC', description: 'FX swap execution: 5,000 USDC → 25,600 BRL', status: 'processing', agentId: AGENTS.remittance.id, agentName: AGENTS.remittance.name, createdAt: h(1) }),
    makeTransfer({ amount: 142.50, currency: 'USDC', description: 'Utility bill payment: Electric Company Inc', status: 'completed', agentId: AGENTS.billpay.id, agentName: AGENTS.billpay.name, createdAt: h(6.5) }),
    makeTransfer({ amount: 18450, currency: 'USDC', description: 'February 2026 LATAM payroll batch (12 employees)', status: 'completed', agentId: AGENTS.payout.id, agentName: AGENTS.payout.name, createdAt: h(70) }),
    makeTransfer({ amount: 1200, currency: 'USDC', description: 'Cross-border Pix transfer to Brazil', status: 'completed', agentId: AGENTS.remittance.id, agentName: AGENTS.remittance.name, createdAt: h(34) }),
  ];

  console.log(`Inserting ${transfers.length} transfers...`);
  const { error: txError } = await supabase.from('transfers').insert(transfers);
  if (txError) {
    console.error('Failed to insert transfers:', txError.message);
    return;
  }
  console.log(`  ✓ ${transfers.length} transfers inserted`);

  // =========================================================================
  // Session 1: Multi-turn procurement negotiation (3 tasks, completed)
  // =========================================================================
  const session1 = `procurement-deal-${randomUUID().slice(0, 8)}`;
  const s1Tasks = [
    {
      id: randomUUID(), tenant_id: tenantId, agent_id: AGENTS.procurement.id,
      context_id: session1, state: 'completed', status_message: 'Quote accepted, PO issued',
      direction: 'outbound', remote_agent_url: 'https://supplier-ai.acme.com/a2a',
      transfer_id: transfers[0].id, created_at: h(48), updated_at: h(46),
    },
    {
      id: randomUUID(), tenant_id: tenantId, agent_id: AGENTS.procurement.id,
      context_id: session1, state: 'completed', status_message: 'Invoice validated and payment scheduled',
      direction: 'outbound', remote_agent_url: 'https://supplier-ai.acme.com/a2a',
      transfer_id: transfers[1].id, created_at: h(44), updated_at: h(42),
    },
    {
      id: randomUUID(), tenant_id: tenantId, agent_id: AGENTS.procurement.id,
      context_id: session1, state: 'completed', status_message: 'Payment confirmed, receipt issued',
      direction: 'inbound', remote_agent_url: 'https://supplier-ai.acme.com/a2a',
      transfer_id: transfers[2].id, created_at: h(40), updated_at: h(38),
    },
  ];

  // =========================================================================
  // Session 2: Remittance FX operation (2 tasks, one working)
  // =========================================================================
  const session2 = `fx-rebalance-${randomUUID().slice(0, 8)}`;
  const s2Tasks = [
    {
      id: randomUUID(), tenant_id: tenantId, agent_id: AGENTS.remittance.id,
      context_id: session2, state: 'completed', status_message: 'FX quote locked: 1 USDC = 5.12 BRL',
      direction: 'outbound', remote_agent_url: 'https://fx-bridge.latam-pay.io/a2a',
      transfer_id: transfers[3].id, created_at: h(12), updated_at: h(11),
    },
    {
      id: randomUUID(), tenant_id: tenantId, agent_id: AGENTS.remittance.id,
      context_id: session2, state: 'working', status_message: 'Executing swap: 5,000 USDC → 25,600 BRL',
      direction: 'outbound', remote_agent_url: 'https://fx-bridge.latam-pay.io/a2a',
      transfer_id: transfers[4].id, created_at: h(10), updated_at: h(1),
    },
  ];

  // =========================================================================
  // Session 3: Inbound travel booking (2 tasks, input-required, no cost)
  // =========================================================================
  const session3 = `travel-booking-${randomUUID().slice(0, 8)}`;
  const s3Tasks = [
    {
      id: randomUUID(), tenant_id: tenantId, agent_id: AGENTS.travel.id,
      context_id: session3, state: 'completed', status_message: 'Flight options retrieved',
      direction: 'inbound', created_at: h(6), updated_at: h(5),
    },
    {
      id: randomUUID(), tenant_id: tenantId, agent_id: AGENTS.travel.id,
      context_id: session3, state: 'input-required', status_message: 'Need passport details to confirm booking',
      direction: 'inbound', created_at: h(4), updated_at: h(0.5),
    },
  ];

  // =========================================================================
  // Session 4: Bill pay conversation (3 tasks, mixed directions)
  // =========================================================================
  const session4 = `billpay-session-${randomUUID().slice(0, 8)}`;
  const s4Tasks = [
    {
      id: randomUUID(), tenant_id: tenantId, agent_id: AGENTS.billpay.id,
      context_id: session4, state: 'completed', status_message: 'Utility bill detected: $142.50 due Feb 28',
      direction: 'inbound', created_at: h(8), updated_at: h(7),
    },
    {
      id: randomUUID(), tenant_id: tenantId, agent_id: AGENTS.billpay.id,
      context_id: session4, state: 'completed', status_message: 'Payment authorized and submitted',
      direction: 'outbound', remote_agent_url: 'https://utility-pay.example.com/a2a',
      transfer_id: transfers[5].id, created_at: h(7), updated_at: h(6.5),
    },
    {
      id: randomUUID(), tenant_id: tenantId, agent_id: AGENTS.billpay.id,
      context_id: session4, state: 'completed', status_message: 'Payment confirmation received',
      direction: 'inbound', created_at: h(6), updated_at: h(5.5),
    },
  ];

  // =========================================================================
  // Standalone tasks (no session — various states)
  // =========================================================================
  const standalone = [
    {
      id: randomUUID(), tenant_id: tenantId, agent_id: AGENTS.payout.id,
      state: 'completed', status_message: 'Payroll batch processed: 12 transfers',
      direction: 'outbound', remote_agent_url: 'https://payroll.acme-hr.com/a2a',
      transfer_id: transfers[6].id, created_at: h(72), updated_at: h(70),
    },
    {
      id: randomUUID(), tenant_id: tenantId, agent_id: AGENTS.procurement.id,
      state: 'failed', status_message: 'Remote agent timeout after 30s',
      direction: 'outbound', remote_agent_url: 'https://vendor-bot.example.com/a2a',
      created_at: h(24), updated_at: h(23),
    },
    {
      id: randomUUID(), tenant_id: tenantId, agent_id: AGENTS.shopping.id,
      state: 'canceled', status_message: 'Canceled by user — duplicate request',
      direction: 'inbound', created_at: h(18), updated_at: h(17),
    },
    {
      id: randomUUID(), tenant_id: tenantId, agent_id: AGENTS.payout.id,
      state: 'submitted', status_message: null,
      direction: 'inbound', created_at: h(0.1), updated_at: h(0.1),
    },
    {
      id: randomUUID(), tenant_id: tenantId, agent_id: AGENTS.procurement.id,
      state: 'working', status_message: 'Negotiating terms with supplier agent',
      direction: 'outbound', remote_agent_url: 'https://supplier-v2.globex.io/a2a',
      created_at: h(2), updated_at: h(0.3),
    },
    {
      id: randomUUID(), tenant_id: tenantId, agent_id: AGENTS.shopping.id,
      state: 'rejected', status_message: 'Payment rejected: insufficient KYA tier',
      direction: 'inbound', created_at: h(30), updated_at: h(29),
    },
    {
      id: randomUUID(), tenant_id: tenantId, agent_id: AGENTS.remittance.id,
      state: 'completed', status_message: 'Cross-border transfer settled: 1,200 USDC → 6,144 BRL',
      direction: 'outbound', remote_agent_url: 'https://pix-bridge.latam.io/a2a',
      transfer_id: transfers[7].id, created_at: h(36), updated_at: h(34),
    },
    {
      id: randomUUID(), tenant_id: tenantId, agent_id: AGENTS.travel.id,
      state: 'working', status_message: 'Searching partner agents for best hotel rates in São Paulo',
      direction: 'outbound', remote_agent_url: 'https://hotel-concierge.travel-ai.com/a2a',
      created_at: h(1), updated_at: h(0.2),
    },
  ];

  const allTasks = [...s1Tasks, ...s2Tasks, ...s3Tasks, ...s4Tasks, ...standalone];

  console.log(`Inserting ${allTasks.length} tasks...`);
  const { error: taskError } = await supabase.from('a2a_tasks').insert(allTasks);
  if (taskError) {
    console.error('Failed to insert tasks:', taskError.message);
    return;
  }
  console.log(`  ✓ ${allTasks.length} tasks inserted`);

  // =========================================================================
  // Messages
  // =========================================================================
  const messages: any[] = [];

  // Session 1
  messages.push(
    { tenant_id: tenantId, task_id: s1Tasks[0].id, role: 'user', parts: [{ text: 'Request quote for 500 units of SKU-7821 from Acme Supplier' }], metadata: {} },
    { tenant_id: tenantId, task_id: s1Tasks[0].id, role: 'agent', parts: [{ text: 'Quote received: $12.50/unit, MOQ 200, delivery 5 business days. Total: $6,250.00 USDC.' }, { data: { sku: 'SKU-7821', unitPrice: 12.50, quantity: 500, total: 6250, currency: 'USDC' } }], metadata: {} },
    { tenant_id: tenantId, task_id: s1Tasks[0].id, role: 'user', parts: [{ text: 'Accept quote and issue purchase order' }], metadata: {} },
    { tenant_id: tenantId, task_id: s1Tasks[0].id, role: 'agent', parts: [{ text: 'PO-2026-0847 issued. Supplier confirmed. Proceeding to invoice stage.' }], metadata: {} },
    { tenant_id: tenantId, task_id: s1Tasks[1].id, role: 'agent', parts: [{ text: 'Invoice INV-ACME-2026-1234 received for $6,250.00. 3-way match passed.' }, { data: { invoiceId: 'INV-ACME-2026-1234', amount: 6250 } }], metadata: {} },
    { tenant_id: tenantId, task_id: s1Tasks[1].id, role: 'user', parts: [{ text: 'Approve payment' }], metadata: {} },
    { tenant_id: tenantId, task_id: s1Tasks[1].id, role: 'agent', parts: [{ text: 'Payment of 6,250 USDC scheduled. ETA: 2 minutes.' }], metadata: {} },
    { tenant_id: tenantId, task_id: s1Tasks[2].id, role: 'agent', parts: [{ text: 'Payment of 6,250 USDC confirmed by supplier agent. Receipt attached.' }, { data: { receipt: 'REC-ACME-2026-5678', amount: 6250 } }], metadata: {} },
  );

  // Session 2
  messages.push(
    { tenant_id: tenantId, task_id: s2Tasks[0].id, role: 'user', parts: [{ text: 'Get best FX rate for USDC→BRL, amount: 5,000 USDC' }], metadata: {} },
    { tenant_id: tenantId, task_id: s2Tasks[0].id, role: 'agent', parts: [{ text: 'FX quote locked: 1 USDC = 5.12 BRL. You\'ll receive ~25,600 BRL. Quote valid 60s.' }, { data: { pair: 'USDC/BRL', rate: 5.12, amount: 5000, receive: 25600 } }], metadata: {} },
    { tenant_id: tenantId, task_id: s2Tasks[1].id, role: 'user', parts: [{ text: 'Execute the swap at locked rate' }], metadata: {} },
    { tenant_id: tenantId, task_id: s2Tasks[1].id, role: 'agent', parts: [{ text: 'Swap initiated. Converting 5,000 USDC → 25,600 BRL via Pix rail. Processing...' }], metadata: {} },
  );

  // Session 3
  messages.push(
    { tenant_id: tenantId, task_id: s3Tasks[0].id, role: 'user', parts: [{ text: 'Find flights Mexico City → São Paulo, Mar 15-20, 2 passengers' }], metadata: {} },
    { tenant_id: tenantId, task_id: s3Tasks[0].id, role: 'agent', parts: [{ text: '3 options found. Best: LATAM LA456, $420/person, direct.' }, { data: { flights: [{ airline: 'LATAM', flight: 'LA456', price: 420, stops: 0 }, { airline: 'Avianca', flight: 'AV789', price: 385, stops: 1 }] } }], metadata: {} },
    { tenant_id: tenantId, task_id: s3Tasks[1].id, role: 'user', parts: [{ text: 'Book LATAM LA456 for 2 passengers' }], metadata: {} },
    { tenant_id: tenantId, task_id: s3Tasks[1].id, role: 'agent', parts: [{ text: 'To confirm booking, I need passport details for both passengers.' }], metadata: {} },
  );

  // Session 4
  messages.push(
    { tenant_id: tenantId, task_id: s4Tasks[0].id, role: 'agent', parts: [{ text: 'Detected upcoming bill: Electric Company Inc, $142.50, due Feb 28. Pay now?' }], metadata: {} },
    { tenant_id: tenantId, task_id: s4Tasks[0].id, role: 'user', parts: [{ text: 'Yes, pay it now' }], metadata: {} },
    { tenant_id: tenantId, task_id: s4Tasks[1].id, role: 'agent', parts: [{ text: 'Payment of $142.50 USDC submitted to Electric Company Inc.' }, { data: { payee: 'Electric Company Inc', amount: 142.50, currency: 'USDC' } }], metadata: {} },
    { tenant_id: tenantId, task_id: s4Tasks[2].id, role: 'agent', parts: [{ text: 'Confirmation received. Payment posted. Next bill due March 28.' }, { data: { confirmationCode: 'ELEC-2026-88421' } }], metadata: {} },
  );

  // Standalone
  messages.push(
    { tenant_id: tenantId, task_id: standalone[0].id, role: 'user', parts: [{ text: 'Process February payroll for LATAM team (12 employees)' }], metadata: {} },
    { tenant_id: tenantId, task_id: standalone[0].id, role: 'agent', parts: [{ text: 'Payroll batch processed. 12 transfers totaling 18,450 USDC completed.' }, { data: { batchId: 'PAY-2026-02-001', employees: 12, total: 18450 } }], metadata: {} },
    { tenant_id: tenantId, task_id: standalone[1].id, role: 'user', parts: [{ text: 'Request inventory pricing from VendorBot' }], metadata: {} },
    { tenant_id: tenantId, task_id: standalone[1].id, role: 'agent', parts: [{ text: 'Error: Remote agent at vendor-bot.example.com did not respond within 30 seconds.' }], metadata: {} },
    { tenant_id: tenantId, task_id: standalone[2].id, role: 'user', parts: [{ text: 'Check balance for wallet W-0012' }], metadata: {} },
    { tenant_id: tenantId, task_id: standalone[3].id, role: 'user', parts: [{ text: 'Transfer 250 USDC to supplier account for emergency order' }], metadata: {} },
    { tenant_id: tenantId, task_id: standalone[4].id, role: 'user', parts: [{ text: 'Negotiate volume discount for Q2 order of 2,000 units' }], metadata: {} },
    { tenant_id: tenantId, task_id: standalone[4].id, role: 'agent', parts: [{ text: 'Connected to Globex supplier agent. Proposing 12% volume discount for 2,000 units.' }], metadata: {} },
    { tenant_id: tenantId, task_id: standalone[5].id, role: 'user', parts: [{ text: 'Process payment of 50,000 USDC to unverified account' }], metadata: {} },
    { tenant_id: tenantId, task_id: standalone[5].id, role: 'agent', parts: [{ text: 'Payment rejected. KYA tier 1 does not permit transfers above 10,000 USDC.' }], metadata: {} },
    { tenant_id: tenantId, task_id: standalone[6].id, role: 'user', parts: [{ text: 'Send 1,200 USDC to Brazil via Pix' }], metadata: {} },
    { tenant_id: tenantId, task_id: standalone[6].id, role: 'agent', parts: [{ text: 'Transfer completed. 1,200 USDC → 6,144 BRL at rate 5.12. Settled via Pix in 3.2s.' }, { data: { amount: 1200, received: 6144, rate: 5.12, rail: 'pix' } }], metadata: {} },
    { tenant_id: tenantId, task_id: standalone[7].id, role: 'user', parts: [{ text: 'Find hotels in São Paulo, March 15-20, budget $150/night' }], metadata: {} },
    { tenant_id: tenantId, task_id: standalone[7].id, role: 'agent', parts: [{ text: 'Querying 3 partner hotel agents in parallel...' }], metadata: {} },
  );

  console.log(`Inserting ${messages.length} messages...`);
  const { error: msgError } = await supabase.from('a2a_messages').insert(messages);
  if (msgError) {
    console.error('Failed to insert messages:', msgError.message);
    return;
  }
  console.log(`  ✓ ${messages.length} messages inserted`);

  // Artifacts
  const artifacts = [
    {
      tenant_id: tenantId, task_id: s1Tasks[2].id, label: 'Payment Receipt',
      mime_type: 'application/json',
      parts: [{ data: { receiptId: 'REC-ACME-2026-5678', amount: 6250, currency: 'USDC', supplier: 'Acme Supplier Co.' } }],
      metadata: {},
    },
    {
      tenant_id: tenantId, task_id: standalone[0].id, label: 'Payroll Summary',
      mime_type: 'text/plain',
      parts: [{ text: 'February 2026 LATAM Payroll\n\nEmployees: 12\nTotal: 18,450.00 USDC\nRails: Pix (BR), SPEI (MX)\nStatus: All completed' }],
      metadata: {},
    },
  ];

  console.log(`Inserting ${artifacts.length} artifacts...`);
  const { error: artError } = await supabase.from('a2a_artifacts').insert(artifacts);
  if (artError) {
    console.error('Failed to insert artifacts:', artError.message);
    return;
  }
  console.log(`  ✓ ${artifacts.length} artifacts inserted`);

  // Summary
  const linkedCount = allTasks.filter((t: any) => t.transfer_id).length;
  const totalCost = transfers.reduce((s, t) => s + t.amount, 0);
  console.log('\n========================================');
  console.log('A2A Dashboard Seed Complete!');
  console.log('========================================');
  console.log(`Sessions: 4 | Tasks: ${allTasks.length} | Messages: ${messages.length} | Artifacts: ${artifacts.length}`);
  console.log(`Transfers created: ${transfers.length} (linked to ${linkedCount} tasks)`);
  console.log(`Total cost across transfers: $${totalCost.toLocaleString()}`);
  console.log(`Directions: ${allTasks.filter((t: any) => t.direction === 'outbound').length} outbound, ${allTasks.filter((t: any) => t.direction === 'inbound').length} inbound`);
  console.log('\nView at: http://localhost:3000/dashboard/agentic-payments/a2a/tasks');
}

seed().catch(console.error);
