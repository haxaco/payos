/**
 * Sample AI Agent (Consumer)
 * 
 * Demonstrates x402 Consumer SDK for calling paid APIs with automatic payment.
 * 
 * Setup:
 *   1. Create an agent in PayOS dashboard
 *   2. Agent automatically gets: API key + wallet
 *   3. Create .env file with: PAYOS_API_KEY, PAYOS_AGENT_ID, PAYOS_WALLET_ID
 *   4. Run: pnpm dev
 * 
 * Usage:
 *   pnpm dev                    # Interactive demo
 *   pnpm dev --free             # Call free endpoint
 *   pnpm dev --forecast         # Call paid forecast (auto-pay)
 *   pnpm dev --historical       # Call paid historical (auto-pay)
 *   pnpm dev --status           # Check wallet/spending status
 */

import 'dotenv/config';
import { X402Client } from '@sly/x402-client-sdk';
import chalk from 'chalk';
import ora from 'ora';

// ============================================
// Configuration
// ============================================

const WEATHER_API_URL = process.env.PROVIDER_API_URL || 'http://localhost:4001';
const DEBUG = process.env.DEBUG === 'true';

// Validate required environment variables
if (!process.env.PAYOS_API_KEY || !process.env.PAYOS_AGENT_ID || !process.env.PAYOS_WALLET_ID) {
  console.error(`
${chalk.red('╔══════════════════════════════════════════════════════════════════╗')}
${chalk.red('║')}  ${chalk.red('❌ Missing required environment variables')}                       ${chalk.red('║')}
${chalk.red('╠══════════════════════════════════════════════════════════════════╣')}
${chalk.red('║')}                                                                  ${chalk.red('║')}
${chalk.red('║')}  Required:                                                       ${chalk.red('║')}
${chalk.red('║')}  • PAYOS_API_KEY  - From Settings → API Keys                     ${chalk.red('║')}
${chalk.red('║')}  • PAYOS_AGENT_ID - From creating an agent                       ${chalk.red('║')}
${chalk.red('║')}                                                                  ${chalk.red('║')}
${chalk.red('║')}  Setup steps:                                                    ${chalk.red('║')}
${chalk.red('║')}  1. Go to PayOS dashboard (http://localhost:3000)                ${chalk.red('║')}
${chalk.red('║')}  2. Get API key from Settings → API Keys                         ${chalk.red('║')}
${chalk.red('║')}  3. Create an agent and note its ID                              ${chalk.red('║')}
${chalk.red('║')}  4. Create a wallet and assign it to the agent                   ${chalk.red('║')}
${chalk.red('║')}  5. Fund the wallet                                              ${chalk.red('║')}
${chalk.red('║')}                                                                  ${chalk.red('║')}
${chalk.red('║')}  Then run:                                                       ${chalk.red('║')}
${chalk.red('║')}  ${chalk.yellow('PAYOS_API_KEY=pk_xxx PAYOS_AGENT_ID=agt_xxx pnpm dev')}            ${chalk.red('║')}
${chalk.red('║')}                                                                  ${chalk.red('║')}
${chalk.red('╚══════════════════════════════════════════════════════════════════╝')}
  `);
  process.exit(1);
}

// ============================================
// Initialize x402 Client
// ============================================

const x402 = new X402Client({
  apiKey: process.env.PAYOS_API_KEY,
  agentId: process.env.PAYOS_AGENT_ID,
  walletId: process.env.PAYOS_WALLET_ID,  // Explicit wallet ID (workaround)
  apiUrl: process.env.PAYOS_API_URL,
  
  // Safety limits (optional)
  maxAutoPayAmount: 0.10,   // Don't auto-pay more than $0.10 per request
  maxDailySpend: 10.0,      // Daily spending limit of $10
  
  // Callbacks (optional)
  onPayment: (payment) => {
    console.log(chalk.green(`\n   💰 Payment processed!`));
    console.log(chalk.gray(`      Amount: ${payment.amount} ${payment.currency}`));
    console.log(chalk.gray(`      Transfer: ${payment.transferId.slice(0, 8)}...`));
    console.log(chalk.gray(`      New Balance: $${payment.newWalletBalance.toFixed(4)}\n`));
  },
  
  onLimitReached: (limit) => {
    console.log(chalk.yellow(`\n   ⚠️  Spending limit reached!`));
    console.log(chalk.gray(`      Type: ${limit.type}`));
    console.log(chalk.gray(`      Limit: $${limit.limit}`));
    console.log(chalk.gray(`      Requested: $${limit.requested}\n`));
  },
  
  debug: DEBUG
});

// ============================================
// API Functions
// ============================================

