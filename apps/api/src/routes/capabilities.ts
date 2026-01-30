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

/**
 * GET /v1/capabilities/function-calling
 * Returns capabilities in LLM function-calling formats (OpenAI, Anthropic)
 *
 * Query params:
 *   - format: 'openai' | 'anthropic' | undefined (both)
 */
router.get('/function-calling', async (c) => {
  const format = c.req.query('format') as 'openai' | 'anthropic' | undefined;

  // Define capabilities optimized for LLM function calling
  const capabilities = [
    {
      name: 'sly_get_settlement_quote',
      description: 'Get a quote for cross-border settlement with FX rates and fees. Use this to show the user how much they will receive before executing a payment. Supports USD to BRL (Brazil via Pix) and USD to MXN (Mexico via SPEI).',
      parameters: {
        type: 'object',
        required: ['from_currency', 'to_currency', 'amount'],
        properties: {
          from_currency: {
            type: 'string',
            enum: ['USD', 'USDC'],
            description: 'Source currency (USD or USDC)',
          },
          to_currency: {
            type: 'string',
            enum: ['BRL', 'MXN'],
            description: 'Destination currency (BRL for Brazil, MXN for Mexico)',
          },
          amount: {
            type: 'string',
            description: 'Amount to send in source currency (e.g., "100.00")',
          },
          rail: {
            type: 'string',
            enum: ['pix', 'spei'],
            description: 'Settlement rail: "pix" for Brazil (instant), "spei" for Mexico (same-day)',
          },
        },
      },
    },
    {
      name: 'sly_execute_settlement',
      description: 'Execute a settlement using a previously obtained quote. This transfers funds to the recipient via the specified rail (Pix or SPEI). Always get a quote first and confirm with the user before executing.',
      parameters: {
        type: 'object',
        required: ['quote_id', 'destination_account_id'],
        properties: {
          quote_id: {
            type: 'string',
            description: 'The quote ID obtained from sly_get_settlement_quote',
          },
          destination_account_id: {
            type: 'string',
            description: 'The recipient account ID in Sly',
          },
          idempotency_key: {
            type: 'string',
            description: 'Unique key to prevent duplicate settlements (recommended)',
          },
          metadata: {
            type: 'object',
            description: 'Optional metadata to attach to the settlement',
          },
        },
      },
    },
    {
      name: 'sly_get_settlement_status',
      description: 'Check the current status of a settlement. Use this to track whether a payment has completed, is still processing, or has failed.',
      parameters: {
        type: 'object',
        required: ['settlement_id'],
        properties: {
          settlement_id: {
            type: 'string',
            description: 'The settlement ID to check',
          },
        },
      },
    },
    {
      name: 'sly_create_transfer',
      description: 'Create an internal transfer between two Sly accounts. For cross-border payments to external recipients, use sly_execute_settlement instead.',
      parameters: {
        type: 'object',
        required: ['from_account_id', 'to_account_id', 'amount', 'currency'],
        properties: {
          from_account_id: {
            type: 'string',
            description: 'Source account ID',
          },
          to_account_id: {
            type: 'string',
            description: 'Destination account ID',
          },
          amount: {
            type: 'string',
            description: 'Amount to transfer (e.g., "100.00")',
          },
          currency: {
            type: 'string',
            enum: ['USD', 'USDC'],
            description: 'Currency of the transfer',
          },
          description: {
            type: 'string',
            description: 'Optional description for the transfer',
          },
        },
      },
    },
    {
      name: 'sly_get_account_balance',
      description: 'Get the current balance of an account in all currencies. Use this to check available funds before initiating a transfer or settlement.',
      parameters: {
        type: 'object',
        required: ['account_id'],
        properties: {
          account_id: {
            type: 'string',
            description: 'The account ID to check',
          },
        },
      },
    },
    {
      name: 'sly_check_compliance',
      description: 'Run compliance checks on a recipient before sending a payment. Returns approval status and any required actions. Always run this before large transfers.',
      parameters: {
        type: 'object',
        required: ['recipient_account_id', 'amount', 'currency'],
        properties: {
          recipient_account_id: {
            type: 'string',
            description: 'The recipient account ID to check',
          },
          amount: {
            type: 'string',
            description: 'The amount to be transferred',
          },
          currency: {
            type: 'string',
            description: 'The currency of the transfer',
          },
        },
      },
    },
    {
      name: 'sly_list_accounts',
      description: 'List all accounts accessible to the current API key. Use this to find account IDs for transfers.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['individual', 'business'],
            description: 'Filter by account type',
          },
          status: {
            type: 'string',
            enum: ['active', 'suspended', 'closed'],
            description: 'Filter by account status',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of accounts to return (default: 20)',
          },
        },
      },
    },
    {
      name: 'sly_simulate_transfer',
      description: 'Simulate a transfer without executing it. Returns what would happen including fees, FX rates, and any validation errors. Use this for "what if" scenarios.',
      parameters: {
        type: 'object',
        required: ['from_account_id', 'to_account_id', 'amount', 'currency'],
        properties: {
          from_account_id: {
            type: 'string',
            description: 'Source account ID',
          },
          to_account_id: {
            type: 'string',
            description: 'Destination account ID',
          },
          amount: {
            type: 'string',
            description: 'Amount to transfer',
          },
          currency: {
            type: 'string',
            description: 'Currency of the transfer',
          },
        },
      },
    },
  ];

  // Transform to OpenAI format
  const openaiFormat = capabilities.map((cap) => ({
    name: cap.name,
    description: cap.description,
    parameters: cap.parameters,
  }));

  // Transform to Anthropic format
  const anthropicFormat = capabilities.map((cap) => ({
    name: cap.name,
    description: cap.description,
    input_schema: cap.parameters,
  }));

  // Return based on format query param
  if (format === 'openai') {
    return c.json({
      api_version: '2025-12-01',
      format: 'openai',
      functions: openaiFormat,
    });
  }

  if (format === 'anthropic') {
    return c.json({
      api_version: '2025-12-01',
      format: 'anthropic',
      tools: anthropicFormat,
    });
  }

  // Return both formats
  return c.json({
    api_version: '2025-12-01',
    openai_functions: openaiFormat,
    anthropic_tools: anthropicFormat,
  });
});

