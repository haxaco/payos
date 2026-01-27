# @sly/mcp-server

Model Context Protocol (MCP) server for PayOS, enabling Claude Desktop integration.

## What is MCP?

[Model Context Protocol](https://modelcontextprotocol.io/) is Anthropic's open protocol for connecting AI assistants like Claude to external tools and data sources. This server exposes PayOS payment operations as MCP tools that Claude can use.

## Installation

```bash
# From npm (when published)
npm install -g @sly/mcp-server

# From source
cd packages/mcp-server
pnpm build
pnpm link --global
```

## Configuration

### Claude Desktop Setup

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "payos": {
      "command": "npx",
      "args": ["@sly/mcp-server"],
      "env": {
        "PAYOS_API_KEY": "payos_sandbox_...",
        "PAYOS_ENVIRONMENT": "sandbox"
      }
    }
  }
}
```

### Environment Variables

- `PAYOS_API_KEY` (required): Your PayOS API key
- `PAYOS_ENVIRONMENT` (optional): Environment to use
  - `sandbox` (default): Local development, no real transactions
  - `testnet`: Testnet with real blockchain transactions
  - `production`: Production environment

### Get an API Key

1. Go to [https://payos.ai/dashboard/api-keys](https://payos.ai/dashboard/api-keys)
2. Create a new API key
3. Copy and paste into your Claude Desktop config

## Available Tools

Once configured, Claude Desktop will have access to:

### `get_settlement_quote`
Get a settlement quote for cross-border payment.

**Parameters:**
- `fromCurrency`: Source currency (USD, BRL, MXN, USDC)
- `toCurrency`: Destination currency (USD, BRL, MXN, USDC)
- `amount`: Amount to convert
- `rail` (optional): Settlement rail (pix, spei, wire, usdc)

**Example conversation:**
```
User: How much would it cost to send $100 to Brazil via Pix?

Claude: [Uses get_settlement_quote tool]
       To send $100 to Brazil via Pix:
       - You'll receive: 500.25 BRL
       - Exchange rate: 5.0025 BRL/USD
       - Fee: $0.50
       - Estimated settlement: 10 seconds
```

### `create_settlement`
Execute a settlement using a quote.

**Parameters:**
- `quoteId`: Quote ID from get_settlement_quote
- `destinationAccountId`: Destination account ID
- `metadata` (optional): Additional metadata

**Example conversation:**
```
User: Execute that settlement to account acct_brazil_123

Claude: [Uses create_settlement tool]
       Settlement created successfully!
       - ID: set_abc123
       - Status: processing
       - Expected completion: ~10 seconds
```

### `get_settlement_status`
Check the status of a settlement.

**Parameters:**
- `settlementId`: Settlement ID

**Example conversation:**
```
User: Check the status of settlement set_abc123

Claude: [Uses get_settlement_status tool]
       Settlement set_abc123 is completed!
       - Completed at: 2025-01-03T16:45:23Z
       - Final amount: 500.25 BRL
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run locally
PAYOS_API_KEY=payos_sandbox_xxx pnpm start

# Run tests
pnpm test

# Watch mode
pnpm dev
```

## Testing with MCP Inspector

The [MCP Inspector](https://github.com/modelcontextprotocol/inspector) is a tool for debugging MCP servers:

```bash
# Install inspector
npm install -g @modelcontextprotocol/inspector

# Run server in inspector
PAYOS_API_KEY=payos_sandbox_xxx mcp-inspector npx @sly/mcp-server
```

## Architecture

```
┌─────────────────┐
│ Claude Desktop  │
└────────┬────────┘
         │ MCP Protocol (stdio)
┌────────┴────────┐
│  MCP Server     │
│  (This package) │
└────────┬────────┘
         │ HTTP
┌────────┴────────┐
│  PayOS API      │
│  (api.payos.ai) │
└─────────────────┘
```

## YC Demo

This MCP server is the centerpiece of the YC demo:

1. **Live in Claude Desktop**: No custom UI needed
2. **Natural language**: "Send $100 to Brazil via Pix"
3. **Real-time**: Instant quotes and settlement
4. **Cross-border**: USD → BRL via Pix in 10 seconds

Demo script:
```
User: I need to pay a contractor in Brazil $500

Claude: [Gets quote, shows rate and fees, confirms]

User: Yes, proceed

Claude: [Creates settlement, shows status]
       Payment sent! Your contractor will receive 2,501.25 BRL
       via Pix in approximately 10 seconds.
```

## License

MIT