async function fetchCurrentWeather(location: string = 'San Francisco') {
  const spinner = ora('Fetching current weather (free)...').start();
  
  try {
    // Free endpoint - no payment needed
    const response = await fetch(`${WEATHER_API_URL}/api/weather/current?location=${encodeURIComponent(location)}`);
    const data = await response.json();
    
    spinner.succeed('Weather data received');
    printWeather(data);
    
  } catch (error: any) {
    spinner.fail('Failed to fetch weather');
    console.error(chalk.red(`   Error: ${error.message}`));
  }
}

async function fetchWeatherForecast(location: string = 'San Francisco') {
  const spinner = ora('Fetching 5-day forecast (paid)...').start();
  
  try {
    // Paid endpoint - x402 client handles payment automatically
    const response = await x402.fetch(
      `${WEATHER_API_URL}/api/weather/forecast?location=${encodeURIComponent(location)}`
    );
    
    if (response.ok) {
      const data = await response.json();
      spinner.succeed('Forecast data received');
      printForecast(data);
    } else if (response.status === 402) {
      spinner.fail('Payment required but could not be processed');
      console.log(chalk.yellow('   Check your wallet balance and limits'));
    } else {
      spinner.fail(`Request failed: ${response.status}`);
    }
    
  } catch (error: any) {
    spinner.fail('Failed to fetch forecast');
    console.error(chalk.red(`   Error: ${error.message}`));
  }
}

async function fetchHistoricalWeather(location: string = 'San Francisco', days: number = 7) {
  const spinner = ora(`Fetching ${days}-day historical data (paid)...`).start();
  
  try {
    const response = await x402.fetch(
      `${WEATHER_API_URL}/api/weather/historical?location=${encodeURIComponent(location)}&days=${days}`
    );
    
    if (response.ok) {
      const data = await response.json();
      spinner.succeed('Historical data received');
      printHistorical(data);
    } else if (response.status === 402) {
      spinner.fail('Payment required but could not be processed');
    } else {
      spinner.fail(`Request failed: ${response.status}`);
    }
    
  } catch (error: any) {
    spinner.fail('Failed to fetch historical data');
    console.error(chalk.red(`   Error: ${error.message}`));
  }
}

async function checkStatus() {
  const spinner = ora('Checking wallet status...').start();
  
  try {
    const status = await x402.getStatus();
    spinner.succeed('Status retrieved');
    
    console.log(`
   ${chalk.bold('💳 Agent Status')}
   ${chalk.gray('─────────────────────────────────────────')}
   Balance:     ${chalk.green('$' + status.balance.toFixed(4))} ${status.currency}
   Today Spent: ${chalk.yellow('$' + status.todaySpend.toFixed(4))}
   Daily Limit: ${status.dailyLimit ? '$' + status.dailyLimit.toFixed(2) : 'None'}
   Remaining:   ${chalk.cyan('$' + status.remaining.toFixed(4))}
`);
    
  } catch (error: any) {
    spinner.fail('Failed to get status');
    console.error(chalk.red(`   Error: ${error.message}`));
  }
}

// ============================================
// Display Functions
// ============================================

function printWeather(data: any) {
  console.log(`
   ${chalk.bold(`📍 ${data.location}`)}
   ${chalk.gray('─────────────────────────────────────────')}
   🌡️  Temperature: ${chalk.yellow(data.temperature + '°' + data.temperatureUnit)}
   ☁️  Conditions:  ${data.conditions}
   ${chalk.gray(`Tier: ${data.tier} | ${data.timestamp}`)}
`);
}

function printForecast(data: any) {
  console.log(`
   ${chalk.bold(`📍 ${data.location} - 5 Day Forecast`)}
   ${chalk.gray('─────────────────────────────────────────')}
   Current: ${data.current.temperature}°${data.current.temperatureUnit} - ${data.current.conditions}
   
   ${chalk.bold('📅 Extended Forecast')}
   ${chalk.gray('─────────────────────────────────────────')}`);
  
  for (const day of data.forecast) {
    console.log(`   ${day.day.padEnd(8)} ${chalk.yellow(day.high + '°')}/${chalk.blue(day.low + '°')}  ${day.conditions.padEnd(14)} 💧${day.precipitation}%`);
  }
  
  console.log(`
   ${chalk.gray(`Tier: ${data.tier}`)}
   ${data.x402?.paid ? chalk.green('✅ Paid via x402') : ''}
`);
}

function printHistorical(data: any) {
  console.log(`
   ${chalk.bold(`📊 ${data.location} - ${data.period}`)}
   ${chalk.gray('─────────────────────────────────────────')}
   ${chalk.gray('Date         High   Low   Precip  Humidity')}`);
  
  // Show first 10 days
  for (const day of data.data.slice(0, 10)) {
    console.log(`   ${day.date}   ${day.high}°    ${day.low}°    ${day.precipitation.toFixed(2)}"   ${day.humidity}%`);
  }
  
  if (data.data.length > 10) {
    console.log(chalk.gray(`   ... and ${data.data.length - 10} more days`));
  }
  
  console.log(`
   ${chalk.gray(`Tier: ${data.tier}`)}
   ${data.x402?.paid ? chalk.green('✅ Paid via x402') : ''}
`);
}

