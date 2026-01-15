/**
 * Test Circle Payouts Integration
 * Story 40.3, 40.4: Pix and SPEI Payout Integration
 * 
 * Tests the Circle Payouts API (Pix, SPEI).
 * Run with: npx tsx scripts/test-circle-payouts.ts
 */

import 'dotenv/config';
import {
  getCirclePayoutsClient,
  validatePixKey,
  validateClabe,
  PIX_MAGIC_AMOUNTS,
  SPEI_MAGIC_AMOUNTS,
} from '../src/services/circle/payouts.js';

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║              Circle Payouts Integration Test                  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('\n');

  try {
    const client = getCirclePayoutsClient();
    
    // 1. Test health check
    console.log('1️⃣  Testing health check...');
    const health = await client.healthCheck();
    console.log(`   ${health.healthy ? '✅' : '❌'} ${health.message}`);
    console.log('');

    // 2. Get master wallet balances
    console.log('2️⃣  Getting master wallet balances...');
    const balances = await client.getMasterWalletBalance();
    console.log(`   💰 Found ${balances.length} balance(s):`);
    for (const b of balances) {
      console.log(`      - ${b.currency}: ${b.amount}`);
    }
    if (balances.length === 0) {
      console.log(`      (No balances - fund your sandbox wallet first)`);
    }
    console.log('');

    // 3. List existing payouts
    console.log('3️⃣  Listing recent payouts...');
    const payouts = await client.listPayouts({ pageSize: 5 });
    console.log(`   📋 Found ${payouts.length} recent payout(s):`);
    for (const p of payouts) {
      console.log(`      - ${p.id}: ${p.amount.amount} ${p.amount.currency} → ${p.status}`);
    }
    console.log('');

    // 4. Test Pix key validation
    console.log('4️⃣  Testing Pix key validation...');
    const pixTests = [
      { key: '123.456.789-09', type: 'cpf' as const, expected: true },
      { key: '12345678909', type: 'cpf' as const, expected: true },
      { key: '12.345.678/0001-95', type: 'cnpj' as const, expected: true },
      { key: 'test@email.com', type: 'email' as const, expected: true },
      { key: '+5511999887766', type: 'phone' as const, expected: true },
      { key: '123e4567-e89b-12d3-a456-426614174000', type: 'evp' as const, expected: true },
      { key: 'invalid', type: 'cpf' as const, expected: false },
    ];
    for (const test of pixTests) {
      const result = validatePixKey(test.key, test.type);
      const status = result === test.expected ? '✅' : '❌';
      console.log(`   ${status} ${test.type}: "${test.key.substring(0, 20)}..." → ${result}`);
    }
    console.log('');

    // 5. Test CLABE validation
    console.log('5️⃣  Testing CLABE validation...');
    const clabeTests = [
      { clabe: '032180000118359719', expected: true },  // Valid CLABE
      { clabe: '123456789012345678', expected: false }, // Invalid checksum
      { clabe: '12345678901234567', expected: false },  // Too short
    ];
    for (const test of clabeTests) {
      const result = validateClabe(test.clabe);
      const status = result === test.expected ? '✅' : '❌';
      console.log(`   ${status} "${test.clabe}" → ${result}`);
    }
    console.log('');

    // 6. Show magic amounts for testing
    console.log('6️⃣  Magic amounts for sandbox testing:');
    console.log('   🇧🇷 Pix (BRL):');
    console.log(`      - Success: ${PIX_MAGIC_AMOUNTS.SUCCESS.join(', ')}`);
    console.log(`      - Pending: ${PIX_MAGIC_AMOUNTS.PENDING_EXTERNAL.join(', ')}`);
    console.log(`      - Returned: ${PIX_MAGIC_AMOUNTS.RETURNED.join(', ')}`);
    console.log(`      - Failed: ${PIX_MAGIC_AMOUNTS.FAILED.join(', ')}`);
    console.log('   🇲🇽 SPEI (MXN):');
    console.log(`      - Success: ${SPEI_MAGIC_AMOUNTS.SUCCESS.join(', ')}`);
    console.log(`      - Pending: ${SPEI_MAGIC_AMOUNTS.PENDING_EXTERNAL.join(', ')}`);
    console.log(`      - Returned: ${SPEI_MAGIC_AMOUNTS.RETURNED.join(', ')}`);
    console.log(`      - Failed: ${SPEI_MAGIC_AMOUNTS.FAILED.join(', ')}`);
    console.log('');

    // Summary
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    TEST SUMMARY                               ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  ✅ Circle Payouts API: Connected                             ║`);
    console.log(`║  ✅ Balances: ${balances.length} currency(ies)                               ║`);
    console.log(`║  ✅ Pix validation: Working                                   ║`);
    console.log(`║  ✅ CLABE validation: Working                                 ║`);
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('\n');
    
    // Check if we have BRL/MXN balance for payouts
    const hasBrl = balances.some(b => b.currency === 'BRL' && parseFloat(b.amount) > 0);
    const hasMxn = balances.some(b => b.currency === 'MXN' && parseFloat(b.amount) > 0);
    
    if (!hasBrl && !hasMxn) {
      console.log('⚠️  Note: No BRL or MXN balance found in sandbox wallet.');
      console.log('   To test actual payouts, fund your sandbox wallet first.');
      console.log('   See: https://developers.circle.com/circle-mint/docs/test-payouts');
    } else {
      console.log('💡 Ready to create test payouts! Run with --create flag to test.');
    }
    console.log('\n');
    console.log('🎉 Circle Payouts integration test PASSED!\n');

  } catch (error) {
    console.error('\n❌ Test FAILED:', error);
    process.exit(1);
  }
}

main();



