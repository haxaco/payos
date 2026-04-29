/**
 * UCP (Unified Commerce Protocol) — core endpoints.
 * Mount: /v1/ucp
 *
 * COVERED (9 endpoints):
 *   POST   /tokens              create UCP token for settlement
 *   POST   /settle              settle a token against a rail
 *   POST   /settle/mandate      AP2-mandate-backed settlement
 *   GET    /settlements         list settlements
 *   GET    /settlements/{id}    get settlement
 *   POST   /quote               FX/rail quote
 *   GET    /corridors           supported corridors
 *   GET    /info                protocol capability info
 *   GET    /analytics           tenant UCP analytics
 *
 * See also: /v1/ucp/checkouts, /v1/ucp/orders, /v1/ucp/identity,
 *           /v1/ucp/merchants (separate files in this folder).
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../../middleware/auth.js';

const app = new OpenAPIHono();
app.use('*', authMiddleware);

const CorridorEnum = z.enum(['pix', 'spei', 'auto']);
const UCPCurrencyEnum = z.enum(['USD', 'USDC']);

const PixRecipient = z.object({
  type: z.literal('pix'),
  pix_key: z.string().min(1).max(77),
  pix_key_type: z.enum(['cpf', 'cnpj', 'email', 'phone', 'evp']),
  name: z.string().min(1).max(200),
  tax_id: z.string().optional(),
});
const SpeiRecipient = z.object({
  type: z.literal('spei'),
  clabe: z.string().regex(/^[0-9]{18}$/),
  name: z.string().min(1).max(200),
  rfc: z.string().optional(),
});
const UCPRecipient = z.discriminatedUnion('type', [PixRecipient, SpeiRecipient]).openapi('UCPRecipient');

const UCPTokenSchema = z.object({
  id: z.string(),
  token: z.string().describe('JWS-signed UCP token'),
  amount: z.number(),
  currency: UCPCurrencyEnum,
  corridor: CorridorEnum,
  recipient: UCPRecipient,
  status: z.enum(['pending', 'settled', 'expired', 'cancelled']),
  expires_at: z.string().datetime(),
  created_at: z.string().datetime(),
}).openapi('UCPToken');

const UCPSettlementSchema = z.object({
  id: z.string(),
  token_id: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  amount: z.number(),
  currency: UCPCurrencyEnum,
  corridor: CorridorEnum,
  tx_hash: z.string().nullable().optional(),
  rail_reference: z.string().nullable().optional(),
  completed_at: z.string().datetime().nullable().optional(),
  created_at: z.string().datetime(),
}).openapi('UCPSettlement');

const UCPQuoteSchema = z.object({
  corridor: CorridorEnum,
  amount: z.number(),
  currency: UCPCurrencyEnum,
  rate: z.string(),
  fee: z.string(),
  receive_amount: z.string(),
  receive_currency: z.string(),
  expires_at: z.string().datetime(),
}).openapi('UCPQuote');

const TokenRequestSchema = z.object({
  corridor: CorridorEnum.default('auto'),
  amount: z.number().positive().max(100000),
  currency: UCPCurrencyEnum,
  recipient: UCPRecipient,
  metadata: z.record(z.unknown()).optional(),
  defer_settlement: z.boolean().default(false),
}).openapi('UCPTokenRequest');

const SettleRequestSchema = z.object({
  token: z.string().min(1),
  idempotency_key: z.string().max(64).optional(),
}).openapi('UCPSettleRequest');

const MandateSettleRequestSchema = z.object({
  mandate_token: z.string().min(1),
  amount: z.number().positive().max(100000),
  currency: UCPCurrencyEnum,
  corridor: CorridorEnum.default('auto'),
  recipient: UCPRecipient,
  idempotency_key: z.string().max(64).optional(),
  defer_settlement: z.boolean().default(false),
}).openapi('UCPMandateSettleRequest');

const ErrorSchema = z.object({
  error: z.string(), code: z.string().optional(), details: z.unknown().optional(),
}).openapi('Error');
const Pagination = z.object({ page: z.number(), limit: z.number(), total: z.number(), totalPages: z.number() });
const notMigrated = () => ({ error: 'Not yet migrated — use plain-Hono UCP router', code: 'NOT_MIGRATED' });

app.openapi(createRoute({
  method: 'post', path: '/tokens', tags: ['UCP'],
  summary: 'Create a UCP token',
  description: 'Issue a settlement token for a specified recipient and amount. The token is JWS-signed and contains the settlement instructions. Use `POST /settle` to execute.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: TokenRequestSchema } }, required: true } },
  responses: {
    201: { description: 'Token issued', content: { 'application/json': { schema: z.object({ data: UCPTokenSchema }) } } },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorSchema } } },
    403: { description: 'Spending policy rejected', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 400));

app.openapi(createRoute({
  method: 'post', path: '/settle', tags: ['UCP'],
  summary: 'Settle a UCP token',
  description: 'Execute settlement against the rail specified in the token. Returns the settlement record with on-chain tx_hash or rail_reference.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: SettleRequestSchema } }, required: true } },
  responses: {
    201: { description: 'Settlement initiated', content: { 'application/json': { schema: z.object({ data: UCPSettlementSchema }) } } },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorSchema } } },
    409: { description: 'Token expired or already settled', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 400));

app.openapi(createRoute({
  method: 'post', path: '/settle/mandate', tags: ['UCP'],
  summary: 'Settle against an AP2 mandate',
  description:
    'Issue and settle a UCP token backed by an AP2 mandate — no pre-issued token needed. Mandate scope is verified on execution.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: MandateSettleRequestSchema } }, required: true } },
  responses: {
    201: { description: 'Settled', content: { 'application/json': { schema: z.object({ data: UCPSettlementSchema }) } } },
    403: { description: 'Mandate scope violation', content: { 'application/json': { schema: ErrorSchema } } },
    409: { description: 'Mandate expired / revoked', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 400));

app.openapi(createRoute({
  method: 'get', path: '/settlements', tags: ['UCP'], summary: 'List settlements',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { query: z.object({
    status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
    corridor: CorridorEnum.optional(),
    since: z.string().datetime().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(50),
  }) },
  responses: {
    200: { description: 'Paginated settlements', content: { 'application/json': { schema: z.object({ data: z.array(UCPSettlementSchema), pagination: Pagination }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } }, 200));

app.openapi(createRoute({
  method: 'get', path: '/settlements/{id}', tags: ['UCP'], summary: 'Get a settlement',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'Settlement detail', content: { 'application/json': { schema: z.object({ data: UCPSettlementSchema }) } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

app.openapi(createRoute({
  method: 'post', path: '/quote', tags: ['UCP'], summary: 'Request a rail quote',
  description: 'Get FX rate, fee, and estimated settlement time for a corridor. Expires in ~30 seconds. Use to display to user before settlement.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: z.object({
    corridor: CorridorEnum.optional(),
    amount: z.number().positive().max(100000),
    currency: UCPCurrencyEnum,
  }) } }, required: true } },
  responses: {
    200: { description: 'Quote', content: { 'application/json': { schema: z.object({ data: UCPQuoteSchema }) } } },
    400: { description: 'Unsupported corridor / currency', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 400));

app.openapi(createRoute({
  method: 'get', path: '/corridors', tags: ['UCP'], summary: 'List supported corridors',
  description: 'Enumerates active corridors for your tenant (e.g. USD→BRL via Pix, USD→MXN via SPEI), their limits, and typical settlement times.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'Corridors', content: { 'application/json': { schema: z.object({
      data: z.array(z.object({
        corridor: CorridorEnum,
        from_currency: UCPCurrencyEnum,
        to_currency: z.string(),
        min_amount: z.string(),
        max_amount: z.string(),
        typical_settlement: z.string(),
        active: z.boolean(),
      })),
    }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [] }, 200));

app.openapi(createRoute({
  method: 'get', path: '/info', tags: ['UCP'], summary: 'Protocol capability info',
  description: 'Machine-readable capability advertisement — what your UCP installation supports. Usually consumed via `.well-known/ucp`.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'Capabilities', content: { 'application/json': { schema: z.object({
      version: z.string(),
      supported_rails: z.array(z.string()),
      supported_currencies: z.array(z.string()),
      jwks_url: z.string().url(),
    }) } } },
  },
}), async (c): Promise<any> => c.json({ version: '1.0', supported_rails: [], supported_currencies: [], jwks_url: '' }, 200));

app.openapi(createRoute({
  method: 'get', path: '/analytics', tags: ['UCP'], summary: 'Tenant UCP analytics',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { query: z.object({ period: z.enum(['24h', '7d', '30d', '90d', '1y']).default('30d') }) },
  responses: {
    200: { description: 'Analytics summary', content: { 'application/json': { schema: z.object({
      total_volume: z.string(),
      total_settlements: z.number().int(),
      by_corridor: z.record(z.object({ volume: z.string(), count: z.number() })),
      average_time_to_settle_seconds: z.number(),
    }) } } },
  },
}), async (c): Promise<any> => c.json({ total_volume: '0', total_settlements: 0, by_corridor: {}, average_time_to_settle_seconds: 0 }, 200));

export default app;
