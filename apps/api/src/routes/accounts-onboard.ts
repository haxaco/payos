/**
 * Account Onboarding Routes
 *
 * Story 51.3: Unified Entity Onboarding Endpoint
 *
 * @see Epic 51: Unified Platform Onboarding
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import { ValidationError } from '../middleware/error.js';
import { onboardEntity, type OnboardingInput } from '../services/entity-onboarding.js';

const app = new Hono();

// Apply auth middleware
app.use('*', authMiddleware);

// ============================================
// Validation Schemas
// ============================================

const paymentMethodSchema = z.object({
  type: z.enum(['pix', 'spei', 'bank_account']),
  // PIX fields
  pix_key: z.string().optional(),
  pix_key_type: z.enum(['cpf', 'cnpj', 'email', 'phone', 'evp']).optional(),
  // SPEI fields
  clabe: z.string().optional(),
  // Bank account fields
  bank_code: z.string().optional(),
  account_number: z.string().optional(),
  routing_number: z.string().optional(),
}).refine(
  (data) => {
    // PIX requires pix_key and pix_key_type
    if (data.type === 'pix') {
      return data.pix_key && data.pix_key_type;
    }
    // SPEI requires clabe
    if (data.type === 'spei') {
      return data.clabe;
    }
    // Bank account requires bank_code and account_number
    if (data.type === 'bank_account') {
      return data.bank_code && data.account_number;
    }
    return true;
  },
  { message: 'Missing required fields for payment method type' }
);

const verificationSchema = z.object({
  skip_kyb: z.boolean().optional(),
  skip_kyc: z.boolean().optional(),
  documents: z.array(z.object({
    type: z.string(),
    url: z.string().url(),
  })).optional(),
}).optional();

const personOnboardingSchema = z.object({
  type: z.literal('person'),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  country: z.string().length(2), // ISO 3166-1 alpha-2
  tax_id: z.string().optional(),
  payment_methods: z.array(paymentMethodSchema).optional(),
  verification: verificationSchema,
  metadata: z.record(z.unknown()).optional(),
});

const businessOnboardingSchema = z.object({
  type: z.literal('business'),
  business_name: z.string().min(1).max(255),
  email: z.string().email().optional(),
  country: z.string().length(2), // ISO 3166-1 alpha-2
  tax_id: z.string().optional(),
  payment_methods: z.array(paymentMethodSchema).optional(),
  verification: verificationSchema,
  metadata: z.record(z.unknown()).optional(),
});

const onboardingSchema = z.discriminatedUnion('type', [
  personOnboardingSchema,
  businessOnboardingSchema,
]);

// ============================================
// POST /v1/accounts/onboard - Unified Onboarding
// ============================================

/**
 * Onboard a new entity (person or business) in a single call.
 *
 * Creates:
 * - Account record
 * - Payment method records (PIX, SPEI, bank account)
 * - Triggers KYC/KYB verification if not skipped
 *
 * @example
 * POST /v1/accounts/onboard
 * {
 *   "type": "business",
 *   "business_name": "Brazilian Supplier Ltd",
 *   "country": "BR",
 *   "tax_id": "12.345.678/0001-90",
 *   "payment_methods": [
 *     { "type": "pix", "pix_key_type": "cnpj", "pix_key": "12345678000190" }
 *   ],
 *   "verification": {
 *     "skip_kyb": false,
 *     "documents": [
 *       { "type": "cnpj_card", "url": "https://..." }
 *     ]
 *   }
 * }
 */
app.post('/', async (c) => {
  const ctx = c.get('ctx');

  let body;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON body');
  }

  // Validate request
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Validation failed', parsed.error.flatten());
  }

  const input = parsed.data as OnboardingInput;
  const supabase = createClient();

  // Perform onboarding
  const result = await onboardEntity(ctx.tenantId, input, supabase);

  // Return 201 Created with result
  return c.json(result, 201);
});

export default app;
