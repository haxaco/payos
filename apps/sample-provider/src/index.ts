/**
 * Sample Weather API Provider
 *
 * Demonstrates x402 Provider SDK for monetizing API endpoints.
 *
 * Setup:
 *   1. Get API key from Sly dashboard
 *   2. Create .env file with: SLY_API_KEY=pk_xxx
 *   3. Run: pnpm dev
 *
 * Test:
 *   curl http://localhost:4001/api/weather/current      # Free
 *   curl -v http://localhost:4001/api/weather/forecast  # Returns 402
 */

import 'dotenv/config';
import express from 'express';
import { X402Provider } from '@sly/x402-provider-sdk';

const app = express();
app.use(express.json());

// ============================================
// x402 Request/Response Logger (for spec validation)
// ============================================

// Performance tracking
const requestTimings = new Map<string, { start: number; phase: string }>();

function logX402Details(type: 'REQUEST' | 'RESPONSE_402' | 'RESPONSE_OK', data: any) {
  if (!VERBOSE_LOGGING) return;
  
  const divider = '═'.repeat(70);
  const timestamp = new Date().toISOString();
  const now = Date.now();
  
  console.log(`\n${divider}`);
  console.log(`📋 x402 ${type} @ ${timestamp}`);
  console.log(divider);
  
  if (type === 'REQUEST') {
    // Track request start time
    const reqId = data.headers['x-payment-id'] || `req-${now}`;
    requestTimings.set(reqId, { start: now, phase: data.headers['x-payment-id'] ? 'paid' : 'initial' });
    
    console.log(`
┌─ INCOMING REQUEST ─────────────────────────────────────────────────┐
│ Method:      ${data.method}
│ Path:        ${data.path}
│ Query:       ${JSON.stringify(data.query)}
├─ x402 HEADERS ─────────────────────────────────────────────────────┤
│ X-Payment-ID:    ${data.headers['x-payment-id'] || '(none)'}
│ X-Payment-Proof: ${data.headers['x-payment-proof'] || '(none)'}
│ X-Wallet-ID:     ${data.headers['x-wallet-id'] || '(none)'}
│ X-Request-ID:    ${data.headers['x-request-id'] || '(none)'}
└────────────────────────────────────────────────────────────────────┘`);
  }
  
  if (type === 'RESPONSE_402') {
    // Calculate time for 402 response
    const reqId = `req-${now}`;
    const timing = Array.from(requestTimings.entries()).find(([k, v]) => v.phase === 'initial')?.[1];
    const elapsed = timing ? now - timing.start : 0;
    
    console.log(`
┌─ 402 PAYMENT REQUIRED RESPONSE ────────────────────────────────────┐
│ Status:          402 Payment Required
│ ⏱️  Response Time: ${elapsed}ms
├─ x402 RESPONSE HEADERS (per spec) ─────────────────────────────────┤
│ X-Payment-Required:  ${data.headers['X-Payment-Required']}
│ X-Payment-Amount:    ${data.headers['X-Payment-Amount']}
│ X-Payment-Currency:  ${data.headers['X-Payment-Currency']}
│ X-Payment-Address:   ${data.headers['X-Payment-Address']}
│ X-Endpoint-ID:       ${data.headers['X-Endpoint-ID']}
│ X-Payment-Network:   ${data.headers['X-Payment-Network']}
├─ RESPONSE BODY ────────────────────────────────────────────────────┤
${JSON.stringify(data.body, null, 2).split('\n').map(l => '│ ' + l).join('\n')}
└────────────────────────────────────────────────────────────────────┘`);
  }
  
  if (type === 'RESPONSE_OK') {
    // Calculate verification + data serving time
    const paymentId = data.payment?.transferId;
    const timing = requestTimings.get(paymentId);
    const verificationTime = timing ? now - timing.start : 0;
    
    // Clean up old timings
    requestTimings.delete(paymentId);
    
    console.log(`
┌─ 200 OK - PAYMENT VERIFIED ────────────────────────────────────────┐
│ Status:          200 OK
│ Payment Verified: ✅ YES
│ ⏱️  Verification Time: ${verificationTime}ms
├─ PAYMENT DETAILS ──────────────────────────────────────────────────┤
│ Transfer ID:     ${data.payment?.transferId || 'N/A'}
│ Request ID:      ${data.payment?.requestId || 'N/A'}
│ Amount:          ${data.payment?.amount} ${data.payment?.currency || 'USDC'}
│ From Wallet:     ${data.payment?.from || 'N/A'}
│ To Wallet:       ${data.payment?.to || 'N/A'}
│ Endpoint ID:     ${data.payment?.endpointId || 'N/A'}
├─ DATA SERVED ──────────────────────────────────────────────────────┤
│ Tier:            ${data.tier || 'premium'}
│ Data Size:       ${JSON.stringify(data.body).length} bytes
└────────────────────────────────────────────────────────────────────┘`);
  }
  
  console.log(divider + '\n');
}