/**
 * GET /v1/capabilities/protocols
 * Returns capabilities specific to agentic payment protocols (x402, AP2, ACP, UCP)
 */
router.get('/protocols', async (c) => {
  const protocolCapabilities = {
    api_version: '2025-12-01',
    protocols: {
      x402: {
        name: 'x402 Micropayments',
        description: 'HTTP 402 Payment Required protocol for API monetization',
        status: 'stable',
        capabilities: [
          {
            name: 'sly_x402_create_endpoint',
            description: 'Register a paywall-protected API endpoint',
            parameters: {
              type: 'object',
              required: ['url', 'price'],
              properties: {
                url: { type: 'string', description: 'The URL to protect' },
                price: { type: 'string', description: 'Price per request (e.g., "0.001")' },
                currency: { type: 'string', enum: ['USD', 'USDC'], description: 'Price currency' },
              },
            },
          },
          {
            name: 'sly_x402_verify_payment',
            description: 'Verify an x402 payment header',
            parameters: {
              type: 'object',
              required: ['payment_header'],
              properties: {
                payment_header: { type: 'string', description: 'The X-PAYMENT header value' },
              },
            },
          },
        ],
      },
      ap2: {
        name: 'AP2 Agent Payments',
        description: 'Mandate-based payments for autonomous AI agents',
        status: 'stable',
        capabilities: [
          {
            name: 'sly_ap2_create_mandate',
            description: 'Create a spending mandate for an agent',
            parameters: {
              type: 'object',
              required: ['agent_id', 'max_amount', 'currency'],
              properties: {
                agent_id: { type: 'string', description: 'The agent ID' },
                max_amount: { type: 'string', description: 'Maximum amount per execution' },
                currency: { type: 'string', description: 'Currency for the mandate' },
                max_executions: { type: 'number', description: 'Maximum number of executions' },
                expires_at: { type: 'string', description: 'ISO 8601 expiration timestamp' },
              },
            },
          },
          {
            name: 'sly_ap2_execute_mandate',
            description: 'Execute a payment against an existing mandate',
            parameters: {
              type: 'object',
              required: ['mandate_id', 'amount'],
              properties: {
                mandate_id: { type: 'string', description: 'The mandate ID' },
                amount: { type: 'string', description: 'Amount to pay' },
                description: { type: 'string', description: 'Payment description' },
              },
            },
          },
        ],
      },
      acp: {
        name: 'Agent Commerce Protocol',
        description: 'E-commerce checkout for AI agents (Stripe/OpenAI compatible)',
        status: 'stable',
        capabilities: [
          {
            name: 'sly_acp_create_checkout',
            description: 'Create a checkout session for agent purchases',
            parameters: {
              type: 'object',
              required: ['items'],
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      price: { type: 'string' },
                      quantity: { type: 'number' },
                    },
                  },
                  description: 'Cart items',
                },
                return_url: { type: 'string', description: 'URL to return to after checkout' },
              },
            },
          },
          {
            name: 'sly_acp_complete_checkout',
            description: 'Complete a checkout with a SharedPaymentToken',
            parameters: {
              type: 'object',
              required: ['checkout_id', 'payment_token'],
              properties: {
                checkout_id: { type: 'string', description: 'The checkout session ID' },
                payment_token: { type: 'string', description: 'SharedPaymentToken from the agent' },
              },
            },
          },
        ],
      },
      ucp: {
        name: 'Universal Commerce Protocol',
        description: 'Full commerce lifecycle protocol (Google + Shopify standard)',
        status: 'stable',
        capabilities: [
          {
            name: 'sly_ucp_get_quote',
            description: 'Get a UCP settlement quote',
            parameters: {
              type: 'object',
              required: ['amount', 'currency', 'corridor'],
              properties: {
                amount: { type: 'string', description: 'Amount to settle' },
                currency: { type: 'string', enum: ['USD', 'USDC'], description: 'Source currency' },
                corridor: { type: 'string', enum: ['pix', 'spei'], description: 'Settlement corridor' },
              },
            },
          },
          {
            name: 'sly_ucp_acquire_token',
            description: 'Acquire a UCP settlement token',
            parameters: {
              type: 'object',
              required: ['quote_id'],
              properties: {
                quote_id: { type: 'string', description: 'Quote ID from sly_ucp_get_quote' },
                recipient: {
                  type: 'object',
                  description: 'Recipient details (Pix key or CLABE)',
                },
              },
            },
          },
          {
            name: 'sly_ucp_settle',
            description: 'Execute settlement with a UCP token',
            parameters: {
              type: 'object',
              required: ['token'],
              properties: {
                token: { type: 'string', description: 'UCP settlement token' },
                idempotency_key: { type: 'string', description: 'Unique key to prevent duplicates' },
              },
            },
          },
        ],
      },
    },
    card_networks: {
      visa_vic: {
        name: 'Visa Intelligent Commerce',
        description: 'Agent payments via Visa card rails using TAP protocol',
        status: 'available',
        requires_registration: true,
        registration_url: 'https://developer.visa.com',
      },
      mastercard_agent_pay: {
        name: 'Mastercard Agent Pay',
        description: 'Agent payments via Mastercard rails with DTVC tokens',
        status: 'available',
        requires_registration: true,
        registration_url: 'https://developer.mastercard.com',
      },
    },
  };

  return c.json(protocolCapabilities);
});

export default router;

