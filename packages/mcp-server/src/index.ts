#!/usr/bin/env node

/**
 * Sly MCP Server
 *
 * Model Context Protocol server for Claude Desktop integration.
 * Exposes Sly payment capabilities as MCP tools.
 *
 * Usage:
 *   npx @sly/mcp-server
 *
 * Configuration via environment variables:
 *   SLY_API_KEY - Your Sly API key (required)
 *   SLY_ENVIRONMENT - 'sandbox' | 'testnet' | 'production' (default: 'sandbox')
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { Sly, getEnvironmentConfig } from '@sly/sdk';

// Get configuration from environment
const SLY_API_KEY = process.env.SLY_API_KEY;
const SLY_ENVIRONMENT = (process.env.SLY_ENVIRONMENT as 'sandbox' | 'testnet' | 'production') || 'sandbox';

if (!SLY_API_KEY) {
  console.error('Error: SLY_API_KEY environment variable is required');
  process.exit(1);
}

// Initialize Sly SDK
const sly = new Sly({
  apiKey: SLY_API_KEY,
  environment: SLY_ENVIRONMENT,
});

// Derive API URL for direct fetch calls (batch operations)
const SLY_API_URL = process.env.SLY_API_URL || getEnvironmentConfig(SLY_ENVIRONMENT).apiUrl;

// Create MCP server
const server = new Server(
  {
    name: '@sly/mcp-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Define MCP tools from Sly capabilities
 */
