/**
 * Response Wrapper Middleware (Story 30.2)
 * 
 * Automatically wraps all API responses in the structured format from Epic 30.
 * Transforms errors to machine-readable format with suggested actions.
 */

import { Context, Next } from 'hono';
import { ContentfulStatusCode } from 'hono/utils/http-status';
import {
  ErrorCode,
  createApiError,
  getErrorMetadata,
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiPaginatedResponse,
  ResponseMeta,
  SuggestedAction,
} from '@sly/types';
import { ZodError } from 'zod';

// ============================================
// TIMING TRACKING
// ============================================

/**
 * Timing middleware - tracks request processing time
 */
export async function timingMiddleware(c: Context, next: Next) {
  const startTime = Date.now();
  c.set('startTime', startTime);

  try {
    await next();
  } finally {
    const processingTime = Date.now() - startTime;
    c.set('processingTime', processingTime);
  }
}

// ============================================
// RESPONSE WRAPPER
// ============================================

/**
 * Response wrapper middleware - wraps all responses in structured format
 * 
 * This middleware intercepts responses and wraps them in the Epic 30 format.
 * It should be applied BEFORE route handlers so it can catch their responses.
 */
export async function responseWrapperMiddleware(c: Context, next: Next) {
  // Store original json method
  const originalJson = c.json.bind(c);

  // Override json method to wrap responses
  c.json = function (data: any, arg2?: any) {
    // Extract status code from argument (handle overload)
    let status: ContentfulStatusCode | undefined;
    if (typeof arg2 === 'number') {
      status = arg2 as ContentfulStatusCode;
    } else if (arg2 && typeof arg2 === 'object' && 'status' in arg2) {
      status = arg2.status as ContentfulStatusCode;
    }
    // Get request metadata
    const requestId = c.get('requestId') || crypto.randomUUID();
    const startTime = c.get('startTime') || Date.now();
    const processingTime = Date.now() - startTime;
    const timestamp = new Date().toISOString();

    // If this is already a wrapped response (has success field), pass through
    if (data && typeof data === 'object' && 'success' in data) {
      return originalJson(data, status);
    }

    // If status indicates error (4xx, 5xx), this will be handled by error middleware
    if (status && status >= 400) {
      return originalJson(data, status);
    }

    // Wrap success response (Smart handling for double-nesting)
    let wrappedResponse: any;

    if (data && typeof data === 'object' && 'pagination' in data && 'data' in data) {
      // Handle PaginatedResponse from route handler (Flattening)
      // Extracts data and pagination to top level of response
      wrappedResponse = {
        success: true,
        data: data.data,
        pagination: data.pagination,
        links: data.links,
        meta: {
          request_id: requestId,
          timestamp,
          processing_time_ms: processingTime,
          api_version: '1.0',
          environment: (process.env.NODE_ENV as 'sandbox' | 'production') || 'sandbox',
        },
      };
    } else if (data && typeof data === 'object' && 'data' in data && Object.keys(data).length === 1) {
      // Handle Single Resource Wrapper (Unwrapping)
      // Use existing data property as the main data
      wrappedResponse = {
        success: true,
        data: data.data,
        meta: {
          request_id: requestId,
          timestamp,
          processing_time_ms: processingTime,
          api_version: '1.0',
          environment: (process.env.NODE_ENV as 'sandbox' | 'production') || 'sandbox',
        },
      };
    } else {
      // Default Wrapping
      wrappedResponse = {
        success: true,
        data,
        meta: {
          request_id: requestId,
          timestamp,
          processing_time_ms: processingTime,
          api_version: '1.0',
          environment: (process.env.NODE_ENV as 'sandbox' | 'production') || 'sandbox',
        },
      };
    }

    return originalJson(wrappedResponse, status || 200);
  };

  await next();
}

// ============================================
// ERROR TRANSFORMATION
// ============================================

/**
 * Map old ApiError classes to new ErrorCode enum
 */
