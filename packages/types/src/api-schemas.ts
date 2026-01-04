/**
 * PayOS API Validation Schemas
 * 
 * Zod schemas for validating API responses and ensuring type safety.
 * 
 * @module types/api-schemas
 */

import { z } from 'zod';
import { ErrorCode, ErrorCategory } from './errors.js';

// ============================================
// ERROR CODE SCHEMAS
// ============================================

/**
 * Schema for error codes
 */
export const ErrorCodeSchema = z.nativeEnum(ErrorCode);

/**
 * Schema for error categories
 */
export const ErrorCategorySchema = z.nativeEnum(ErrorCategory);

// ============================================
// SUGGESTED ACTION SCHEMA
// ============================================

/**
 * Schema for suggested actions
 */
export const SuggestedActionSchema = z.object({
  action: z.string(),
  description: z.string(),
  endpoint: z.string().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
  min_amount: z.string().optional(),
  max_amount: z.string().optional(),
  recommended_interval_seconds: z.number().int().positive().optional(),
  available_at: z.string().datetime().optional(),
  parameters: z.record(z.unknown()).optional(),
});

// ============================================
// ERROR RESPONSE SCHEMAS
// ============================================

/**
 * Schema for retry guidance
 */
export const RetryGuidanceSchema = z.object({
  retryable: z.boolean(),
  retry_after_seconds: z.number().int().positive().optional(),
  retry_after_action: z.string().optional(),
  max_retries: z.number().int().positive().optional(),
  backoff_strategy: z.enum(['linear', 'exponential', 'fixed']).optional(),
});

/**
 * Schema for API error object
 */
export const ApiErrorSchema = z.object({
  code: ErrorCodeSchema,
  category: ErrorCategorySchema,
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  suggested_actions: z.array(SuggestedActionSchema).optional(),
  retry: RetryGuidanceSchema.optional(),
  documentation_url: z.string().url().optional(),
  stack: z.string().optional(),
});

/**
 * Schema for error response
 */
export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: ApiErrorSchema,
  request_id: z.string(),
  timestamp: z.string().datetime(),
  api_version: z.string().optional(),
});

// ============================================
// SUCCESS RESPONSE SCHEMAS
// ============================================

/**
 * Schema for rate limit info
 */
export const RateLimitSchema = z.object({
  limit: z.number().int().positive(),
  remaining: z.number().int().nonnegative(),
  reset_at: z.string().datetime(),
});

/**
 * Schema for deprecation warning
 */
export const DeprecationSchema = z.object({
  deprecated: z.boolean(),
  sunset_date: z.string().datetime().optional(),
  replacement_endpoint: z.string().optional(),
  message: z.string().optional(),
});

/**
 * Schema for response metadata
 */
export const ResponseMetaSchema = z.object({
  request_id: z.string(),
  timestamp: z.string().datetime(),
  processing_time_ms: z.number().int().nonnegative().optional(),
  api_version: z.string().optional(),
  environment: z.enum(['sandbox', 'testnet', 'production']).optional(),
  rate_limit: RateLimitSchema.optional(),
  deprecation: DeprecationSchema.optional(),
});

/**
 * Schema for resource links
 */
export const ResourceLinksSchema = z.record(z.string());

/**
 * Schema for success response (generic)
 * The data type must be provided when using this schema
 */
export const createSuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: ResponseMetaSchema,
    links: ResourceLinksSchema.optional(),
    next_actions: z.array(SuggestedActionSchema).optional(),
  });

/**
 * Generic success response schema (data is unknown)
 */
export const ApiSuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
  meta: ResponseMetaSchema,
  links: ResourceLinksSchema.optional(),
  next_actions: z.array(SuggestedActionSchema).optional(),
});

// ============================================
// PAGINATED RESPONSE SCHEMAS
// ============================================

/**
 * Schema for pagination metadata
 */
export const PaginationMetaSchema = z.object({
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total_count: z.number().int().nonnegative(),
  total_pages: z.number().int().nonnegative(),
  has_next_page: z.boolean(),
  has_previous_page: z.boolean(),
});

/**
 * Schema for pagination links
 */
export const PaginationLinksSchema = z.object({
  self: z.string(),
  first: z.string().optional(),
  prev: z.string().optional(),
  next: z.string().optional(),
  last: z.string().optional(),
});

