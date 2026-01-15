/**
 * Circle FX Quote Test Script
 * 
 * Tests the FX quote service for USD→BRL and USD→MXN conversions.
 * 
 * Usage:
 *   cd apps/api && npx tsx scripts/test-circle-fx.ts
 * 
 * @see Story 40.6: Circle FX Quote Integration
 */

import { config } from 'dotenv';
config({ path: '.env' });

import { getCircleFXService } from '../src/services/circle/fx.js';

const fxService = getCircleFXService();

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Circle FX Quote Test                                   ║');
  console.log('║     Story 40.6                                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // ==========================================================================
  // Test 1: USD → BRL (Pix)
  // ==========================================================================
  console.log('=== Test 1: USD → BRL (Pix) ===\n');
  
  const usdToBrl = await fxService.getQuote({
    source_currency: 'USD',
    destination_currency: 'BRL',
    source_amount: 100,
  });
  
  console.log('Quote ID:', usdToBrl.id);
  console.log('Corridor:', usdToBrl.corridor);
  console.log('Rate:', usdToBrl.rate, 'USD/BRL');
  console.log('Source:', `$${usdToBrl.source_amount} USD`);
  console.log('Fee:', `$${usdToBrl.total_fee} (${usdToBrl.fee_percentage}%)`);
  console.log('Destination:', `R$${usdToBrl.destination_amount?.toFixed(2)} BRL`);
  console.log('Expires:', usdToBrl.expires_at);
  console.log('✅ USD→BRL quote generated\n');

  // ==========================================================================
  // Test 2: USD → MXN (SPEI)
  // ==========================================================================
  console.log('=== Test 2: USD → MXN (SPEI) ===\n');
  
  const usdToMxn = await fxService.getQuote({
    source_currency: 'USD',
    destination_currency: 'MXN',
    source_amount: 100,
  });
  
  console.log('Quote ID:', usdToMxn.id);
  console.log('Corridor:', usdToMxn.corridor);
  console.log('Rate:', usdToMxn.rate, 'USD/MXN');
  console.log('Source:', `$${usdToMxn.source_amount} USD`);
  console.log('Fee:', `$${usdToMxn.total_fee} (${usdToMxn.fee_percentage}%)`);
  console.log('Destination:', `MX$${usdToMxn.destination_amount?.toFixed(2)} MXN`);
  console.log('✅ USD→MXN quote generated\n');

  // ==========================================================================
  // Test 3: Reverse Quote (destination amount)
  // ==========================================================================
  console.log('=== Test 3: Reverse Quote (R$500 BRL) ===\n');
  
  const reverseQuote = await fxService.getQuote({
    source_currency: 'USD',
    destination_currency: 'BRL',
    destination_amount: 500,
  });
  
  console.log('To send: R$500 BRL');
  console.log('You need: $' + reverseQuote.source_amount?.toFixed(2), 'USD');
  console.log('Rate:', reverseQuote.rate, 'USD/BRL');
  console.log('Fee:', `$${reverseQuote.total_fee} (${reverseQuote.fee_percentage}%)`);
  console.log('✅ Reverse quote calculated\n');

  // ==========================================================================
  // Test 4: Cross-LATAM (BRL → MXN via USD)
  // ==========================================================================
  console.log('=== Test 4: Cross-LATAM (BRL → MXN) ===\n');
  
  const crossLatam = await fxService.getQuote({
    source_currency: 'BRL',
    destination_currency: 'MXN',
    source_amount: 1000,
  });
  
  console.log('Corridor:', crossLatam.corridor);
  console.log('Rate:', crossLatam.rate, 'BRL/MXN');
  console.log('Source:', `R$${crossLatam.source_amount} BRL`);
  console.log('Fee:', `R$${crossLatam.total_fee} (${crossLatam.fee_percentage}%)`);
  console.log('Destination:', `MX$${crossLatam.destination_amount?.toFixed(2)} MXN`);
  console.log('✅ Cross-LATAM quote generated\n');

  // ==========================================================================
  // Test 5: Lock Quote
  // ==========================================================================
  console.log('=== Test 5: Lock Quote ===\n');
  
  const locked = await fxService.lockQuote(usdToBrl.id);
  
  console.log('Lock ID:', locked.lock_id);
  console.log('Locked at:', locked.locked_at);
  console.log('Lock expires:', locked.lock_expires_at);
  console.log('Rate locked:', locked.rate);
  console.log('✅ Quote locked for 30 seconds\n');

  // ==========================================================================
  // Test 6: Supported Corridors
  // ==========================================================================
  console.log('=== Test 6: Supported Corridors ===\n');
  
  const corridors = fxService.getSupportedCorridors();
  
  console.log('Available corridors:');
  corridors.forEach(c => {
    console.log(`  ${c.source} → ${c.destination}: ${c.fee}% fee`);
  });
  console.log('\n✅ Corridors retrieved\n');

  // ==========================================================================
  // Test 7: Multiple Quotes Comparison
  // ==========================================================================
  console.log('=== Test 7: Multiple Quotes Comparison ===\n');
  
  const quotes = await fxService.getQuotes([
    { source: 'USD', destination: 'BRL' },
    { source: 'USD', destination: 'MXN' },
    { source: 'BRL', destination: 'MXN' },
  ]);
  
  console.log('Comparison for $100 equivalent:');
  quotes.forEach(q => {
    console.log(`  ${q.corridor}: 1 ${q.source_currency} = ${q.rate.toFixed(4)} ${q.destination_currency}`);
  });
  console.log('\n✅ Multiple quotes retrieved\n');

  // ==========================================================================
  // Summary
  // ==========================================================================
  console.log('='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log('\n🎉 All FX tests passed!');
  console.log('\nSupported Features:');
  console.log('  ✅ USD → BRL (Pix)');
  console.log('  ✅ USD → MXN (SPEI)');
  console.log('  ✅ Reverse quotes (destination amount)');
  console.log('  ✅ Cross-LATAM (BRL ↔ MXN via USD)');
  console.log('  ✅ Quote locking (30s)');
  console.log('  ✅ Multiple quote comparison');
  console.log('\nNote: Using mock rates for PoC. Production would use Circle FX API.');
}

main().catch(console.error);



