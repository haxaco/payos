# PayOS + Vercel AI SDK Example: Next.js Chat with Payments

This example shows how to build a Next.js chat application with PayOS payment capabilities using the Vercel AI SDK.

## Setup

```bash
npm install ai @ai-sdk/openai @payos/sdk
```

## API Route

Create `app/api/chat/route.ts`:

```typescript
import { createPayOSVercelTools, PAYOS_VERCEL_SYSTEM_PROMPT } from '@payos/sdk/vercel';
import { PayOS } from '@payos/sdk';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Initialize PayOS
  const payos = new PayOS({
    apiKey: process.env.PAYOS_API_KEY!,
    environment: process.env.PAYOS_ENVIRONMENT as any || 'sandbox',
  });

  // Create PayOS tools
  const tools = createPayOSVercelTools(payos);

  // Stream response with tools
  const result = await streamText({
    model: openai('gpt-4'),
    system: PAYOS_VERCEL_SYSTEM_PROMPT,
    messages,
    tools,
    maxToolRoundtrips: 5,
  });

  return result.toDataStreamResponse();
}
```

## Client Component

Create `app/page.tsx`:

```typescript
'use client';

import { useChat } from 'ai/react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat();

  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      <h1 className="text-2xl font-bold mb-4">PayOS AI Assistant</h1>
      
      {messages.map(m => (
        <div key={m.id} className="whitespace-pre-wrap mb-4">
          <div className="font-bold">{m.role === 'user' ? 'You: ' : 'AI: '}</div>
          <div>{m.content}</div>
          
          {/* Show tool calls */}
          {m.toolInvocations?.map((toolInvocation, i) => (
            <div key={i} className="text-sm text-gray-500 mt-2">
              {toolInvocation.state === 'result' && (
                <div>
                  ✓ {toolInvocation.toolName}
                  <pre className="text-xs mt-1">
                    {JSON.stringify(toolInvocation.result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      <form onSubmit={handleSubmit} className="fixed bottom-0 w-full max-w-md mb-8">
        <input
          className="w-full p-2 border border-gray-300 rounded shadow-xl"
          value={input}
          placeholder="Ask me about payments..."
          onChange={handleInputChange}
          disabled={isLoading}
        />
      </form>
    </div>
  );
}
```

## Environment Variables

Create `.env.local`:

```bash
PAYOS_API_KEY=payos_sandbox_...
PAYOS_ENVIRONMENT=sandbox
OPENAI_API_KEY=sk-...
```

## Example Conversations

### Get a Quote

```
User: How much would it cost to send $100 to Brazil via Pix?

AI: Let me get you a quote for that.
    [Calls get_settlement_quote tool]
    
    To send $100 USD to Brazil via Pix:
    - You'll receive: 500.25 BRL
    - Exchange rate: 5.0025 BRL/USD
    - Fee: $0.50
    - Settlement time: ~10 seconds
    
    Would you like me to proceed with this transfer?
```

### Execute Settlement

```
User: Yes, send it to account acct_brazil_123

AI: [Calls create_settlement tool]
    
    ✅ Settlement created successfully!
    
    Settlement ID: set_abc123
    Status: Processing
    Expected completion: ~10 seconds
    
    I'll check the status for you...
    
    [Calls get_settlement_status tool]
    
    🎉 Payment completed!
    Your recipient received 500.25 BRL
    Completed at: 5:45 PM
```

### Check Compliance

```
User: Can I send money to account acct_new_recipient?

AI: [Calls check_compliance tool]
    
    ✅ Compliance check passed!
    
    This recipient is verified and can receive payments.
    No additional documentation needed.
    
    Would you like to proceed with a payment?
```

## Advanced: Custom Tools

You can also create custom tools alongside PayOS:

```typescript
import { createPayOSVercelTools } from '@payos/sdk/vercel';
import { tool } from 'ai';
import { z } from 'zod';

const tools = {
  ...createPayOSVercelTools(payos),
  
  // Custom tool
  get_exchange_rate: tool({
    description: 'Get current exchange rate between two currencies',
    parameters: z.object({
      from: z.string(),
      to: z.string(),
    }),
    execute: async ({ from, to }) => {
      // Your custom logic
      return { rate: 5.0025 };
    },
  }),
};
```

## Streaming with Tool Calls

The Vercel AI SDK automatically handles:
- ✅ Streaming text responses
- ✅ Tool call execution
- ✅ Multiple tool rounds
- ✅ Error handling
- ✅ React state management

## Production Considerations

1. **Rate Limiting**: Add rate limiting to your API route
2. **Authentication**: Protect your API route with auth
3. **Error Handling**: Add try/catch and user-friendly errors
4. **Logging**: Log tool calls for debugging
5. **Monitoring**: Track tool usage and success rates

## Full Example Repository

See `examples/vercel-nextjs-chat` for a complete working example with:
- Authentication
- Rate limiting
- Error handling
- Beautiful UI with Tailwind CSS
- TypeScript throughout

