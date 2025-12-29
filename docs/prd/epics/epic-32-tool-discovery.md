# Epic 32: Tool Discovery 🧭

**Status:** Pending
**Phase:** AI-Native Foundation
**Priority:** P0
**Total Points:** 11
**Stories:** 0/4 Complete
**Dependencies:** None
**Enables:** Agent platform integrations (LangChain, etc.)

[← Back to Master PRD](../PayOS_PRD_Master.md)

---

## Overview

Provide a machine-readable capability catalog that agent platforms can consume to understand what PayOS can do.

---

## Endpoints

### GET /v1/capabilities

Returns capability definitions with parameters, return types, and error codes.

```json
{
  "api_version": "2025-12-01",
  "capabilities": [
    {
      "name": "create_transfer",
      "description": "Create a cross-border transfer with automatic FX",
      "category": "payments",
      "endpoint": "POST /v1/transfers",
      "parameters": { ... },
      "returns": { ... },
      "errors": ["INSUFFICIENT_BALANCE", "INVALID_ACCOUNT_ID"],
      "supports_simulation": true,
      "supports_idempotency": true
    }
  ],
  "limits": { ... },
  "supported_currencies": ["USD", "BRL", "MXN"],
  "webhook_events": [...]
}
```

### GET /v1/capabilities/openapi

Returns full OpenAPI 3.0 specification.

### GET /v1/capabilities/function-calling

Returns schemas optimized for LLM function calling (OpenAI/Anthropic format).

```json
{
  "functions": [
    {
      "name": "payos_create_transfer",
      "description": "Create a cross-border payment...",
      "parameters": {
        "type": "object",
        "required": ["from_account_id", "to_account_id", "amount", "currency"],
        "properties": { ... }
      }
    },
    {
      "name": "payos_simulate_transfer",
      "description": "Preview a transfer before executing...",
      "parameters": { ... }
    }
  ]
}
```

---

## Stories

| Story | Points | Priority | Description |
|-------|--------|----------|-------------|
| 32.1 | 3 | P0 | Capabilities endpoint with basic structure |
| 32.2 | 3 | P0 | Function-calling format for LLM agents |
| 32.3 | 3 | P1 | Full OpenAPI spec generation |
| 32.4 | 2 | P2 | Capability versioning |
| **Total** | **11** | | **0/4 Complete** |

---

## Use Cases

### LangChain Integration
```python
from langchain.tools import Tool
import requests

# Fetch PayOS capabilities
caps = requests.get("https://api.payos.ai/v1/capabilities/function-calling").json()

# Convert to LangChain tools
tools = [Tool.from_function_definition(f) for f in caps['functions']]
```

### OpenAI Function Calling
```typescript
const capabilities = await fetch('https://api.payos.ai/v1/capabilities/function-calling');
const { functions } = await capabilities.json();

const completion = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [...],
  tools: functions.map(f => ({ type: "function", function: f }))
});
```

---

## Technical Deliverables

### API Routes
- `apps/api/src/routes/capabilities.ts`

### Schema Generation
- `apps/api/src/services/openapi-generator.ts` - Auto-generate from route definitions
- `apps/api/src/services/function-calling-generator.ts` - Convert to LLM format

### Static Files
- `apps/api/public/openapi.json` - Cached OpenAPI spec
- Updated on deployment

---

## Success Criteria

- ✅ Capabilities endpoint returns all PayOS operations
- ✅ Function-calling format compatible with OpenAI/Anthropic
- ✅ OpenAPI spec passes validation
- ✅ LangChain integration tested
- ✅ Documentation includes integration examples

---

## Related Documentation

- **Epic 30:** Structured Response System (defines error codes)
- **Epic 28:** Simulation System (advertised as capability)