const tools: Tool[] = [
  // ==========================================================================
  // Core Settlement Tools
  // ==========================================================================
  {
    name: 'get_settlement_quote',
    description: 'Get a settlement quote for cross-border payment with FX rates and fees',
    inputSchema: {
      type: 'object',
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
        },
        rail: {
          type: 'string',
          enum: ['pix', 'spei', 'wire', 'usdc'],
          description: 'Settlement rail (optional)',
        },
      },
      required: ['fromCurrency', 'toCurrency', 'amount'],
    },
  },
  {
    name: 'create_settlement',
    description: 'Execute a settlement using a quote',
    inputSchema: {
      type: 'object',
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
      required: ['quoteId', 'destinationAccountId'],
    },
  },
  {
    name: 'get_settlement_status',
    description: 'Check the status of a settlement',
    inputSchema: {
      type: 'object',
      properties: {
        settlementId: {
          type: 'string',
          description: 'Settlement ID',
        },
      },
      required: ['settlementId'],
    },
  },

  // ==========================================================================
  // UCP (Universal Commerce Protocol) Tools
  // ==========================================================================
  {
    name: 'ucp_discover',
    description: 'Discover a UCP merchant\'s capabilities by fetching their /.well-known/ucp profile. Use this to find out what a merchant supports before creating a checkout.',
    inputSchema: {
      type: 'object',
      properties: {
        merchantUrl: {
          type: 'string',
          description: 'The merchant\'s base URL (e.g., https://shop.example.com)',
        },
      },
      required: ['merchantUrl'],
    },
  },

  // UCP Checkout Session Management
  {
    name: 'ucp_create_checkout',
    description: 'Create a UCP checkout session with line items, buyer info, and payment configuration. Sessions expire after 6 hours by default.',
    inputSchema: {
      type: 'object',
      properties: {
        currency: {
          type: 'string',
          description: 'ISO 4217 pricing currency, exactly 3 characters (e.g., "USD", "BRL", "MXN"). This is the display/pricing currency — the actual payment method (USDC, card, etc.) is set via the payment instrument.',
        },
        line_items: {
          type: 'array',
          description: 'Items in the checkout',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique item identifier (required, e.g., "item_sneakers")' },
              name: { type: 'string', description: 'Item name' },
              quantity: { type: 'integer', description: 'Quantity (positive integer)' },
              unit_price: { type: 'integer', description: 'Price per unit in cents (e.g., 2999 = $29.99)' },
              total_price: { type: 'integer', description: 'Line total in cents (quantity * unit_price)' },
              description: { type: 'string', description: 'Item description (optional)' },
              image_url: { type: 'string', description: 'Product image URL (optional)' },
              product_url: { type: 'string', description: 'Product page URL (optional)' },
            },
            required: ['id', 'name', 'quantity', 'unit_price', 'total_price'],
          },
        },
        buyer: {
          type: 'object',
          description: 'Buyer information (optional)',
          properties: {
            email: { type: 'string' },
            name: { type: 'string' },
            phone: { type: 'string' },
          },
        },
        shipping_address: {
          type: 'object',
          description: 'Shipping address (optional)',
          properties: {
            line1: { type: 'string' },
            line2: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            postal_code: { type: 'string' },
            country: { type: 'string' },
          },
          required: ['line1', 'city', 'postal_code', 'country'],
        },
        payment_config: {
          type: 'object',
          description: 'Payment configuration (optional)',
          properties: {
            handlers: {
              type: 'array',
              items: { type: 'string' },
              description: 'Accepted payment handlers',
            },
            default_handler: { type: 'string' },
            capture_method: { type: 'string', enum: ['automatic', 'manual'] },
          },
        },
        payment_instruments: {
          type: 'array',
          description: 'Payment instruments. If provided, the first is auto-selected — the checkout can skip the add-instrument step and go straight to ready_for_complete.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique instrument identifier (e.g., "pi_sly_usdc_1")' },
              handler: { type: 'string', description: 'Payment handler (e.g., "sly")' },
              type: { type: 'string', description: 'Instrument type (e.g., "usdc", "card")' },
              last4: { type: 'string', description: 'Last 4 digits (optional)' },
              brand: { type: 'string', description: 'Brand name (optional)' },
            },
            required: ['id', 'handler', 'type'],
          },
        },
        checkout_type: {
          type: 'string',
          enum: ['physical', 'digital', 'service'],
          description: 'Checkout type. "digital" and "service" skip the shipping address requirement. Default: "physical".',
        },
        metadata: {
          type: 'object',
          description: 'Custom metadata (optional)',
        },
      },
      required: ['currency', 'line_items'],
    },
  },
  {
    name: 'ucp_get_checkout',
    description: 'Get UCP checkout session details including line items, totals, payment instruments, and messages.',
    inputSchema: {
      type: 'object',
      properties: {
        checkoutId: {
          type: 'string',
          description: 'UUID of the checkout session',
        },
      },
      required: ['checkoutId'],
    },
  },
  {
    name: 'ucp_list_checkouts',
    description: 'List UCP checkout sessions with optional filtering by status.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['incomplete', 'requires_escalation', 'ready_for_complete', 'complete_in_progress', 'completed', 'canceled'],
          description: 'Filter by checkout status (optional)',
        },
        page: { type: 'number', description: 'Page number (optional)' },
        limit: { type: 'number', description: 'Results per page (optional)' },
      },
      required: [],
    },
  },
  {
    name: 'ucp_update_checkout',
    description: 'Update a UCP checkout session — change line items, addresses, buyer info, or metadata. Cannot update completed or cancelled checkouts.',
    inputSchema: {
      type: 'object',
      properties: {
        checkoutId: {
          type: 'string',
          description: 'UUID of the checkout session',
        },
        line_items: {
          type: 'array',
          description: 'Updated line items (optional)',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              quantity: { type: 'number' },
              unit_price: { type: 'number' },
              total_price: { type: 'number' },
            },
            required: ['name', 'quantity', 'unit_price', 'total_price'],
          },
        },
        buyer: { type: 'object', description: 'Updated buyer info (optional)' },
        shipping_address: { type: 'object', description: 'Updated shipping address (optional)' },
        billing_address: { type: 'object', description: 'Updated billing address (optional)' },
        metadata: { type: 'object', description: 'Updated metadata (optional)' },
      },
      required: ['checkoutId'],
    },
  },
  {
    name: 'ucp_complete_checkout',
    description: 'Complete a UCP checkout — processes payment and creates an order. The checkout must have all required fields and a selected payment instrument.',
    inputSchema: {
      type: 'object',
      properties: {
        checkoutId: {
          type: 'string',
          description: 'UUID of the checkout session to complete',
        },
      },
      required: ['checkoutId'],
    },
  },
  {
    name: 'ucp_cancel_checkout',
    description: 'Cancel a UCP checkout session.',
    inputSchema: {
      type: 'object',
      properties: {
        checkoutId: {
          type: 'string',
          description: 'UUID of the checkout session to cancel',
        },
      },
      required: ['checkoutId'],
    },
  },
  {
    name: 'ucp_add_payment_instrument',
    description: 'Add a payment instrument (method) to a UCP checkout session.',
    inputSchema: {
      type: 'object',
      properties: {
        checkoutId: {
          type: 'string',
          description: 'UUID of the checkout session',
        },
        id: {
          type: 'string',
          description: 'Unique instrument identifier (e.g., "pi_sly_usdc_1")',
        },
        handler: {
          type: 'string',
          description: 'Payment handler identifier (e.g., "stripe", "sly")',
        },
        type: {
          type: 'string',
          description: 'Instrument type (e.g., "card", "wallet", "usdc")',
        },
        last4: {
          type: 'string',
          description: 'Last 4 digits for display (optional)',
        },
        brand: {
          type: 'string',
          description: 'Card brand or wallet name (optional)',
        },
        metadata: {
          type: 'object',
          description: 'Additional instrument data (optional)',
        },
      },
      required: ['checkoutId', 'id', 'handler', 'type'],
    },
  },

  {
    name: 'ucp_batch_checkout',
    description: 'Create and complete multiple UCP checkouts in one call. Each checkout spec should include all required fields (line_items, buyer, shipping_address or checkout_type=digital/service, and payment_instruments). Checkouts that reach ready_for_complete are auto-completed. Returns an array of results.',
    inputSchema: {
      type: 'object',
      properties: {
        checkouts: {
          type: 'array',
          description: 'Array of checkout specifications to create and complete',
          items: {
            type: 'object',
            properties: {
              currency: { type: 'string', description: 'ISO 4217 currency (e.g., "USD")' },
              line_items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    quantity: { type: 'integer' },
                    unit_price: { type: 'integer' },
                    total_price: { type: 'integer' },
                    description: { type: 'string' },
                  },
                  required: ['id', 'name', 'quantity', 'unit_price', 'total_price'],
                },
              },
              buyer: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  name: { type: 'string' },
                },
              },
              shipping_address: {
                type: 'object',
                properties: {
                  line1: { type: 'string' },
                  city: { type: 'string' },
                  postal_code: { type: 'string' },
                  country: { type: 'string' },
                  state: { type: 'string' },
                },
                required: ['line1', 'city', 'postal_code', 'country'],
              },
              payment_instruments: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    handler: { type: 'string' },
                    type: { type: 'string' },
                  },
                  required: ['id', 'handler', 'type'],
                },
              },
              checkout_type: {
                type: 'string',
                enum: ['physical', 'digital', 'service'],
              },
              metadata: { type: 'object' },
            },
            required: ['currency', 'line_items'],
          },
        },
      },
      required: ['checkouts'],
    },
  },

  // UCP Order Management
  {
    name: 'ucp_list_orders',
    description: 'List UCP orders with optional filtering by status.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
          description: 'Filter by order status (optional)',
        },
        page: { type: 'number', description: 'Page number (optional)' },
        limit: { type: 'number', description: 'Results per page (optional)' },
      },
      required: [],
    },
  },
  {
    name: 'ucp_get_order',
    description: 'Get UCP order details including line items, payment info, fulfillment events, and adjustments.',
    inputSchema: {
      type: 'object',
      properties: {
        orderId: {
          type: 'string',
          description: 'UUID of the order',
        },
      },
      required: ['orderId'],
    },
  },
  {
    name: 'ucp_update_order_status',
    description: 'Update UCP order status. Valid transitions: confirmed → processing → shipped → delivered.',
    inputSchema: {
      type: 'object',
      properties: {
        orderId: {
          type: 'string',
          description: 'UUID of the order',
        },
        status: {
          type: 'string',
          enum: ['processing', 'shipped', 'delivered'],
          description: 'New order status',
        },
      },
      required: ['orderId', 'status'],
    },
  },
  {
    name: 'ucp_cancel_order',
    description: 'Cancel a UCP order. Optionally provide a reason.',
    inputSchema: {
      type: 'object',
      properties: {
        orderId: {
          type: 'string',
          description: 'UUID of the order to cancel',
        },
        reason: {
          type: 'string',
          description: 'Cancellation reason (optional)',
        },
      },
      required: ['orderId'],
    },
  },
  {
    name: 'ucp_add_fulfillment_event',
    description: 'Record a fulfillment event on a UCP order (e.g., shipped, in_transit, delivered).',
    inputSchema: {
      type: 'object',
      properties: {
        orderId: {
          type: 'string',
          description: 'UUID of the order',
        },
        type: {
          type: 'string',
          enum: ['shipped', 'in_transit', 'out_for_delivery', 'delivered', 'returned'],
          description: 'Event type',
        },
        description: {
          type: 'string',
          description: 'Event description',
        },
        tracking_number: {
          type: 'string',
          description: 'Tracking number (optional)',
        },
        carrier: {
          type: 'string',
          description: 'Shipping carrier (optional)',
        },
      },
      required: ['orderId', 'type', 'description'],
    },
  },

  // ==========================================================================
  // Agent Management Tools
  // ==========================================================================
  {
    name: 'list_accounts',
    description: 'List accounts for the current tenant. Use this to find a business account for agent creation.',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['individual', 'business'],
          description: 'Filter by account type (optional)',
        },
        status: {
          type: 'string',
          enum: ['active', 'inactive', 'suspended'],
          description: 'Filter by account status (optional)',
        },
      },
      required: [],
    },
  },
  {
    name: 'create_agent',
    description: 'Register a new AI agent under a business account. The agent can then be verified and given spending mandates.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'UUID of the parent business account',
        },
        name: {
          type: 'string',
          description: 'Name for the agent (e.g., "Shopping Agent")',
        },
        description: {
          type: 'string',
          description: 'Description of what the agent does (optional)',
        },
      },
      required: ['accountId', 'name'],
    },
  },
  {
    name: 'verify_agent',
    description: 'Verify an agent at a KYA (Know Your Agent) tier. Higher tiers unlock higher spending limits. Tier 1 is sufficient for most use cases.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: 'UUID of the agent to verify',
        },
        tier: {
          type: 'number',
          enum: [1, 2, 3],
          description: 'KYA verification tier (1=Standard, 2=Advanced, 3=Enterprise)',
        },
      },
      required: ['agentId', 'tier'],
    },
  },
  {
    name: 'get_agent',
    description: 'Get details of a specific agent including its KYA tier, status, and permissions.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: 'UUID of the agent',
        },
      },
      required: ['agentId'],
    },
  },
  {
    name: 'get_agent_limits',
    description: 'Get the spending limits and current usage for an agent. Shows per-transaction and daily limits based on KYA tier.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: 'UUID of the agent',
        },
      },
      required: ['agentId'],
    },
  },

  // ==========================================================================
  // AP2 (Agent-to-Agent Protocol) Mandate Tools
  // ==========================================================================
  {
    name: 'ap2_create_mandate',
    description: 'Create a spending mandate that authorizes an agent to spend up to a budget. The mandate tracks spending and enforces limits.',
    inputSchema: {
      type: 'object',
      properties: {
        mandate_id: {
          type: 'string',
          description: 'Unique identifier for the mandate (e.g., "mandate_shopping_001")',
        },
        agent_id: {
          type: 'string',
          description: 'UUID of the agent this mandate is for',
        },
        account_id: {
          type: 'string',
          description: 'UUID of the account funding the mandate',
        },
        authorized_amount: {
          type: 'number',
          description: 'Maximum amount the agent can spend under this mandate',
        },
        currency: {
          type: 'string',
          description: 'Currency for the mandate (default: USD)',
        },
        mandate_type: {
          type: 'string',
          enum: ['intent', 'cart', 'payment'],
          description: 'Type of mandate (default: payment)',
        },
        description: {
          type: 'string',
          description: 'Human-readable description of what this mandate is for (optional)',
        },
        expires_at: {
          type: 'string',
          description: 'ISO 8601 expiration timestamp (optional)',
        },
      },
      required: ['mandate_id', 'agent_id', 'account_id', 'authorized_amount'],
    },
  },
  {
    name: 'ap2_get_mandate',
    description: 'Get mandate details including execution history, remaining budget, and status.',
    inputSchema: {
      type: 'object',
      properties: {
        mandateId: {
          type: 'string',
          description: 'The mandate ID',
        },
      },
      required: ['mandateId'],
    },
  },
  {
    name: 'ap2_execute_mandate',
    description: 'Execute a payment against a mandate. Deducts from the mandate budget and creates a transfer.',
    inputSchema: {
      type: 'object',
      properties: {
        mandateId: {
          type: 'string',
          description: 'The mandate ID to execute against',
        },
        amount: {
          type: 'number',
          description: 'Amount to pay',
        },
        currency: {
          type: 'string',
          description: 'Currency (should match mandate currency)',
        },
        description: {
          type: 'string',
          description: 'Description of this payment (optional)',
        },
      },
      required: ['mandateId', 'amount'],
    },
  },
  {
    name: 'ap2_list_mandates',
    description: 'List mandates with optional filtering by status, agent, or account.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'completed', 'cancelled', 'expired'],
          description: 'Filter by mandate status (optional)',
        },
        agent_id: {
          type: 'string',
          description: 'Filter by agent ID (optional)',
        },
        account_id: {
          type: 'string',
          description: 'Filter by account ID (optional)',
        },
        limit: {
          type: 'number',
          description: 'Max results to return (optional)',
        },
      },
      required: [],
    },
  },

  // ==========================================================================
  // ACP (Agentic Commerce Protocol) Checkout Tools
  // ==========================================================================
  {
    name: 'acp_create_checkout',
    description: 'Create a checkout session with items for an agent to purchase. This is the first step in the shopping flow.',
    inputSchema: {
      type: 'object',
      properties: {
        checkout_id: {
          type: 'string',
          description: 'Unique identifier for the checkout (e.g., "checkout_001")',
        },
        agent_id: {
          type: 'string',
          description: 'UUID of the agent making the purchase',
        },
        account_id: {
          type: 'string',
          description: 'UUID of the account funding the checkout (optional, defaults to agent\'s account)',
        },
        merchant_id: {
          type: 'string',
          description: 'Identifier for the merchant (e.g., "merchant_nike")',
        },
        items: {
          type: 'array',
          description: 'Array of items to purchase',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Item name',
              },
              description: {
                type: 'string',
                description: 'Item description (optional)',
              },
              quantity: {
                type: 'number',
                description: 'Quantity to purchase',
              },
              unit_price: {
                type: 'number',
                description: 'Price per unit',
              },
              total_price: {
                type: 'number',
                description: 'Total price for this line item (quantity * unit_price)',
              },
            },
            required: ['name', 'quantity', 'unit_price', 'total_price'],
          },
        },
        tax_amount: {
          type: 'number',
          description: 'Tax amount (optional)',
        },
        shipping_amount: {
          type: 'number',
          description: 'Shipping amount (optional)',
        },
        payment_method: {
          type: 'string',
          description: 'Payment method (optional)',
        },
        checkout_data: {
          type: 'object',
          description: 'Additional checkout data (optional)',
        },
      },
      required: ['checkout_id', 'agent_id', 'merchant_id', 'items'],
    },
  },
  {
    name: 'acp_get_checkout',
    description: 'Get checkout details including items, totals, and current status.',
    inputSchema: {
      type: 'object',
      properties: {
        checkoutId: {
          type: 'string',
          description: 'The checkout ID',
        },
      },
      required: ['checkoutId'],
    },
  },
  {
    name: 'acp_complete_checkout',
    description: 'Complete and pay for a checkout. Use the checkout UUID (not the string checkout_id). In sandbox, a test payment token is generated automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        checkoutId: {
          type: 'string',
          description: 'The checkout UUID (id field, not checkout_id)',
        },
        shared_payment_token: {
          type: 'string',
          description: 'Shared payment token. In sandbox, defaults to a test token (spt_test_...) if omitted.',
        },
        payment_method: {
          type: 'string',
          description: 'Payment method (optional)',
        },
      },
      required: ['checkoutId'],
    },
  },
  {
    name: 'acp_list_checkouts',
    description: 'List checkouts with optional filtering by status, agent, or merchant.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'completed', 'cancelled', 'expired'],
          description: 'Filter by checkout status (optional)',
        },
        agent_id: {
          type: 'string',
          description: 'Filter by agent ID (optional)',
        },
        merchant_id: {
          type: 'string',
          description: 'Filter by merchant ID (optional)',
        },
        limit: {
          type: 'number',
          description: 'Max results to return (optional)',
        },
      },
      required: [],
    },
  },

  // ==========================================================================
  // Wallet Management Tools
  // ==========================================================================
  {
    name: 'list_wallets',
    description: 'List wallets for the current tenant. Can filter by account, agent, or status.',
    inputSchema: {
      type: 'object',
      properties: {
        owner_account_id: {
          type: 'string',
          description: 'Filter by owner account UUID (optional)',
        },
        managed_by_agent_id: {
          type: 'string',
          description: 'Filter by managing agent UUID (optional)',
        },
        status: {
          type: 'string',
          enum: ['active', 'frozen', 'depleted'],
          description: 'Filter by wallet status (optional)',
        },
        page: {
          type: 'number',
          description: 'Page number (optional)',
        },
        limit: {
          type: 'number',
          description: 'Results per page (optional)',
        },
      },
      required: [],
    },
  },
  {
    name: 'create_wallet',
    description: 'Create a new wallet for an account. Supports internal (Sly-managed), Circle custodial, and Circle MPC wallet types.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'UUID of the account that owns this wallet',
        },
        name: {
          type: 'string',
          description: 'Human-readable wallet name (optional)',
        },
        currency: {
          type: 'string',
          enum: ['USDC', 'EURC'],
          description: 'Wallet currency (default: USDC)',
        },
        walletType: {
          type: 'string',
          enum: ['internal', 'circle_custodial', 'circle_mpc'],
          description: 'Wallet type (default: internal)',
        },
        blockchain: {
          type: 'string',
          enum: ['base', 'eth', 'polygon', 'avax', 'sol'],
          description: 'Blockchain network (optional)',
        },
        initialBalance: {
          type: 'number',
          description: 'Initial balance to fund the wallet with (optional)',
        },
        managedByAgentId: {
          type: 'string',
          description: 'UUID of an agent that manages this wallet (optional)',
        },
        purpose: {
          type: 'string',
          description: 'Purpose of the wallet (optional)',
        },
      },
      required: ['accountId'],
    },
  },
  {
    name: 'get_wallet',
    description: 'Get wallet details including balance and recent transactions.',
    inputSchema: {
      type: 'object',
      properties: {
        walletId: {
          type: 'string',
          description: 'UUID of the wallet',
        },
      },
      required: ['walletId'],
    },
  },
  {
    name: 'get_wallet_balance',
    description: 'Get the current balance of a wallet with sync status information.',
    inputSchema: {
      type: 'object',
      properties: {
        walletId: {
          type: 'string',
          description: 'UUID of the wallet',
        },
      },
      required: ['walletId'],
    },
  },
  {
    name: 'wallet_deposit',
    description: 'Deposit funds into a wallet from an account.',
    inputSchema: {
      type: 'object',
      properties: {
        walletId: {
          type: 'string',
          description: 'UUID of the wallet to deposit into',
        },
        amount: {
          type: 'number',
          description: 'Amount to deposit',
        },
        fromAccountId: {
          type: 'string',
          description: 'UUID of the source account',
        },
        reference: {
          type: 'string',
          description: 'Reference note for the deposit (optional)',
        },
      },
      required: ['walletId', 'amount', 'fromAccountId'],
    },
  },
  {
    name: 'wallet_withdraw',
    description: 'Withdraw funds from a wallet to an account.',
    inputSchema: {
      type: 'object',
      properties: {
        walletId: {
          type: 'string',
          description: 'UUID of the wallet to withdraw from',
        },
        amount: {
          type: 'number',
          description: 'Amount to withdraw',
        },
        destinationAccountId: {
          type: 'string',
          description: 'UUID of the destination account',
        },
        reference: {
          type: 'string',
          description: 'Reference note for the withdrawal (optional)',
        },
      },
      required: ['walletId', 'amount', 'destinationAccountId'],
    },
  },
  {
    name: 'wallet_test_fund',
    description: 'Add test funds to a wallet (sandbox/test mode only). Max 100,000 USDC per request.',
    inputSchema: {
      type: 'object',
      properties: {
        walletId: {
          type: 'string',
          description: 'UUID of the wallet to fund',
        },
        amount: {
          type: 'number',
          description: 'Amount of test funds to add (max 100,000)',
        },
        currency: {
          type: 'string',
          enum: ['USDC', 'EURC'],
          description: 'Currency (default: USDC)',
        },
        reference: {
          type: 'string',
          description: 'Reference note (optional)',
        },
      },
      required: ['walletId', 'amount'],
    },
  },

  // ==========================================================================
  // x402 Micropayment Tools
  // ==========================================================================
  {
    name: 'x402_create_endpoint',
    description: 'Register an x402 payment endpoint. This defines a paid API route with pricing, volume discounts, and webhook notifications.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Endpoint name (1-255 chars)',
        },
        path: {
          type: 'string',
          description: 'API path (must start with /, max 500 chars)',
        },
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ANY'],
          description: 'HTTP method',
        },
        description: {
          type: 'string',
          description: 'What this endpoint provides (optional, max 1000 chars)',
        },
        accountId: {
          type: 'string',
          description: 'UUID of the account receiving payments',
        },
        basePrice: {
          type: 'number',
          description: 'Price per request in token units (e.g., 0.50 for $0.50 USDC). Min 0.0001, max 999999.',
        },
        currency: {
          type: 'string',
          enum: ['USDC', 'EURC'],
          description: 'Payment currency (default: USDC)',
        },
        volumeDiscounts: {
          type: 'array',
          description: 'Volume discount tiers (optional)',
          items: {
            type: 'object',
            properties: {
              threshold: { type: 'integer', description: 'Minimum call count to qualify for discount' },
              priceMultiplier: { type: 'number', description: 'Price multiplier (0-1, e.g., 0.9 = 10% off)' },
            },
            required: ['threshold', 'priceMultiplier'],
          },
        },
        webhookUrl: {
          type: 'string',
          description: 'URL to notify on payment (optional, must be valid URL)',
        },
        network: {
          type: 'string',
          description: 'Blockchain network (default: base-mainnet)',
        },
      },
      required: ['name', 'path', 'method', 'accountId', 'basePrice'],
    },
  },
  {
    name: 'x402_list_endpoints',
    description: 'List x402 payment endpoints with optional filtering.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'paused', 'disabled'],
          description: 'Filter by endpoint status (optional)',
        },
        account_id: {
          type: 'string',
          description: 'Filter by account UUID (optional)',
        },
        page: {
          type: 'number',
          description: 'Page number (optional)',
        },
        limit: {
          type: 'number',
          description: 'Results per page (optional)',
        },
      },
      required: [],
    },
  },
  {
    name: 'x402_get_endpoint',
    description: 'Get x402 endpoint details including pricing, stats, and recent transactions.',
    inputSchema: {
      type: 'object',
      properties: {
        endpointId: {
          type: 'string',
          description: 'UUID of the endpoint',
        },
      },
      required: ['endpointId'],
    },
  },
  {
    name: 'x402_pay',
    description: 'Make an x402 micropayment to a paid endpoint. Deducts from a wallet and returns a payment proof JWT.',
    inputSchema: {
      type: 'object',
      properties: {
        endpointId: {
          type: 'string',
          description: 'UUID of the x402 endpoint to pay',
        },
        walletId: {
          type: 'string',
          description: 'UUID of the wallet to pay from',
        },
        amount: {
          type: 'number',
          description: 'Payment amount (must match endpoint basePrice)',
        },
        currency: {
          type: 'string',
          enum: ['USDC', 'EURC'],
          description: 'Payment currency (must match endpoint currency)',
        },
        method: {
          type: 'string',
          description: 'HTTP method of the request being paid for (e.g., "GET")',
        },
        path: {
          type: 'string',
          description: 'Path of the request being paid for (e.g., "/api/data")',
        },
      },
      required: ['endpointId', 'walletId', 'amount', 'currency', 'method', 'path'],
    },
  },
  {
    name: 'x402_verify',
    description: 'Verify an x402 payment was completed. Supports fast JWT verification or database verification.',
    inputSchema: {
      type: 'object',
      properties: {
        jwt: {
          type: 'string',
          description: 'JWT payment proof for fast verification (~1ms)',
        },
        requestId: {
          type: 'string',
          description: 'Request ID for database verification (use with transferId)',
        },
        transferId: {
          type: 'string',
          description: 'Transfer ID for database verification (use with requestId)',
        },
      },
      required: [],
    },
  },
];

