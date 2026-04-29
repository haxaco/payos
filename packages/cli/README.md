# @sly_ai/cli

The Sly command-line interface — a terminal tool for the Sly agentic economy platform.

Use it for ops work, scripting, CI/CD, and anywhere you'd reach for `curl` against the Sly API.

## Install

```bash
npm install -g @sly_ai/cli
# or
pnpm add -g @sly_ai/cli
```

Verify:

```bash
sly --version
```

## Authenticate

The CLI reads credentials from environment variables:

```bash
# Required
export SLY_API_KEY=pk_test_...   # or pk_live_*

# Optional — defaults to sandbox for pk_test_, production for pk_live_
export SLY_API_URL=https://api.getsly.ai
```

Your key prefix (`pk_test_` vs `pk_live_`) automatically selects the correct base URL.

## Commands

All command groups:

| Group | Description |
|---|---|
| `sly accounts` | Manage person / business accounts |
| `sly agents` | Create agents, provision Ed25519 keys, manage skills |
| `sly wallets` | Read balances, fund wallets (sandbox), freeze/unfreeze |
| `sly agent-wallets` | Agent-scoped wallet operations and policies |
| `sly merchants` | UCP merchant catalog |
| `sly settlement` | Settlement windows, rules, reconciliation |
| `sly x402` | x402 payment endpoints, facilitator, bridge |
| `sly acp` | Agentic Commerce Protocol (Stripe / OpenAI) |
| `sly ap2` | Google AP2 mandates |
| `sly ucp` | Unified Commerce Protocol tokens, settlements |
| `sly mpp` | Machine Payments Protocol sessions |
| `sly a2a` | Agent-to-agent tasks, marketplace, skills |
| `sly support` | Open a support ticket |
| `sly env` | Inspect or swap environment |

Each command group follows a consistent CRUD pattern. Use `sly <group> --help` to see available sub-commands.

## Quick examples

**List accounts**
```bash
sly accounts list
```

**Create a business account**
```bash
sly accounts create \
  --type business \
  --name "Acme Robotics" \
  --email ops@acme.example
```

**Create an agent with an auto-generated Ed25519 keypair**
```bash
sly agents create \
  --account acc_... \
  --name "Payables Bot" \
  --tier 1 \
  --generate-keypair
```

**Send a transfer**
```bash
sly wallets transfer \
  --from wal_source \
  --to wal_dest \
  --amount 42.00 \
  --currency USDC
```

**Fund a wallet in sandbox**
```bash
sly wallets fund --wallet wal_... --amount 1000.00
```

**List agents currently connected over SSE**
```bash
sly agents list --connected
```

**Send an A2A task to a peer agent**
```bash
sly a2a send \
  --to agt_peer_... \
  --skill invoice.review \
  --message "Please review attached PO"
```

## Output formatting

Default output is human-friendly tables. Pass `--json` for scriptable output:

```bash
sly accounts list --json | jq '.[] | select(.type == "business")'
```

## Exit codes

- `0` — success
- `1` — missing credentials or configuration
- `2` — API returned a 4xx
- `3` — API returned a 5xx or network error

Safe for `set -e` pipelines.

## Environment management

```bash
# Show current settings
sly env show

# Test connectivity
sly env ping
```

## Development

If you're contributing to the CLI:

```bash
cd packages/cli
pnpm install
pnpm dev -- accounts list    # run from source
pnpm build                   # produce dist/
```

The CLI is a thin shell over [`@sly_ai/sdk`](https://www.npmjs.com/package/@sly_ai/sdk). Most commands map 1:1 to an SDK method — if you're building a non-CLI integration, you'll likely want the SDK directly.

## See also

- **Public docs**: [docs.getsly.ai](https://docs.getsly.ai)
- **SDK**: `@sly_ai/sdk`
- **MCP server**: `@sly_ai/mcp-server` (for Claude Desktop and other agent runtimes)
- **API reference**: [docs.getsly.ai/api-reference](https://docs.getsly.ai/api-reference)

## License

Private. See LICENSE in the monorepo root.