/**
 * Schema for paginated response (generic)
 */
export const createPaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    meta: ResponseMetaSchema,
    pagination: PaginationMetaSchema,
    links: PaginationLinksSchema,
  });

/**
 * Generic paginated response schema (items are unknown)
 */
export const ApiPaginatedResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.unknown()),
  meta: ResponseMetaSchema,
  pagination: PaginationMetaSchema,
  links: PaginationLinksSchema,
});

// ============================================
// UNION SCHEMAS
// ============================================

/**
 * Schema for any API response (success or error)
 */
export const createApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.union([createSuccessResponseSchema(dataSchema), ApiErrorResponseSchema]);

/**
 * Generic API response schema
 */
export const ApiResponseSchema = z.union([ApiSuccessResponseSchema, ApiErrorResponseSchema]);

// ============================================
// WEBHOOK SCHEMAS
// ============================================

/**
 * Schema for webhook events
 */
export const WebhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  created_at: z.string().datetime(),
  data: z.unknown(),
  api_version: z.string(),
  livemode: z.boolean(),
  attempt_count: z.number().int().nonnegative().optional(),
});

/**
 * Schema for webhook delivery status
 */
export const WebhookDeliverySchema = z.object({
  id: z.string(),
  event_id: z.string(),
  endpoint_url: z.string().url(),
  status_code: z.number().int().optional(),
  response_body: z.string().optional(),
  status: z.enum(['pending', 'delivered', 'failed']),
  attempted_at: z.string().datetime(),
  completed_at: z.string().datetime().optional(),
  error_message: z.string().optional(),
  next_retry_at: z.string().datetime().optional(),
});

// ============================================
// BATCH OPERATION SCHEMAS
// ============================================

/**
 * Schema for batch item result
 */
export const createBatchItemResultSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    index: z.number().int().nonnegative(),
    success: z.boolean(),
    data: itemSchema.optional(),
    error: ApiErrorSchema.optional(),
    meta: z
      .object({
        processing_time_ms: z.number().int().nonnegative().optional(),
      })
      .catchall(z.unknown())
      .optional(),
  });

/**
 * Schema for batch operation response
 */
export const createBatchOperationResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    results: z.array(createBatchItemResultSchema(itemSchema)),
    summary: z.object({
      total: z.number().int().nonnegative(),
      succeeded: z.number().int().nonnegative(),
      failed: z.number().int().nonnegative(),
      success_rate: z.number().min(0).max(1),
    }),
    meta: ResponseMetaSchema,
    next_actions: z.array(SuggestedActionSchema).optional(),
  });

// ============================================
// STREAMING SCHEMAS
// ============================================

/**
 * Schema for server-sent events
 */
export const StreamEventSchema = z.object({
  event: z.string(),
  data: z.unknown(),
  id: z.string().optional(),
  retry: z.number().int().positive().optional(),
});

/**
 * Schema for stream chunks
 */
export const createStreamChunkSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    sequence: z.number().int().nonnegative(),
    data: dataSchema,
    done: z.boolean(),
    error: ApiErrorSchema.optional(),
    meta: z
      .object({
        chunk_size: z.number().int().positive().optional(),
      })
      .catchall(z.unknown())
      .optional(),
  });

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate and parse an API response
 */
export function validateApiResponse<T>(
  response: unknown,
  dataSchema: z.ZodTypeAny
): z.infer<ReturnType<typeof createApiResponseSchema>> {
  const schema = createApiResponseSchema(dataSchema);
  return schema.parse(response);
}

/**
 * Validate and parse a paginated response
 */
export function validatePaginatedResponse<T>(
  response: unknown,
  itemSchema: z.ZodTypeAny
): z.infer<ReturnType<typeof createPaginatedResponseSchema>> {
  const schema = createPaginatedResponseSchema(itemSchema);
  return schema.parse(response);
}

/**
 * Validate and parse an error response
 */
export function validateErrorResponse(response: unknown): z.infer<typeof ApiErrorResponseSchema> {
  return ApiErrorResponseSchema.parse(response);
}

/**
 * Safe parse that returns validation errors
 */