function mapLegacyErrorToCode(error: Error & { details?: any }): ErrorCode {
  const errorName = error.constructor.name;

  switch (errorName) {
    case 'NotFoundError':
      // Try to determine resource type from message
      if (error.message.toLowerCase().includes('account')) return ErrorCode.ACCOUNT_NOT_FOUND;
      if (error.message.toLowerCase().includes('transfer')) return ErrorCode.TRANSFER_NOT_FOUND;
      if (error.message.toLowerCase().includes('agent')) return ErrorCode.AGENT_NOT_FOUND;
      if (error.message.toLowerCase().includes('wallet')) return ErrorCode.WALLET_NOT_FOUND;
      if (error.message.toLowerCase().includes('stream')) return ErrorCode.STREAM_NOT_FOUND;
      if (error.message.toLowerCase().includes('quote')) return ErrorCode.QUOTE_NOT_FOUND;
      return ErrorCode.ACCOUNT_NOT_FOUND; // Default

    case 'ValidationError':
      return ErrorCode.INVALID_REQUEST_FORMAT;

    case 'UnauthorizedError':
      return ErrorCode.UNAUTHORIZED;

    case 'ForbiddenError':
      return ErrorCode.FORBIDDEN;

    case 'InsufficientBalanceError':
      return ErrorCode.INSUFFICIENT_BALANCE;

    case 'HoldExceedsBalanceError':
      return ErrorCode.HOLD_EXCEEDS_BALANCE;

    case 'CurrencyMismatchError':
      return ErrorCode.CURRENCY_MISMATCH;

    case 'InvalidPixKeyError':
      return ErrorCode.INVALID_PIX_KEY;

    case 'InvalidClabeError':
      return ErrorCode.INVALID_CLABE;

    case 'RateLimitedError':
      return ErrorCode.RATE_LIMITED;

    case 'VelocityLimitError':
      return ErrorCode.VELOCITY_LIMIT_EXCEEDED;

    case 'ComplianceHoldError':
      return ErrorCode.COMPLIANCE_HOLD;

    case 'ServiceUnavailableError':
      return ErrorCode.SERVICE_UNAVAILABLE;

    case 'ApprovalRequiredError':
      return ErrorCode.APPROVAL_REQUIRED;

    case 'ApprovalRejectedError':
      return ErrorCode.APPROVAL_REJECTED;

    case 'StreamInsufficientFundingError':
      return ErrorCode.STREAM_INSUFFICIENT_FUNDING;

    case 'X402PaymentRequiredError':
      return ErrorCode.X402_PAYMENT_REQUIRED;

    case 'RailUnavailableError':
      return ErrorCode.RAIL_UNAVAILABLE;

    case 'RecipientValidationFailedError':
      return ErrorCode.RECIPIENT_VALIDATION_FAILED;

    case 'AccountNotFoundError':
      return ErrorCode.ACCOUNT_NOT_FOUND;

    case 'LimitExceededError':
      const limitType = error.details?.limitType?.toLowerCase() || '';
      if (limitType.includes('daily')) {
        return ErrorCode.DAILY_LIMIT_EXCEEDED;
      }
      if (limitType.includes('monthly')) {
        return ErrorCode.MONTHLY_LIMIT_EXCEEDED;
      }
      return ErrorCode.SINGLE_TRANSFER_LIMIT_EXCEEDED;

    case 'QuoteExpiredError':
      return ErrorCode.QUOTE_EXPIRED;

    case 'KYCRequiredError':
      return ErrorCode.KYC_REQUIRED;

    case 'KYBRequiredError':
      return ErrorCode.KYB_REQUIRED;

    default:
      return ErrorCode.INTERNAL_ERROR;
  }
}

/**
 * Transform Zod validation errors to structured format
 */
function transformZodError(zodError: ZodError): {
  code: ErrorCode;
  details: Record<string, unknown>;
} {
  const fieldErrors: Record<string, string[]> = {};
  const missingFields: string[] = [];

  for (const issue of zodError.errors) {
    const field = issue.path.join('.');

    if (issue.code === 'invalid_type' && issue.received === 'undefined') {
      missingFields.push(field);
    } else {
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field].push(issue.message);
    }
  }

  // Determine most appropriate error code
  let code: ErrorCode;
  if (missingFields.length > 0) {
    code = ErrorCode.MISSING_REQUIRED_FIELD;
  } else {
    code = ErrorCode.INVALID_REQUEST_FORMAT;
  }

  return {
    code,
    details: {
      validation_errors: fieldErrors,
      missing_fields: missingFields.length > 0 ? missingFields : undefined,
      error_count: zodError.errors.length,
    },
  };
}

