/**
 * Vercel AI SDK integration for Sly
 *
 * Provides Sly tools in Vercel AI SDK format for use with Next.js
 * applications, streaming responses, and React hooks.
 *
 * @example
 * ```typescript
 * // API Route (app/api/chat/route.ts)
 * import { createSlyVercelTools, SLY_VERCEL_SYSTEM_PROMPT } from '@sly/sdk/vercel';
 * import { openai } from '@ai-sdk/openai';
 * import { streamText } from 'ai';
 *
 * export async function POST(req: Request) {
 *   const { messages } = await req.json();
 *   const sly = new Sly({ apiKey: process.env.SLY_API_KEY });
 *
 *   const result = await streamText({
 *     model: openai('gpt-4'),
 *     system: SLY_VERCEL_SYSTEM_PROMPT,
 *     messages,
 *     tools: createSlyVercelTools(sly),
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
export type { SlyVercelTools, PayOSVercelTools } from './tools';

