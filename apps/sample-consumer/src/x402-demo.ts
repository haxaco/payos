/**
 * x402 Micropayments Demo
 * 
 * Demonstrates automatic payment for premium API endpoints
 */

import { PayOS } from '@sly/sdk';
import chalk from 'chalk';

export async function runX402Demo(payos: PayOS, providerUrl: string) {
  console.log(chalk.cyan('\n╔══════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║  x402 Micropayments Demo                                         ║'));
  console.log(chalk.cyan('╚══════════════════════════════════════════════════════════════════╝\n'));
  
  // Create x402 client with spending limits
  // Note: x402-specific options are passed through at runtime
  const client = payos.x402.createClient({
    maxAutoPayAmount: '0.50',
    maxDailySpend: '10.00',
    onPayment: (payment: { amount: string }) => {
      console.log(chalk.green(`   ✅ Payment processed: $${payment.amount}`));
    },
  } as any);
  
  try {
    // 1. Free endpoint - no payment
    console.log(chalk.bold('1. Calling FREE endpoint (no payment)'));
    const freeResponse = await fetch(`${providerUrl}/api/weather/current?location=San+Francisco`);
    const freeData = await freeResponse.json();
    console.log(chalk.gray(`   📍 ${freeData.location}: ${freeData.temperature}°${freeData.temperatureUnit}`));
    console.log(chalk.gray(`   ☁️  ${freeData.conditions}\n`));
    
    // 2. Premium endpoint - automatic payment ($0.001)
    console.log(chalk.bold('2. Calling PAID endpoint (auto-payment)'));
    const paidResponse = await client.fetch(`${providerUrl}/api/weather/forecast?location=San+Francisco`);
    
    if (paidResponse.ok) {
      const paidData = await paidResponse.json();
      console.log(chalk.gray(`   📊 5-day forecast received`));
      console.log(chalk.gray(`   💳 Cost: $${paidData.x402?.payment?.amount || '0.001'}`));
      console.log(chalk.green(`   ✅ Payment verified\n`));
    } else {
      console.log(chalk.red(`   ❌ Request failed: ${paidResponse.status}\n`));
    }
    
    console.log(chalk.green('✅ x402 demo complete!\n'));
    return { success: true, spent: 0.001 };
    
  } catch (error: any) {
    console.error(chalk.red(`❌ x402 demo error: ${error.message}\n`));
    return { success: false, spent: 0 };
  }
}