/**
 * Transform Supabase errors to structured format
 */
function transformSupabaseError(error: any): {
  code: ErrorCode;
  details: Record<string, unknown>;
} {
  const supabaseCode = error.code;

  switch (supabaseCode) {
    case 'PGRST116': // No rows returned
      return {
        code: ErrorCode.ACCOUNT_NOT_FOUND, // Default, should be overridden by context
        details: {},
      };

    case '23505': // Unique violation
      return {
        code: ErrorCode.IDEMPOTENCY_CONFLICT,
        details: {
          constraint: error.constraint,
          detail: error.detail,
          ...(error.details || {}), // Preserve any custom details
        },
      };

    case '23503': // Foreign key violation
      return {
        code: ErrorCode.INVALID_ACCOUNT_ID, // Default
        details: {
          constraint: error.constraint,
          detail: error.detail,
        },
      };

    case '42P01': // Undefined table
    case '42703': // Undefined column
      return {
        code: ErrorCode.INTERNAL_ERROR,
        details: {
          database_error: error.message,
        },
      };

    default:
      return {
        code: ErrorCode.DATABASE_ERROR,
        details: {
          supabase_code: supabaseCode,
          message: error.message,
        },
      };
  }
}

/**
 * Create suggested actions based on error code and context
 * 
 * This function generates context-aware suggested actions that tell clients
 * (especially AI agents) what to do next. Actions include actual IDs, amounts,
 * and endpoints from the request context.
 */
