/**
 * ACP Checkout Demo
 * 
 * Demonstrates e-commerce checkout flow
 */

import { PayOS } from '@sly/sdk';
import chalk from 'chalk';

export async function runACPDemo(payos: PayOS, userEmail: string, accountId: string) {
  console.log(chalk.cyan('\n╔══════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║  ACP E-commerce Checkout Demo                                    ║'));
  console.log(chalk.cyan('╚══════════════════════════════════════════════════════════════════╝\n'));
  
  try {
    // 1. Create checkout
    console.log(chalk.bold('1. Creating checkout with 2 items'));
    const checkout = await payos.acp.createCheckout({
      checkout_id: `order_${Date.now()}`,
      agent_id: 'shopping_agent_001',
      agent_name: 'Shopping Assistant AI',
      customer_email: userEmail,
      account_id: accountId,
      merchant_name: 'API Credits Store',
      merchant_id: 'merchant_api_credits',
      items: [
        {
          name: 'API Credits - Starter Pack',
          description: '10,000 API credits',
          quantity: 2,
          unit_price: 45,
          total_price: 90, // quantity * unit_price
          currency: 'USDC',
        },
        {
          name: 'Premium Support',
          description: '24/7 support for 1 month',
          quantity: 1,
          unit_price: 20,
          total_price: 20, // quantity * unit_price
          currency: 'USDC',
        },
      ],
      currency: 'USDC',
      tax_amount: 5.50,
      discount_amount: 10,
      metadata: {
        user_email: userEmail,
        campaign: 'new_user',
      },
    });
    
    console.log(chalk.gray(`   Checkout ID: ${checkout.id}`));
    console.log(chalk.gray(`   Items:`));
    console.log(chalk.gray(`     • API Credits × 2: $90.00`));
    console.log(chalk.gray(`     • Premium Support × 1: $20.00`));
    console.log(chalk.gray(`   Subtotal: $${checkout.subtotal}`));
    console.log(chalk.gray(`   Tax: +$${checkout.tax_amount || 0}`));
    console.log(chalk.gray(`   Discount: -$${checkout.discount_amount || 0} (WELCOME10)`));
    console.log(chalk.gray(`   Total: $${checkout.total_amount}\n`));
    
    // 2. Complete checkout
    console.log(chalk.bold('2. Completing checkout'));
    const completed = await payos.acp.completeCheckout(checkout.id, {
      shared_payment_token: `spt_${Date.now()}`,
      payment_method: 'card',
    });
    
    console.log(chalk.gray(`   Transfer ID: ${completed.transfer_id}`));
    console.log(chalk.gray(`   Amount: $${completed.total_amount}`));
    console.log(chalk.gray(`   Status: ${completed.status}\n`));
    
    console.log(chalk.green('✅ ACP demo complete!\n'));
    return { success: true, spent: 105.50 };
    
  } catch (error: any) {
    console.error(chalk.red(`❌ ACP demo error: ${error.message}\n`));
    console.error(chalk.gray(`   Details: ${JSON.stringify(error.response?.data || error)}\n`));
    return { success: false, spent: 0 };
  }
}