export function safeParseApiResponse<T>(
  response: unknown,
  dataSchema: z.ZodTypeAny
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const schema = createApiResponseSchema(dataSchema);
  const result = schema.safeParse(response);

  if (result.success) {
    return { success: true, data: result.data as T };
  }

  return { success: false, errors: result.error };
}

// ============================================
// REFINEMENTS
// ============================================

/**
 * Refine pagination meta to ensure consistency
 */
export const PaginationMetaRefinedSchema = PaginationMetaSchema.refine(
  (data) => {
    // Ensure total_pages matches total_count and page_size
    const expectedPages = Math.ceil(data.total_count / data.page_size);
    return data.total_pages === expectedPages;
  },
  {
    message: 'total_pages must match ceil(total_count / page_size)',
  }
).refine(
  (data) => {
    // Ensure page is within valid range
    return data.page >= 1 && data.page <= Math.max(1, data.total_pages);
  },
  {
    message: 'page must be between 1 and total_pages',
  }
).refine(
  (data) => {
    // Ensure has_next_page is accurate
    return data.has_next_page === (data.page < data.total_pages);
  },
  {
    message: 'has_next_page must be true when page < total_pages',
  }
).refine(
  (data) => {
    // Ensure has_previous_page is accurate
    return data.has_previous_page === (data.page > 1);
  },
  {
    message: 'has_previous_page must be true when page > 1',
  }
);

/**
 * Refine batch summary to ensure consistency
 */
export const BatchSummaryRefinedSchema = z
  .object({
    total: z.number().int().nonnegative(),
    succeeded: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    success_rate: z.number().min(0).max(1),
  })
  .refine(
    (data) => {
      // Ensure succeeded + failed = total
      return data.succeeded + data.failed === data.total;
    },
    {
      message: 'succeeded + failed must equal total',
    }
  )
  .refine(
    (data) => {
      // Ensure success_rate matches succeeded / total
      const expectedRate = data.total === 0 ? 1 : data.succeeded / data.total;
      return Math.abs(data.success_rate - expectedRate) < 0.0001; // Float precision tolerance
    },
    {
      message: 'success_rate must equal succeeded / total',
    }
  );

// ============================================
// COMMON DATA SCHEMAS
// ============================================

/**
 * Schema for ID fields (must start with specific prefix)
 */
export const createIdSchema = (prefix: string) =>
  z.string().regex(new RegExp(`^${prefix}_[a-zA-Z0-9]+$`), {
    message: `ID must start with '${prefix}_' followed by alphanumeric characters`,
  });

/**
 * Common ID schemas
 */
export const AccountIdSchema = createIdSchema('acc');
export const TransferIdSchema = createIdSchema('txn');
export const AgentIdSchema = createIdSchema('agent');
export const WalletIdSchema = createIdSchema('wallet');
export const StreamIdSchema = createIdSchema('stream');
export const QuoteIdSchema = createIdSchema('quote');
export const BatchIdSchema = createIdSchema('batch');
export const MandateIdSchema = createIdSchema('mandate');
export const CheckoutIdSchema = createIdSchema('checkout');
export const EndpointIdSchema = createIdSchema('endpoint');
export const RequestIdSchema = createIdSchema('req');

/**
 * Schema for currency codes (ISO 4217)
 */
export const CurrencyCodeSchema = z.string().length(3).toUpperCase();

/**
 * Schema for monetary amounts (as string with 2 decimal places)
 */
export const MonetaryAmountSchema = z.string().regex(/^\d+\.\d{2}$/, {
  message: 'Amount must be a string with exactly 2 decimal places (e.g., "100.00")',
});

/**
 * Schema for positive monetary amounts
 */
export const PositiveMonetaryAmountSchema = MonetaryAmountSchema.refine(
  (val) => parseFloat(val) > 0,
  {
    message: 'Amount must be greater than 0',
  }
);

/**
 * Schema for timestamps (ISO 8601)
 */
export const TimestampSchema = z.string().datetime();

// ============================================
// EXPORTS
// ============================================

export type {
  SuggestedAction,
  RetryGuidance,
  ApiError,
  ApiErrorResponse,
  ResponseMeta,
  ResourceLinks,
  ApiSuccessResponse,
  PaginationMeta,
  PaginationLinks,
  ApiPaginatedResponse,
  WebhookEvent,
  WebhookDelivery,
} from './api-responses.js';