function printHeader() {
  const agentId = process.env.PAYOS_AGENT_ID || 'not set';
  const agentDisplay = agentId.length > 20 ? agentId.slice(0, 17) + '...' : agentId;
  
  console.log(`
${chalk.cyan('╔══════════════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}                                                                  ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.bold('🤖 AI Agent')} ${chalk.gray('(x402 Consumer SDK Demo)')}                         ${chalk.cyan('║')}
${chalk.cyan('║')}                                                                  ${chalk.cyan('║')}
${chalk.cyan('╠══════════════════════════════════════════════════════════════════╣')}
${chalk.cyan('║')}                                                                  ${chalk.cyan('║')}
${chalk.cyan('║')}   Agent ID:    ${chalk.gray(agentDisplay.padEnd(45))} ${chalk.cyan('║')}
${chalk.cyan('║')}   Weather API: ${chalk.gray(WEATHER_API_URL.padEnd(45))} ${chalk.cyan('║')}
${chalk.cyan('║')}   Auto-pay:    ${chalk.green('Enabled')}                                          ${chalk.cyan('║')}
${chalk.cyan('║')}   Max/request: ${chalk.yellow('$0.10')}                                            ${chalk.cyan('║')}
${chalk.cyan('║')}   Daily limit: ${chalk.yellow('$10.00')}                                           ${chalk.cyan('║')}
${chalk.cyan('║')}                                                                  ${chalk.cyan('║')}
${chalk.cyan('╚══════════════════════════════════════════════════════════════════╝')}
`);
}

function printHelp() {
  console.log(`
   ${chalk.bold('Usage:')}
   ${chalk.gray('─────────────────────────────────────────')}
   pnpm dev               Interactive demo
   pnpm dev --free        Free weather (no payment)
   pnpm dev --forecast    5-day forecast (auto-pay $0.001)
   pnpm dev --historical  Historical data (auto-pay $0.01)
   pnpm dev --status      Check wallet balance
   pnpm dev --help        Show this help
   
   ${chalk.bold('Examples:')}
   ${chalk.gray('─────────────────────────────────────────')}
   pnpm dev --forecast "New York"
   pnpm dev --historical "London" 14
`);
}

// ============================================
// CLI Interface
// ============================================

async function main() {
  printHeader();
  
  const args = process.argv.slice(2);
  const command = args[0] || 'interactive';
  
  switch (command) {
    case '--free':
    case '-f':
      await fetchCurrentWeather(args[1]);
      break;
      
    case '--forecast':
    case '-p':
      await fetchWeatherForecast(args[1]);
      break;
      
    case '--historical':
    case '-h':
      await fetchHistoricalWeather(args[1], parseInt(args[2]) || 7);
      break;
      
    case '--status':
    case '-s':
      await checkStatus();
      break;
      
    case '--help':
      printHelp();
      break;
      
    case 'interactive':
    default:
      await runInteractiveDemo();
      break;
  }
}

async function runInteractiveDemo() {
  console.log(`
   ${chalk.bold('🎬 Running Interactive Demo')}
   ${chalk.gray('─────────────────────────────────────────')}
`);

  // Step 1: Check status
  console.log(chalk.cyan('   ▶ Step 1: Check agent status'));
  await checkStatus();
  
  // Step 2: Free endpoint
  console.log(chalk.cyan('   ▶ Step 2: Call FREE endpoint'));
  await fetchCurrentWeather('San Francisco');
  
  // Step 3: Paid endpoint (will trigger payment)
  console.log(chalk.cyan('   ▶ Step 3: Call PAID endpoint (auto-payment will occur)'));
  await fetchWeatherForecast('San Francisco');
  
  // Step 4: Check status again
  console.log(chalk.cyan('   ▶ Step 4: Check status after payment'));
  await checkStatus();
  
  console.log(`
${chalk.green('╔══════════════════════════════════════════════════════════════════╗')}
${chalk.green('║')}  ${chalk.green('✅ Demo complete!')}                                               ${chalk.green('║')}
${chalk.green('║')}                                                                  ${chalk.green('║')}
${chalk.green('║')}  The agent automatically:                                        ${chalk.green('║')}
${chalk.green('║')}  • Detected 402 Payment Required                                 ${chalk.green('║')}
${chalk.green('║')}  • Processed payment via PayOS                                   ${chalk.green('║')}
${chalk.green('║')}  • Retried request with payment proof                            ${chalk.green('║')}
${chalk.green('║')}  • Received premium data                                         ${chalk.green('║')}
${chalk.green('║')}                                                                  ${chalk.green('║')}
${chalk.green('║')}  Check the PayOS dashboard to see the transaction!               ${chalk.green('║')}
${chalk.green('╚══════════════════════════════════════════════════════════════════╝')}
`);
}

main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
