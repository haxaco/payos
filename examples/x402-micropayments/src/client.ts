/**
 * x402 Client Example - PayOS
 * 
 * Demonstrates how to consume x402-protected APIs with automatic payment handling
 * 
 * User tenant: haxaco@gmail.com
 * 
 * Features:
 * - Automatic 402 payment handling
 * - Spending limits (per-request + daily)
 * - Usage tracking
 * - Sandbox mode (no real payments)
 */

import { PayOS } from '@sly/sdk';

const USER_EMAIL = 'haxaco@gmail.com';
const USER_ACCOUNT_ID = 'acct_haxaco_test';
const PROVIDER_URL = 'http://localhost:3402';

// Initialize PayOS SDK
const payos = new PayOS({
  apiKey: process.env.PAYOS_API_KEY || 'payos_sandbox_test',
  environment: 'sandbox',
});

// Create x402 client with spending limits
const client = payos.x402.createClient({
  maxPaymentAmount: '0.50', // Max $0.50 per request
  dailyLimit: '10.00', // Max $10 per day
  onPayment: (payment) => {
    console.log(`💳 Payment made: $${payment.amount} for ${payment.description}`);
  },
  onLimitReached: (limit) => {
    console.log(`⚠️  Spending limit reached: ${limit.type} - $${limit.amount}`);
  },
});

async function demonstrateX402() {
  console.log('\n🚀 x402 Client - PayOS');
  console.log('=====================');
  console.log(`User: ${USER_EMAIL}`);
  console.log(`Account: ${USER_ACCOUNT_ID}`);
  console.log(`Provider: ${PROVIDER_URL}`);
  console.log(`Environment: sandbox\n`);

  // Wait for provider to start
  console.log('⏳ Waiting for provider to start...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    // 1. Free endpoint - Get pricing
    console.log('\n📋 Scenario 1: Get Pricing (Free)');
    console.log('----------------------------------');
    const pricing = await client.fetch(`${PROVIDER_URL}/api/pricing`);
    const pricingData = await pricing.json();
    console.log(`✅ Pricing retrieved (no charge)`);
    console.log(`   Endpoints: ${pricingData.endpoints.length}`);
    console.log(`   Provider revenue (30d): $${pricingData.total_revenue_30d}`);

    // 2. AI Generation - $0.10
    console.log('\n🤖 Scenario 2: AI Text Generation ($0.10)');
    console.log('------------------------------------------');
    const aiResponse = await client.fetch(`${PROVIDER_URL}/api/ai/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Explain quantum computing in simple terms',
        max_tokens: 150,
      }),
    });
    const aiData = await aiResponse.json();
    console.log(`✅ AI generation completed`);
    console.log(`   Cost: $${aiData.cost}`);
    console.log(`   Tokens: ${aiData.tokens_used}`);
    console.log(`   Response: ${aiData.generated_text.substring(0, 80)}...`);

    // 3. Analytics - $0.05
    console.log('\n📊 Scenario 3: Get Analytics Insights ($0.05)');
    console.log('----------------------------------------------');
    const analyticsResponse = await client.fetch(`${PROVIDER_URL}/api/analytics/insights`);
    const analyticsData = await analyticsResponse.json();
    console.log(`✅ Analytics retrieved`);
    console.log(`   Cost: $${analyticsData.cost}`);
    console.log(`   Total users: ${analyticsData.metrics.total_users}`);
    console.log(`   Active users: ${analyticsData.metrics.active_users}`);
    console.log(`   Growth rate: ${analyticsData.metrics.growth_rate}%`);

    // 4. Image Enhancement - $0.15
    console.log('\n🖼️  Scenario 4: Image Enhancement ($0.15)');
    console.log('------------------------------------------');
    const imageResponse = await client.fetch(`${PROVIDER_URL}/api/images/enhance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: 'https://example.com/image.jpg',
        enhancement_type: 'auto',
      }),
    });
    const imageData = await imageResponse.json();
    console.log(`✅ Image enhanced`);
    console.log(`   Cost: $${imageData.cost}`);
    console.log(`   Resolution: ${imageData.improvements.resolution}`);
    console.log(`   Enhanced URL: ${imageData.enhanced_url}`);

    // 5. Multiple requests
    console.log('\n🔄 Scenario 5: Multiple Requests');
    console.log('----------------------------------');
    let totalSpent = 0;
    
    for (let i = 1; i <= 3; i++) {
      const response = await client.fetch(`${PROVIDER_URL}/api/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Request ${i}: Generate a tagline for a tech startup`,
          max_tokens: 50,
        }),
      });
      const data = await response.json();
      totalSpent += data.cost;
      console.log(`   Request ${i}: $${data.cost} charged (total: $${totalSpent.toFixed(2)})`);
    }

    // 6. Get usage summary
    console.log('\n📈 Usage Summary');
    console.log('----------------');
    console.log(`   User: ${USER_EMAIL}`);
    console.log(`   Total spent: $${totalSpent.toFixed(2)}`);
    console.log(`   Requests made: 7 (3 free, 4 paid)`);
    console.log(`   Average cost: $${(totalSpent / 4).toFixed(3)} per paid request`);
    console.log(`   Daily limit remaining: $${(10.00 - totalSpent).toFixed(2)}`);

    console.log('\n✅ All x402 scenarios completed successfully!');
    console.log('=============================================\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 'PAYMENT_REQUIRED') {
      console.log('   This endpoint requires payment via x402');
    } else if (error.code === 'LIMIT_EXCEEDED') {
      console.log('   Spending limit exceeded');
    }
  }
}

// Check if provider is running
async function checkProvider() {
  try {
    const response = await fetch(`${PROVIDER_URL}/api/health`);
    if (response.ok) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

// Main execution
async function main() {
  const providerRunning = await checkProvider();
  
  if (!providerRunning) {
    console.log('\n⚠️  x402 Provider not running!');
    console.log('\n📝 Please start the provider first:');
    console.log('   cd examples/x402-micropayments');
    console.log('   pnpm dev:provider\n');
    console.log('   Then in another terminal:');
    console.log('   pnpm dev:client\n');
    process.exit(1);
  }

  await demonstrateX402();
  process.exit(0);
}

main().catch(console.error);

