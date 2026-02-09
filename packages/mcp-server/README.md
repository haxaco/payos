# @sly/mcp-server

Model Context Protocol (MCP) server for Sly, enabling Claude Desktop integration.

## What is MCP?

[Model Context Protocol](https://modelcontextprotocol.io/) is Anthropic's open protocol for connecting AI assistants like Claude to external tools and data sources. This server exposes Sly payment operations as MCP tools that Claude can use.

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
    "sly": {
      "command": "npx",
      "args": ["@sly/mcp-server"],
      "env": {
        "SLY_API_KEY": "pk_test_...",
        "SLY_ENVIRONMENT": "sandbox"
      }
    }
  }
}
```

### Environment Variables

- `SLY_API_KEY` (required): Your Sly API key
- `SLY_ENVIRONMENT` (optional): Environment to use
  - `sandbox` (default): Local development, no real transactions
  - `testnet`: Testnet with real blockchain transactions
  - `production`: Production environment

## Available Tools

Once configured, Claude Desktop will have access to 22 tools across 5 categories:

### Settlement Tools

#### `get_settlement_quote`
Get a settlement quote for cross-border payment.

**Parameters:**
- `fromCurrency`: Source currency (USD, BRL, MXN, USDC)
- `toCurrency`: Destination currency (USD, BRL, MXN, USDC)
- `amount`: Amount to convert
- `rail` (optional): Settlement rail (pix, spei, wire, usdc)

#### `create_settlement`
Execute a settlement using a quote.

**Parameters:**
- `quoteId`: Quote ID from get_settlement_quote
- `destinationAccountId`: Destination account ID
- `metadata` (optional): Additional metadata

#### `get_settlement_status`
Check the status of a settlement.

**Parameters:**
- `settlementId`: Settlement ID

### UCP (Universal Commerce Protocol) Tools

#### `ucp_discover`
Discover a merchant's UCP capabilities.

#### `ucp_get_quote`
Get an FX quote for settlement to Brazil (Pix) or Mexico (SPEI).

#### `ucp_acquire_token`
Acquire a settlement token that locks in an FX rate for 15 minutes.

#### `ucp_settle`
Complete a settlement using a previously acquired token.

#### `ucp_get_settlement`
Check the status of a UCP settlement.

#### `ucp_list_corridors`
List available settlement corridors.

### Agent Management Tools

#### `list_accounts`
List accounts for the current tenant. Use to find a business account for agent creation.

#### `create_agent`
Register a new AI agent under a business account.

**Parameters:**
- `accountId`: UUID of the parent business account
- `name`: Name for the agent
- `description` (optional): What the agent does

#### `verify_agent`
Verify an agent at a KYA tier (1-3). Higher tiers unlock higher spending limits.

#### `get_agent`
Get agent details including KYA tier, status, and permissions.

#### `get_agent_limits`
Get spending limits and current usage for an agent.

### AP2 (Agent-to-Agent Protocol) Mandate Tools

#### `ap2_create_mandate`
Create a spending mandate that authorizes an agent to spend up to a budget.

**Parameters:**
- `mandate_id`: Unique mandate identifier
- `agent_id`: Agent UUID
- `account_id`: Funding account UUID
- `authorized_amount`: Maximum spend amount
- `currency` (optional): Currency (default: USD)
- `mandate_type` (optional): intent | cart | payment

#### `ap2_get_mandate`
Get mandate details including execution history and remaining budget.

#### `ap2_execute_mandate`
Execute a payment against a mandate. Deducts from the budget and creates a transfer.

#### `ap2_list_mandates`
List mandates with optional filtering by status, agent, or account.

### ACP (Agentic Commerce Protocol) Checkout Tools

#### `acp_create_checkout`
Create a checkout session with items for an agent to purchase.

**Parameters:**
- `checkout_id`: Unique checkout identifier
- `agent_id`: Agent UUID
- `merchant_id`: Merchant identifier
- `items`: Array of items (name, quantity, unit_price, total_price)
- `tax_amount`, `shipping_amount` (optional): Additional charges

#### `acp_get_checkout`
Get checkout details including items, totals, and status.

#### `acp_complete_checkout`
Complete and pay for a checkout.

#### `acp_list_checkouts`
List checkouts with optional filtering.

## Shopping Demo Flow

With all tools available, Claude can run the full shopping demo:

```
User: List my accounts and find a business account

Claude: [Uses list_accounts] Found "TechCorp Trading" (acct_xxx)

User: Create a Shopping Agent under that account

Claude: [Uses create_agent] Created "Shopping Agent" (agent_xxx)

User: Verify the agent at KYA Tier 1

Claude: [Uses verify_agent] Agent verified at Tier 1

User: Create a $500 spending mandate for the agent

Claude: [Uses ap2_create_mandate] Mandate created with $500 budget

User: Create a checkout with sneakers ($199) and a backpack ($89)

Claude: [Uses acp_create_checkout] Checkout created, total: $288

User: Complete the checkout and record the payment

Claude: [Uses acp_complete_checkout, ap2_execute_mandate]
       Checkout completed! $288 deducted from mandate.
       Remaining budget: $212
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run locally
SLY_API_KEY=pk_test_xxx pnpm start

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
SLY_API_KEY=pk_test_xxx mcp-inspector npx @sly/mcp-server
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
│  Sly API        │
│  (api.sly.dev)  │
└─────────────────┘
```

## License

MIT
