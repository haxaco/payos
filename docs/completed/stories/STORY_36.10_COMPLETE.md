# Story 36.10: Function-calling Format - COMPLETE

**Status**: ✅ COMPLETE  
**Points**: 3  
**Completed**: January 3, 2025

## Summary

Created formatters to convert PayOS capabilities into standard AI agent tool schemas (OpenAI, Claude, LangChain), enabling easy integration with popular AI frameworks.

## Implementation Details

### 1. Formatters (`packages/sdk/src/capabilities/formatters.ts`)

#### Format Converters
- `toOpenAIFunction(capability)` - Convert single capability to OpenAI format
- `toClaudeTool(capability)` - Convert single capability to Claude format
- `toLangChainTool(capability)` - Convert single capability to LangChain format
- `toOpenAIFunctions(capabilities)` - Convert all capabilities to OpenAI
- `toClaudeTools(capabilities)` - Convert all capabilities to Claude
- `toLangChainTools(capabilities)` - Convert all capabilities to LangChain

#### System Messages
- `getOpenAISystemMessage()` - Pre-configured system prompt for OpenAI
- `getClaudeSystemMessage()` - Pre-configured system prompt for Claude

### 2. Type Definitions

```typescript
// OpenAI function-calling schema
interface OpenAIFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

// Claude tool schema
interface ClaudeTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

// LangChain tool schema
interface LangChainTool {
  name: string;
  description: string;
  schema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}
```

### 3. Client Integration

Added convenience methods to `CapabilitiesClient`:
- `toOpenAI()` - Get capabilities + system message for OpenAI
- `toClaude()` - Get capabilities + system message for Claude
- `toLangChain()` - Get capabilities for LangChain

## Testing

```bash
cd packages/sdk && pnpm test
# ✓ 8 formatter tests pass
# ✓ 83 total tests pass
```

## Usage Examples

### OpenAI Function Calling

```typescript
const payos = new PayOS({
  apiKey: 'payos_...',
  environment: 'sandbox',
});

const { functions, systemMessage } = await payos.capabilities.toOpenAI();

// Use with OpenAI SDK
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'system', content: systemMessage },
    { role: 'user', content: 'Send $100 to Brazil' },
  ],
  functions,
});
```

### Claude Tool Use

```typescript
const { tools, systemMessage } = await payos.capabilities.toClaude();

// Use with Anthropic SDK
const response = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  system: systemMessage,
  tools,
  messages: [
    { role: 'user', content: 'Get a quote for sending $100 to Brazil' },
  ],
});
```

### LangChain

```typescript
const tools = await payos.capabilities.toLangChain();

// Use with LangChain
import { ChatOpenAI } from '@langchain/openai';
import { createOpenAIFunctionsAgent } from 'langchain/agents';

const agent = await createOpenAIFunctionsAgent({
  llm: new ChatOpenAI(),
  tools,
});
```

## Files Created/Modified

### Created
- `packages/sdk/src/capabilities/formatters.ts` - Format converters
- `packages/sdk/src/capabilities/formatters.test.ts` - Formatter tests

### Modified
- `packages/sdk/src/capabilities/index.ts` - Export formatters
- `packages/sdk/src/capabilities/client.ts` - Added convenience methods

## Next Steps

Story 36.11: MCP Server for Claude (YC DEMO) - Build Model Context Protocol server for native Claude Desktop integration

