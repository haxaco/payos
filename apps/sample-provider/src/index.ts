/**
 * Sample Weather API Provider
 * 
 * Demonstrates x402 Provider SDK for monetizing API endpoints.
 * 
 * Setup:
 *   1. Get API key from PayOS dashboard
 *   2. Set environment variable: PAYOS_API_KEY=pk_xxx
 *   3. Run: pnpm dev
 * 
 * Test:
 *   curl http://localhost:4000/api/weather/current      # Free
 *   curl -v http://localhost:4000/api/weather/forecast  # Returns 402
 */

import express from 'express';
import { X402Provider } from '@payos/x402-provider-sdk';

const app = express();
app.use(express.json());

// ============================================
// Configuration
// ============================================

const PORT = parseInt(process.env.PORT || '4000');
const DEBUG = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development';

// Validate API key
if (!process.env.PAYOS_API_KEY) {
  console.error(`
╔══════════════════════════════════════════════════════════════════╗
║  ❌ Missing PAYOS_API_KEY environment variable                   ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  To get your API key:                                            ║
║  1. Go to PayOS dashboard (http://localhost:3000)                ║
║  2. Create a business account                                    ║
║  3. Generate an API key with endpoint permissions                ║
║                                                                  ║
║  Then run:                                                       ║
║  PAYOS_API_KEY=pk_xxx pnpm dev                                   ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
  `);
  process.exit(1);
}

// ============================================
// Initialize x402 Provider
// ============================================

const x402 = new X402Provider({
  apiKey: process.env.PAYOS_API_KEY,
  debug: DEBUG
});

// ============================================
// Mock Weather Data
// ============================================

function getCurrentWeather(location: string) {
  return {
    location,
    temperature: Math.round(60 + Math.random() * 20),
    temperatureUnit: 'F',
    conditions: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 4)],
    timestamp: new Date().toISOString(),
    tier: 'free'
  };
}

function getWeatherForecast(location: string) {
  return {
    location,
    current: getCurrentWeather(location),
    forecast: Array.from({ length: 5 }, (_, i) => ({
      day: i === 0 ? 'Today' : `Day ${i + 1}`,
      date: new Date(Date.now() + i * 86400000).toISOString().split('T')[0],
      high: Math.round(65 + Math.random() * 15),
      low: Math.round(45 + Math.random() * 15),
      conditions: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 4)],
      precipitation: Math.round(Math.random() * 100),
      humidity: Math.round(40 + Math.random() * 40)
    })),
    tier: 'premium'
  };
}

function getHistoricalWeather(location: string, days: number = 30) {
  return {
    location,
    period: `Last ${days} days`,
    data: Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
      high: Math.round(60 + Math.random() * 20),
      low: Math.round(40 + Math.random() * 20),
      precipitation: Math.round(Math.random() * 100) / 100,
      humidity: Math.round(40 + Math.random() * 40)
    })),
    tier: 'premium'
  };
}

// ============================================
// API Routes
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'Weather API',
    x402Enabled: true
  });
});

// List available endpoints
app.get('/api', (req, res) => {
  res.json({
    endpoints: [
      { path: '/api/weather/current', method: 'GET', price: 'Free', description: 'Current weather conditions' },
      { path: '/api/weather/forecast', method: 'GET', price: '$0.001', description: '5-day weather forecast' },
      { path: '/api/weather/historical', method: 'GET', price: '$0.01', description: '30-day historical data' }
    ]
  });
});

// Free endpoint - no payment required
app.get('/api/weather/current', (req, res) => {
  const location = (req.query.location as string) || 'San Francisco';
  res.json(getCurrentWeather(location));
});

// Premium endpoint - 5-day forecast ($0.001)
app.get('/api/weather/forecast', x402.protect(), (req: any, res) => {
  const location = (req.query.location as string) || 'San Francisco';
  
  res.json({
    ...getWeatherForecast(location),
    x402: {
      paid: true,
      payment: req.x402Payment
    }
  });
});

// Premium endpoint - Historical data ($0.01)
app.get('/api/weather/historical', x402.protect(), (req: any, res) => {
  const location = (req.query.location as string) || 'San Francisco';
  const days = parseInt(req.query.days as string) || 30;
  
  res.json({
    ...getHistoricalWeather(location, days),
    x402: {
      paid: true,
      payment: req.x402Payment
    }
  });
});

// ============================================
// Startup
// ============================================

async function registerEndpoints() {
  console.log('\n📝 Registering x402 endpoints with PayOS...\n');
  
  try {
    // Register 5-day forecast endpoint
    await x402.register('/api/weather/forecast', {
      name: 'Weather Forecast API',
      description: '5-day weather forecast with daily high/low and conditions',
      price: 0.001,
      currency: 'USDC'
    }, 'GET');
    console.log('   ✅ GET /api/weather/forecast - $0.001 USDC');
    
    // Register historical data endpoint
    await x402.register('/api/weather/historical', {
      name: 'Historical Weather API',
      description: 'Historical weather data (up to 30 days)',
      price: 0.01,
      currency: 'USDC',
      volumeDiscounts: [
        { threshold: 100, discount: 0.1 },   // 10% off after 100 calls
        { threshold: 1000, discount: 0.25 }  // 25% off after 1000 calls
      ]
    }, 'GET');
    console.log('   ✅ GET /api/weather/historical - $0.01 USDC (volume discounts available)');
    
    console.log('\n   All endpoints registered successfully!\n');
    
  } catch (error: any) {
    console.error('\n   ⚠️  Some endpoints may already be registered:', error.message);
    console.log('   Continuing with cached endpoints...\n');
  }
}

app.listen(PORT, async () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   🌤️  Weather API Provider                                       ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║   Server:  http://localhost:${PORT.toString().padEnd(6)}                            ║
║   Debug:   ${DEBUG ? 'enabled ' : 'disabled'}                                       ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║   Endpoints:                                                     ║
║   ──────────────────────────────────────────────────────────     ║
║   GET  /api/weather/current     Free     Current conditions      ║
║   GET  /api/weather/forecast    $0.001   5-day forecast          ║
║   GET  /api/weather/historical  $0.01    30-day history          ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║   Test Commands:                                                 ║
║   ──────────────────────────────────────────────────────────     ║
║   curl http://localhost:${PORT}/api/weather/current                 ║
║   curl -v http://localhost:${PORT}/api/weather/forecast             ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`);

  await registerEndpoints();
  
  console.log('   🚀 Ready to receive requests!\n');
});
