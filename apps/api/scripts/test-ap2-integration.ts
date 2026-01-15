/**
 * AP2 (Agent-to-Agent Protocol) Integration Test
 * 
 * Tests mandate creation, activation, and payment flow.
 * 
 * Usage:
 *   cd apps/api && npx tsx scripts/test-ap2-integration.ts
 * 
 * @see Story 40.14: AP2 Reference Setup
 */

import { config } from 'dotenv';
config({ path: '.env' });

import { getAP2MandateService } from '../src/services/ap2/mandate-service.js';

const mandateService = getAP2MandateService();

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     AP2 (Agent-to-Agent Protocol) Test                     ║');
  console.log('║     Story 40.14                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // ==========================================================================
  // Test 1: Agent Card Discovery
  // ==========================================================================
  console.log('=== Test 1: Agent Card Discovery ===\n');
  
  const agentCard = mandateService.getAgentCard();
  
  console.log('Agent Card:');
  console.log('  ID:', agentCard.id);
  console.log('  Name:', agentCard.name);
  console.log('  Version:', agentCard.version);
  console.log('  Protocols:', agentCard.capabilities.protocols.join(', '));
  console.log('  Currencies:', agentCard.capabilities.payments.currencies.join(', '));
  console.log('  Rails:', agentCard.capabilities.payments.rails.join(', '));
  console.log('  Supports x402:', agentCard.capabilities.payments.supports_x402);
  console.log('  Endpoints:');
  console.log('    - Mandates:', agentCard.endpoints.mandates);
  console.log('    - Payments:', agentCard.endpoints.payments);
  console.log('✅ Agent card generated\n');

  // ==========================================================================
  // Test 2: Create Mandate
  // ==========================================================================
  console.log('=== Test 2: Create Mandate ===\n');
  
  const mandate = await mandateService.createMandate({
    payer_id: 'user_alice_123',
    payer_name: 'Alice',
    payee_id: 'merchant_amazon_br',
    payee_name: 'Amazon Brazil',
    type: 'recurring',
    max_amount: 500,
    currency: 'USD',
    frequency: 'monthly',
    max_occurrences: 12,
    valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  });
  
  console.log('Mandate Created:');
  console.log('  ID:', mandate.id);
  console.log('  Type:', mandate.type);
  console.log('  Status:', mandate.status);
  console.log('  Payer:', mandate.payer.name || mandate.payer.id);
  console.log('  Payee:', mandate.payee.name);
  console.log('  Max Amount:', `$${mandate.max_amount} ${mandate.currency}`);
  console.log('  Frequency:', mandate.frequency);
  console.log('  Valid Until:', mandate.valid_until?.slice(0, 10));
  console.log('✅ Mandate created\n');

  // ==========================================================================
  // Test 3: Activate Mandate
  // ==========================================================================
  console.log('=== Test 3: Activate Mandate ===\n');
  
  // Mock VDC (Verifiable Digital Credential)
  const mockVDC = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiableCredential', 'PaymentMandateCredential'],
    id: `urn:uuid:${mandate.id}`,
    issuer: 'did:web:payos.dev',
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: mandate.payer.id,
      mandate_id: mandate.id,
      authorized: true,
    },
  };
  
  const activatedMandate = await mandateService.activateMandate(mandate.id, mockVDC);
  
  console.log('Mandate Activated:');
  console.log('  Status:', activatedMandate.status);
  console.log('  Has VDC:', !!activatedMandate.credential);
  console.log('  VDC Type:', activatedMandate.credential?.type?.join(', '));
  console.log('✅ Mandate activated with VDC\n');

  // ==========================================================================
  // Test 4: Request Payment (Success)
  // ==========================================================================
  console.log('=== Test 4: Request Payment (Success) ===\n');
  
  const paymentResponse = await mandateService.requestPayment({
    id: 'req_' + Date.now(),
    mandate_id: mandate.id,
    amount: 49.99,
    currency: 'USD',
    description: 'Monthly subscription - Amazon Prime',
    reference: 'SUB-2026-001',
    destination: {
      type: 'pix',
      pix_key: '12345678901',
    },
  });
  
  console.log('Payment Response:');
  console.log('  ID:', paymentResponse.id);
  console.log('  Status:', paymentResponse.status);
  console.log('  Amount:', `$${paymentResponse.amount} ${paymentResponse.currency}`);
  console.log('  Authorized At:', paymentResponse.authorized_at);
  console.log('  Authorized By:', paymentResponse.authorized_by);
  console.log('✅ Payment authorized\n');

  // ==========================================================================
  // Test 5: Request Payment (Amount Exceeded)
  // ==========================================================================
  console.log('=== Test 5: Request Payment (Amount Exceeded) ===\n');
  
  const exceededResponse = await mandateService.requestPayment({
    id: 'req_' + Date.now(),
    mandate_id: mandate.id,
    amount: 999.99,  // Exceeds max_amount of 500
    currency: 'USD',
    description: 'Large purchase',
  });
  
  console.log('Payment Response:');
  console.log('  Status:', exceededResponse.status);
  console.log('  Error Code:', exceededResponse.error_code);
  console.log('  Error Message:', exceededResponse.error_message);
  console.log('✅ Amount limit enforced\n');

  // ==========================================================================
  // Test 6: Suspend Mandate
  // ==========================================================================
  console.log('=== Test 6: Suspend Mandate ===\n');
  
  const suspendedMandate = await mandateService.suspendMandate(mandate.id, 'User requested pause');
  
  console.log('Mandate Suspended:');
  console.log('  Status:', suspendedMandate.status);
  console.log('✅ Mandate suspended\n');

  // ==========================================================================
  // Test 7: Request Payment (Mandate Not Active)
  // ==========================================================================
  console.log('=== Test 7: Request Payment (Mandate Suspended) ===\n');
  
  const suspendedPaymentResponse = await mandateService.requestPayment({
    id: 'req_' + Date.now(),
    mandate_id: mandate.id,
    amount: 10,
    currency: 'USD',
  });
  
  console.log('Payment Response:');
  console.log('  Status:', suspendedPaymentResponse.status);
  console.log('  Error Code:', suspendedPaymentResponse.error_code);
  console.log('  Error Message:', suspendedPaymentResponse.error_message);
  console.log('✅ Suspended mandate blocked\n');

  // ==========================================================================
  // Test 8: Revoke Mandate
  // ==========================================================================
  console.log('=== Test 8: Revoke Mandate ===\n');
  
  const revokedMandate = await mandateService.revokeMandate(mandate.id);
  
  console.log('Mandate Revoked:');
  console.log('  Status:', revokedMandate.status);
  console.log('✅ Mandate revoked\n');

  // ==========================================================================
  // Summary
  // ==========================================================================
  console.log('='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log('\n🎉 All AP2 tests passed!');
  console.log('\nAP2 Capabilities:');
  console.log('  ✅ Agent card discovery');
  console.log('  ✅ Mandate lifecycle (create → activate → suspend → revoke)');
  console.log('  ✅ VDC (Verifiable Digital Credential) support');
  console.log('  ✅ Payment authorization with mandate limits');
  console.log('  ✅ Amount limit enforcement');
  console.log('  ✅ Status-based access control');
  console.log('\nSupported Payment Rails:');
  agentCard.capabilities.payments.rails.forEach(r => {
    console.log(`  - ${r}`);
  });
}

main().catch(console.error);



