# Story 36.12: LangChain Tools - COMPLETE

**Status**: ✅ COMPLETE  
**Points**: 3  
**Completed**: January 3, 2025

## Summary

Created LangChain-compatible tool wrappers for PayOS operations, enabling integration with LangChain.js agents and chains.

## Implementation Details

### 1. Tool Definitions (`packages/sdk/src/langchain/tools.ts`)

**Main Functions:**
- `createPayOSLangChainTools(payos)` - Create all tools from a PayOS instance
- `getPayOSLangChainTool(payos, name)` - Get a single tool by name
- `PAYOS_LANGCHAIN_SYSTEM_MESSAGE` - Pre-configured system prompt

**Tools Created:**
1. `get_settlement_quote` - Get FX quote with fees
2. `create_settlement` - Execute settlement from quote
3. `get_settlement_status` - Check settlement status
4. `check_compliance` - Verify recipient compliance

### 2. Type Definitions

```typescript
interface PayOSLangChainTool {
  name: string;
  description: string;
  schema: z.ZodObject<any>;
  func: (input: any) => Promise<string>;
}
```

Tools use Zod schemas for validation, compatible with LangChain's `DynamicStructuredTool`.

### 3. Package Export

Added `./langchain` subpath export:
```json
"./langchain": {
  "types": "./dist/langchain.d.ts",
  "import": "./dist/langchain.mjs",
  "require": "./dist/langchain.js"
}
```

## Testing

```bash
cd packages/sdk && pnpm test
# ✓ 14 LangChain tool tests pass
# ✓ 97 total tests pass
```

Test coverage includes:
- Tool creation
- Tool execution
- Schema validation
- Error handling
- System message content

## Usage Examples

### Basic LangChain Agent

```typescript
import { createPayOSLangChainTools, PAYOS_LANGCHAIN_SYSTEM_MESSAGE } from '@payos/sdk/langchain';
import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { PayOS } from '@payos/sdk';

const payos = new PayOS({
  apiKey: 'payos_...',
  environment: 'sandbox',
});

const tools = createPayOSLangChainTools(payos);

const agent = createReactAgent({
  llm: new ChatOpenAI({ model: 'gpt-4' }),
  tools,
});

const result = await agent.invoke({
  messages: [
    { role: 'system', content: PAYOS_LANGCHAIN_SYSTEM_MESSAGE },
    { role: 'user', content: 'Send $100 to Brazil via Pix' },
  ],
});

console.log(result.messages[result.messages.length - 1].content);
```

### With LangGraph

```typescript
import { StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { createPayOSLangChainTools } from '@payos/sdk/langchain';

const tools = createPayOSLangChainTools(payos);
const toolNode = new ToolNode(tools);

const graph = new StateGraph({
  channels: {
    messages: { reducer: (a, b) => a.concat(b) },
  },
})
  .addNode('agent', agentNode)
  .addNode('tools', toolNode)
  .addEdge('__start__', 'agent')
  .addConditionalEdges('agent', shouldContinue, {
    continue: 'tools',
    end: '__end__',
  })
  .addEdge('tools', 'agent');

const app = graph.compile();
```

### Individual Tool Usage

```typescript
import { getPayOSLangChainTool } from '@payos/sdk/langchain';

const quoteTool = getPayOSLangChainTool(payos, 'get_settlement_quote');

if (quoteTool) {
  const result = await quoteTool.func({
    fromCurrency: 'USD',
    toCurrency: 'BRL',
    amount: '100',
  });
  console.log(result);
}
```

## Architecture

```
┌────────────────────────────────────────────┐
│       LangChain Application                │
│   (Agent, Chain, or Custom Logic)          │
└────────────────┬───────────────────────────┘
                 │ Tool Calls
                 ↓
┌────────────────────────────────────────────┐
│    PayOSLangChainTool[]                    │
│    (Zod schemas + async functions)         │
└────────────────┬───────────────────────────┘
                 │ PayOS SDK Methods
                 ↓
┌────────────────────────────────────────────┐
│         PayOS SDK Client                   │
│    (getSettlementQuote, etc.)              │
└────────────────┬───────────────────────────┘
                 │ HTTP
                 ↓
┌────────────────────────────────────────────┐
│         PayOS API Server                   │
└────────────────────────────────────────────┘
```

## Features

### 1. Zod Schema Validation
All inputs are validated with Zod before execution:
```typescript
schema: z.object({
  fromCurrency: z.enum(['USD', 'BRL', 'MXN', 'USDC']),
  toCurrency: z.enum(['USD', 'BRL', 'MXN', 'USDC']),
  amount: z.string(),
})
```

### 2. Error Handling
Errors are caught and returned as strings:
```typescript
func: async (input: any) => {
  try {
    const quote = await payos.getSettlementQuote(input);
    return JSON.stringify(quote, null, 2);
  } catch (error: any) {
    return `Error: ${error.message}`;
  }
}
```

### 3. Descriptive System Message
Pre-configured prompt explains:
- Available operations
- Payment rails and their characteristics
- Best practices (get quote first, check compliance, etc.)

## Integration Points

### Compatible With:
- **LangChain.js**: Direct tool integration
- **LangGraph**: State machine workflows
- **OpenAI Functions**: Via LangChain adapters
- **Custom Agents**: Generic tool interface

### Example Workflows:

**Simple Payment:**
```
User → Agent → get_settlement_quote → Agent → create_settlement → Agent → User
```

**With Compliance:**
```
User → Agent → check_compliance → Agent → get_settlement_quote → Agent → create_settlement → User
```

**Status Checking:**
```
User → Agent → get_settlement_status → Agent → User
```

## Files Created/Modified

### Created
- `packages/sdk/src/langchain/tools.ts` - Tool implementations
- `packages/sdk/src/langchain/index.ts` - Module exports
- `packages/sdk/src/langchain/tools.test.ts` - Tool tests

### Modified
- `packages/sdk/tsup.config.ts` - Added langchain entry
- `packages/sdk/package.json` - Added langchain export

## Dependencies

Uses `zod` (already in dependencies) for schema validation. No additional dependencies needed.

## Next Steps for Epic 36

With all P0 stories complete (36.1-36.4, 36.7-36.12), the SDK is ready for:
- **YC Demo**: MCP server + Claude Desktop
- **Production Use**: Full test coverage, error handling
- **Integration**: Multiple agent frameworks supported

## Resources

- [LangChain.js Docs](https://js.langchain.com/)
- [LangGraph](https://langchain-ai.github.io/langgraphjs/)
- [Zod](https://zod.dev/)
- [PayOS SDK Docs](../../../packages/sdk/README.md)