// Performance summary stats
const perfStats = {
  requests402: [] as number[],
  requestsPaid: [] as number[],
  
  add402(ms: number) {
    this.requests402.push(ms);
    if (this.requests402.length % 5 === 0) this.printSummary();
  },
  
  addPaid(ms: number) {
    this.requestsPaid.push(ms);
    if (this.requestsPaid.length % 5 === 0) this.printSummary();
  },
  
  printSummary() {
    const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    const min = (arr: number[]) => arr.length ? Math.min(...arr) : 0;
    const max = (arr: number[]) => arr.length ? Math.max(...arr) : 0;
    
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  📊 PERFORMANCE SUMMARY                                          ║
╠══════════════════════════════════════════════════════════════════╣
║  402 Responses (${this.requests402.length} total):                                      
║    Avg: ${avg(this.requests402).toString().padEnd(4)}ms  |  Min: ${min(this.requests402).toString().padEnd(4)}ms  |  Max: ${max(this.requests402).toString().padEnd(4)}ms
║                                                                  ║
║  Paid Requests (${this.requestsPaid.length} total):                                      
║    Avg: ${avg(this.requestsPaid).toString().padEnd(4)}ms  |  Min: ${min(this.requestsPaid).toString().padEnd(4)}ms  |  Max: ${max(this.requestsPaid).toString().padEnd(4)}ms
║                                                                  ║
║  💡 Payment overhead: ~${(avg(this.requestsPaid) + avg(this.requests402)).toString()}ms per x402 call             
╚══════════════════════════════════════════════════════════════════╝
`);
  }
};

// Middleware to log all incoming requests to x402 endpoints with timing
function createX402Logger(endpoint: string) {
  return (req: any, res: any, next: Function) => {
    const startTime = Date.now();
    const hasPayment = !!req.headers['x-payment-id'];
    const paymentId = req.headers['x-payment-id'] || `unpaid-${startTime}`;
    
    // Store start time for this request
    (req as any)._x402StartTime = startTime;
    (req as any)._x402PaymentId = paymentId;
    
    logX402Details('REQUEST', {
      method: req.method,
      path: req.path,
      query: req.query,
      headers: req.headers
    });
    
    // Intercept response to log timing
    const originalJson = res.json.bind(res);
    res.json = function(body: any) {
      const endTime = Date.now();
      const elapsed = endTime - startTime;
      
      if (res.statusCode === 402) {
        perfStats.add402(elapsed);
        
        console.log(`\n⏱️  [PERF] 402 Response: ${elapsed}ms (endpoint lookup + header generation)`);
        
        logX402Details('RESPONSE_402', {
          headers: {
            'X-Payment-Required': res.getHeader('X-Payment-Required'),
            'X-Payment-Amount': res.getHeader('X-Payment-Amount'),
            'X-Payment-Currency': res.getHeader('X-Payment-Currency'),
            'X-Payment-Address': res.getHeader('X-Payment-Address'),
            'X-Endpoint-ID': res.getHeader('X-Endpoint-ID'),
            'X-Payment-Network': res.getHeader('X-Payment-Network')
          },
          body
        });
      }
      return originalJson(body);
    };
    
    next();
  };
}

app.use('/api/weather/forecast', createX402Logger('/api/weather/forecast'));
app.use('/api/weather/historical', createX402Logger('/api/weather/historical'));

// ============================================
// Configuration
// ============================================

const PORT = parseInt(process.env.PORT || '4000');
const DEBUG = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development';
const VERBOSE_LOGGING = true; // Always log x402 details for validation

// Support both SLY_ (new) and PAYOS_ (legacy) prefixes
const API_KEY = process.env.SLY_API_KEY || process.env.PAYOS_API_KEY;
const API_URL = process.env.SLY_API_URL || process.env.PAYOS_API_URL;

// Validate API key
if (!API_KEY) {
  console.error(`
╔══════════════════════════════════════════════════════════════════╗
║  ❌ Missing SLY_API_KEY environment variable                     ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  To get your API key:                                            ║
║  1. Go to Sly dashboard (http://localhost:3000)                  ║
║  2. Create a business account                                    ║
║  3. Generate an API key with endpoint permissions                ║
║                                                                  ║
║  Then run:                                                       ║
║  SLY_API_KEY=pk_xxx pnpm dev                                     ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
  `);
  process.exit(1);
}

// ============================================
// Initialize x402 Provider
// ============================================

const x402 = new X402Provider({
  apiKey: API_KEY,
  apiUrl: API_URL,
  debug: DEBUG,

  // Phase 2: JWT secret for local payment verification (~1ms vs ~140ms API call)
  jwtSecret: process.env.X402_JWT_SECRET || 'sly-x402-jwt-secret-change-in-prod',
  preferLocalVerification: true
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
  const startTime = (req as any)._x402StartTime || Date.now();
  const elapsed = Date.now() - startTime;
  
  // Track paid request performance
  perfStats.addPaid(elapsed);
  console.log(`\n⏱️  [PERF] Paid Request: ${elapsed}ms (verification + data serving)`);
  
  const responseData = {
    ...getWeatherForecast(location),
    x402: {
      paid: true,
      payment: req.x402Payment,
      _perf: {
        serverProcessingMs: elapsed
      }
    }
  };
  
  // Log successful payment response
  logX402Details('RESPONSE_OK', {
    payment: req.x402Payment,
    tier: 'premium',
    body: responseData
  });
  
  res.json(responseData);
});

// Premium endpoint - Historical data ($0.01)
app.get('/api/weather/historical', x402.protect(), (req: any, res) => {
  const location = (req.query.location as string) || 'San Francisco';
  const days = parseInt(req.query.days as string) || 30;
  const startTime = (req as any)._x402StartTime || Date.now();
  const elapsed = Date.now() - startTime;
  
  // Track paid request performance
  perfStats.addPaid(elapsed);
  console.log(`\n⏱️  [PERF] Paid Request: ${elapsed}ms (verification + data serving)`);
  
  const responseData = {
    ...getHistoricalWeather(location, days),
    x402: {
      paid: true,
      payment: req.x402Payment,
      _perf: {
        serverProcessingMs: elapsed
      }
    }
  };
  
  // Log successful payment response
  logX402Details('RESPONSE_OK', {
    payment: req.x402Payment,
    tier: 'premium',
    body: responseData
  });
  
  res.json(responseData);
});

// ============================================
// Startup
// ============================================

async function setupEndpoints() {
  console.log('\n📝 Setting up x402 endpoints...\n');
  
  try {
    // Ensure 5-day forecast endpoint exists (idempotent - safe on restart)
    const forecast = await x402.ensureEndpoint('/api/weather/forecast', {
      name: 'Weather Forecast API',
      description: '5-day weather forecast with daily high/low and conditions',
      price: 0.001,
      currency: 'USDC'
    }, 'GET');
    console.log(`   ✅ GET /api/weather/forecast - $0.001 USDC (${forecast.id.slice(0, 8)}...)`);
    
    // Ensure historical data endpoint exists
    const historical = await x402.ensureEndpoint('/api/weather/historical', {
      name: 'Historical Weather API',
      description: 'Historical weather data (up to 30 days)',
      price: 0.01,
      currency: 'USDC',
      volumeDiscounts: [
        { threshold: 100, discount: 0.1 },   // 10% off after 100 calls
        { threshold: 1000, discount: 0.25 }  // 25% off after 1000 calls
      ]
    }, 'GET');
    console.log(`   ✅ GET /api/weather/historical - $0.01 USDC (${historical.id.slice(0, 8)}...)`);
    
    console.log('\n   ✨ Endpoints ready!\n');
    
  } catch (error: any) {
    console.error('\n   ❌ Failed to setup endpoints:', error.message);
    console.log('   Check your API key and PayOS connection.\n');
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

  await setupEndpoints();
  
  console.log('   🚀 Ready to receive requests!\n');
});
