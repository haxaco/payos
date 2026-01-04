/**
 * x402 Sandbox Facilitator Routes
 * 
 * Provides mock blockchain facilitator endpoints for local x402 testing.
 * Only enabled in development/sandbox mode.
 */

import { Hono } from 'hono';

const router = new Hono();

// Only enable in development/sandbox mode
const isEnabled = process.env.NODE_ENV !== 'production';

/**
 * POST /v1/x402/facilitator/verify
 * Verify payment payload structure
 */
router.post('/verify', async (c) => {
  if (!isEnabled) {
    return c.json({ error: 'Facilitator not available in production' }, 404);
  }

  try {
    const { payment } = await c.req.json();

    // Validate required fields
    const requiredFields = ['scheme', 'network', 'amount', 'token', 'from', 'to'];
    for (const field of requiredFields) {
      if (!payment[field]) {
        return c.json({
          valid: false,
          reason: `Missing required field: ${field}`,
        });
      }
    }

    // Validate scheme (exact-evm only for now)
    if (payment.scheme !== 'exact-evm') {
      return c.json({
        valid: false,
        reason: `Unsupported scheme: ${payment.scheme}`,
        details: {
          supportedSchemes: ['exact-evm'],
        },
      });
    }

    // Validate network (Base mainnet and Sepolia)
    const supportedNetworks = ['eip155:8453', 'eip155:84532'];
    if (!supportedNetworks.includes(payment.network)) {
      return c.json({
        valid: false,
        reason: `Unsupported network: ${payment.network}`,
        details: {
          supportedNetworks,
        },
      });
    }

    // Validate amount
    const amount = parseFloat(payment.amount);
    if (isNaN(amount) || amount <= 0) {
      return c.json({
        valid: false,
        reason: `Invalid amount: ${payment.amount}`,
      });
    }

    // In sandbox mode, skip signature verification
    return c.json({ valid: true });
  } catch (error: any) {
    return c.json({
      valid: false,
      reason: error.message || 'Verification failed',
    }, 400);
  }
});

/**
 * POST /v1/x402/facilitator/settle
 * Settle payment and return mock transaction hash
 */
router.post('/settle', async (c) => {
  if (!isEnabled) {
    return c.json({ error: 'Facilitator not available in production' }, 404);
  }

  try {
    const { payment } = await c.req.json();

    // Verify payment first
    const requiredFields = ['scheme', 'network', 'amount', 'token', 'from', 'to'];
    for (const field of requiredFields) {
      if (!payment[field]) {
        return c.json({
          error: `Payment verification failed: Missing required field: ${field}`,
        }, 400);
      }
    }

    // Generate mock transaction hash
    const chars = '0123456789abcdef';
    let txHash = '0x';
    for (let i = 0; i < 64; i++) {
      txHash += chars[Math.floor(Math.random() * chars.length)];
    }

    return c.json({
      transactionHash: txHash,
      settled: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return c.json({
      error: error.message || 'Settlement failed',
    }, 400);
  }
});

/**
 * GET /v1/x402/facilitator/supported
 * Get supported schemes and networks
 */
router.get('/supported', async (c) => {
  if (!isEnabled) {
    return c.json({ error: 'Facilitator not available in production' }, 404);
  }

  return c.json({
    schemes: [
      {
        scheme: 'exact-evm',
        networks: ['eip155:8453', 'eip155:84532'], // Base mainnet and Sepolia
      },
    ],
  });
});

export default router;

