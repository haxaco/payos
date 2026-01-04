/**
 * Vercel AI SDK integration for PayOS
 * 
 * Provides PayOS tools in Vercel AI SDK format for use with Next.js
 * applications, streaming responses, and React hooks.
 * 
 * @example
 * ```typescript
 * // API Route (app/api/chat/route.ts)
 * import { createPayOSVercelTools, PAYOS_VERCEL_SYSTEM_PROMPT } from '@payos/sdk/vercel';
 * import { openai } from '@ai-sdk/openai';
 * import { streamText } from 'ai';
 * 
 * export async function POST(req: Request) {
 *   const { messages } = await req.json();
 *   const payos = new PayOS({ apiKey: process.env.PAYOS_API_KEY });
 *   
 *   const result = await streamText({
 *     model: openai('gpt-4'),
 *     system: PAYOS_VERCEL_SYSTEM_PROMPT,
 *     messages,
 *     tools: createPayOSVercelTools(payos),
 *   });
 *   
 *   return result.toAIStreamResponse();
 * }
 * 
 * // Client Component (app/page.tsx)
 * 'use client';
 * import { useChat } from 'ai/react';
 * 
 * export default function Chat() {
 *   const { messages, input, handleInputChange, handleSubmit } = useChat();
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       {messages.map(m => <div key={m.id}>{m.content}</div>)}
 *       <input value={input} onChange={handleInputChange} />
 *     </form>
 *   );
 * }
 * ```
 */

export * from './tools';
export type { PayOSVercelTools } from './tools';

