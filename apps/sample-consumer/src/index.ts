/**
 * Sample Weather Client (Consumer)
 * 
 * Demonstrates x402 Consumer SDK for calling paid APIs with automatic payment.
 * 
 * Usage:
 *   pnpm dev                    # Interactive mode
 *   pnpm dev --free             # Call free endpoint
 *   pnpm dev --premium          # Call premium endpoint (auto-pay)
 *   pnpm dev --quote <endpoint> # Get price quote
 *   pnpm dev --balance          # Check wallet balance
 */

import { X402Client, X402Payment, X402Error } from '@payos/x402-client-sdk';
import chalk from 'chalk';
import ora from 'ora';

// Configuration from environment
const config = {
  payosApiUrl: process.env.PAYOS_API_URL || 'http://localhost:3456',
  payosApiKey: process.env.PAYOS_API_KEY || '',
  payosWalletId: process.env.PAYOS_WALLET_ID || '',
  weatherApiUrl: process.env.WEATHER_API_URL || 'http://localhost:4000',
  debug: process.env.DEBUG === 'true'
};

// Validate configuration
if (!config.payosApiKey || !config.payosWalletId) {
  console.error(chalk.red('\n❌ Missing required environment variables:'));
  console.error(chalk.gray('   PAYOS_API_KEY - Your PayOS API key'));
  console.error(chalk.gray('   PAYOS_WALLET_ID - Your consumer wallet ID'));
  console.error(chalk.gray('\nExample:'));
  console.error(chalk.gray('   PAYOS_API_KEY=pk_xxx PAYOS_WALLET_ID=wal_xxx pnpm dev'));
  process.exit(1);
}

// Initialize x402 Client SDK
const client = new X402Client({
  apiUrl: config.payosApiUrl,
  walletId: config.payosWalletId,
  auth: config.payosApiKey,
  debug: config.debug
});

// ============================================
// Display Functions
// ============================================

function printHeader() {
  console.log('');
  console.log(chalk.cyan('╔══════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║                                                          ║'));
  console.log(chalk.cyan('║   🌤️  Weather Client ') + chalk.gray('(x402 Consumer SDK Demo)') + chalk.cyan('           ║'));
  console.log(chalk.cyan('║                                                          ║'));
  console.log(chalk.cyan('╚══════════════════════════════════════════════════════════╝'));
  console.log('');
  console.log(chalk.gray(`   Weather API: ${config.weatherApiUrl}`));
  console.log(chalk.gray(`   PayOS API:   ${config.payosApiUrl}`));
  console.log(chalk.gray(`   Wallet:      ${config.payosWalletId.slice(0, 12)}...`));
  console.log('');
}

function printWeather(data: any) {
  console.log('');
  console.log(chalk.bold(`   📍 ${data.location}`));
  console.log(chalk.gray('   ─────────────────────────────────────────'));
  console.log(`   🌡️  Temperature: ${chalk.yellow(data.temperature + '°F')}`);
  console.log(`   ☁️  Conditions:  ${data.conditions}`);
  
  if (data.tier === 'premium') {
    console.log(`   💧 Humidity:    ${data.humidity}%`);
    console.log(`   💨 Wind:        ${data.wind.speed} mph ${data.wind.direction}`);
    console.log(`   🌡️  Feels Like:  ${data.feelsLike}°F`);
    console.log(`   👁️  Visibility:  ${data.visibility} mi`);
    console.log(`   ☀️  UV Index:    ${data.uvIndex}`);
    
    if (data.forecast) {
      console.log('');
      console.log(chalk.bold('   📅 5-Day Forecast'));
      console.log(chalk.gray('   ─────────────────────────────────────────'));
      for (const day of data.forecast) {
        console.log(`   ${day.day.padEnd(10)} ${chalk.yellow(day.high + '°')}/${chalk.blue(day.low + '°')}  ${day.conditions}`);
      }
    }
  }
  
  console.log('');
  console.log(chalk.gray(`   Tier: ${data.tier}`));
  console.log(chalk.gray(`   Time: ${data.timestamp}`));
  
  if (data.x402?.paid) {
    console.log('');
    console.log(chalk.green('   ✅ Paid via x402'));
    if (data.x402.payment) {
      console.log(chalk.gray(`      Amount: ${data.x402.payment.amount} ${data.x402.payment.currency}`));
      console.log(chalk.gray(`      TX: ${data.x402.payment.transferId}`));
    }
  }
  
  console.log('');
}

