/**
 * Capabilities API - Tool Discovery for AI Agents
 * 
 * Returns machine-readable definitions of all PayOS operations.
 * Enables AI agents to discover what PayOS can do programmatically.
 */

import { Hono } from 'hono';

const router = new Hono();

/**
 * GET /v1/capabilities
 * Returns all PayOS capabilities in machine-readable format
 */
router.get('/', async (c) => {
  const capabilities = {
    apiVersion: '2025-12-01',
    capabilities: [
      // Settlement operations
      {
        name: 'get_settlement_quote',
        description: 'Get a settlement quote for cross-border payment with FX rates and fees',
        category: 'settlements',
        endpoint: 'POST /v1/settlements/quote',
        parameters: {
          type: 'object',
          required: ['fromCurrency', 'toCurrency', 'amount'],
          properties: {
            fromCurrency: {
              type: 'string',
              enum: ['USD', 'BRL', 'MXN', 'USDC'],
              description: 'Source currency',
            },
            toCurrency: {
              type: 'string',
              enum: ['USD', 'BRL', 'MXN', 'USDC'],
              description: 'Destination currency',
            },
            amount: {
              type: 'string',
              description: 'Amount to convert',
              pattern: '^[0-9]+\\.?[0-9]*$',
            },
            rail: {
              type: 'string',
              enum: ['pix', 'spei', 'wire', 'usdc'],
              description: 'Settlement rail (optional)',
            },
          },
        },
        returns: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            fromCurrency: { type: 'string' },
            toCurrency: { type: 'string' },
            fromAmount: { type: 'string' },
            toAmount: { type: 'string' },
            fxRate: { type: 'string' },
            fees: { type: 'object' },
            rail: { type: 'string' },
            expiresAt: { type: 'string' },
            estimatedSettlementSeconds: { type: 'number' },
          },
        },
        errors: ['INVALID_CURRENCY', 'INVALID_AMOUNT', 'RATE_UNAVAILABLE'],
        supportsSimulation: false,
        supportsIdempotency: false,
      },
      {
        name: 'create_settlement',
        description: 'Execute a settlement using a quote',
        category: 'settlements',
        endpoint: 'POST /v1/settlements',
        parameters: {
          type: 'object',
          required: ['quoteId', 'destinationAccountId'],
          properties: {
            quoteId: {
              type: 'string',
              description: 'Quote ID from get_settlement_quote',
            },
            destinationAccountId: {
              type: 'string',
              description: 'Destination account ID',
            },
            metadata: {
              type: 'object',
              description: 'Optional metadata',
            },
          },
        },
        returns: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            status: { type: 'string' },
            quoteId: { type: 'string' },
            fromAmount: { type: 'string' },
            toAmount: { type: 'string' },
            rail: { type: 'string' },
            createdAt: { type: 'string' },
          },
        },
        errors: ['QUOTE_EXPIRED', 'QUOTE_NOT_FOUND', 'INSUFFICIENT_BALANCE', 'ACCOUNT_NOT_FOUND'],
        supportsSimulation: true,
        supportsIdempotency: true,
      },
      {
        name: 'get_settlement_status',
        description: 'Check the status of a settlement',
        category: 'settlements',
        endpoint: 'GET /v1/settlements/:id',
        parameters: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              description: 'Settlement ID',
            },
          },
        },
        returns: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
            completedAt: { type: 'string' },
            failureReason: { type: 'string' },
          },
        },
        errors: ['SETTLEMENT_NOT_FOUND'],
        supportsSimulation: false,
        supportsIdempotency: false,
      },
      // Transfer operations
      {
        name: 'create_transfer',
        description: 'Create a cross-border transfer with automatic FX',
        category: 'payments',
        endpoint: 'POST /v1/transfers',
        parameters: {
          type: 'object',
          required: ['fromAccountId', 'toAccountId', 'amount', 'currency'],
          properties: {
            fromAccountId: { type: 'string' },
            toAccountId: { type: 'string' },
            amount: { type: 'string' },
            currency: { type: 'string', enum: ['USD', 'BRL', 'MXN'] },
            description: { type: 'string' },
            metadata: { type: 'object' },
          },
        },
        returns: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            status: { type: 'string' },
            amount: { type: 'string' },
            createdAt: { type: 'string' },
          },
        },
        errors: ['INSUFFICIENT_BALANCE', 'ACCOUNT_NOT_FOUND', 'DAILY_LIMIT_EXCEEDED'],
        supportsSimulation: true,
        supportsIdempotency: true,
      },
      // Account operations
      {
        name: 'get_account',
        description: 'Get account details',
        category: 'accounts',
        endpoint: 'GET /v1/accounts/:id',
        parameters: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        returns: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            type: { type: 'string' },
            status: { type: 'string' },
          },
        },
        errors: ['ACCOUNT_NOT_FOUND'],
        supportsSimulation: false,
        supportsIdempotency: false,
      },
      {
        name: 'get_account_balance',
        description: 'Get account balances in all currencies',
        category: 'accounts',
        endpoint: 'GET /v1/accounts/:id/balances',
        parameters: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        returns: {
          type: 'object',
          properties: {
            balances: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  currency: { type: 'string' },
                  available: { type: 'string' },
                  pending: { type: 'string' },
                },
              },
            },
          },
        },
        errors: ['ACCOUNT_NOT_FOUND'],
        supportsSimulation: false,
        supportsIdempotency: false,
      },
      // Compliance operations
      {
        name: 'check_compliance',
        description: 'Check if a recipient passes compliance checks',
        category: 'compliance',
        endpoint: 'POST /v1/compliance/check',
        parameters: {
          type: 'object',
          required: ['recipientAccountId', 'amount', 'currency'],
          properties: {
            recipientAccountId: { type: 'string' },
            amount: { type: 'string' },
            currency: { type: 'string' },
          },
        },
        returns: {
          type: 'object',
          properties: {
            approved: { type: 'boolean' },
            flags: { type: 'array', items: { type: 'string' } },
            requiredActions: { type: 'array', items: { type: 'string' } },
          },
        },
        errors: ['ACCOUNT_NOT_FOUND'],
        supportsSimulation: false,
        supportsIdempotency: false,
      },
    ],
    limits: {
      rateLimit: '1000/hour',
      maxTransfer: '100000.00',
    },
    supportedCurrencies: ['USD', 'BRL', 'MXN', 'USDC'],
    supportedRails: ['pix', 'spei', 'wire', 'usdc'],
    webhookEvents: [
      'transfer.created',
      'transfer.completed',
      'transfer.failed',
      'settlement.created',
      'settlement.completed',
      'settlement.failed',
      'refund.created',
      'refund.completed',
      'dispute.created',
      'dispute.resolved',
    ],
  };

  return c.json(capabilities);
});

export default router;

