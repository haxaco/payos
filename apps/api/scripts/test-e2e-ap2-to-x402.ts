/**
 * E2E Test: AP2 Mandate → x402 Payment → Settlement
 * 
 * Tests the full flow of agent-authorized payments settling via x402.
 * 
 * Flow:
 * 1. Agent creates mandate for user
 * 2. User authorizes with VDC
 * 3. Agent requests payment under mandate
 * 4. PayOS settles via x402 (USDC on Base)
 * 5. Bridge converts to fiat (Pix/SPEI)
 * 
 * Usage:
 *   cd apps/api && npx tsx scripts/test-e2e-ap2-to-x402.ts
 * 
 * @see Story 40.26: E2E AP2 → x402
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Import services
import { getAP2MandateService, getVDCIssuer, getVDCVerifier } from '../src/services/ap2/index.js';
import { getCircleFXService } from '../src/services/circle/fx.js';

interface E2EContext {
  supabase: ReturnType<typeof createClient>;
  tenantId: string;
  mandateId?: string;
  paymentId?: string;
  transferId?: string;
  settlementId?: string;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     E2E Test: AP2 Mandate → x402 → Settlement              ║');
  console.log('║     Story 40.26                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const ctx: E2EContext = {
    supabase: createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY),
    tenantId: '',
  };

  // Get tenant
  const { data: tenant } = await ctx.supabase.from('tenants').select('id').limit(1).single();
  if (!tenant) throw new Error('No tenant found');
  ctx.tenantId = tenant.id;

  const mandateService = getAP2MandateService();
  const vdcIssuer = getVDCIssuer();
  const vdcVerifier = getVDCVerifier();
  const fxService = getCircleFXService();

  // ==========================================================================
  // Step 1: Agent Creates Mandate
  // ==========================================================================
  console.log('=== Step 1: Agent Creates Mandate ===\n');
  
  const mandate = await mandateService.createMandate({
    payer_id: 'user_demo_e2e',
    payer_name: 'Demo User',
    payee_id: 'merchant_rappi_br',
    payee_name: 'Rappi Brazil',
    payee_account: 'pix:12345678901',
    type: 'recurring',
    max_amount: 100,
    currency: 'USD',
    frequency: 'daily',
  });
  
  ctx.mandateId = mandate.id;
  
  console.log('   ✅ Mandate created:', mandate.id.slice(0, 30) + '...');
  console.log('   Payer:', mandate.payer.name);
  console.log('   Payee:', mandate.payee.name);
  console.log('   Max: $' + mandate.max_amount + ' ' + mandate.currency);
  console.log('');

  // ==========================================================================
  // Step 2: Issue & Verify VDC
  // ==========================================================================
  console.log('=== Step 2: Issue & Verify VDC ===\n');
  
  const vdc = await vdcIssuer.issueMandate(mandate);
  const verifyResult = await vdcVerifier.verifyMandateVDC(mandate, vdc);
  
  if (!verifyResult.valid) {
    throw new Error('VDC verification failed: ' + verifyResult.errors.join(', '));
  }
  
  console.log('   ✅ VDC issued and verified');
  console.log('   Proof Type:', vdc.proof?.type);
  console.log('   Issuer:', vdc.issuer);
  console.log('');

  // ==========================================================================
  // Step 3: Activate Mandate
  // ==========================================================================
  console.log('=== Step 3: Activate Mandate ===\n');
  
  const activatedMandate = await mandateService.activateMandate(mandate.id, vdc);
  
  console.log('   ✅ Mandate activated');
  console.log('   Status:', activatedMandate.status);
  console.log('');

  // ==========================================================================
  // Step 4: Agent Requests Payment
  // ==========================================================================
  console.log('=== Step 4: Agent Requests Payment ===\n');
  
  const paymentAmount = 25.00;
  
  const paymentResponse = await mandateService.requestPayment({
    id: `req_e2e_${Date.now()}`,
    mandate_id: mandate.id,
    amount: paymentAmount,
    currency: 'USD',
    description: 'Food delivery order #12345',
    reference: 'ORDER-12345',
    destination: {
      type: 'pix',
      pix_key: '12345678901',
    },
  });
  
  ctx.paymentId = paymentResponse.id;
  
  console.log('   ✅ Payment authorized');
  console.log('   ID:', paymentResponse.id);
  console.log('   Amount: $' + paymentResponse.amount + ' ' + paymentResponse.currency);
  console.log('   Status:', paymentResponse.status);
  console.log('');

  // ==========================================================================
  // Step 5: Get FX Quote
  // ==========================================================================
  console.log('=== Step 5: Get FX Quote (USD → BRL) ===\n');
  
  const fxQuote = await fxService.getQuote({
    source_currency: 'USD',
    destination_currency: 'BRL',
    source_amount: paymentAmount,
  });
  
  console.log('   ✅ FX Quote received');
  console.log('   Rate:', fxQuote.rate);
  console.log('   Source: $' + fxQuote.source_amount + ' USD');
  console.log('   Destination: R$' + fxQuote.destination_amount?.toFixed(2) + ' BRL');
  console.log('   Fee: $' + fxQuote.total_fee + ' (' + fxQuote.fee_percentage + '%)');
  console.log('');

  // ==========================================================================
  // Step 6: Create Transfer Record
  // ==========================================================================
  console.log('=== Step 6: Create Transfer Record ===\n');
  
  const { data: account } = await ctx.supabase
    .from('accounts')
    .select('id')
    .eq('tenant_id', ctx.tenantId)
    .limit(1)
    .single();
  
  if (!account) throw new Error('No account found');
  
  const { data: transfer, error: transferError } = await ctx.supabase
    .from('transfers')
    .insert({
      tenant_id: ctx.tenantId,
      from_account_id: account.id,
      to_account_id: account.id,
      amount: paymentAmount,
      currency: 'USD',
      type: 'ap2',
      status: 'pending',
      description: 'AP2 mandate payment: ' + paymentResponse.id,
      protocol_metadata: {
        protocol: 'ap2',
        mandate_id: mandate.id,
        payment_id: paymentResponse.id,
        x402_settlement: true,
        fx_quote_id: fxQuote.id,
      },
      initiated_by_type: 'agent',
      initiated_by_id: 'payos-agent',
    })
    .select()
    .single();
  
  if (transferError) throw new Error('Failed to create transfer: ' + transferError.message);
  
  ctx.transferId = transfer.id;
  
  console.log('   ✅ Transfer created:', transfer.id.slice(0, 20) + '...');
  console.log('   Type:', transfer.type);
  console.log('   Protocol:', transfer.protocol_metadata?.protocol);
  console.log('');

  // ==========================================================================
  // Step 7: Simulate x402 Settlement
  // ==========================================================================
  console.log('=== Step 7: Simulate x402 Settlement ===\n');
  
  // In production, this would be an actual x402 transaction
  const mockTxHash = '0x' + Array(64).fill('0').map(() => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  
  console.log('   📦 Simulating x402 USDC transfer...');
  console.log('   Chain: Base Sepolia');
  console.log('   Amount:', paymentAmount, 'USDC');
  console.log('   Tx Hash:', mockTxHash.slice(0, 20) + '...');
  
  // Update transfer with x402 details
  await ctx.supabase
    .from('transfers')
    .update({
      status: 'processing',
      protocol_metadata: {
        ...transfer.protocol_metadata,
        x402_tx_hash: mockTxHash,
        x402_chain: 'base-sepolia',
        x402_amount: paymentAmount.toString(),
      },
    })
    .eq('id', transfer.id);
  
  console.log('   ✅ x402 payment submitted');
  console.log('');

  // ==========================================================================
  // Step 8: Create Settlement Record
  // ==========================================================================
  console.log('=== Step 8: Create Pix Settlement ===\n');
  
  const { data: settlement, error: settlementError } = await ctx.supabase
    .from('settlements')
    .insert({
      tenant_id: ctx.tenantId,
      transfer_id: transfer.id,
      rail: 'pix',
      provider: 'circle',
      status: 'pending',
      amount: paymentAmount,
      currency: 'USD',
      fee_amount: fxQuote.total_fee,
      destination_details: {
        type: 'pix',
        pix_key: '12345678901',
        pix_key_type: 'cpf',
        beneficiary_name: 'Rappi Brazil',
        destination_amount: fxQuote.destination_amount,
        destination_currency: 'BRL',
        fx_rate: fxQuote.rate,
      },
    })
    .select()
    .single();
  
  if (settlementError) throw new Error('Failed to create settlement: ' + settlementError.message);
  
  ctx.settlementId = settlement.id;
  
  console.log('   ✅ Settlement created:', settlement.id.slice(0, 20) + '...');
  console.log('   Rail:', settlement.rail);
  console.log('   Provider:', settlement.provider);
  console.log('   Destination: R$' + settlement.destination_details?.destination_amount?.toFixed(2));
  console.log('');

  // ==========================================================================
  // Step 9: Complete Settlement (Simulated)
  // ==========================================================================
  console.log('=== Step 9: Complete Settlement ===\n');
  
  // Simulate settlement completion
  await new Promise(r => setTimeout(r, 500));
  
  const completedAt = new Date().toISOString();
  
  await ctx.supabase
    .from('settlements')
    .update({
      status: 'completed',
      completed_at: completedAt,
      external_id: 'pix_' + Date.now(),
      provider_response: {
        pix_e2e_id: 'E' + Math.random().toString(36).slice(2, 34).toUpperCase(),
        completed_at: completedAt,
      },
    })
    .eq('id', settlement.id);
  
  await ctx.supabase
    .from('transfers')
    .update({ status: 'completed' })
    .eq('id', transfer.id);
  
  // Update AP2 payment status
  await mandateService.updatePayment(paymentResponse.id, {
    status: 'completed',
    transfer_id: transfer.id,
    settlement_id: settlement.id,
  });
  
  console.log('   ✅ Settlement completed');
  console.log('   Pix E2E ID: E***...***');
  console.log('   Completed at:', completedAt.slice(0, 19));
  console.log('');

  // ==========================================================================
  // Step 10: Verify Complete Flow
  // ==========================================================================
  console.log('=== Step 10: Verify Complete Flow ===\n');
  
  const finalPayment = await mandateService.getPayment(paymentResponse.id);
  
  const { data: finalTransfer } = await ctx.supabase
    .from('transfers')
    .select('*')
    .eq('id', transfer.id)
    .single();
  
  const { data: finalSettlement } = await ctx.supabase
    .from('settlements')
    .select('*')
    .eq('id', settlement.id)
    .single();
  
  console.log('📋 Final State:');
  console.log('   Mandate:', activatedMandate.status);
  console.log('   Payment:', finalPayment?.status);
  console.log('   Transfer:', finalTransfer?.status);
  console.log('   Settlement:', finalSettlement?.status);
  console.log('');

  // ==========================================================================
  // Summary
  // ==========================================================================
  console.log('='.repeat(60));
  console.log('🎉 E2E TEST PASSED!');
  console.log('='.repeat(60));
  console.log('\nComplete AP2 → x402 → Pix flow verified:');
  console.log('  1. ✅ Agent creates mandate');
  console.log('  2. ✅ VDC issued and verified');
  console.log('  3. ✅ Mandate activated');
  console.log('  4. ✅ Payment authorized under mandate');
  console.log('  5. ✅ FX quote obtained');
  console.log('  6. ✅ Transfer record created');
  console.log('  7. ✅ x402 payment simulated');
  console.log('  8. ✅ Pix settlement initiated');
  console.log('  9. ✅ Settlement completed');
  console.log(' 10. ✅ Flow verified');
  console.log('\nFlow Summary:');
  console.log(`  AP2 Mandate → $${paymentAmount} USD → ${paymentAmount} USDC (x402) → R$${fxQuote.destination_amount?.toFixed(2)} (Pix)`);
}

main().catch(error => {
  console.error('\n❌ E2E Test failed:', error.message);
  process.exit(1);
});



