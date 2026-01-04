# Testing PayOS MCP with Claude Desktop

This guide walks you through testing PayOS payments directly in Claude Desktop using the Model Context Protocol (MCP).

## Prerequisites

1. **Claude Desktop** installed ([download here](https://claude.ai/desktop))
2. **PayOS API running** locally on `http://localhost:4000`
3. **Node.js 18+** installed
4. **Your PayOS API key** (from your tenant)

---

## Step 1: Build the MCP Server

```bash
cd /Users/haxaco/Dev/PayOS

# Install dependencies
pnpm install

# Build the MCP server
cd packages/mcp-server
pnpm build
```

---

## Step 2: Configure Claude Desktop

Open your Claude Desktop config file:

```bash
# macOS
code ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Or create it if it doesn't exist
mkdir -p ~/Library/Application\ Support/Claude
touch ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

Add this configuration:

```json
{
  "mcpServers": {
    "payos": {
      "command": "node",
      "args": ["/Users/haxaco/Dev/PayOS/packages/mcp-server/dist/index.js"],
      "env": {
        "PAYOS_API_KEY": "YOUR_API_KEY_HERE",
        "PAYOS_ENVIRONMENT": "sandbox"
      }
    }
  }
}
```

### Getting Your API Key

You can get your API key using the SDK's authentication:

```bash
# From the PayOS directory
cd /Users/haxaco/Dev/PayOS/apps/sample-consumer

# Run with your credentials
PAYOS_API_URL=http://localhost:4000 \
USER_EMAIL=haxaco@gmail.com \
USER_PASSWORD=your_password \
pnpm tsx src/index-new.ts
```

Or query the database directly:

```sql
SELECT key FROM api_keys WHERE tenant_id = 'your-tenant-id' LIMIT 1;
```

---

## Step 3: Restart Claude Desktop

**Important:** After editing the config, you must completely quit and restart Claude Desktop.

On macOS:
- Cmd + Q to fully quit
- Reopen Claude from Applications

---

## Step 4: Verify MCP is Connected

In Claude Desktop, you should see a **🔌 plug icon** or **tools indicator** showing "payos" is connected.

Try asking Claude:
```
What payment capabilities do you have?
```

Claude should respond listing the PayOS tools:
- `get_settlement_quote` - Get FX quotes
- `create_settlement` - Execute settlements
- `get_settlement_status` - Check status

---

## Step 5: Test Payment Scenarios

### Scenario 1: Get a Quote

```
How much would it cost to send $100 USD to Brazil via Pix?
```

Expected: Claude calls `get_settlement_quote` and shows:
- Exchange rate (e.g., 5.25 BRL/USD)
- Total fees
- Amount recipient receives
- Estimated settlement time

### Scenario 2: Execute Settlement

```
Send $50 to account acc_brazil_123 using that quote
```

Expected: Claude calls `create_settlement` and shows:
- Settlement ID
- Status: processing
- Expected completion time

### Scenario 3: Check Status

```
What's the status of settlement set_abc123?
```

Expected: Claude calls `get_settlement_status` and shows:
- Current status (completed/processing/failed)
- Timestamps
- Transaction details

---

## Troubleshooting

### MCP Server Not Appearing

1. Check the config file syntax is valid JSON
2. Verify the path to `index.js` is correct
3. Check Claude's developer logs:
   ```bash
   tail -f ~/Library/Logs/Claude/mcp*.log
   ```

### "PAYOS_API_KEY environment variable is required"

Your API key isn't being passed. Double-check:
1. The `env` section in config
2. No extra spaces or quotes in the key

### "Connection refused" or Network Errors

Make sure PayOS API is running:
```bash
cd /Users/haxaco/Dev/PayOS/apps/api
pnpm dev
```

### Testing MCP Server Directly

Use the MCP Inspector tool:

```bash
# Install inspector globally
npm install -g @modelcontextprotocol/inspector

# Run with your API key
PAYOS_API_KEY=your_key_here \
PAYOS_ENVIRONMENT=sandbox \
mcp-inspector node /Users/haxaco/Dev/PayOS/packages/mcp-server/dist/index.js
```

This opens a web UI where you can:
- List available tools
- Test tool calls manually
- See raw responses

---

## Demo Script

Here's a full demo flow you can use:

### 1. Introduction
```
You: What can you help me with for payments?
Claude: I have access to PayOS payment tools. I can:
        - Get settlement quotes for cross-border payments
        - Execute settlements to Brazil (Pix) or Mexico (SPEI)
        - Check settlement status
```

### 2. Quote
```
You: I need to pay a contractor $500 in Brazil
Claude: [Uses get_settlement_quote]
        Here's a quote for $500 USD to Brazil via Pix:
        
        💰 They'll receive: 2,625.00 BRL
        📊 Exchange rate: 5.25 BRL/USD
        💳 Fee: $2.50
        ⚡ Settlement: ~30 seconds
        
        Would you like me to proceed?
```

### 3. Execute
```
You: Yes, send it to account acc_contractor_brazil
Claude: [Uses create_settlement]
        ✅ Settlement initiated!
        
        Settlement ID: set_xyz789
        Status: processing
```

### 4. Confirm
```
You: Is it complete?
Claude: [Uses get_settlement_status]
        🎉 Payment complete!
        
        Your contractor received 2,625.00 BRL
        Transaction ID: set_xyz789
```

---

## Advanced: Adding More Tools

The MCP server can be extended. Edit `/packages/mcp-server/src/index.ts`:

```typescript
// Add to tools array
{
  name: 'list_accounts',
  description: 'List all accounts',
  inputSchema: {
    type: 'object',
    properties: {},
  },
}

// Add to switch statement
case 'list_accounts': {
  const accounts = await payos.listAccounts();
  return {
    content: [{ type: 'text', text: JSON.stringify(accounts, null, 2) }],
  };
}
```

Then rebuild: `pnpm build`

---

## Environment Options

| Environment | API URL | Use Case |
|-------------|---------|----------|
| `sandbox` | `localhost:4000` | Local development |
| `testnet` | TBD | Integration testing |
| `production` | TBD | Live payments |

---

## Resources

- [MCP Specification](https://modelcontextprotocol.io/)
- [Claude Desktop](https://claude.ai/desktop)
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
- [PayOS SDK Docs](/packages/sdk/README.md)

---

*Last updated: January 3, 2026*