/**
 * Handler for listing available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools,
  };
});

/**
 * Handler for tool execution
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_settlement_quote': {
        const quote = await sly.getSettlementQuote(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(quote, null, 2),
            },
          ],
        };
      }

      case 'create_settlement': {
        const settlement = await sly.createSettlement(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(settlement, null, 2),
            },
          ],
        };
      }

      case 'get_settlement_status': {
        const { settlementId } = args as { settlementId: string };
        const settlement = await sly.getSettlement(settlementId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(settlement, null, 2),
            },
          ],
        };
      }

      // ======================================================================
      // UCP Tools
      // ======================================================================

      case 'ucp_discover': {
        const { merchantUrl } = args as { merchantUrl: string };
        const profile = await sly.ucp.discover(merchantUrl);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(profile, null, 2),
            },
          ],
        };
      }

      case 'ucp_create_checkout': {
        const {
          currency, line_items, buyer, shipping_address, payment_config,
          payment_instruments, checkout_type, metadata,
        } = args as {
          currency: string;
          line_items: Array<{ id?: string; name: string; quantity: number; unit_price: number; total_price: number; description?: string; image_url?: string; product_url?: string }>;
          buyer?: { email?: string; name?: string; phone?: string };
          shipping_address?: { line1: string; line2?: string; city: string; state?: string; postal_code: string; country: string };
          payment_config?: { handlers?: string[]; default_handler?: string; capture_method?: string };
          payment_instruments?: Array<{ id: string; handler: string; type: string; last4?: string; brand?: string }>;
          checkout_type?: 'physical' | 'digital' | 'service';
          metadata?: Record<string, any>;
        };
        const body: Record<string, any> = { currency, line_items, buyer, shipping_address, payment_config, metadata };
        if (payment_instruments) body.payment_instruments = payment_instruments;
        if (checkout_type) body.checkout_type = checkout_type;
        const result = await sly.request('/v1/ucp/checkouts', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'ucp_get_checkout': {
        const { checkoutId } = args as { checkoutId: string };
        const result = await sly.request(`/v1/ucp/checkouts/${checkoutId}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'ucp_list_checkouts': {
        const params = new URLSearchParams();
        if (args && (args as any).status) params.set('status', (args as any).status);
        if (args && (args as any).page) params.set('page', String((args as any).page));
        if (args && (args as any).limit) params.set('limit', String((args as any).limit));
        const query = params.toString();
        const result = await sly.request(`/v1/ucp/checkouts${query ? `?${query}` : ''}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'ucp_update_checkout': {
        const { checkoutId, ...updates } = args as {
          checkoutId: string;
          line_items?: any[];
          buyer?: any;
          shipping_address?: any;
          billing_address?: any;
          metadata?: any;
        };
        const result = await sly.request(`/v1/ucp/checkouts/${checkoutId}`, {
          method: 'PUT',
          body: JSON.stringify(updates),
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'ucp_complete_checkout': {
        const { checkoutId } = args as { checkoutId: string };
        const result = await sly.request(`/v1/ucp/checkouts/${checkoutId}/complete`, {
          method: 'POST',
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'ucp_cancel_checkout': {
        const { checkoutId } = args as { checkoutId: string };
        const result = await sly.request(`/v1/ucp/checkouts/${checkoutId}/cancel`, {
          method: 'POST',
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'ucp_add_payment_instrument': {
        const { checkoutId, id: instrumentId, handler, type: instrumentType, last4, brand, metadata } = args as {
          checkoutId: string;
          id: string;
          handler: string;
          type: string;
          last4?: string;
          brand?: string;
          metadata?: Record<string, any>;
        };
        const result = await sly.request(`/v1/ucp/checkouts/${checkoutId}/instruments`, {
          method: 'POST',
          body: JSON.stringify({ id: instrumentId, handler, type: instrumentType, last4, brand, metadata }),
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'ucp_batch_checkout': {
        const { checkouts } = args as {
          checkouts: Array<{
            currency: string;
            line_items: Array<{ id?: string; name: string; quantity: number; unit_price: number; total_price: number; description?: string }>;
            buyer?: { email?: string; name?: string };
            shipping_address?: { line1: string; city: string; postal_code: string; country: string; state?: string };
            payment_instruments?: Array<{ id: string; handler: string; type: string }>;
            checkout_type?: 'physical' | 'digital' | 'service';
            metadata?: Record<string, any>;
          }>;
        };

        const results: Array<{ checkout_id: string; order_id?: string; status: string; error?: string }> = [];

        for (const spec of checkouts) {
          let checkoutId = '';
          try {
            // Create checkout with all fields
            const body: Record<string, any> = {
              currency: spec.currency,
              line_items: spec.line_items,
              buyer: spec.buyer,
              shipping_address: spec.shipping_address,
              metadata: spec.metadata,
            };
            if (spec.payment_instruments) body.payment_instruments = spec.payment_instruments;
            if (spec.checkout_type) body.checkout_type = spec.checkout_type;

            // Create the checkout (use direct fetch to get full response control)
            const createRes = await fetch(`${SLY_API_URL}/v1/ucp/checkouts`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SLY_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(body),
            });
            const createJson = await createRes.json() as any;
            // Unwrap { success, data } envelope from response wrapper middleware
            const created = createJson?.data || createJson;

            if (!createRes.ok) {
              results.push({ checkout_id: 'failed', status: 'error', error: `Create failed: ${createJson?.error?.message || createJson?.error || createRes.statusText}` });
              continue;
            }

            checkoutId = created?.id;
            if (!checkoutId) {
              results.push({ checkout_id: 'unknown', status: 'error', error: `Create returned no id` });
              continue;
            }

            // Always attempt to complete — the complete endpoint validates
            // readiness internally. This avoids relying on the status field
            // from the create response which can be undefined.
            const completeRes = await fetch(`${SLY_API_URL}/v1/ucp/checkouts/${checkoutId}/complete`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SLY_API_KEY}`,
                'Content-Type': 'application/json',
              },
            });
            const completeJson = await completeRes.json() as any;
            // Unwrap { success, data } envelope
            const completed = completeJson?.data || completeJson;

            if (completeRes.ok) {
              results.push({
                checkout_id: completed?.id || checkoutId,
                order_id: completed?.order_id,
                status: completed?.status || 'completed',
              });
            } else {
              // Complete failed — report the checkout as created but not completed
              results.push({
                checkout_id: checkoutId,
                status: created?.status || 'created',
                error: `Complete failed (${completeRes.status}): ${completeJson?.error?.message || completeJson?.error || 'unknown error'}`,
              });
            }
          } catch (err: any) {
            results.push({
              checkout_id: checkoutId || 'failed',
              status: 'error',
              error: err.message,
            });
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                total: checkouts.length,
                completed: results.filter(r => r.status === 'completed').length,
                failed: results.filter(r => r.error).length,
                results,
              }, null, 2),
            },
          ],
        };
      }

      case 'ucp_list_orders': {
        const params = new URLSearchParams();
        if (args && (args as any).status) params.set('status', (args as any).status);
        if (args && (args as any).page) params.set('page', String((args as any).page));
        if (args && (args as any).limit) params.set('limit', String((args as any).limit));
        const query = params.toString();
        const result = await sly.request(`/v1/ucp/orders${query ? `?${query}` : ''}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'ucp_get_order': {
        const { orderId } = args as { orderId: string };
        const result = await sly.request(`/v1/ucp/orders/${orderId}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'ucp_update_order_status': {
        const { orderId, status } = args as { orderId: string; status: string };
        const result = await sly.request(`/v1/ucp/orders/${orderId}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status }),
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'ucp_cancel_order': {
        const { orderId, reason } = args as { orderId: string; reason?: string };
        const result = await sly.request(`/v1/ucp/orders/${orderId}/cancel`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'ucp_add_fulfillment_event': {
        const { orderId, type: eventType, description, tracking_number, carrier } = args as {
          orderId: string;
          type: string;
          description: string;
          tracking_number?: string;
          carrier?: string;
        };
        const result = await sly.request(`/v1/ucp/orders/${orderId}/events`, {
          method: 'POST',
          body: JSON.stringify({ type: eventType, description, tracking_number, carrier }),
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      // ======================================================================
      // Agent Management Tools
      // ======================================================================

      case 'list_accounts': {
        const params = new URLSearchParams();
        if (args && (args as any).type) params.set('type', (args as any).type);
        if (args && (args as any).status) params.set('status', (args as any).status);
        const query = params.toString();
        const result = await sly.request(`/v1/accounts${query ? `?${query}` : ''}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'create_agent': {
        const { accountId, name: agentName, description } = args as {
          accountId: string;
          name: string;
          description?: string;
        };
        const result = await sly.request('/v1/agents', {
          method: 'POST',
          body: JSON.stringify({
            accountId,
            name: agentName,
            description,
          }),
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'verify_agent': {
        const { agentId, tier } = args as { agentId: string; tier: number };
        const result = await sly.request(`/v1/agents/${agentId}/verify`, {
          method: 'POST',
          body: JSON.stringify({ tier }),
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_agent': {
        const { agentId } = args as { agentId: string };
        const result = await sly.request(`/v1/agents/${agentId}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_agent_limits': {
        const { agentId } = args as { agentId: string };
        const result = await sly.request(`/v1/agents/${agentId}/limits`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      // ======================================================================
      // AP2 Mandate Tools
      // ======================================================================

      case 'ap2_create_mandate': {
        const {
          mandate_id,
          agent_id,
          account_id,
          authorized_amount,
          currency,
          mandate_type,
          description,
          expires_at,
        } = args as {
          mandate_id: string;
          agent_id: string;
          account_id: string;
          authorized_amount: number;
          currency?: string;
          mandate_type?: string;
          description?: string;
          expires_at?: string;
        };
        const result = await sly.ap2.createMandate({
          mandate_id,
          agent_id,
          account_id,
          authorized_amount,
          currency,
          mandate_type: (mandate_type as 'intent' | 'cart' | 'payment') || 'payment',
          mandate_data: description ? { description } : undefined,
          expires_at,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'ap2_get_mandate': {
        const { mandateId } = args as { mandateId: string };
        const result = await sly.ap2.getMandate(mandateId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'ap2_execute_mandate': {
        const { mandateId, amount, currency, description } = args as {
          mandateId: string;
          amount: number;
          currency?: string;
          description?: string;
        };
        const result = await sly.ap2.executeMandate(mandateId, {
          amount,
          currency,
          description,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'ap2_list_mandates': {
        const { status, agent_id, account_id, limit } = (args || {}) as {
          status?: 'active' | 'completed' | 'cancelled' | 'expired';
          agent_id?: string;
          account_id?: string;
          limit?: number;
        };
        const result = await sly.ap2.listMandates({
          status,
          agent_id,
          account_id,
          limit,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      // ======================================================================
      // ACP Checkout Tools
      // ======================================================================

      case 'acp_create_checkout': {
        const {
          checkout_id,
          agent_id,
          account_id,
          merchant_id,
          items,
          tax_amount,
          shipping_amount,
          payment_method,
          checkout_data,
        } = args as {
          checkout_id: string;
          agent_id: string;
          account_id?: string;
          merchant_id: string;
          items: Array<{
            name: string;
            description?: string;
            quantity: number;
            unit_price: number;
            total_price: number;
          }>;
          tax_amount?: number;
          shipping_amount?: number;
          payment_method?: string;
          checkout_data?: Record<string, any>;
        };
        const result = await sly.acp.createCheckout({
          checkout_id,
          agent_id,
          account_id: account_id || '',
          merchant_id,
          items,
          tax_amount,
          shipping_amount,
          payment_method,
          checkout_data,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'acp_get_checkout': {
        const { checkoutId } = args as { checkoutId: string };
        const result = await sly.acp.getCheckout(checkoutId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'acp_complete_checkout': {
        const { checkoutId, shared_payment_token, payment_method } = args as {
          checkoutId: string;
          shared_payment_token?: string;
          payment_method?: string;
        };
        const token = shared_payment_token || `spt_test_${Date.now()}`;
        const result = await sly.acp.completeCheckout(checkoutId, {
          shared_payment_token: token,
          payment_method,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'acp_list_checkouts': {
        const { status, agent_id, merchant_id, limit } = (args || {}) as {
          status?: 'pending' | 'completed' | 'cancelled' | 'expired';
          agent_id?: string;
          merchant_id?: string;
          limit?: number;
        };
        const result = await sly.acp.listCheckouts({
          status: status as any,
          agent_id,
          merchant_id,
          limit,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      // ======================================================================
      // Wallet Management Tools
      // ======================================================================

      case 'list_wallets': {
        const params = new URLSearchParams();
        if (args && (args as any).owner_account_id) params.set('owner_account_id', (args as any).owner_account_id);
        if (args && (args as any).managed_by_agent_id) params.set('managed_by_agent_id', (args as any).managed_by_agent_id);
        if (args && (args as any).status) params.set('status', (args as any).status);
        if (args && (args as any).page) params.set('page', String((args as any).page));
        if (args && (args as any).limit) params.set('limit', String((args as any).limit));
        const query = params.toString();
        const result = await sly.request(`/v1/wallets${query ? `?${query}` : ''}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'create_wallet': {
        const {
          accountId,
          name: walletName,
          currency,
          walletType,
          blockchain,
          initialBalance,
          managedByAgentId,
          purpose,
        } = args as {
          accountId: string;
          name?: string;
          currency?: string;
          walletType?: string;
          blockchain?: string;
          initialBalance?: number;
          managedByAgentId?: string;
          purpose?: string;
        };
        const result = await sly.request('/v1/wallets', {
          method: 'POST',
          body: JSON.stringify({
            accountId,
            name: walletName,
            currency,
            walletType,
            blockchain,
            initialBalance,
            managedByAgentId,
            purpose,
          }),
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_wallet': {
        const { walletId } = args as { walletId: string };
        const result = await sly.request(`/v1/wallets/${walletId}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_wallet_balance': {
        const { walletId } = args as { walletId: string };
        const result = await sly.request(`/v1/wallets/${walletId}/balance`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'wallet_deposit': {
        const { walletId, amount, fromAccountId, reference } = args as {
          walletId: string;
          amount: number;
          fromAccountId: string;
          reference?: string;
        };
        const result = await sly.request(`/v1/wallets/${walletId}/deposit`, {
          method: 'POST',
          body: JSON.stringify({ amount, fromAccountId, reference }),
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'wallet_withdraw': {
        const { walletId, amount, destinationAccountId, reference } = args as {
          walletId: string;
          amount: number;
          destinationAccountId: string;
          reference?: string;
        };
        const result = await sly.request(`/v1/wallets/${walletId}/withdraw`, {
          method: 'POST',
          body: JSON.stringify({ amount, destinationAccountId, reference }),
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'wallet_test_fund': {
        const { walletId, amount, currency, reference } = args as {
          walletId: string;
          amount: number;
          currency?: string;
          reference?: string;
        };
        const result = await sly.request(`/v1/wallets/${walletId}/test-fund`, {
          method: 'POST',
          body: JSON.stringify({ amount, currency, reference }),
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      // ======================================================================
      // x402 Micropayment Tools
      // ======================================================================

      case 'x402_create_endpoint': {
        const {
          name: endpointName,
          path,
          method,
          description,
          accountId,
          basePrice,
          currency,
          volumeDiscounts,
          webhookUrl,
        } = args as {
          name: string;
          path: string;
          method?: string;
          description?: string;
          accountId: string;
          basePrice: number;
          currency?: string;
          volumeDiscounts?: Array<{ minCalls: number; discountPercent: number }>;
          webhookUrl?: string;
        };
        const result = await sly.request('/v1/x402/endpoints', {
          method: 'POST',
          body: JSON.stringify({
            name: endpointName,
            path,
            method,
            description,
            accountId,
            basePrice,
            currency,
            volumeDiscounts,
            webhookUrl,
          }),
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'x402_list_endpoints': {
        const params = new URLSearchParams();
        if (args && (args as any).status) params.set('status', (args as any).status);
        if (args && (args as any).account_id) params.set('account_id', (args as any).account_id);
        if (args && (args as any).page) params.set('page', String((args as any).page));
        if (args && (args as any).limit) params.set('limit', String((args as any).limit));
        const query = params.toString();
        const result = await sly.request(`/v1/x402/endpoints${query ? `?${query}` : ''}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'x402_get_endpoint': {
        const { endpointId } = args as { endpointId: string };
        const result = await sly.request(`/v1/x402/endpoints/${endpointId}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'x402_pay': {
        const { endpointId, walletId, amount, currency, method: httpMethod, path: endpointPath } = args as {
          endpointId: string;
          walletId: string;
          amount: number;
          currency: string;
          method: string;
          path: string;
        };
        const requestId = crypto.randomUUID();
        const result = await sly.request('/v1/x402/pay', {
          method: 'POST',
          body: JSON.stringify({
            endpointId,
            requestId,
            amount,
            currency,
            walletId,
            method: httpMethod,
            path: endpointPath,
            timestamp: Math.floor(Date.now() / 1000),
          }),
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'x402_verify': {
        const { jwt, requestId, transferId } = args as {
          jwt?: string;
          requestId?: string;
          transferId?: string;
        };
        const result = await sly.request('/v1/x402/verify', {
          method: 'POST',
          body: JSON.stringify({ jwt, requestId, transferId }),
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    const details = error.details || error.errors || '';
    const detailsStr = details ? `\nDetails: ${JSON.stringify(details, null, 2)}` : '';
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}${detailsStr}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Sly MCP server running on stdio');
  console.error(`Environment: ${SLY_ENVIRONMENT}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
