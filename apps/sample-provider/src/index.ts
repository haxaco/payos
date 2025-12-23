/**
 * Sample Weather API Provider
 * 
 * Demonstrates x402 Provider SDK for monetizing API endpoints.
 * 
 * Run: pnpm dev
 * Test: curl http://localhost:4000/api/weather/premium
 */

import express from 'express';
import { X402Provider, X402Endpoint } from '@payos/x402-provider-sdk';

const app = express();
app.use(express.json());

// Configuration from environment
const config = {
  port: parseInt(process.env.PORT || '4000'),
  payosApiUrl: process.env.PAYOS_API_URL || 'http://localhost:3456',
  payosApiKey: process.env.PAYOS_API_KEY || '',
  payosAccountId: process.env.PAYOS_ACCOUNT_ID || '',
  debug: process.env.DEBUG === 'true'
};

// Validate configuration
if (!config.payosApiKey || !config.payosAccountId) {
  console.error('❌ Missing required environment variables:');
  console.error('   PAYOS_API_KEY - Your PayOS API key');
  console.error('   PAYOS_ACCOUNT_ID - Your provider account ID');
  console.error('\nExample:');
  console.error('   PAYOS_API_KEY=pk_xxx PAYOS_ACCOUNT_ID=acc_xxx pnpm dev');
  process.exit(1);
}

// Initialize x402 Provider SDK
const x402 = new X402Provider({
  apiUrl: config.payosApiUrl,
  auth: config.payosApiKey,
  accountId: config.payosAccountId,
  debug: config.debug
});

// Store registered endpoints
let registeredEndpoints: Map<string, X402Endpoint> = new Map();

// ============================================
// Mock Weather Data
// ============================================

function getWeatherData(location: string, premium: boolean = false) {
  const base = {
    location,
    temperature: Math.round(60 + Math.random() * 20),
    conditions: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 4)],
    timestamp: new Date().toISOString()
  };

  if (!premium) {
    return { ...base, tier: 'free' };
  }

  return {
    ...base,
    tier: 'premium',
    humidity: Math.round(40 + Math.random() * 40),
    wind: {
      speed: Math.round(5 + Math.random() * 20),
      direction: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)]
    },
    pressure: Math.round(1000 + Math.random() * 30),
    visibility: Math.round(5 + Math.random() * 10),
    uvIndex: Math.round(Math.random() * 11),
    feelsLike: Math.round(58 + Math.random() * 25),
    dewPoint: Math.round(40 + Math.random() * 20),
    forecast: [
      { day: 'Tomorrow', high: 72, low: 58, conditions: 'Sunny' },
      { day: 'Day 2', high: 75, low: 60, conditions: 'Partly Cloudy' },
      { day: 'Day 3', high: 70, low: 55, conditions: 'Cloudy' },
      { day: 'Day 4', high: 68, low: 52, conditions: 'Rainy' },
      { day: 'Day 5', high: 65, low: 50, conditions: 'Sunny' }
    ]
  };
}

function getHistoricalData(location: string, days: number = 30) {
  const data = [];
  const now = Date.now();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    data.push({
      date: date.toISOString().split('T')[0],
      high: Math.round(60 + Math.random() * 20),
      low: Math.round(40 + Math.random() * 20),
      precipitation: Math.round(Math.random() * 100) / 100,
      humidity: Math.round(40 + Math.random() * 40)
    });
  }
  
  return {
    location,
    period: `Last ${days} days`,
    data
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
    x402Enabled: true,
    endpoints: {
      free: '/api/weather/free',
      premium: '/api/weather/premium',
      historical: '/api/weather/historical'
    }
  });
});

// List registered x402 endpoints
app.get('/api/x402/endpoints', (req, res) => {
  res.json({
    endpoints: Array.from(registeredEndpoints.values()).map(ep => ({
      path: ep.path,
      method: ep.method,
      price: ep.basePrice,
      currency: ep.currency
    }))
  });
});

// Free endpoint - no payment required
app.get('/api/weather/free', (req, res) => {
  const location = (req.query.location as string) || 'San Francisco';
  res.json(getWeatherData(location, false));
});

// Premium endpoint - x402 protected ($0.001 per call)
app.get('/api/weather/premium',
  x402.middleware({
    onPaymentVerified: (payment) => {
      console.log(`💰 Payment verified: ${payment.amount} ${payment.currency} (${payment.transferId})`);
    }
  }),
  (req: any, res) => {
    const location = (req.query.location as string) || 'San Francisco';
    
    res.json({
      ...getWeatherData(location, true),
      x402: {
        paid: true,
        payment: req.x402Payment ? {
          amount: req.x402Payment.amount,
          currency: req.x402Payment.currency,
          transferId: req.x402Payment.transferId
        } : null
      }
    });
  }
);

