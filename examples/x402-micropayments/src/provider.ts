/**
 * x402 Provider Example - PayOS
 * 
 * Demonstrates how to monetize API endpoints using HTTP 402 Payment Required
 * 
 * User tenant: haxaco@gmail.com
 * 
 * Features:
 * - Protected API endpoints with per-request pricing
 * - Automatic payment verification
 * - Sandbox mode (no real payments)
 * - Usage tracking and analytics
 */

import express from 'express';
import { PayOS } from '@sly/sdk';

const USER_EMAIL = 'haxaco@gmail.com';
const PROVIDER_ACCOUNT_ID = 'acct_haxaco_provider';

// Initialize PayOS SDK
const payos = new PayOS({
  apiKey: process.env.PAYOS_API_KEY || 'payos_sandbox_test',
  environment: 'sandbox',
});

// Create x402 provider with monetized endpoints
const provider = payos.x402.createProvider({
  // AI Model API - $0.10 per request
  'POST /api/ai/generate': {
    price: '0.10',
    currency: 'USD',
    description: 'AI text generation (GPT-4 equivalent)',
    metadata: {
      provider: USER_EMAIL,
      model: 'gpt-4',
      max_tokens: 1000,
    },
  },

  // Data Analytics API - $0.05 per request
  'GET /api/analytics/insights': {
    price: '0.05',
    currency: 'USD',
    description: 'Real-time analytics insights',
    metadata: {
      provider: USER_EMAIL,
      tier: 'premium',
    },
  },

  // Image Processing API - $0.15 per request
  'POST /api/images/enhance': {
    price: '0.15',
    currency: 'USD',
    description: 'AI image enhancement',
    metadata: {
      provider: USER_EMAIL,
      resolution: '4K',
    },
  },

  // Free endpoints (no payment required)
  'GET /api/health': {
    price: '0',
    currency: 'USD',
    description: 'Health check endpoint',
  },

  'GET /api/pricing': {
    price: '0',
    currency: 'USD',
    description: 'Get API pricing information',
  },
});

// Create Express app
const app = express();
app.use(express.json());

// Apply x402 middleware to all /api routes
app.use('/api', provider.middleware());

// Health check (free)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    provider: USER_EMAIL,
    timestamp: new Date().toISOString(),
  });
});

// Pricing information (free)
app.get('/api/pricing', (req, res) => {
  res.json({
    provider: USER_EMAIL,
    endpoints: [
      {
        method: 'POST',
        path: '/api/ai/generate',
        price: 0.10,
        currency: 'USD',
        description: 'AI text generation',
      },
      {
        method: 'GET',
        path: '/api/analytics/insights',
        price: 0.05,
        currency: 'USD',
        description: 'Analytics insights',
      },
      {
        method: 'POST',
        path: '/api/images/enhance',
        price: 0.15,
        currency: 'USD',
        description: 'Image enhancement',
      },
    ],
    total_revenue_30d: 245.50,
    total_requests_30d: 1547,
  });
});

// AI Generation endpoint ($0.10 per request)
app.post('/api/ai/generate', (req, res) => {
  const { prompt, max_tokens = 100 } = req.body;

  // Simulate AI generation
  const response = {
    provider: USER_EMAIL,
    model: 'gpt-4-equivalent',
    prompt,
    generated_text: `This is a simulated AI response for: "${prompt}". In production, this would call a real AI model.`,
    tokens_used: max_tokens,
    cost: 0.10,
    timestamp: new Date().toISOString(),
  };

  console.log(`✅ AI Generation: $0.10 charged for ${USER_EMAIL}`);
  res.json(response);
});

// Analytics endpoint ($0.05 per request)
app.get('/api/analytics/insights', (req, res) => {
  const insights = {
    provider: USER_EMAIL,
    period: '30d',
    metrics: {
      total_users: 1234,
      active_users: 567,
      revenue: 12450.00,
      growth_rate: 23.5,
    },
    top_features: [
      { name: 'AI Generation', usage: 45 },
      { name: 'Image Enhancement', usage: 30 },
      { name: 'Analytics', usage: 25 },
    ],
    cost: 0.05,
    timestamp: new Date().toISOString(),
  };

  console.log(`✅ Analytics: $0.05 charged for ${USER_EMAIL}`);
  res.json(insights);
});

// Image Enhancement endpoint ($0.15 per request)
app.post('/api/images/enhance', (req, res) => {
  const { image_url, enhancement_type = 'auto' } = req.body;

  const response = {
    provider: USER_EMAIL,
    original_url: image_url,
    enhanced_url: `https://cdn.payos.ai/enhanced/${Date.now()}.jpg`,
    enhancement_type,
    improvements: {
      resolution: '4K',
      noise_reduction: 'applied',
      color_correction: 'applied',
      sharpness: 'enhanced',
    },
    cost: 0.15,
    timestamp: new Date().toISOString(),
  };

  console.log(`✅ Image Enhancement: $0.15 charged for ${USER_EMAIL}`);
  res.json(response);
});

// Start server
const PORT = process.env.PORT || 3402;
app.listen(PORT, () => {
  console.log('\n🚀 x402 Provider - PayOS');
  console.log('=======================');
  console.log(`Provider: ${USER_EMAIL}`);
  console.log(`Account: ${PROVIDER_ACCOUNT_ID}`);
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Environment: sandbox\n`);
  console.log('💰 Monetized Endpoints:');
  console.log('  POST /api/ai/generate       → $0.10 per request');
  console.log('  GET  /api/analytics/insights → $0.05 per request');
  console.log('  POST /api/images/enhance    → $0.15 per request\n');
  console.log('🆓 Free Endpoints:');
  console.log('  GET  /api/health');
  console.log('  GET  /api/pricing\n');
  console.log('📊 Try it:');
  console.log('  curl http://localhost:3402/api/health');
  console.log('  curl http://localhost:3402/api/pricing\n');
});

