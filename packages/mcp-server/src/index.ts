#!/usr/bin/env node

/**
 * PayOS MCP Server
 * 
 * Model Context Protocol server for Claude Desktop integration.
 * Exposes PayOS payment capabilities as MCP tools.
 * 
 * Usage:
 *   npx @payos/mcp-server
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
import { PayOS } from '@payos/sdk';

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
    name: '@payos/mcp-server',
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

