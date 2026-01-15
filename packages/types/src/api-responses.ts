/**
 * PayOS API Response Types
 * 
 * Structured response formats for all PayOS APIs.
 * Every response includes success/error status, metadata, and suggested actions.
 * 
 * @module types/api-responses
 */

import type { ErrorCode, ErrorCategory } from './errors.js';

// ============================================
// SUGGESTED ACTIONS
// ============================================

/**
 * Action that a client can take in response to an error or successful operation
 */
export interface SuggestedAction {
  /** Action identifier (e.g., 'top_up_account', 'refresh_quote') */
  action: string;
  
  /** Human-readable description of the action */
  description: string;
  
  /** API endpoint to call for this action (if applicable) */
  endpoint?: string;
  
  /** HTTP method for the endpoint */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  
  /** Minimum amount required (for funding actions) */
  min_amount?: string;
  
  /** Maximum amount allowed */
  max_amount?: string;
  
  /** Recommended interval in seconds (for polling actions) */
  recommended_interval_seconds?: number;
  
  /** When this action becomes available (timestamp) */
  available_at?: string;
  
  /** Additional parameters needed for this action */
  parameters?: Record<string, unknown>;
}

// ============================================
// ERROR RESPONSE
// ============================================

/**
 * Retry guidance for errors
 */
export interface RetryGuidance {
  /** Whether the operation can be retried */
  retryable: boolean;
  
  /** Seconds to wait before retrying */
  retry_after_seconds?: number;
  
  /** What action must be taken before retry is possible */
  retry_after_action?: string;
  
  /** Maximum number of retry attempts recommended */
  max_retries?: number;
  
  /** Suggested backoff strategy */
  backoff_strategy?: 'linear' | 'exponential' | 'fixed';
}

/**
 * Detailed error object
 */
export interface ApiError {
  /** Machine-readable error code */
  code: ErrorCode;
  
  /** Error category */
  category: ErrorCategory;
  
  /** Human-readable error message */
  message: string;
  
  /** Additional contextual details about the error */
  details?: Record<string, unknown>;
  
  /** Actions the client can take to resolve the error */
  suggested_actions?: SuggestedAction[];
  
  /** Retry guidance */
  retry?: RetryGuidance;
  
  /** URL to error documentation */
  documentation_url?: string;
  
  /** Stack trace (only in development) */
  stack?: string;
}

/**
 * Error response wrapper
 */
export interface ApiErrorResponse {
  /** Always false for error responses */
  success: false;
  
  /** Error details */
  error: ApiError;
  
  /** Unique request ID for tracking */
  request_id: string;
  
  /** Timestamp when error occurred */
  timestamp: string;
  
  /** API version */
  api_version?: string;
}

// ============================================
// SUCCESS RESPONSE
// ============================================

/**
 * Response metadata
 */
export interface ResponseMeta {
  /** Unique request ID for tracking */
  request_id: string;
  
  /** Timestamp when response was generated */
  timestamp: string;
  
  /** Processing time in milliseconds */
  processing_time_ms?: number;
  
  /** API version */
  api_version?: string;
  
  /** Environment (sandbox, production) */
  environment?: 'sandbox' | 'testnet' | 'production';
  
  /** Rate limit information */
  rate_limit?: {
    limit: number;
    remaining: number;
    reset_at: string;
  };
  
  /** Deprecation warning */
  deprecation?: {
    deprecated: boolean;
    sunset_date?: string;
    replacement_endpoint?: string;
    message?: string;
  };
}

/**
 * Related resource links
 */
export interface ResourceLinks {
  /** Link to this resource */
  self?: string;
  
  /** Additional related resource links */
  [key: string]: string | undefined;
}

/**
 * Success response wrapper
 */
export interface ApiSuccessResponse<T> {
  /** Always true for success responses */
  success: true;
  
  /** Response data */
  data: T;
  
  /** Response metadata */
  meta: ResponseMeta;
  
  /** Links to related resources */
  links?: ResourceLinks;
  
  /** Next actions the client can take */
  next_actions?: SuggestedAction[];
}

// ============================================
// PAGINATED RESPONSE
// ============================================

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  /** Current page number (1-indexed) */
  page: number;
  
  /** Items per page */
  page_size: number;
  
  /** Total number of items */
  total_count: number;
  
  /** Total number of pages */
  total_pages: number;
  
  /** Whether there is a next page */
  has_next_page: boolean;
  
  /** Whether there is a previous page */
  has_previous_page: boolean;
}

/**
 * Pagination links
 */
export interface PaginationLinks {
  /** Current page */
  self: string;
  
  /** First page */
  first?: string;
  
  /** Previous page */
  prev?: string;
  
  /** Next page */
  next?: string;
  
  /** Last page */
  last?: string;
}

