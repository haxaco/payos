/**
 * UCP (Universal Commerce Protocol) Module
 *
 * Google+Shopify's protocol for agentic commerce.
 *
 * @see Story 43.9: UCP Client Module
 * @see https://ucp.dev/specification/overview/
 *
 * @example
 * ```typescript
 * import { PayOS } from '@payos/sdk';
 *
 * const payos = new PayOS({ apiKey: '...' });
 *
 * // Get quote
 * const quote = await payos.ucp.getQuote({
 *   corridor: 'pix',
 *   amount: 100,
 *   currency: 'USD',
 * });
 *
 * // Acquire token
 * const token = await payos.ucp.acquireToken({
 *   corridor: 'pix',
 *   amount: 100,
 *   currency: 'USD',
 *   recipient: payos.ucp.createPixRecipient({
 *     pix_key: '12345678901',
 *     pix_key_type: 'cpf',
 *     name: 'Maria Silva',
 *   }),
 * });
 *
 * // Settle
 * const settlement = await payos.ucp.settle({ token: token.token });
 * ```
 */

export { UCPClient } from './client';
export * from './types';
