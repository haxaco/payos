/**
 * AP2 Subscription Demo
 * 
 * Demonstrates mandate-based recurring payments
 */

import { PayOS } from '@payos/sdk';
import chalk from 'chalk';

export async function runAP2Demo(payos: PayOS, userEmail: string, accountId: string) {
  console.log(chalk.cyan('\n╔══════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║  AP2 Subscription Demo                                           ║'));
  console.log(chalk.cyan('╚══════════════════════════════════════════════════════════════════╝\n'));
  
  try {
    // 1. Create mandate
    console.log(chalk.bold('1. Creating subscription mandate ($50 authorized)'));
    const mandate = await payos.ap2.createMandate({
      mandate_id: `ai_subscription_${Date.now()}`,
      mandate_type: 'payment',
      agent_id: 'ai_credits_agent',
      agent_name: 'AI Credits Service',
      account_id: accountId,
      authorized_amount: 50,
      currency: 'USD',
      metadata: {
        user_email: userEmail,
        plan: 'pro',
        description: 'AI Credits Monthly Subscription',
      },
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    
    console.log(chalk.gray(`   Mandate ID: ${mandate.id}`));
    console.log(chalk.gray(`   Authorized: $${mandate.authorized_amount}`));
    console.log(chalk.gray(`   Status: ${mandate.status}\n`));
    
    // 2. Week 1 usage
    console.log(chalk.bold('2. Week 1: Charging $8 (800 API calls)'));
    const week1 = await payos.ap2.executeMandate(mandate.id, {
      amount: 8,
      currency: 'USD',
      description: 'Week 1: 800 API calls',
      idempotency_key: `week1_${mandate.id}`,
    });
    
    console.log(chalk.gray(`   Transfer ID: ${week1.transfer_id}`));
    console.log(chalk.gray(`   Remaining: $${week1.mandate.remaining_amount}\n`));
    
    // 3. Week 2 usage
    console.log(chalk.bold('3. Week 2: Charging $12 (1200 API calls)'));
    const week2 = await payos.ap2.executeMandate(mandate.id, {
      amount: 12,
      currency: 'USD',
      description: 'Week 2: 1200 API calls',
      idempotency_key: `week2_${mandate.id}`,
    });
    
    console.log(chalk.gray(`   Transfer ID: ${week2.transfer_id}`));
    console.log(chalk.gray(`   Used: $${week2.mandate.used_amount} of $${mandate.authorized_amount}`));
    console.log(chalk.gray(`   Remaining: $${week2.mandate.remaining_amount}\n`));
    
    // 4. Cancel mandate
    console.log(chalk.bold('4. Cancelling subscription'));
    const cancelled = await payos.ap2.cancelMandate(mandate.id);
    console.log(chalk.gray(`   Status: ${cancelled.status}\n`));
    
    console.log(chalk.green('✅ AP2 demo complete!\n'));
    return { success: true, spent: 20 };
    
  } catch (error: any) {
    console.error(chalk.red(`❌ AP2 demo error: ${error.message}\n`));
    if (error.data) {
      console.error(chalk.gray(`   API Response:`));
      console.error(chalk.gray(`   ${JSON.stringify(error.data, null, 2)}\n`));
    }
    return { success: false, spent: 0 };
  }
}

