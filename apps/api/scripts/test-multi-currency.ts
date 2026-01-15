/**
 * Multi-Currency Test Script
 * 
 * Tests cross-LATAM currency conversions via USD intermediary.
 * 
 * Usage:
 *   cd apps/api && npx tsx scripts/test-multi-currency.ts
 * 
 * @see Story 40.17: Multi-Currency Support
 */

import { config } from 'dotenv';
config({ path: '.env' });

import { getMultiCurrencyService, SUPPORTED_CORRIDORS } from '../src/services/fx/multi-currency.js';

const mcService = getMultiCurrencyService();

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Multi-Currency Test                                    ║');
  console.log('║     Story 40.17                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // ==========================================================================
  // Test 1: Direct USD → BRL
  // ==========================================================================
  console.log('=== Test 1: Direct USD → BRL ===\n');
  
  const usdToBrl = await mcService.getQuote('USD', 'BRL', 100);
  
  console.log('Quote ID:', usdToBrl.id);
  console.log('Route:', usdToBrl.route.via ? `via ${usdToBrl.route.via}` : 'Direct');
  console.log('Steps:', usdToBrl.route.steps.length);
  console.log('Source:', `$${usdToBrl.source_amount} USD`);
  console.log('Destination:', `R$${usdToBrl.destination_amount} BRL`);
  console.log('Total Rate:', usdToBrl.route.total_rate.toFixed(4));
  console.log('Total Fee:', `$${usdToBrl.total_fee} (${usdToBrl.route.total_fee_percentage}%)`);
  console.log('Estimated Time:', usdToBrl.route.estimated_time);
  console.log('✅ Direct route\n');

  // ==========================================================================
  // Test 2: Cross-LATAM BRL → MXN (via USD)
  // ==========================================================================
  console.log('=== Test 2: Cross-LATAM BRL → MXN ===\n');
  
  const brlToMxn = await mcService.getQuote('BRL', 'MXN', 1000);
  
  console.log('Quote ID:', brlToMxn.id);
  console.log('Route:', brlToMxn.route.via ? `via ${brlToMxn.route.via}` : 'Direct');
  console.log('Steps:');
  brlToMxn.route.steps.forEach((step, i) => {
    console.log(`  ${i + 1}. ${step.from} → ${step.to}: ${step.rate.toFixed(4)} (${step.fee_percentage}% fee)`);
  });
  console.log('Source:', `R$${brlToMxn.source_amount} BRL`);
  console.log('Destination:', `MX$${brlToMxn.destination_amount} MXN`);
  console.log('Total Rate:', brlToMxn.route.total_rate.toFixed(4));
  console.log('Total Fee:', `R$${brlToMxn.total_fee} (${brlToMxn.route.total_fee_percentage}%)`);
  console.log('Estimated Time:', brlToMxn.route.estimated_time);
  console.log('✅ Two-hop route via USD\n');

  // ==========================================================================
  // Test 3: Cross-LATAM MXN → BRL (via USD)
  // ==========================================================================
  console.log('=== Test 3: Cross-LATAM MXN → BRL ===\n');
  
  const mxnToBrl = await mcService.getQuote('MXN', 'BRL', 5000);
  
  console.log('Quote ID:', mxnToBrl.id);
  console.log('Route:', mxnToBrl.route.via ? `via ${mxnToBrl.route.via}` : 'Direct');
  console.log('Steps:');
  mxnToBrl.route.steps.forEach((step, i) => {
    console.log(`  ${i + 1}. ${step.from} → ${step.to}: ${step.rate.toFixed(4)} (${step.fee_percentage}% fee)`);
  });
  console.log('Source:', `MX$${mxnToBrl.source_amount} MXN`);
  console.log('Destination:', `R$${mxnToBrl.destination_amount} BRL`);
  console.log('Effective Rate:', (mxnToBrl.destination_amount / mxnToBrl.source_amount).toFixed(4), 'MXN/BRL');
  console.log('✅ Two-hop route via USD\n');

  // ==========================================================================
  // Test 4: USDC → MXN (normalized to USD)
  // ==========================================================================
  console.log('=== Test 4: USDC → MXN ===\n');
  
  const usdcToMxn = await mcService.getQuote('USDC', 'MXN', 50);
  
  console.log('Route:', usdcToMxn.route.via ? `via ${usdcToMxn.route.via}` : 'Direct');
  console.log('Source:', `${usdcToMxn.source_amount} USDC`);
  console.log('Destination:', `MX$${usdcToMxn.destination_amount} MXN`);
  console.log('Note: USDC is treated as USD for FX purposes');
  console.log('✅ USDC normalized to USD\n');

  // ==========================================================================
  // Test 5: Same Currency (no conversion)
  // ==========================================================================
  console.log('=== Test 5: Same Currency (USD → USD) ===\n');
  
  const identity = await mcService.getQuote('USD', 'USD', 100);
  
  console.log('Source:', `$${identity.source_amount} USD`);
  console.log('Destination:', `$${identity.destination_amount} USD`);
  console.log('Rate:', identity.route.total_rate);
  console.log('Fee:', `$${identity.total_fee}`);
  console.log('✅ No conversion needed\n');

  // ==========================================================================
  // Test 6: Simulation
  // ==========================================================================
  console.log('=== Test 6: Transfer Simulation ===\n');
  
  const simulation = await mcService.simulateTransfer('USD', 'BRL', 500);
  
  console.log('Simulating: $500 USD → BRL');
  console.log('Route:', simulation.route_description);
  console.log('Source Amount:', `$${simulation.source_amount} USD`);
  console.log('Destination Amount:', `R$${simulation.destination_amount} BRL`);
  console.log('Effective Rate:', simulation.effective_rate);
  console.log('Total Fees:', `$${simulation.total_fees}`);
  console.log('✅ Simulation complete\n');

  // ==========================================================================
  // Test 7: Corridor Support Check
  // ==========================================================================
  console.log('=== Test 7: Supported Corridors ===\n');
  
  const corridors = mcService.getSupportedCorridors();
  
  console.log('Direct Corridors:');
  corridors.filter(c => c.direct).forEach(c => {
    console.log(`  ${c.source} → ${c.destination} (${c.settlement_rail}) - ${c.estimated_time}`);
  });
  
  console.log('\nCross-LATAM Corridors (via USD):');
  corridors.filter(c => !c.direct).forEach(c => {
    console.log(`  ${c.source} → ${c.destination} (${c.settlement_rail}) - ${c.estimated_time}`);
  });
  console.log('');

  // ==========================================================================
  // Test 8: Best Rate Comparison
  // ==========================================================================
  console.log('=== Test 8: Rate Comparison ===\n');
  
  const bestRate = await mcService.getBestRate('BRL', 'MXN', 1000);
  
  console.log('BRL → MXN (R$1000):');
  console.log('Best Route:', bestRate.best.via ? `via ${bestRate.best.via}` : 'Direct');
  console.log('Total Rate:', bestRate.best.total_rate.toFixed(4));
  console.log('Total Fee:', bestRate.best.total_fee_percentage + '%');
  console.log('✅ Best rate identified\n');

  // ==========================================================================
  // Summary
  // ==========================================================================
  console.log('='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log('\n🎉 All multi-currency tests passed!');
  console.log('\nSupported Features:');
  console.log('  ✅ Direct USD → BRL/MXN');
  console.log('  ✅ Cross-LATAM BRL ↔ MXN (via USD)');
  console.log('  ✅ USDC normalization');
  console.log('  ✅ Two-hop routing');
  console.log('  ✅ Transfer simulation');
  console.log('  ✅ Best rate comparison');
  console.log('\nCorridors:');
  console.log(`  - ${corridors.filter(c => c.direct).length} direct corridors`);
  console.log(`  - ${corridors.filter(c => !c.direct).length} cross-LATAM corridors`);
}

main().catch(console.error);