function createSuggestedActions(
  code: ErrorCode,
  details?: Record<string, unknown>,
  context?: Context
): SuggestedAction[] | undefined {
  const actions: SuggestedAction[] = [];

  switch (code) {
    // ============================================
    // BALANCE ERRORS
    // ============================================
    case ErrorCode.INSUFFICIENT_BALANCE:
      // Primary action: Add funds
      if (details?.account_id) {
        actions.push({
          action: 'top_up_account',
          description: 'Add funds to the source account',
          endpoint: `/v1/accounts/${details.account_id}/deposits`,
          method: 'POST',
          min_amount: details.shortfall as string,
        });
      }
      // Alternative: Reduce amount
      if (details?.available_amount) {
        actions.push({
          action: 'reduce_amount',
          description: 'Reduce the transfer amount to available balance',
          max_amount: details.available_amount as string,
        });
      }
      // Alternative: Use different account
      actions.push({
        action: 'use_different_account',
        description: 'Use a different source account with sufficient balance',
      });
      break;

    case ErrorCode.HOLD_EXCEEDS_BALANCE:
      actions.push({
        action: 'top_up_account',
        description: 'Add funds to cover the hold amount',
        min_amount: details?.hold_amount as string,
      });
      actions.push({
        action: 'release_holds',
        description: 'Release existing holds to free up balance',
        endpoint: details?.account_id ? `/v1/accounts/${details.account_id}/holds` : undefined,
      });
      break;

    case ErrorCode.CURRENCY_MISMATCH:
      actions.push({
        action: 'use_fx_conversion',
        description: 'Use cross-border transfer with FX conversion',
        endpoint: '/v1/transfers',
        method: 'POST',
      });
      actions.push({
        action: 'use_matching_currency',
        description: 'Use accounts with matching currencies',
      });
      break;

    // ============================================
    // VALIDATION ERRORS
    // ============================================
    case ErrorCode.INVALID_AMOUNT:
      actions.push({
        action: 'fix_amount',
        description: 'Provide a valid positive amount',
        parameters: {
          min_amount: details?.min_amount,
          max_amount: details?.max_amount,
        },
      });
      break;

    case ErrorCode.INVALID_PIX_KEY:
      actions.push({
        action: 'verify_pix_key',
        description: 'Verify the PIX key format (CPF, CNPJ, email, phone, or random key)',
      });
      actions.push({
        action: 'check_recipient',
        description: 'Confirm PIX key with recipient',
      });
      break;

    case ErrorCode.INVALID_CLABE:
      actions.push({
        action: 'verify_clabe',
        description: 'Verify CLABE is exactly 18 digits with valid checksum',
      });
      break;

    case ErrorCode.MISSING_REQUIRED_FIELD:
      if (details?.missing_fields && Array.isArray(details.missing_fields)) {
        actions.push({
          action: 'add_required_fields',
          description: `Add required fields: ${(details.missing_fields as string[]).join(', ')}`,
          parameters: {
            missing_fields: details.missing_fields,
          },
        });
      } else {
        actions.push({
          action: 'fix_request',
          description: 'Add all required fields to the request',
        });
      }
      break;

    case ErrorCode.INVALID_REQUEST_FORMAT:
      if (details?.validation_errors) {
        actions.push({
          action: 'fix_validation_errors',
          description: 'Correct the validation errors in your request',
          parameters: {
            errors: details.validation_errors,
          },
        });
      } else {
        actions.push({
          action: 'fix_request',
          description: 'Correct the request format and retry',
        });
      }
      break;

    // ============================================
    // LIMIT ERRORS
    // ============================================
    case ErrorCode.DAILY_LIMIT_EXCEEDED:
    case ErrorCode.MONTHLY_LIMIT_EXCEEDED:
      const limitType = code === ErrorCode.DAILY_LIMIT_EXCEEDED ? 'daily' : 'monthly';
      actions.push({
        action: 'wait_for_reset',
        description: `Wait for ${limitType} limit to reset`,
        available_at: details?.resets_at as string,
      });
      actions.push({
        action: 'request_limit_increase',
        description: `Request a ${limitType} limit increase`,
        endpoint: '/v1/accounts/limits',
        method: 'PATCH',
      });
      if (details?.requested_amount && details?.limit) {
        const remaining = (details.limit as number) - (details.current_usage as number || 0);
        if (remaining > 0) {
          actions.push({
            action: 'reduce_amount',
            description: 'Reduce amount to fit within remaining limit',
            max_amount: remaining.toString(),
          });
        }
      }
      break;

    case ErrorCode.AGENT_SPENDING_LIMIT_EXCEEDED:
      actions.push({
        action: 'wait_for_reset',
        description: 'Wait for agent spending limit to reset',
        available_at: details?.resets_at as string,
      });
      actions.push({
        action: 'request_limit_increase',
        description: 'Request agent limit increase',
        endpoint: details?.agent_id ? `/v1/agents/${details.agent_id}` : undefined,
        method: 'PATCH',
      });
      actions.push({
        action: 'use_different_agent',
        description: 'Use a different agent with available limits',
      });
      break;

    case ErrorCode.RATE_LIMITED:
      actions.push({
        action: 'wait_and_retry',
        description: 'Wait for rate limit to reset and retry',
        recommended_interval_seconds: details?.retry_after_seconds as number || 60,
        available_at: details?.reset_at as string,
      });
      actions.push({
        action: 'implement_backoff',
        description: 'Implement exponential backoff in your retry logic',
      });
      break;

    case ErrorCode.VELOCITY_LIMIT_EXCEEDED:
      actions.push({
        action: 'slow_down',
        description: 'Reduce transaction frequency',
        recommended_interval_seconds: details?.limit_window_seconds as number,
      });
      actions.push({
        action: 'batch_transactions',
        description: 'Combine multiple transactions into a batch',
        endpoint: '/v1/transfers/batch',
        method: 'POST',
      });
      break;

    // ============================================
    // COMPLIANCE ERRORS
    // ============================================
    case ErrorCode.KYC_REQUIRED:
      actions.push({
        action: 'complete_kyc',
        description: 'Complete KYC verification',
        endpoint: details?.verification_url as string || '/v1/accounts/verify',
        parameters: {
          required_tier: details?.required_tier,
          current_tier: details?.current_tier,
        },
      });
      break;

    case ErrorCode.KYB_REQUIRED:
      actions.push({
        action: 'complete_kyb',
        description: 'Complete KYB (business) verification',
        endpoint: details?.verification_url as string || '/v1/accounts/verify',
        parameters: {
          required_tier: details?.required_tier,
          current_tier: details?.current_tier,
        },
      });
      break;

    case ErrorCode.KYA_REQUIRED:
      actions.push({
        action: 'complete_kya',
        description: 'Complete KYA (agent) verification',
        endpoint: details?.verification_url as string || `/v1/agents/${details?.agent_id}/verify`,
        parameters: {
          agent_id: details?.agent_id,
          required_tier: details?.required_tier,
        },
      });
      break;

    case ErrorCode.COMPLIANCE_HOLD:
      actions.push({
        action: 'wait_for_review',
        description: 'Wait for compliance review to complete',
        available_at: details?.review_expected_at as string,
      });
      actions.push({
        action: 'contact_support',
        description: 'Contact support for status update',
        endpoint: details?.support_contact as string,
      });
      break;

    case ErrorCode.RECIPIENT_NOT_VERIFIED:
      actions.push({
        action: 'request_recipient_verification',
        description: 'Ask recipient to complete verification',
        parameters: {
          recipient_id: details?.recipient_id,
        },
      });
      actions.push({
        action: 'use_verified_recipient',
        description: 'Use a different verified recipient',
      });
      break;

    // ============================================
    // TECHNICAL ERRORS
    // ============================================
    case ErrorCode.QUOTE_EXPIRED:
      actions.push({
        action: 'refresh_quote',
        description: 'Get a new quote',
        endpoint: '/v1/quotes',
        method: 'POST',
      });
      if (details?.quote_id) {
        actions.push({
          action: 'retry_with_new_quote',
          description: 'Retry the transfer with a fresh quote',
        });
      }
      break;

    case ErrorCode.SERVICE_UNAVAILABLE:
      actions.push({
        action: 'retry_with_backoff',
        description: 'Retry with exponential backoff',
        recommended_interval_seconds: 30,
      });
      if (details?.estimated_restoration) {
        actions.push({
          action: 'wait_for_restoration',
          description: 'Wait for service to be restored',
          available_at: details.estimated_restoration as string,
        });
      }
      break;

    case ErrorCode.IDEMPOTENCY_CONFLICT:
      actions.push({
        action: 'use_different_key',
        description: 'Use a different idempotency key for a new request',
      });
      if (details?.existing_request_id) {
        actions.push({
          action: 'retrieve_existing',
          description: 'Retrieve the existing request if it was intended',
          endpoint: `/v1/transfers/${details.existing_request_id}`,
          method: 'GET',
        });
      }
      break;

    // ============================================
    // WORKFLOW ERRORS
    // ============================================
    case ErrorCode.APPROVAL_REQUIRED:
      actions.push({
        action: 'submit_for_approval',
        description: 'Submit the operation for approval',
        endpoint: details?.workflow_id ? `/v1/workflows/${details.workflow_id}/submit` : undefined,
        method: 'POST',
      });
      break;

    case ErrorCode.APPROVAL_PENDING:
      actions.push({
        action: 'wait_for_approval',
        description: 'Wait for approver to review',
        parameters: {
          workflow_id: details?.workflow_id,
          pending_approvers: details?.pending_approvers,
        },
      });
      actions.push({
        action: 'contact_approvers',
        description: 'Contact approvers to expedite review',
      });
      break;

    case ErrorCode.APPROVAL_REJECTED:
      if (details?.rejection_reason) {
        actions.push({
          action: 'review_rejection',
          description: `Review rejection reason: ${details.rejection_reason}`,
        });
      }
      actions.push({
        action: 'modify_and_resubmit',
        description: 'Modify the request and resubmit for approval',
      });
      break;

    // ============================================
    // RESOURCE ERRORS (404)
    // ============================================
    case ErrorCode.ACCOUNT_NOT_FOUND:
    case ErrorCode.TRANSFER_NOT_FOUND:
    case ErrorCode.AGENT_NOT_FOUND:
    case ErrorCode.WALLET_NOT_FOUND:
    case ErrorCode.STREAM_NOT_FOUND:
      const resourceType = code.replace('_NOT_FOUND', '').toLowerCase();
      actions.push({
        action: 'verify_id',
        description: `Verify the ${resourceType} ID is correct`,
        parameters: {
          provided_id: details?.[`${resourceType}_id`],
        },
      });
      actions.push({
        action: 'list_resources',
        description: `List available ${resourceType}s`,
        endpoint: `/v1/${resourceType}s`,
        method: 'GET',
      });
      break;

    // ============================================
    // STATE ERRORS
    // ============================================
    case ErrorCode.ACCOUNT_SUSPENDED:
      actions.push({
        action: 'contact_support',
        description: 'Contact support to resolve suspension',
        parameters: {
          account_id: details?.account_id,
          reason: details?.reason,
        },
      });
      break;

    case ErrorCode.REFUND_NOT_ALLOWED:
      actions.push({
        action: 'check_eligibility',
        description: 'Review refund eligibility requirements',
        parameters: {
          reason: details?.reason,
        },
      });
      if (details?.reason === 'already_refunded') {
        actions.push({
          action: 'view_existing_refund',
          description: 'View the existing refund',
        });
      }
      break;

    case ErrorCode.STREAM_INSUFFICIENT_FUNDING:
      if (details?.stream_id) {
        actions.push({
          action: 'fund_stream',
          description: 'Add funding to the stream',
          endpoint: `/v1/streams/${details.stream_id}/fund`,
          method: 'POST',
          min_amount: details?.required_funding as string,
        });
      }
      actions.push({
        action: 'reduce_flow_rate',
        description: 'Reduce the stream flow rate',
      });
      break;

    // ============================================
    // PROTOCOL ERRORS
    // ============================================
    case ErrorCode.X402_PAYMENT_REQUIRED:
      actions.push({
        action: 'make_x402_payment',
        description: 'Make x402 payment for this endpoint',
        endpoint: details?.endpoint_id as string,
        parameters: {
          price: details?.price,
          currency: details?.currency,
        },
      });
      break;

    case ErrorCode.AP2_MANDATE_EXPIRED:
      actions.push({
        action: 'refresh_mandate',
        description: 'Get a new AP2 mandate from the agent',
      });
      break;

    case ErrorCode.ACP_SESSION_EXPIRED:
      actions.push({
        action: 'create_new_session',
        description: 'Create a new ACP checkout session',
        endpoint: '/v1/acp/checkout',
        method: 'POST',
      });
      break;

    // ============================================
    // SETTLEMENT ERRORS
    // ============================================
    case ErrorCode.RAIL_UNAVAILABLE:
      actions.push({
        action: 'wait_for_rail',
        description: 'Wait for payment rail to come back online',
        available_at: details?.estimated_restoration as string,
      });
      actions.push({
        action: 'use_alternative_rail',
        description: 'Use an alternative payment rail if available',
      });
      break;

    case ErrorCode.RECIPIENT_VALIDATION_FAILED:
      actions.push({
        action: 'verify_recipient_details',
        description: 'Verify recipient payment details are correct',
        parameters: {
          validation_errors: details?.validation_errors,
        },
      });
      actions.push({
        action: 'check_recipient',
        description: 'Confirm payment details with recipient',
      });
      break;
  }

  return actions.length > 0 ? actions : undefined;
}