function printPayment(payment: X402Payment) {
  console.log('');
  console.log(chalk.green('   💰 Payment Successful!'));
  console.log(chalk.gray('   ─────────────────────────────────────────'));
  console.log(`   Amount:      ${chalk.yellow(payment.amount + ' ' + payment.currency)}`);
  console.log(`   Transfer ID: ${chalk.gray(payment.transferId)}`);
  console.log(`   Request ID:  ${chalk.gray(payment.requestId)}`);
  console.log(`   New Balance: ${chalk.cyan('$' + payment.newWalletBalance.toFixed(4))}`);
  console.log('');
}

// ============================================
// API Functions
// ============================================

async function fetchFreeWeather(location: string = 'San Francisco') {
  const spinner = ora('Fetching free weather data...').start();
  
  try {
    const response = await fetch(`${config.weatherApiUrl}/api/weather/free?location=${encodeURIComponent(location)}`);
    const data = await response.json();
    
    spinner.succeed('Weather data received');
    printWeather(data);
    
  } catch (error: any) {
    spinner.fail('Failed to fetch weather');
    console.error(chalk.red(`   Error: ${error.message}`));
  }
}

async function fetchPremiumWeather(location: string = 'San Francisco') {
  const spinner = ora('Fetching premium weather data...').start();
  
  let paymentInfo: X402Payment | null = null;
  
  try {
    const response = await client.fetch(
      `${config.weatherApiUrl}/api/weather/premium?location=${encodeURIComponent(location)}`,
      {
        method: 'GET',
        autoRetry: true,
        maxRetries: 1,
        onPayment: (payment) => {
          paymentInfo = payment;
          spinner.text = 'Payment processed, fetching data...';
        },
        onError: (error) => {
          spinner.fail('Payment failed');
          console.error(chalk.red(`   Error: ${error.message}`));
        }
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      spinner.succeed('Premium weather data received');
      
      if (paymentInfo) {
        printPayment(paymentInfo);
      }
      
      printWeather(data);
    } else if (response.status === 402) {
      spinner.fail('Payment required but auto-pay disabled or failed');
      const body = await response.json();
      console.log(chalk.yellow('\n   Payment Details:'));
      console.log(chalk.gray(`   Amount: ${body.paymentDetails?.amount} ${body.paymentDetails?.currency}`));
      console.log(chalk.gray(`   Endpoint: ${body.paymentDetails?.endpointId}`));
    } else {
      spinner.fail(`Request failed: ${response.status}`);
    }
    
  } catch (error: any) {
    spinner.fail('Failed to fetch weather');
    console.error(chalk.red(`   Error: ${error.message}`));
  }
}

async function fetchHistoricalWeather(location: string = 'San Francisco', days: number = 30) {
  const spinner = ora(`Fetching ${days}-day historical data...`).start();
  
  let paymentInfo: X402Payment | null = null;
  
  try {
    const response = await client.fetch(
      `${config.weatherApiUrl}/api/weather/historical?location=${encodeURIComponent(location)}&days=${days}`,
      {
        method: 'GET',
        autoRetry: true,
        onPayment: (payment) => {
          paymentInfo = payment;
          spinner.text = 'Payment processed, fetching data...';
        }
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      spinner.succeed('Historical data received');
      
      if (paymentInfo) {
        printPayment(paymentInfo);
      }
      
      console.log('');
      console.log(chalk.bold(`   📊 Historical Weather for ${data.location}`));
      console.log(chalk.gray(`   Period: ${data.period}`));
      console.log(chalk.gray('   ─────────────────────────────────────────'));
      console.log(chalk.gray('   Date         High   Low   Precip  Humidity'));
      
      for (const day of data.data.slice(0, 10)) {
        console.log(`   ${day.date}   ${day.high}°    ${day.low}°    ${day.precipitation}"    ${day.humidity}%`);
      }
      
      if (data.data.length > 10) {
        console.log(chalk.gray(`   ... and ${data.data.length - 10} more days`));
      }
      console.log('');
    } else {
      spinner.fail(`Request failed: ${response.status}`);
    }
    
  } catch (error: any) {
    spinner.fail('Failed to fetch historical data');
    console.error(chalk.red(`   Error: ${error.message}`));
  }
}

async function getQuote(endpointId: string) {
  const spinner = ora('Getting price quote...').start();
  
  try {
    const quote = await client.getQuote(endpointId);
    spinner.succeed('Quote received');
    
    console.log('');
    console.log(chalk.bold('   💵 Price Quote'));
    console.log(chalk.gray('   ─────────────────────────────────────────'));
    console.log(`   Endpoint:   ${quote.name}`);
    console.log(`   Path:       ${quote.method} ${quote.path}`);
    console.log(`   Base Price: ${chalk.yellow(quote.basePrice + ' ' + quote.currency)}`);
    console.log(`   Your Price: ${chalk.green(quote.currentPrice + ' ' + quote.currency)}`);
    
    if (quote.volumeDiscounts?.length > 0) {
      console.log('');
      console.log(chalk.bold('   📉 Volume Discounts'));
      for (const discount of quote.volumeDiscounts) {
        const off = Math.round((1 - discount.priceMultiplier) * 100);
        console.log(`   ${discount.threshold}+ calls: ${off}% off`);
      }
    }
    
    console.log('');
    console.log(chalk.gray(`   Your total calls: ${quote.totalCalls}`));
    console.log('');
    
  } catch (error: any) {
    spinner.fail('Failed to get quote');
    console.error(chalk.red(`   Error: ${error.message}`));
  }
}

async function checkBalance() {
  const spinner = ora('Checking wallet balance...').start();
  
  try {
    const response = await fetch(`${config.payosApiUrl}/v1/wallets/${config.payosWalletId}`, {
      headers: {
        'Authorization': `Bearer ${config.payosApiKey}`
      }
    });
    
    if (response.ok) {
      const wallet = await response.json();
      spinner.succeed('Balance retrieved');
      
      console.log('');
      console.log(chalk.bold('   💳 Wallet Balance'));
      console.log(chalk.gray('   ─────────────────────────────────────────'));
      console.log(`   Wallet ID: ${wallet.id}`);
      console.log(`   Balance:   ${chalk.green('$' + parseFloat(wallet.balance).toFixed(4))} ${wallet.currency || 'USDC'}`);
      console.log(`   Status:    ${wallet.status}`);
      console.log('');
    } else {
      spinner.fail('Failed to get balance');
    }
    
  } catch (error: any) {
    spinner.fail('Failed to check balance');
    console.error(chalk.red(`   Error: ${error.message}`));
  }
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
      await fetchFreeWeather(args[1]);
      break;
      
    case '--premium':
    case '-p':
      await fetchPremiumWeather(args[1]);
      break;
      
    case '--historical':
    case '-h':
      await fetchHistoricalWeather(args[1], parseInt(args[2]) || 30);
      break;
      
    case '--quote':
    case '-q':
      if (!args[1]) {
        console.error(chalk.red('   Please provide an endpoint ID'));
        console.log(chalk.gray('   Usage: pnpm dev --quote <endpoint-id>'));
        break;
      }
      await getQuote(args[1]);
      break;
      
    case '--balance':
    case '-b':
      await checkBalance();
      break;
      
    case '--help':
      printHelp();
      break;
      
    case 'interactive':
    default:
      await runInteractive();
      break;
  }
}

function printHelp() {
  console.log(chalk.bold('   Commands:'));
  console.log(chalk.gray('   ─────────────────────────────────────────'));
  console.log('   --free, -f [location]       Fetch free weather data');
  console.log('   --premium, -p [location]    Fetch premium weather (auto-pay)');
  console.log('   --historical, -h [loc] [d]  Fetch historical data');
  console.log('   --quote, -q <endpoint-id>   Get price quote');
  console.log('   --balance, -b               Check wallet balance');
  console.log('   --help                      Show this help');
  console.log('');
  console.log(chalk.bold('   Examples:'));
  console.log(chalk.gray('   ─────────────────────────────────────────'));
  console.log('   pnpm dev --free "New York"');
  console.log('   pnpm dev --premium "Los Angeles"');
  console.log('   pnpm dev --historical "Chicago" 7');
  console.log('   pnpm dev --balance');
  console.log('');
}

async function runInteractive() {
  console.log(chalk.bold('   Interactive Mode'));
  console.log(chalk.gray('   ─────────────────────────────────────────'));
  console.log('   1. Free weather');
  console.log('   2. Premium weather (auto-pay)');
  console.log('   3. Historical weather (auto-pay)');
  console.log('   4. Check balance');
  console.log('');
  console.log(chalk.gray('   Running demo sequence...\n'));
  
  // Demo: Free endpoint
  console.log(chalk.cyan('   ▶ Testing FREE endpoint...'));
  await fetchFreeWeather('San Francisco');
  
  // Demo: Check balance
  console.log(chalk.cyan('   ▶ Checking wallet balance...'));
  await checkBalance();
  
  // Demo: Premium endpoint (will trigger payment)
  console.log(chalk.cyan('   ▶ Testing PREMIUM endpoint (will process payment)...'));
  await fetchPremiumWeather('San Francisco');
  
  // Demo: Check balance again
  console.log(chalk.cyan('   ▶ Checking balance after payment...'));
  await checkBalance();
  
  console.log(chalk.green('\n   ✅ Demo complete!\n'));
}

main().catch(console.error);