// Historical data endpoint - x402 protected ($0.01 per call)
app.get('/api/weather/historical',
  x402.middleware(),
  (req: any, res) => {
    const location = (req.query.location as string) || 'San Francisco';
    const days = parseInt(req.query.days as string) || 30;
    
    res.json({
      ...getHistoricalData(location, days),
      x402: {
        paid: true,
        payment: req.x402Payment ? {
          amount: req.x402Payment.amount,
          currency: req.x402Payment.currency,
          transferId: req.x402Payment.transferId
        } : null
      }
    });
  }
);

// Batch endpoint - x402 protected ($0.005 per call)
app.post('/api/weather/batch',
  x402.middleware(),
  (req: any, res) => {
    const locations = req.body.locations || ['San Francisco', 'New York', 'Los Angeles'];
    
    if (locations.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 locations per batch request' });
    }
    
    const results = locations.map((loc: string) => getWeatherData(loc, true));
    
    res.json({
      count: results.length,
      results,
      x402: {
        paid: true,
        payment: req.x402Payment ? {
          amount: req.x402Payment.amount,
          currency: req.x402Payment.currency
        } : null
      }
    });
  }
);

// ============================================
// Startup
// ============================================

async function registerEndpoints() {
  console.log('\n📝 Registering x402 endpoints with PayOS...\n');
  
  const endpoints = [
    {
      path: '/api/weather/premium',
      method: 'GET',
      config: {
        name: 'Premium Weather API',
        description: 'Real-time weather data with detailed metrics and 5-day forecast',
        basePrice: 0.001,
        currency: 'USDC' as const,
        volumeDiscounts: [
          { threshold: 100, priceMultiplier: 0.9 },
          { threshold: 1000, priceMultiplier: 0.75 }
        ]
      }
    },
    {
      path: '/api/weather/historical',
      method: 'GET',
      config: {
        name: 'Historical Weather API',
        description: 'Historical weather data for the past 30 days',
        basePrice: 0.01,
        currency: 'USDC' as const
      }
    },
    {
      path: '/api/weather/batch',
      method: 'POST',
      config: {
        name: 'Batch Weather API',
        description: 'Weather data for multiple locations (up to 10)',
        basePrice: 0.005,
        currency: 'USDC' as const
      }
    }
  ];
  
  for (const ep of endpoints) {
    try {
      const registered = await x402.registerEndpoint(ep.path, ep.method, ep.config);
      registeredEndpoints.set(`${ep.method}:${ep.path}`, registered);
      console.log(`   ✅ ${ep.method} ${ep.path} - $${ep.config.basePrice} ${ep.config.currency}`);
      console.log(`      ID: ${registered.id}`);
    } catch (error: any) {
      console.log(`   ⚠️  ${ep.method} ${ep.path} - ${error.message}`);
      // Endpoint might already exist, try to fetch it
      try {
        const existing = await x402.getEndpoint(ep.path, ep.method);
        if (existing) {
          registeredEndpoints.set(`${ep.method}:${ep.path}`, existing);
          console.log(`      Using existing endpoint: ${existing.id}`);
        }
      } catch {
        // Ignore
      }
    }
  }
  
  console.log('\n');
}

app.listen(config.port, async () => {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                                                          ║');
  console.log('║   🌤️  Weather API Provider                               ║');
  console.log('║                                                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`   Server:     http://localhost:${config.port}`);
  console.log(`   PayOS API:  ${config.payosApiUrl}`);
  console.log(`   Account:    ${config.payosAccountId.slice(0, 8)}...`);
  console.log(`   Debug:      ${config.debug ? 'enabled' : 'disabled'}`);
  console.log('');
  console.log('   Endpoints:');
  console.log('   ──────────────────────────────────────────────────────');
  console.log('   GET  /api/weather/free        Free     Basic weather');
  console.log('   GET  /api/weather/premium     $0.001   Detailed weather');
  console.log('   GET  /api/weather/historical  $0.01    30-day history');
  console.log('   POST /api/weather/batch       $0.005   Multi-location');
  console.log('');
  
  await registerEndpoints();
  
  console.log('   Ready to receive requests! 🚀');
  console.log('');
  console.log('   Test commands:');
  console.log('   ──────────────────────────────────────────────────────');
  console.log('   curl http://localhost:4000/api/weather/free');
  console.log('   curl -v http://localhost:4000/api/weather/premium');
  console.log('');
});

