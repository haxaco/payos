#!/usr/bin/env node

/**
 * PayOS MCP Server
 * 
 * Model Context Protocol server for Claude Desktop integration.
 * Exposes PayOS payment capabilities as MCP tools.
 * 
 * Usage:
 *   npx @sly/mcp-server
 * 
 * Configuration via environment variables:
 *   PAYOS_API_KEY - Your PayOS API key (required)
 *   PAYOS_ENVIRONMENT - 'sandbox' | 'testnet' | 'production' (default: 'sandbox')
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { PayOS } from '@sly/sdk';

// Get configuration from environment
const PAYOS_API_KEY = process.env.PAYOS_API_KEY;
const PAYOS_ENVIRONMENT = (process.env.PAYOS_ENVIRONMENT as 'sandbox' | 'testnet' | 'production') || 'sandbox';

if (!PAYOS_API_KEY) {
  console.error('Error: PAYOS_API_KEY environment variable is required');
  process.exit(1);
}

// Initialize PayOS SDK
const payos = new PayOS({
  apiKey: PAYOS_API_KEY,
  environment: PAYOS_ENVIRONMENT,
});

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
 * Define MCP tools from PayOS capabilities
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
  {
    name: 'ucp_get_quote',
    description: 'Get an FX quote for UCP settlement to Brazil (Pix) or Mexico (SPEI). Returns the exchange rate, fees, and destination amount.',
    inputSchema: {
      type: 'object',
      properties: {
        corridor: {
          type: 'string',
          enum: ['pix', 'spei'],
          description: 'Settlement corridor: "pix" for Brazil, "spei" for Mexico',
        },
        amount: {
          type: 'number',
          description: 'Amount in source currency',
        },
        currency: {
          type: 'string',
          enum: ['USD', 'USDC'],
          description: 'Source currency',
        },
      },
      required: ['corridor', 'amount', 'currency'],
    },
  },
  {
    name: 'ucp_acquire_token',
    description: 'Acquire a settlement token for completing a UCP checkout. The token is valid for 15 minutes and locks in the FX rate. Use this before completing a purchase.',
    inputSchema: {
      type: 'object',
      properties: {
        corridor: {
          type: 'string',
          enum: ['pix', 'spei'],
          description: 'Settlement corridor: "pix" for Brazil, "spei" for Mexico',
        },
        amount: {
          type: 'number',
          description: 'Amount in source currency (USD or USDC)',
        },
        currency: {
          type: 'string',
          enum: ['USD', 'USDC'],
          description: 'Source currency',
        },
        recipient: {
          type: 'object',
          description: 'Recipient details (Pix or SPEI)',
          properties: {
            type: {
              type: 'string',
              enum: ['pix', 'spei'],
              description: 'Recipient type matching corridor',
            },
            // Pix fields
            pix_key: {
              type: 'string',
              description: 'Pix key (for pix type)',
            },
            pix_key_type: {
              type: 'string',
              enum: ['cpf', 'cnpj', 'email', 'phone', 'evp'],
              description: 'Type of Pix key (for pix type)',
            },
            // SPEI fields
            clabe: {
              type: 'string',
              description: 'CLABE number - 18 digits (for spei type)',
            },
            // Common fields
            name: {
              type: 'string',
              description: 'Recipient name',
            },
            tax_id: {
              type: 'string',
              description: 'CPF/CNPJ for Pix or RFC for SPEI (optional)',
            },
          },
          required: ['type', 'name'],
        },
      },
      required: ['corridor', 'amount', 'currency', 'recipient'],
    },
  },
  {
    name: 'ucp_settle',
    description: 'Complete a settlement using a previously acquired token. This initiates the actual transfer to the recipient via Pix or SPEI.',
    inputSchema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'Settlement token from ucp_acquire_token (starts with ucp_tok_)',
        },
        idempotency_key: {
          type: 'string',
          description: 'Unique key to prevent duplicate settlements (optional but recommended)',
        },
      },
      required: ['token'],
    },
  },
  {
    name: 'ucp_get_settlement',
    description: 'Check the status of a UCP settlement. Settlements go through: pending → processing → completed (or failed).',
    inputSchema: {
      type: 'object',
      properties: {
        settlementId: {
          type: 'string',
          description: 'Settlement ID (UUID)',
        },
      },
      required: ['settlementId'],
    },
  },
  {
    name: 'ucp_list_corridors',
    description: 'List available UCP settlement corridors with their currencies, rails, and estimated settlement times.',
    inputSchema: {
      type: 'object',
      properties: {},
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
        const quote = await payos.getSettlementQuote(args as any);
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
        const settlement = await payos.createSettlement(args as any);
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
        const settlement = await payos.getSettlement(settlementId);
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
        const profile = await payos.ucp.discover(merchantUrl);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(profile, null, 2),
            },
          ],
        };
      }

      case 'ucp_get_quote': {
        const { corridor, amount, currency } = args as {
          corridor: 'pix' | 'spei';
          amount: number;
          currency: 'USD' | 'USDC';
        };
        const quote = await payos.ucp.getQuote({ corridor, amount, currency });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(quote, null, 2),
            },
          ],
        };
      }

      case 'ucp_acquire_token': {
        const { corridor, amount, currency, recipient } = args as {
          corridor: 'pix' | 'spei';
          amount: number;
          currency: 'USD' | 'USDC';
          recipient: any;
        };
        const token = await payos.ucp.acquireToken({
          corridor,
          amount,
          currency,
          recipient,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(token, null, 2),
            },
          ],
        };
      }

      case 'ucp_settle': {
        const { token, idempotency_key } = args as {
          token: string;
          idempotency_key?: string;
        };
        const settlement = await payos.ucp.settle({ token, idempotency_key });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(settlement, null, 2),
            },
          ],
        };
      }

      case 'ucp_get_settlement': {
        const { settlementId } = args as { settlementId: string };
        const settlement = await payos.ucp.getSettlement(settlementId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(settlement, null, 2),
            },
          ],
        };
      }

      case 'ucp_list_corridors': {
        const corridors = await payos.ucp.getCorridors();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ corridors }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
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
  
  console.error('PayOS MCP server running on stdio');
  console.error(`Environment: ${PAYOS_ENVIRONMENT}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

