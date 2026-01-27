/**
 * Vercel AI SDK Tools for Sly
 *
 * Provides Sly capabilities as Vercel AI SDK tools for use with
 * Next.js applications, streaming responses, and React hooks.
 *
 * @example
 * ```typescript
 * import { createSlyVercelTools } from '@sly/sdk/vercel';
 * import { openai } from '@ai-sdk/openai';
 * import { generateText } from 'ai';
 *
 * const sly = new Sly({ apiKey: '...', environment: 'sandbox' });
 * const tools = createSlyVercelTools(sly);
 *
 * const result = await generateText({
 *   model: openai('gpt-4'),
 *   prompt: 'Send $100 to Brazil via Pix',
 *   tools,
 * });
 * ```
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { Sly } from '../index';

/**
 * Create Vercel AI SDK tools from a Sly instance
 *
 * Returns an object with tools that can be passed directly to
 * `generateText`, `streamText`, or `generateObject` from the `ai` package.
 */
export function createSlyVercelTools(sly: Sly) {
  return {
    get_settlement_quote: tool({
      description: 'Get a settlement quote for cross-border payment with FX rates and fees. Use this when a user wants to know how much money will be received in another currency.',
      parameters: z.object({
        fromCurrency: z.enum(['USD', 'BRL', 'MXN', 'USDC']).describe('Source currency'),
        toCurrency: z.enum(['USD', 'BRL', 'MXN', 'USDC']).describe('Destination currency'),
        amount: z.string().describe('Amount to convert'),
        rail: z.enum(['pix', 'spei', 'wire', 'usdc']).optional().describe('Settlement rail (optional)'),
      }),
      execute: async ({ fromCurrency, toCurrency, amount, rail }) => {
        try {
          const quote = await sly.getSettlementQuote({
            fromCurrency,
            toCurrency,
            amount,
            rail,
          });
          return {
            success: true,
            data: quote,
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message,
          };
        }
      },
    }),

    create_settlement: tool({
      description: 'Execute a settlement using a quote ID. Use this after getting a quote to actually send the money.',
      parameters: z.object({
        quoteId: z.string().describe('Quote ID from get_settlement_quote'),
        destinationAccountId: z.string().describe('Destination account ID'),
        metadata: z.record(z.any()).optional().describe('Optional metadata'),
      }),
      execute: async ({ quoteId, destinationAccountId, metadata }) => {
        try {
          const settlement = await sly.createSettlement({
            quoteId,
            destinationAccountId,
            metadata,
          });
          return {
            success: true,
            data: settlement,
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message,
          };
        }
      },
    }),

    get_settlement_status: tool({
      description: 'Check the status of a settlement. Use this to track if a payment has completed.',
      parameters: z.object({
        settlementId: z.string().describe('Settlement ID'),
      }),
      execute: async ({ settlementId }) => {
        try {
          const settlement = await sly.getSettlement(settlementId);
          return {
            success: true,
            data: settlement,
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message,
          };
        }
      },
    }),

    check_compliance: tool({
      description: 'Check if a recipient passes compliance checks before sending payment. Use this to verify a recipient is valid.',
      parameters: z.object({
        recipientAccountId: z.string().describe('Recipient account ID'),
        amount: z.string().describe('Payment amount'),
        currency: z.enum(['USD', 'BRL', 'MXN']).describe('Payment currency'),
      }),
      execute: async ({ recipientAccountId, amount, currency }) => {
        try {
          const result = await sly.checkCompliance({
            recipientAccountId,
            amount,
            currency,
          });
          return {
            success: true,
            data: result,
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message,
          };
        }
      },
    }),
  };
}

/**
 * System prompt for Vercel AI SDK agents using Sly tools
 */
export const SLY_VERCEL_SYSTEM_PROMPT = `You are a helpful AI assistant with access to Sly payment operations.

You can help users with:
- Getting settlement quotes for cross-border payments (USD, BRL, MXN, USDC)
- Creating settlements and transfers
- Checking settlement status
- Verifying compliance for recipients

Payment rails available:
- Pix (Brazil): Instant settlement in ~10 seconds
- SPEI (Mexico): Fast settlement in ~1 minute
- Wire: Traditional bank transfer
- USDC: Stablecoin settlement on blockchain

Always:
1. Get a quote before creating a settlement
2. Check compliance for new recipients
3. Confirm important actions with the user
4. Provide clear information about exchange rates and fees
5. Explain the estimated settlement time

When presenting quotes:
- Show the exchange rate clearly
- Mention any fees
- Explain the estimated settlement time
- Ask for confirmation before executing`;

// Backward compatibility alias
export { SLY_VERCEL_SYSTEM_PROMPT as PAYOS_VERCEL_SYSTEM_PROMPT };

/**
 * Type for Vercel AI SDK tools
 */
export type SlyVercelTools = ReturnType<typeof createSlyVercelTools>;

// Backward compatibility alias
export type PayOSVercelTools = SlyVercelTools;

// Backward compatibility alias for function
export { createSlyVercelTools as createPayOSVercelTools };

