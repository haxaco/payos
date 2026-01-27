/**
 * Sly Sample Consumer - Multi-Protocol Demo
 *
 * Demonstrates all three payment protocols:
 * - x402: Micropayments for APIs
 * - AP2: Subscription mandates
 * - ACP: E-commerce checkout
 *
 * User: haxaco@gmail.com
 */

import 'dotenv/config';
import { Sly, createWithPassword } from '@sly/sdk';
import chalk from 'chalk';
import { runX402Demo } from './x402-demo';
import { runAP2Demo } from './ap2-demo';
import { runACPDemo } from './acp-demo';

// Configuration from environment (supports both SLY_ and legacy PAYOS_ prefixes)
const API_KEY = process.env.SLY_API_KEY || process.env.PAYOS_API_KEY;
const USER_EMAIL = process.env.USER_EMAIL || 'haxaco@gmail.com';
const USER_PASSWORD = process.env.USER_PASSWORD || '';
const ENVIRONMENT = (process.env.SLY_ENVIRONMENT || process.env.PAYOS_ENVIRONMENT as any) || 'sandbox';
const API_URL = process.env.SLY_API_URL || process.env.PAYOS_API_URL || 'http://localhost:4000';
const USER_ACCOUNT_ID = process.env.USER_ACCOUNT_ID || 'acct_haxaco_test';
const PROVIDER_URL = process.env.PROVIDER_API_URL || 'http://localhost:4001';

// Initialize Sly SDK (will be set in main)
let sly: Sly;

function printHeader() {
  console.log(chalk.cyan(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   PayOS Sample Consumer - Multi-Protocol Demo                   ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║   User:        ${USER_EMAIL.padEnd(45)} ║
║   Environment: ${ENVIRONMENT.padEnd(45)} ║
║   API:         ${API_URL.padEnd(45)} ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║   Protocols:                                                     ║
║   • x402 - Micropayments for API access                          ║
║   • AP2  - Mandate-based subscriptions                           ║
║   • ACP  - E-commerce checkout flow                              ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`));
}

function printSummary(results: any[], duration: number) {
  const totalSpent = results.reduce((sum, r) => sum + (r.spent || 0), 0);
  const successCount = results.filter(r => r.success).length;
  
  console.log(chalk.cyan(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   📊 Demo Summary                                                ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║   Duration:        ${duration.toFixed(1)}s                                         ║
║   Protocols Run:   ${successCount}/3 successful                                    ║
║   Total Spent:     $${totalSpent.toFixed(2)}                                       ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║   Breakdown:                                                     ║
║   • x402: $${(results[0]?.spent || 0).toFixed(3)} (micropayments)                            ║
║   • AP2:  $${(results[1]?.spent || 0).toFixed(2)} (subscription)                            ║
║   • ACP:  $${(results[2]?.spent || 0).toFixed(2)} (checkout)                                ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║   🎯 View Results:                                                ║
║   http://localhost:3000/dashboard/transfers                      ║
║   http://localhost:3000/dashboard/agentic-payments              ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`));
}

async function runAllDemos() {
  printHeader();
  
  const startTime = Date.now();
  const results = [];
  
  try {
    // Run x402 demo (if provider is available)
    console.log(chalk.yellow('▶ Starting x402 demo...\n'));
    const x402Result = await runX402Demo(payos, PROVIDER_URL);
    results.push(x402Result);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Run AP2 demo
    console.log(chalk.yellow('▶ Starting AP2 demo...\n'));
    const ap2Result = await runAP2Demo(payos, USER_EMAIL, USER_ACCOUNT_ID);
    results.push(ap2Result);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Run ACP demo
    console.log(chalk.yellow('▶ Starting ACP demo...\n'));
    const acpResult = await runACPDemo(payos, USER_EMAIL, USER_ACCOUNT_ID);
    results.push(acpResult);
    
    const duration = (Date.now() - startTime) / 1000;
    printSummary(results, duration);
    
    console.log(chalk.green('✨ All demos complete! Check the dashboard to see transactions.\n'));
    
  } catch (error: any) {
    console.error(chalk.red('\n❌ Demo failed:'), error.message);
    console.error(chalk.gray('\nPossible issues:'));
    console.error(chalk.gray('  • API server not running (http://localhost:4000)'));
    console.error(chalk.gray('  • Invalid API key'));
    console.error(chalk.gray('  • User/account not set up\n'));
    process.exit(1);
  }
}

// CLI handling
const command = process.argv[2];

async function main() {
  // Initialize PayOS SDK
  try {
    if (API_KEY) {
      // Use API key if provided
      console.log(chalk.gray('Authenticating with API key...'));
      payos = new PayOS({
        apiKey: API_KEY,
        environment: ENVIRONMENT,
        apiUrl: API_URL,
      });
    } else if (USER_PASSWORD) {
      // Use username/password authentication
      console.log(chalk.gray(`Authenticating as ${USER_EMAIL}...`));
      payos = await createWithPassword(
        { email: USER_EMAIL, password: USER_PASSWORD },
        ENVIRONMENT,
        API_URL
      );
      console.log(chalk.green('✅ Authenticated successfully!\n'));
    } else {
      console.error(chalk.red('❌ Authentication required!'));
      console.error(chalk.yellow('\nPlease provide either:'));
      console.error(chalk.gray('  • PAYOS_API_KEY=your_api_key'));
      console.error(chalk.gray('  • USER_EMAIL=email & USER_PASSWORD=password\n'));
      process.exit(1);
    }
  } catch (error: any) {
    console.error(chalk.red('❌ Authentication failed:'), error.message);
    console.error(chalk.yellow('\nPlease check your credentials and try again.\n'));
    process.exit(1);
  }

  // Run demos
  switch (command) {
    case 'x402':
      await runX402Demo(payos, PROVIDER_URL);
      break;
    case 'ap2':
      await runAP2Demo(payos, USER_EMAIL, USER_ACCOUNT_ID);
      break;
    case 'acp':
      await runACPDemo(payos, USER_EMAIL, USER_ACCOUNT_ID);
      break;
    default:
      await runAllDemos();
  }
}

main().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});