/**
 * Error transformation middleware - converts errors to structured format
 * 
 * This is the global error handler that catches all errors and transforms them
 * into the Epic 30 structured error response format.
 */
export function structuredErrorHandler(err: Error, c: Context) {
  console.error('Error caught by structured handler:', err);

  // Get request metadata
  const requestId = c.get('requestId') || crypto.randomUUID();
  const timestamp = new Date().toISOString();

  let errorCode: ErrorCode;
  let httpStatus: number;
  let details: Record<string, unknown> = {};
  let customMessage: string | undefined;

  // Transform based on error type
  if (err instanceof ZodError) {
    // Zod validation error
    const transformed = transformZodError(err);
    errorCode = transformed.code;
    details = transformed.details;
    httpStatus = 400;
  } else if ('code' in err && Object.values(ErrorCode).includes((err as any).code)) {
    // Error with explicit ErrorCode (from tests or direct throws)
    errorCode = (err as any).code;
    details = (err as any).details || {};
    customMessage = err.message;
    // Get HTTP status from error metadata
    const metadata = getErrorMetadata(errorCode);
    httpStatus = metadata.httpStatus;
  } else if ('code' in err && typeof (err as any).code === 'string') {
    // Supabase error (has .code but not an ErrorCode)
    const transformed = transformSupabaseError(err);
    errorCode = transformed.code;
    details = transformed.details;
    httpStatus = errorCode === ErrorCode.ACCOUNT_NOT_FOUND ? 404 : 400;
  } else if ('statusCode' in err) {
    // Legacy ApiError
    const legacyError = err as any;
    errorCode = mapLegacyErrorToCode(err);
    httpStatus = legacyError.statusCode || 500;
    details = legacyError.details || {};
    customMessage = err.message;
  } else {
    // Unknown error
    errorCode = ErrorCode.INTERNAL_ERROR;
    httpStatus = 500;
    customMessage = process.env.NODE_ENV === 'production'
      ? 'An internal error occurred'
      : err.message;

    // Include error ID for tracking
    details.error_id = requestId;
  }

  // Create structured error
  const apiError = createApiError(errorCode, {
    details,
    message: customMessage,
    includeDocUrl: true,
  });

  // Add suggested actions
  apiError.suggested_actions = createSuggestedActions(errorCode, details, c);

  // Enhance retry guidance with retry_after_seconds for specific errors
  // Ensure retry object exists (createApiError only adds it for retryable errors)
  const metadata = getErrorMetadata(errorCode);
  if (!apiError.retry) {
    apiError.retry = {
      retryable: metadata.retryable,
      retry_after_action: metadata.retryAfterAction,
    };
  }

  if (apiError.retry) {
    if (apiError.retry.retryable) {
      // Add specific retry guidance based on error type
      switch (errorCode) {
        // ============================================
        // RATE LIMITING & THROTTLING
        // ============================================
        case ErrorCode.RATE_LIMITED:
          // Use actual rate limit reset time from response headers
          if (details?.retry_after_seconds) {
            apiError.retry.retry_after_seconds = details.retry_after_seconds as number;
          } else {
            apiError.retry.retry_after_seconds = 60; // Default 1 minute
          }
          apiError.retry.backoff_strategy = 'fixed';
          break;

        case ErrorCode.VELOCITY_LIMIT_EXCEEDED:
        case ErrorCode.CONCURRENT_REQUEST_LIMIT:
          if (details?.limit_window_seconds) {
            apiError.retry.retry_after_seconds = details.limit_window_seconds as number;
          } else {
            apiError.retry.retry_after_seconds = 30;
          }
          apiError.retry.backoff_strategy = 'exponential';
          break;

        // ============================================
        // SPENDING & TRANSACTION LIMITS
        // ============================================
        case ErrorCode.DAILY_LIMIT_EXCEEDED:
        case ErrorCode.MONTHLY_LIMIT_EXCEEDED:
        case ErrorCode.AGENT_SPENDING_LIMIT_EXCEEDED:
          // Calculate seconds until reset time
          if (details?.resets_at) {
            const resetTime = new Date(details.resets_at as string).getTime();
            const now = Date.now();
            const secondsUntilReset = Math.max(0, Math.ceil((resetTime - now) / 1000));
            apiError.retry.retry_after_seconds = secondsUntilReset;
          } else {
            // Default to midnight UTC for daily, start of next month for monthly
            const now = new Date();
            if (errorCode === ErrorCode.DAILY_LIMIT_EXCEEDED) {
              const tomorrow = new Date(now);
              tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
              tomorrow.setUTCHours(0, 0, 0, 0);
              apiError.retry.retry_after_seconds = Math.ceil((tomorrow.getTime() - now.getTime()) / 1000);
            } else {
              // Default to 24 hours for monthly limits if no reset time
              apiError.retry.retry_after_seconds = 86400;
            }
          }
          apiError.retry.backoff_strategy = 'fixed';
          break;

        // ============================================
        // BALANCE ERRORS
        // ============================================
        case ErrorCode.INSUFFICIENT_BALANCE:
        case ErrorCode.HOLD_EXCEEDS_BALANCE:
        case ErrorCode.NEGATIVE_BALANCE_NOT_ALLOWED:
          // Retry immediately after top-up action
          apiError.retry.retry_after_seconds = 0;
          apiError.retry.backoff_strategy = 'fixed';
          // Note: retry_after_action is already set from metadata
          break;

        // ============================================
        // QUOTE & TIMING ERRORS
        // ============================================
        case ErrorCode.QUOTE_EXPIRED:
        case ErrorCode.RATE_EXPIRED:
          // Retry immediately with fresh quote
          apiError.retry.retry_after_seconds = 0;
          apiError.retry.backoff_strategy = 'fixed';
          break;

        // ============================================
        // SERVICE & AVAILABILITY ERRORS
        // ============================================
        case ErrorCode.SERVICE_UNAVAILABLE:
        case ErrorCode.RAIL_UNAVAILABLE:
          apiError.retry.retry_after_seconds = 30;
          apiError.retry.backoff_strategy = 'exponential';
          apiError.retry.max_retries = 5;
          break;

        case ErrorCode.TIMEOUT:
          apiError.retry.retry_after_seconds = 10;
          apiError.retry.backoff_strategy = 'exponential';
          apiError.retry.max_retries = 3;
          break;

        // ============================================
        // IDEMPOTENCY & CONCURRENCY
        // ============================================
        case ErrorCode.CONCURRENT_MODIFICATION:
          // Retry quickly with exponential backoff
          apiError.retry.retry_after_seconds = 1;
          apiError.retry.backoff_strategy = 'exponential';
          apiError.retry.max_retries = 3;
          break;

        // ============================================
        // COMPLIANCE & WORKFLOW
        // ============================================
        case ErrorCode.COMPLIANCE_HOLD:
        case ErrorCode.APPROVAL_REQUIRED:
        case ErrorCode.APPROVAL_PENDING:
          // Retry after action (compliance review, approval)
          // No immediate retry - needs human action
          if (!apiError.retry.retry_after_seconds) {
            apiError.retry.retry_after_seconds = 3600; // 1 hour default
          }
          apiError.retry.backoff_strategy = 'fixed';
          break;

        // ============================================
        // AP2 & MANDATE ERRORS
        // ============================================
        case ErrorCode.AP2_MANDATE_EXPIRED:
          // Retry after getting new mandate
          apiError.retry.retry_after_seconds = 0;
          apiError.retry.backoff_strategy = 'fixed';
          break;

        // ============================================
        // DEFAULT FOR OTHER RETRYABLE ERRORS
        // ============================================
        default:
          // Generic retryable error - use sensible defaults
          if (!apiError.retry.retry_after_seconds) {
            apiError.retry.retry_after_seconds = 5;
            apiError.retry.backoff_strategy = 'exponential';
            apiError.retry.max_retries = 3;
          }
      }
    } else {
      // Explicitly mark non-retryable errors
      apiError.retry.retryable = false;
    }
  }

  // Create error response
  const errorResponse: ApiErrorResponse = {
    success: false,
    error: apiError,
    request_id: requestId,
    timestamp,
    api_version: '1.0',
  };

  // Don't include stack traces in production
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    apiError.stack = err.stack;
  }

  return c.json(errorResponse, httpStatus as any);
}

// ============================================
// TYPE EXTENSIONS
// ============================================

// Extend Hono context types
declare module 'hono' {
  interface ContextVariableMap {
    startTime: number;
    processingTime: number;
  }
}

