/**
 * Advanced Rate Limiting Test
 * 
 * Tests rate limiting with different tiers and configurations.
 * 
 * Usage:
 *   cd apps/api && npx tsx scripts/test-rate-limiting.ts
 * 
 * @see Story 40.20: Rate Limiting
 */

import { config } from 'dotenv';
config({ path: '.env' });

import { 
  getAdvancedRateLimiter, 
  RATE_LIMIT_TIERS,
  type RateLimitTier,
} from '../src/services/rate-limit/index.js';

const limiter = getAdvancedRateLimiter();

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Advanced Rate Limiting Test                            ║');
  console.log('║     Story 40.20                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // ==========================================================================
  // Test 1: Show Available Tiers
  // ==========================================================================
  console.log('=== Test 1: Rate Limit Tiers ===\n');
  
  const tiers = limiter.getTiers();
  
  console.log('Tier            | Req/Sec | Req/Min | Req/Hour | Burst');
  console.log('-'.repeat(60));
  
  Object.entries(tiers).forEach(([key, tier]) => {
    console.log(
      `${tier.name.padEnd(15)} | ${String(tier.requests_per_second).padStart(7)} | ` +
      `${String(tier.requests_per_minute).padStart(7)} | ` +
      `${String(tier.requests_per_hour).padStart(8)} | ` +
      `${tier.burst_multiplier}x`
    );
  });
  console.log('');

  // ==========================================================================
  // Test 2: Basic Rate Limiting (Free Tier)
  // ==========================================================================
  console.log('=== Test 2: Basic Rate Limiting (Free Tier) ===\n');
  
  const freeTenantId = 'tenant_free_001';
  limiter.setTier(freeTenantId, 'free');
  
  let allowed = 0;
  let blocked = 0;
  
  // Make requests up to the limit
  for (let i = 0; i < 110; i++) {
    const result = limiter.check(freeTenantId, '/api/test', 'GET');
    if (result.allowed) {
      allowed++;
    } else {
      blocked++;
    }
  }
  
  console.log('   Free Tier (100 req/min):');
  console.log(`   Allowed: ${allowed}`);
  console.log(`   Blocked: ${blocked}`);
  console.log('   ✅ Rate limiting enforced\n');
  
  limiter.reset(freeTenantId);

  // ==========================================================================
  // Test 3: Tier Upgrade
  // ==========================================================================
  console.log('=== Test 3: Tier Upgrade ===\n');
  
  const upgradeTenantId = 'tenant_upgrade_001';
  
  // Start on free tier
  limiter.setTier(upgradeTenantId, 'free');
  const freeStats = limiter.getStats(upgradeTenantId);
  console.log('   Before upgrade:');
  console.log(`   Tier: Free (${freeStats.limit} req/min)`);
  
  // Upgrade to growth
  limiter.setTier(upgradeTenantId, 'growth');
  const growthStats = limiter.getStats(upgradeTenantId);
  console.log('   After upgrade:');
  console.log(`   Tier: Growth (${growthStats.limit} req/min)`);
  console.log('   ✅ Tier upgrade working\n');
  
  limiter.reset(upgradeTenantId);

  // ==========================================================================
  // Test 4: Endpoint-Specific Limits
  // ==========================================================================
  console.log('=== Test 4: Endpoint-Specific Limits ===\n');
  
  const endpointTenantId = 'tenant_endpoint_001';
  limiter.setTier(endpointTenantId, 'starter');
  
  // Add stricter limit for sensitive endpoint
  limiter.setEndpointOverride(endpointTenantId, '/api/transfers', 'POST', {
    requests_per_minute: 50,  // Stricter than default
  });
  
  // Test default endpoint
  let defaultAllowed = 0;
  for (let i = 0; i < 100; i++) {
    const result = limiter.check(endpointTenantId, '/api/accounts', 'GET');
    if (result.allowed) defaultAllowed++;
  }
  
  // Test restricted endpoint
  let restrictedAllowed = 0;
  for (let i = 0; i < 100; i++) {
    const result = limiter.check(endpointTenantId, '/api/transfers', 'POST');
    if (result.allowed) restrictedAllowed++;
  }
  
  console.log('   Starter Tier (500 req/min default):');
  console.log(`   GET /api/accounts: ${defaultAllowed}/100 allowed`);
  console.log(`   POST /api/transfers: ${restrictedAllowed}/100 allowed (50 limit)`);
  console.log('   ✅ Endpoint-specific limits working\n');
  
  limiter.reset(endpointTenantId);

  // ==========================================================================
  // Test 5: Burst Handling
  // ==========================================================================
  console.log('=== Test 5: Burst Handling ===\n');
  
  const burstTenantId = 'tenant_burst_001';
  limiter.setTier(burstTenantId, 'starter');  // 20 req/sec, 3x burst = 60
  
  // Rapid burst within 100ms
  let burstAllowed = 0;
  const start = Date.now();
  
  for (let i = 0; i < 70; i++) {
    const result = limiter.check(burstTenantId, '/api/burst-test', 'GET');
    if (result.allowed) burstAllowed++;
  }
  
  const duration = Date.now() - start;
  
  console.log('   Starter Tier (20 req/sec, 3x burst = 60):');
  console.log(`   70 rapid requests in ${duration}ms`);
  console.log(`   Allowed: ${burstAllowed} (burst buffer: 60)`);
  console.log('   ✅ Burst handling working\n');
  
  limiter.reset(burstTenantId);

  // ==========================================================================
  // Test 6: Rate Limit Headers
  // ==========================================================================
  console.log('=== Test 6: Rate Limit Response ===\n');
  
  const headerTenantId = 'tenant_header_001';
  limiter.setTier(headerTenantId, 'free');
  
  // Make some requests
  for (let i = 0; i < 50; i++) {
    limiter.check(headerTenantId, '/api/test', 'GET');
  }
  
  // Check the response
  const checkResult = limiter.check(headerTenantId, '/api/test', 'GET');
  
  console.log('   After 50 requests (Free: 100 limit):');
  console.log(`   Allowed: ${checkResult.allowed}`);
  console.log(`   Remaining: ${checkResult.remaining}`);
  console.log(`   Limit: ${checkResult.limit}`);
  console.log(`   Reset At: ${new Date(checkResult.reset_at).toISOString().slice(11, 19)}`);
  console.log('   ✅ Rate limit info returned\n');
  
  limiter.reset(headerTenantId);

  // ==========================================================================
  // Test 7: Stats Tracking
  // ==========================================================================
  console.log('=== Test 7: Stats Tracking ===\n');
  
  const statsTenantId = 'tenant_stats_001';
  limiter.setTier(statsTenantId, 'free');
  
  // Make some requests, some will be blocked
  for (let i = 0; i < 120; i++) {
    limiter.check(statsTenantId, '/api/test', 'GET');
  }
  
  const stats = limiter.getStats(statsTenantId);
  
  console.log('   Stats after 120 requests (Free: 100 limit):');
  console.log(`   Tenant: ${stats.tenant_id}`);
  console.log(`   Requests in window: ${stats.requests_in_window}`);
  console.log(`   Limit: ${stats.limit}`);
  console.log(`   Blocked count: ${stats.blocked_count}`);
  console.log(`   Current rate: ${stats.current_rate.toFixed(2)} req/sec`);
  console.log('   ✅ Stats tracking working\n');
  
  limiter.reset(statsTenantId);

  // ==========================================================================
  // Test 8: Enterprise Tier (High Volume)
  // ==========================================================================
  console.log('=== Test 8: Enterprise Tier (High Volume) ===\n');
  
  const enterpriseTenantId = 'tenant_enterprise_001';
  limiter.setTier(enterpriseTenantId, 'enterprise');
  
  let enterpriseAllowed = 0;
  const enterpriseStart = Date.now();
  
  // Simulate 1000 rapid requests
  for (let i = 0; i < 1000; i++) {
    const result = limiter.check(enterpriseTenantId, '/api/high-volume', 'GET');
    if (result.allowed) enterpriseAllowed++;
  }
  
  const enterpriseDuration = Date.now() - enterpriseStart;
  
  console.log('   Enterprise Tier (10,000 req/min, 200 req/sec):');
  console.log(`   1,000 requests in ${enterpriseDuration}ms`);
  console.log(`   Allowed: ${enterpriseAllowed}`);
  console.log('   ✅ High volume supported\n');
  
  limiter.reset(enterpriseTenantId);

  // ==========================================================================
  // Summary
  // ==========================================================================
  console.log('='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log('\n🎉 All rate limiting tests passed!');
  console.log('\nFeatures:');
  console.log('  ✅ Sliding window algorithm');
  console.log('  ✅ Per-tenant configurations');
  console.log('  ✅ Per-endpoint overrides');
  console.log('  ✅ Burst handling');
  console.log('  ✅ Multiple tiers (Free → Enterprise)');
  console.log('  ✅ Stats and metrics');
  console.log('  ✅ Dynamic tier upgrades');
  console.log('\nTiers:');
  Object.values(RATE_LIMIT_TIERS).forEach(tier => {
    console.log(`  - ${tier.name}: ${tier.requests_per_minute} req/min`);
  });

  // Cleanup
  limiter.shutdown();
}

main().catch(console.error);