/**
 * Paginated response wrapper
 */
export interface ApiPaginatedResponse<T> {
  /** Always true for success responses */
  success: true;
  
  /** Array of items */
  data: T[];
  
  /** Response metadata */
  meta: ResponseMeta;
  
  /** Pagination metadata */
  pagination: PaginationMeta;
  
  /** Pagination links */
  links: PaginationLinks;
}

// ============================================
// UNION TYPE
// ============================================

/**
 * Any API response (success or error)
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Any API response including paginated
 */
export type AnyApiResponse<T> = ApiSuccessResponse<T> | ApiPaginatedResponse<T> | ApiErrorResponse;

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Type guard for success responses
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.success === true;
}

/**
 * Type guard for error responses
 */
export function isErrorResponse<T>(response: ApiResponse<T>): response is ApiErrorResponse {
  return response.success === false;
}

/**
 * Type guard for paginated responses
 */
export function isPaginatedResponse<T>(
  response: AnyApiResponse<T>
): response is ApiPaginatedResponse<T> {
  return response.success === true && 'pagination' in response;
}

// ============================================
// HELPER TYPES
// ============================================

/**
 * Extract data type from response
 */
export type ResponseData<T> = T extends ApiSuccessResponse<infer U>
  ? U
  : T extends ApiPaginatedResponse<infer U>
  ? U[]
  : never;

/**
 * Context response types (for Epic 31)
 */
export interface ContextResponse<T> extends ApiSuccessResponse<T> {
  /** Always includes links for context endpoints */
  links: ResourceLinks;
}

// ============================================
// WEBHOOK EVENT TYPES
// ============================================

/**
 * Webhook event envelope
 */
export interface WebhookEvent<T = unknown> {
  /** Event ID */
  id: string;
  
  /** Event type (e.g., 'transfer.completed') */
  type: string;
  
  /** When the event occurred */
  created_at: string;
  
  /** Event payload */
  data: T;
  
  /** API version that generated this event */
  api_version: string;
  
  /** Whether this is a test event */
  livemode: boolean;
  
  /** Number of times this webhook was attempted */
  attempt_count?: number;
}

/**
 * Webhook delivery status
 */
export interface WebhookDelivery {
  /** Delivery ID */
  id: string;
  
  /** Event ID */
  event_id: string;
  
  /** Webhook endpoint URL */
  endpoint_url: string;
  
  /** HTTP status code received */
  status_code?: number;
  
  /** Response body from endpoint */
  response_body?: string;
  
  /** Delivery status */
  status: 'pending' | 'delivered' | 'failed';
  
  /** When delivery was attempted */
  attempted_at: string;
  
  /** When delivery succeeded/failed */
  completed_at?: string;
  
  /** Error message if failed */
  error_message?: string;
  
  /** Next retry time if pending */
  next_retry_at?: string;
}

// ============================================
// BATCH OPERATION TYPES
// ============================================

/**
 * Result of a single batch item
 */
export interface BatchItemResult<T> {
  /** Index of this item in the batch */
  index: number;
  
  /** Whether this item succeeded */
  success: boolean;
  
  /** Result data if successful */
  data?: T;
  
  /** Error if failed */
  error?: ApiError;
  
  /** Item-specific metadata */
  meta?: {
    processing_time_ms?: number;
    [key: string]: unknown;
  };
}

/**
 * Batch operation response
 */
export interface BatchOperationResponse<T> {
  /** Always true (batch request succeeded, individual items may have failed) */
  success: true;
  
  /** Results for each item */
  results: BatchItemResult<T>[];
  
  /** Batch summary */
  summary: {
    /** Total items in batch */
    total: number;
    
    /** Number of successful items */
    succeeded: number;
    
    /** Number of failed items */
    failed: number;
    
    /** Success rate (0-1) */
    success_rate: number;
  };
  
  /** Response metadata */
  meta: ResponseMeta;
  
  /** Actions to handle failures */
  next_actions?: SuggestedAction[];
}

// ============================================
// STREAMING RESPONSE TYPES
// ============================================

/**
 * Server-sent event for streaming responses
 */
export interface StreamEvent<T = unknown> {
  /** Event type */
  event: string;
  
  /** Event data */
  data: T;
  
  /** Event ID (for resuming) */
  id?: string;
  
  /** Retry interval in milliseconds */
  retry?: number;
}

/**
 * Streaming response chunk
 */
export interface StreamChunk<T> {
  /** Chunk sequence number */
  sequence: number;
  
  /** Chunk data */
  data: T;
  
  /** Whether this is the final chunk */
  done: boolean;
  
  /** Error if chunk failed */
  error?: ApiError;
  
  /** Chunk metadata */
  meta?: {
    chunk_size?: number;
    [key: string]: unknown;
  };
}



