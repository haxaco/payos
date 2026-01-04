/**
 * PayOS Error Taxonomy
 * 
 * Comprehensive error code system for AI agent integration.
 * Every error includes machine-readable codes, contextual details, and suggested actions.
 * 
 * @module types/errors
 */

// ============================================
// ERROR CODE ENUM
// ============================================

/**
 * All possible error codes in PayOS
 * Organized by category for easy reference
 */
export enum ErrorCode {
  // ============================================
  // BALANCE ERRORS (400)
  // ============================================
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  HOLD_EXCEEDS_BALANCE = 'HOLD_EXCEEDS_BALANCE',
  CURRENCY_MISMATCH = 'CURRENCY_MISMATCH',
  NEGATIVE_BALANCE_NOT_ALLOWED = 'NEGATIVE_BALANCE_NOT_ALLOWED',

  // ============================================
  // VALIDATION ERRORS (400, 422)
  // ============================================
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INVALID_CURRENCY = 'INVALID_CURRENCY',
  INVALID_ACCOUNT_ID = 'INVALID_ACCOUNT_ID',
  INVALID_TRANSFER_ID = 'INVALID_TRANSFER_ID',
  INVALID_AGENT_ID = 'INVALID_AGENT_ID',
  INVALID_PIX_KEY = 'INVALID_PIX_KEY',
  INVALID_CLABE = 'INVALID_CLABE',
  INVALID_IBAN = 'INVALID_IBAN',
  INVALID_SWIFT_CODE = 'INVALID_SWIFT_CODE',
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_PHONE = 'INVALID_PHONE',
  INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',
  INVALID_FLOW_RATE = 'INVALID_FLOW_RATE',
  INVALID_MANDATE = 'INVALID_MANDATE',
  INVALID_CHECKOUT_SESSION = 'INVALID_CHECKOUT_SESSION',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_REQUEST_FORMAT = 'INVALID_REQUEST_FORMAT',
  AMOUNT_TOO_SMALL = 'AMOUNT_TOO_SMALL',
  AMOUNT_TOO_LARGE = 'AMOUNT_TOO_LARGE',

  // ============================================
  // LIMIT ERRORS (400, 429)
  // ============================================
  DAILY_LIMIT_EXCEEDED = 'DAILY_LIMIT_EXCEEDED',
  MONTHLY_LIMIT_EXCEEDED = 'MONTHLY_LIMIT_EXCEEDED',
  SINGLE_TRANSFER_LIMIT_EXCEEDED = 'SINGLE_TRANSFER_LIMIT_EXCEEDED',
  AGENT_SPENDING_LIMIT_EXCEEDED = 'AGENT_SPENDING_LIMIT_EXCEEDED',
  VELOCITY_LIMIT_EXCEEDED = 'VELOCITY_LIMIT_EXCEEDED',
  RATE_LIMITED = 'RATE_LIMITED',
  CONCURRENT_REQUEST_LIMIT = 'CONCURRENT_REQUEST_LIMIT',
  AGENT_LIMIT_REACHED = 'AGENT_LIMIT_REACHED',
  STREAM_LIMIT_REACHED = 'STREAM_LIMIT_REACHED',

  // ============================================
  // COMPLIANCE ERRORS (403)
  // ============================================
  COMPLIANCE_HOLD = 'COMPLIANCE_HOLD',
  SANCTIONS_MATCH = 'SANCTIONS_MATCH',
  KYC_REQUIRED = 'KYC_REQUIRED',
  KYB_REQUIRED = 'KYB_REQUIRED',
  KYA_REQUIRED = 'KYA_REQUIRED',
  RECIPIENT_NOT_VERIFIED = 'RECIPIENT_NOT_VERIFIED',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  VERIFICATION_PENDING = 'VERIFICATION_PENDING',
  BLOCKED_JURISDICTION = 'BLOCKED_JURISDICTION',
  HIGH_RISK_TRANSACTION = 'HIGH_RISK_TRANSACTION',

  // ============================================
  // TECHNICAL ERRORS (409, 429, 500, 503)
  // ============================================
  RATE_EXPIRED = 'RATE_EXPIRED',
  QUOTE_EXPIRED = 'QUOTE_EXPIRED',
  IDEMPOTENCY_CONFLICT = 'IDEMPOTENCY_CONFLICT',
  CONCURRENT_MODIFICATION = 'CONCURRENT_MODIFICATION',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',

  // ============================================
  // WORKFLOW ERRORS (400, 403)
  // ============================================
  APPROVAL_REQUIRED = 'APPROVAL_REQUIRED',
  APPROVAL_PENDING = 'APPROVAL_PENDING',
  APPROVAL_REJECTED = 'APPROVAL_REJECTED',
  WORKFLOW_NOT_FOUND = 'WORKFLOW_NOT_FOUND',
  WORKFLOW_ALREADY_COMPLETED = 'WORKFLOW_ALREADY_COMPLETED',
  INVALID_WORKFLOW_STATE = 'INVALID_WORKFLOW_STATE',

  // ============================================
  // AUTH ERRORS (401, 403)
  // ============================================
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  API_KEY_INVALID = 'API_KEY_INVALID',
  API_KEY_EXPIRED = 'API_KEY_EXPIRED',
  API_KEY_REVOKED = 'API_KEY_REVOKED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  MISSING_AUTHENTICATION = 'MISSING_AUTHENTICATION',

  // ============================================
  // RESOURCE ERRORS (404)
  // ============================================
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  TRANSFER_NOT_FOUND = 'TRANSFER_NOT_FOUND',
  AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  STREAM_NOT_FOUND = 'STREAM_NOT_FOUND',
  QUOTE_NOT_FOUND = 'QUOTE_NOT_FOUND',
  REFUND_NOT_FOUND = 'REFUND_NOT_FOUND',
  DISPUTE_NOT_FOUND = 'DISPUTE_NOT_FOUND',
  BATCH_NOT_FOUND = 'BATCH_NOT_FOUND',
  MANDATE_NOT_FOUND = 'MANDATE_NOT_FOUND',
  CHECKOUT_NOT_FOUND = 'CHECKOUT_NOT_FOUND',
  ENDPOINT_NOT_FOUND = 'ENDPOINT_NOT_FOUND',

  // ============================================
  // STATE ERRORS (400, 409)
  // ============================================
  ACCOUNT_INACTIVE = 'ACCOUNT_INACTIVE',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  AGENT_SUSPENDED = 'AGENT_SUSPENDED',
  AGENT_NAME_TAKEN = 'AGENT_NAME_TAKEN',
  TRANSFER_ALREADY_COMPLETED = 'TRANSFER_ALREADY_COMPLETED',
  TRANSFER_ALREADY_CANCELLED = 'TRANSFER_ALREADY_CANCELLED',
  TRANSFER_NOT_CANCELLABLE = 'TRANSFER_NOT_CANCELLABLE',
  STREAM_ALREADY_ACTIVE = 'STREAM_ALREADY_ACTIVE',
  STREAM_ALREADY_CANCELLED = 'STREAM_ALREADY_CANCELLED',
  STREAM_INSUFFICIENT_FUNDING = 'STREAM_INSUFFICIENT_FUNDING',
  REFUND_NOT_ALLOWED = 'REFUND_NOT_ALLOWED',
  REFUND_EXCEEDS_ORIGINAL = 'REFUND_EXCEEDS_ORIGINAL',
  REFUND_WINDOW_EXPIRED = 'REFUND_WINDOW_EXPIRED',
  DISPUTE_ALREADY_EXISTS = 'DISPUTE_ALREADY_EXISTS',
  DISPUTE_WINDOW_EXPIRED = 'DISPUTE_WINDOW_EXPIRED',
  DISPUTE_ALREADY_RESOLVED = 'DISPUTE_ALREADY_RESOLVED',
  EVIDENCE_REQUIRED = 'EVIDENCE_REQUIRED',

  // ============================================
  // PROTOCOL ERRORS (402, 400)
  // ============================================
  X402_PAYMENT_REQUIRED = 'X402_PAYMENT_REQUIRED',
  X402_PAYMENT_INVALID = 'X402_PAYMENT_INVALID',
  X402_PROOF_INVALID = 'X402_PROOF_INVALID',
  X402_ENDPOINT_NOT_FOUND = 'X402_ENDPOINT_NOT_FOUND',
  AP2_MANDATE_EXPIRED = 'AP2_MANDATE_EXPIRED',
  AP2_MANDATE_INVALID = 'AP2_MANDATE_INVALID',
  AP2_EXECUTION_FAILED = 'AP2_EXECUTION_FAILED',
  ACP_CHECKOUT_INVALID = 'ACP_CHECKOUT_INVALID',
  ACP_TOKEN_INVALID = 'ACP_TOKEN_INVALID',
  ACP_SESSION_EXPIRED = 'ACP_SESSION_EXPIRED',

  // ============================================
  // SETTLEMENT ERRORS (400, 503)
  // ============================================
  RAIL_UNAVAILABLE = 'RAIL_UNAVAILABLE',
  RECIPIENT_VALIDATION_FAILED = 'RECIPIENT_VALIDATION_FAILED',
  SETTLEMENT_FAILED = 'SETTLEMENT_FAILED',
  FUNDING_SOURCE_INSUFFICIENT = 'FUNDING_SOURCE_INSUFFICIENT',

  // ============================================
  // SIMULATION ERRORS (400, 410, 409, 501)
  // ============================================
  SIMULATION_EXPIRED = 'SIMULATION_EXPIRED',
  SIMULATION_CANNOT_EXECUTE = 'SIMULATION_CANNOT_EXECUTE',
  SIMULATION_STALE = 'SIMULATION_STALE',
  SIMULATION_NOT_FOUND = 'SIMULATION_NOT_FOUND',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
}

// ============================================
// ERROR CATEGORIES
// ============================================

export enum ErrorCategory {
  BALANCE = 'balance',
  VALIDATION = 'validation',
  LIMITS = 'limits',
  COMPLIANCE = 'compliance',
  TECHNICAL = 'technical',
  WORKFLOW = 'workflow',
  AUTH = 'auth',
  RESOURCE = 'resource',
  STATE = 'state',
  PROTOCOL = 'protocol',
}

// ============================================
// ERROR METADATA
// ============================================

export interface ErrorMetadata {
  /** Human-readable error message */
  message: string;
  
  /** Longer explanation of the error */
  description: string;
  
  /** HTTP status code */
  httpStatus: number;
  
  /** Error category */
  category: ErrorCategory;
  
  /** Whether the operation can be retried */
  retryable: boolean;
  
  /** What action makes this error retryable (if applicable) */
  retryAfterAction?: string;
  
  /** Names of detail fields returned with this error */
  detailFields: string[];
  
  /** Steps to resolve the error */
  resolutionSteps: string[];
  
  /** Documentation URL pattern */
  docsUrl: string;
}

/**
 * Complete metadata for all error codes
 */
export const ERROR_METADATA: Record<ErrorCode, ErrorMetadata> = {
  // ============================================
  // BALANCE ERRORS
  // ============================================
  [ErrorCode.INSUFFICIENT_BALANCE]: {
    message: 'Insufficient balance in source account',
    description: 'The source account does not have enough available balance to complete this transfer',
    httpStatus: 400,
    category: ErrorCategory.BALANCE,
    retryable: true,
    retryAfterAction: 'top_up_account',
    detailFields: ['required_amount', 'available_amount', 'shortfall', 'currency', 'account_id'],
    resolutionSteps: [
      'Add funds to the source account',
      'Reduce the transfer amount',
      'Use a different source account with sufficient balance',
    ],
    docsUrl: 'https://docs.payos.com/errors/INSUFFICIENT_BALANCE',
  },

  [ErrorCode.HOLD_EXCEEDS_BALANCE]: {
    message: 'Requested hold amount exceeds available balance',
    description: 'Cannot place a hold because the requested amount exceeds the available balance',
    httpStatus: 400,
    category: ErrorCategory.BALANCE,
    retryable: true,
    retryAfterAction: 'top_up_account',
    detailFields: ['hold_amount', 'available_amount', 'existing_holds', 'currency'],
    resolutionSteps: [
      'Add funds to the account',
      'Release existing holds',
      'Reduce the hold amount',
    ],
    docsUrl: 'https://docs.payos.com/errors/HOLD_EXCEEDS_BALANCE',
  },

  [ErrorCode.CURRENCY_MISMATCH]: {
    message: 'Currency mismatch between accounts',
    description: 'The source and destination accounts have incompatible currencies for this operation',
    httpStatus: 400,
    category: ErrorCategory.BALANCE,
    retryable: false,
    detailFields: ['source_currency', 'destination_currency', 'requires_fx'],
    resolutionSteps: [
      'Use accounts with matching currencies',
      'Use a cross-border transfer with FX conversion',
      'Convert currency before transferring',
    ],
    docsUrl: 'https://docs.payos.com/errors/CURRENCY_MISMATCH',
  },

  [ErrorCode.NEGATIVE_BALANCE_NOT_ALLOWED]: {
    message: 'Operation would result in negative balance',
    description: 'This account type does not allow negative balances',
    httpStatus: 400,
    category: ErrorCategory.BALANCE,
    retryable: true,
    retryAfterAction: 'top_up_account',
    detailFields: ['current_balance', 'requested_amount', 'resulting_balance'],
    resolutionSteps: [
      'Add funds to the account',
      'Reduce the transaction amount',
      'Enable overdraft protection if available',
    ],
    docsUrl: 'https://docs.payos.com/errors/NEGATIVE_BALANCE_NOT_ALLOWED',
  },

  // ============================================
  // VALIDATION ERRORS
  // ============================================
  [ErrorCode.INVALID_AMOUNT]: {
    message: 'Invalid transfer amount',
    description: 'The provided amount is invalid (negative, zero, or malformed)',
    httpStatus: 400,
    category: ErrorCategory.VALIDATION,
    retryable: false,
    detailFields: ['provided_amount', 'min_amount', 'max_amount'],
    resolutionSteps: [
      'Provide a positive, non-zero amount',
      'Ensure amount is within allowed range',
      'Check amount formatting (max 2 decimal places)',
    ],
    docsUrl: 'https://docs.payos.com/errors/INVALID_AMOUNT',
  },

  [ErrorCode.INVALID_CURRENCY]: {
    message: 'Invalid or unsupported currency',
    description: 'The provided currency code is not valid or not supported',
    httpStatus: 400,
    category: ErrorCategory.VALIDATION,
    retryable: false,
    detailFields: ['provided_currency', 'supported_currencies'],
    resolutionSteps: [
      'Use a valid ISO 4217 currency code',
      'Check list of supported currencies',
    ],
    docsUrl: 'https://docs.payos.com/errors/INVALID_CURRENCY',
  },

  [ErrorCode.INVALID_ACCOUNT_ID]: {
    message: 'Invalid account ID format',
    description: 'The provided account ID does not match the expected format',
    httpStatus: 400,
    category: ErrorCategory.VALIDATION,
    retryable: false,
    detailFields: ['provided_id', 'expected_format'],
    resolutionSteps: [
      'Use format: acc_[alphanumeric]',
      'Verify the account ID is correct',
    ],
    docsUrl: 'https://docs.payos.com/errors/INVALID_ACCOUNT_ID',
  },

  [ErrorCode.INVALID_TRANSFER_ID]: {
    message: 'Invalid transfer ID format',
    description: 'The provided transfer ID does not match the expected format',
    httpStatus: 400,
    category: ErrorCategory.VALIDATION,
    retryable: false,
    detailFields: ['provided_id', 'expected_format'],
    resolutionSteps: [
      'Use format: txn_[alphanumeric]',
      'Verify the transfer ID is correct',
    ],
    docsUrl: 'https://docs.payos.com/errors/INVALID_TRANSFER_ID',
  },

  [ErrorCode.INVALID_AGENT_ID]: {
    message: 'Invalid agent ID format',
    description: 'The provided agent ID does not match the expected format',
    httpStatus: 400,
    category: ErrorCategory.VALIDATION,
    retryable: false,
    detailFields: ['provided_id', 'expected_format'],
    resolutionSteps: [
      'Use format: agent_[alphanumeric]',
      'Verify the agent ID is correct',
    ],
    docsUrl: 'https://docs.payos.com/errors/INVALID_AGENT_ID',
  },

  [ErrorCode.INVALID_PIX_KEY]: {
    message: 'Invalid PIX key',
    description: 'The provided PIX key format is invalid',
    httpStatus: 422,
    category: ErrorCategory.VALIDATION,
    retryable: false,
    detailFields: ['provided_key', 'key_type', 'expected_format'],
    resolutionSteps: [
      'Verify PIX key format (CPF, CNPJ, email, phone, or random key)',
      'Check for typos in the PIX key',
    ],
    docsUrl: 'https://docs.payos.com/errors/INVALID_PIX_KEY',
  },

  [ErrorCode.INVALID_CLABE]: {
    message: 'Invalid CLABE number',
    description: 'The provided CLABE does not pass validation',
    httpStatus: 422,
    category: ErrorCategory.VALIDATION,
    retryable: false,
    detailFields: ['provided_clabe', 'expected_format'],
    resolutionSteps: [
      'Verify CLABE is exactly 18 digits',
      'Check CLABE checksum digit',
    ],
    docsUrl: 'https://docs.payos.com/errors/INVALID_CLABE',
  },

  [ErrorCode.INVALID_IBAN]: {
    message: 'Invalid IBAN',
    description: 'The provided IBAN does not pass validation',
    httpStatus: 422,
    category: ErrorCategory.VALIDATION,
    retryable: false,
    detailFields: ['provided_iban', 'country_code'],
    resolutionSteps: [
      'Verify IBAN format for the country',
      'Check IBAN checksum',
    ],
    docsUrl: 'https://docs.payos.com/errors/INVALID_IBAN',
  },

  [ErrorCode.INVALID_SWIFT_CODE]: {
    message: 'Invalid SWIFT/BIC code',
    description: 'The provided SWIFT code does not match the expected format',
    httpStatus: 400,
    category: ErrorCategory.VALIDATION,
    retryable: false,
    detailFields: ['provided_swift', 'expected_format'],
    resolutionSteps: [
      'Use 8 or 11 character SWIFT code',
      'Verify SWIFT code with recipient bank',
    ],
    docsUrl: 'https://docs.payos.com/errors/INVALID_SWIFT_CODE',
  },

  [ErrorCode.INVALID_EMAIL]: {
    message: 'Invalid email address',
    description: 'The provided email address is not valid',
    httpStatus: 400,
    category: ErrorCategory.VALIDATION,
    retryable: false,
    detailFields: ['provided_email'],
    resolutionSteps: [
      'Provide a valid email address',
    ],
    docsUrl: 'https://docs.payos.com/errors/INVALID_EMAIL',
  },

  [ErrorCode.INVALID_PHONE]: {
    message: 'Invalid phone number',
    description: 'The provided phone number is not valid',
    httpStatus: 400,
    category: ErrorCategory.VALIDATION,
    retryable: false,
    detailFields: ['provided_phone', 'expected_format'],
    resolutionSteps: [
      'Use E.164 format (+[country][number])',
      'Verify phone number is correct',
    ],
    docsUrl: 'https://docs.payos.com/errors/INVALID_PHONE',
  },

  [ErrorCode.INVALID_DATE_RANGE]: {
    message: 'Invalid date range',
    description: 'The provided date range is invalid (end before start, or out of bounds)',
    httpStatus: 400,
    category: ErrorCategory.VALIDATION,
    retryable: false,
    detailFields: ['start_date', 'end_date', 'max_range_days'],
    resolutionSteps: [
      'Ensure end date is after start date',
      'Ensure date range is within allowed limits',
    ],
    docsUrl: 'https://docs.payos.com/errors/INVALID_DATE_RANGE',
  },

  [ErrorCode.INVALID_FLOW_RATE]: {
    message: 'Invalid stream flow rate',
    description: 'The provided flow rate is invalid or out of allowed range',
    httpStatus: 400,
    category: ErrorCategory.VALIDATION,
    retryable: false,
    detailFields: ['provided_flow_rate', 'min_flow_rate', 'max_flow_rate'],
    resolutionSteps: [
      'Provide a positive flow rate',
      'Ensure flow rate is within allowed range',
    ],
    docsUrl: 'https://docs.payos.com/errors/INVALID_FLOW_RATE',
  },

  [ErrorCode.INVALID_MANDATE]: {
    message: 'Invalid AP2 mandate',
    description: 'The provided AP2 mandate is malformed or invalid',
    httpStatus: 400,
    category: ErrorCategory.VALIDATION,
    retryable: false,
    detailFields: ['mandate_id', 'validation_errors'],
    resolutionSteps: [
      'Verify mandate JSON structure',
      'Ensure mandate is properly signed',
    ],
    docsUrl: 'https://docs.payos.com/errors/INVALID_MANDATE',
  },

  [ErrorCode.INVALID_CHECKOUT_SESSION]: {
    message: 'Invalid ACP checkout session',
    description: 'The provided ACP checkout session is malformed or invalid',
    httpStatus: 400,
    category: ErrorCategory.VALIDATION,
    retryable: false,
    detailFields: ['checkout_id', 'validation_errors'],
    resolutionSteps: [
      'Verify checkout session structure',
      'Ensure session is not expired',
    ],
    docsUrl: 'https://docs.payos.com/errors/INVALID_CHECKOUT_SESSION',
  },

  [ErrorCode.MISSING_REQUIRED_FIELD]: {
    message: 'Missing required field',
    description: 'A required field is missing from the request',
    httpStatus: 400,
    category: ErrorCategory.VALIDATION,
    retryable: false,
    detailFields: ['missing_fields', 'required_fields'],
    resolutionSteps: [
      'Include all required fields',
    ],
    docsUrl: 'https://docs.payos.com/errors/MISSING_REQUIRED_FIELD',
  },

  [ErrorCode.INVALID_REQUEST_FORMAT]: {
    message: 'Invalid request format',
    description: 'The request body is not valid JSON or does not match the expected schema',
    httpStatus: 400,
    category: ErrorCategory.VALIDATION,
    retryable: false,
    detailFields: ['validation_errors'],
    resolutionSteps: [
      'Ensure request body is valid JSON',
      'Check request schema documentation',
    ],
    docsUrl: 'https://docs.payos.com/errors/INVALID_REQUEST_FORMAT',
  },

  [ErrorCode.AMOUNT_TOO_SMALL]: {
    message: 'Amount below minimum',
    description: 'The transfer amount is below the minimum allowed',
    httpStatus: 400,
    category: ErrorCategory.VALIDATION,
    retryable: false,
    detailFields: ['provided_amount', 'min_amount', 'currency'],
    resolutionSteps: [
      'Increase transfer amount to meet minimum',
    ],
    docsUrl: 'https://docs.payos.com/errors/AMOUNT_TOO_SMALL',
  },

  [ErrorCode.AMOUNT_TOO_LARGE]: {
    message: 'Amount exceeds maximum',
    description: 'The transfer amount exceeds the maximum allowed for a single transaction',
    httpStatus: 400,
    category: ErrorCategory.VALIDATION,
    retryable: false,
    detailFields: ['provided_amount', 'max_amount', 'currency'],
    resolutionSteps: [
      'Reduce transfer amount',
      'Split into multiple smaller transfers',
      'Request limit increase',
    ],
    docsUrl: 'https://docs.payos.com/errors/AMOUNT_TOO_LARGE',
  },

  // ============================================
  // LIMIT ERRORS
  // ============================================
  [ErrorCode.DAILY_LIMIT_EXCEEDED]: {
    message: 'Daily transfer limit exceeded',
    description: 'This transfer would exceed the daily transfer limit',
    httpStatus: 400,
    category: ErrorCategory.LIMITS,
    retryable: true,
    retryAfterAction: 'wait_for_reset',
    detailFields: ['daily_limit', 'current_usage', 'requested_amount', 'resets_at'],
    resolutionSteps: [
      'Wait for daily limit to reset',
      'Reduce transfer amount',
      'Request limit increase',
    ],
    docsUrl: 'https://docs.payos.com/errors/DAILY_LIMIT_EXCEEDED',
  },

  [ErrorCode.MONTHLY_LIMIT_EXCEEDED]: {
    message: 'Monthly transfer limit exceeded',
    description: 'This transfer would exceed the monthly transfer limit',
    httpStatus: 400,
    category: ErrorCategory.LIMITS,
    retryable: true,
    retryAfterAction: 'wait_for_reset',
    detailFields: ['monthly_limit', 'current_usage', 'requested_amount', 'resets_at'],
    resolutionSteps: [
      'Wait for monthly limit to reset',
      'Request limit increase',
    ],
    docsUrl: 'https://docs.payos.com/errors/MONTHLY_LIMIT_EXCEEDED',
  },

  [ErrorCode.SINGLE_TRANSFER_LIMIT_EXCEEDED]: {
    message: 'Single transfer limit exceeded',
    description: 'This transfer exceeds the maximum allowed for a single transaction',
    httpStatus: 400,
    category: ErrorCategory.LIMITS,
    retryable: false,
    detailFields: ['max_single_transfer', 'requested_amount'],
    resolutionSteps: [
      'Split into multiple smaller transfers',
      'Request limit increase',
    ],
    docsUrl: 'https://docs.payos.com/errors/SINGLE_TRANSFER_LIMIT_EXCEEDED',
  },

  [ErrorCode.AGENT_SPENDING_LIMIT_EXCEEDED]: {
    message: 'Agent spending limit exceeded',
    description: 'This payment would exceed the agent spending limit',
    httpStatus: 400,
    category: ErrorCategory.LIMITS,
    retryable: true,
    retryAfterAction: 'wait_for_reset',
    detailFields: ['limit_type', 'limit_amount', 'current_usage', 'resets_at'],
    resolutionSteps: [
      'Wait for limit to reset',
      'Request limit increase for agent',
      'Use a different agent with available limits',
    ],
    docsUrl: 'https://docs.payos.com/errors/AGENT_SPENDING_LIMIT_EXCEEDED',
  },

  [ErrorCode.VELOCITY_LIMIT_EXCEEDED]: {
    message: 'Velocity limit exceeded',
    description: 'Too many transactions in a short time period',
    httpStatus: 429,
    category: ErrorCategory.LIMITS,
    retryable: true,
    retryAfterAction: 'wait',
    detailFields: ['limit_count', 'limit_window_seconds', 'retry_after_seconds'],
    resolutionSteps: [
      'Wait and retry',
      'Batch transactions together',
    ],
    docsUrl: 'https://docs.payos.com/errors/VELOCITY_LIMIT_EXCEEDED',
  },

  [ErrorCode.RATE_LIMITED]: {
    message: 'Rate limit exceeded',
    description: 'Too many API requests in a short time period',
    httpStatus: 429,
    category: ErrorCategory.LIMITS,
    retryable: true,
    retryAfterAction: 'wait',
    detailFields: ['limit', 'window_seconds', 'retry_after_seconds'],
    resolutionSteps: [
      'Wait for rate limit window to reset',
      'Implement exponential backoff',
      'Request higher rate limit',
    ],
    docsUrl: 'https://docs.payos.com/errors/RATE_LIMITED',
  },

  [ErrorCode.CONCURRENT_REQUEST_LIMIT]: {
    message: 'Too many concurrent requests',
    description: 'Maximum number of concurrent requests exceeded',
    httpStatus: 429,
    category: ErrorCategory.LIMITS,
    retryable: true,
    retryAfterAction: 'wait',
    detailFields: ['max_concurrent', 'current_count'],
    resolutionSteps: [
      'Wait for in-flight requests to complete',
      'Reduce concurrency',
    ],
    docsUrl: 'https://docs.payos.com/errors/CONCURRENT_REQUEST_LIMIT',
  },

  [ErrorCode.AGENT_LIMIT_REACHED]: {
    message: 'Maximum agents reached',
    description: 'This account has reached the maximum number of agents allowed',
    httpStatus: 400,
    category: ErrorCategory.LIMITS,
    retryable: false,
    detailFields: ['max_agents', 'current_count'],
    resolutionSteps: [
      'Delete unused agents',
      'Upgrade account tier',
    ],
    docsUrl: 'https://docs.payos.com/errors/AGENT_LIMIT_REACHED',
  },

  [ErrorCode.STREAM_LIMIT_REACHED]: {
    message: 'Maximum streams reached',
    description: 'This account has reached the maximum number of active streams allowed',
    httpStatus: 400,
    category: ErrorCategory.LIMITS,
    retryable: false,
    detailFields: ['max_streams', 'current_count'],
    resolutionSteps: [
      'Cancel unused streams',
      'Upgrade account tier',
    ],
    docsUrl: 'https://docs.payos.com/errors/STREAM_LIMIT_REACHED',
  },

  // ============================================
  // COMPLIANCE ERRORS (continuing...)
  // ============================================
  [ErrorCode.COMPLIANCE_HOLD]: {
    message: 'Transaction on compliance hold',
    description: 'This transaction has been placed on hold for compliance review',
    httpStatus: 403,
    category: ErrorCategory.COMPLIANCE,
    retryable: true,
    retryAfterAction: 'wait_for_review',
    detailFields: ['hold_reason', 'review_expected_at', 'support_contact'],
    resolutionSteps: [
      'Wait for compliance review to complete',
      'Contact support for status update',
      'Provide additional documentation if requested',
    ],
    docsUrl: 'https://docs.payos.com/errors/COMPLIANCE_HOLD',
  },

  [ErrorCode.SANCTIONS_MATCH]: {
    message: 'Sanctions screening match',
    description: 'Transaction blocked due to sanctions screening match',
    httpStatus: 403,
    category: ErrorCategory.COMPLIANCE,
    retryable: false,
    detailFields: ['match_type', 'support_contact'],
    resolutionSteps: [
      'Contact support immediately',
      'Do not retry this transaction',
    ],
    docsUrl: 'https://docs.payos.com/errors/SANCTIONS_MATCH',
  },

  [ErrorCode.KYC_REQUIRED]: {
    message: 'KYC verification required',
    description: 'This operation requires KYC verification to be completed',
    httpStatus: 403,
    category: ErrorCategory.COMPLIANCE,
    retryable: true,
    retryAfterAction: 'complete_kyc',
    detailFields: ['required_tier', 'current_tier', 'verification_url'],
    resolutionSteps: [
      'Complete KYC verification',
      'Submit required documents',
    ],
    docsUrl: 'https://docs.payos.com/errors/KYC_REQUIRED',
  },

  [ErrorCode.KYB_REQUIRED]: {
    message: 'KYB verification required',
    description: 'This operation requires KYB (business) verification to be completed',
    httpStatus: 403,
    category: ErrorCategory.COMPLIANCE,
    retryable: true,
    retryAfterAction: 'complete_kyb',
    detailFields: ['required_tier', 'current_tier', 'verification_url'],
    resolutionSteps: [
      'Complete KYB verification',
      'Submit business documents',
    ],
    docsUrl: 'https://docs.payos.com/errors/KYB_REQUIRED',
  },

  [ErrorCode.KYA_REQUIRED]: {
    message: 'KYA verification required',
    description: 'This operation requires KYA (agent) verification to be completed',
    httpStatus: 403,
    category: ErrorCategory.COMPLIANCE,
    retryable: true,
    retryAfterAction: 'complete_kya',
    detailFields: ['agent_id', 'required_tier', 'current_tier', 'verification_url'],
    resolutionSteps: [
      'Complete KYA verification for agent',
      'Submit agent documentation',
    ],
    docsUrl: 'https://docs.payos.com/errors/KYA_REQUIRED',
  },

  [ErrorCode.RECIPIENT_NOT_VERIFIED]: {
    message: 'Recipient not verified',
    description: 'The recipient account must be verified before receiving this transfer',
    httpStatus: 403,
    category: ErrorCategory.COMPLIANCE,
    retryable: true,
    retryAfterAction: 'verify_recipient',
    detailFields: ['recipient_id', 'required_verification'],
    resolutionSteps: [
      'Ask recipient to complete verification',
      'Use a different verified recipient',
    ],
    docsUrl: 'https://docs.payos.com/errors/RECIPIENT_NOT_VERIFIED',
  },

  [ErrorCode.VERIFICATION_FAILED]: {
    message: 'Verification failed',
    description: 'Identity verification was unsuccessful',
    httpStatus: 403,
    category: ErrorCategory.COMPLIANCE,
    retryable: true,
    retryAfterAction: 'resubmit_verification',
    detailFields: ['failure_reasons', 'support_contact'],
    resolutionSteps: [
      'Review failure reasons',
      'Resubmit with correct information',
      'Contact support if needed',
    ],
    docsUrl: 'https://docs.payos.com/errors/VERIFICATION_FAILED',
  },

  [ErrorCode.VERIFICATION_PENDING]: {
    message: 'Verification pending',
    description: 'Verification is currently under review',
    httpStatus: 403,
    category: ErrorCategory.COMPLIANCE,
    retryable: true,
    retryAfterAction: 'wait_for_review',
    detailFields: ['submitted_at', 'estimated_completion'],
    resolutionSteps: [
      'Wait for verification review to complete',
      'Check status periodically',
    ],
    docsUrl: 'https://docs.payos.com/errors/VERIFICATION_PENDING',
  },

  [ErrorCode.BLOCKED_JURISDICTION]: {
    message: 'Blocked jurisdiction',
    description: 'Transactions with this jurisdiction are not allowed',
    httpStatus: 403,
    category: ErrorCategory.COMPLIANCE,
    retryable: false,
    detailFields: ['jurisdiction_code', 'reason'],
    resolutionSteps: [
      'Use a recipient in an allowed jurisdiction',
    ],
    docsUrl: 'https://docs.payos.com/errors/BLOCKED_JURISDICTION',
  },

  [ErrorCode.HIGH_RISK_TRANSACTION]: {
    message: 'High risk transaction',
    description: 'This transaction has been flagged as high risk and requires manual review',
    httpStatus: 403,
    category: ErrorCategory.COMPLIANCE,
    retryable: true,
    retryAfterAction: 'wait_for_review',
    detailFields: ['risk_score', 'risk_factors', 'review_expected_at'],
    resolutionSteps: [
      'Wait for manual review',
      'Provide additional context if requested',
    ],
    docsUrl: 'https://docs.payos.com/errors/HIGH_RISK_TRANSACTION',
  },

  // ============================================
  // TECHNICAL ERRORS
  // ============================================
  [ErrorCode.RATE_EXPIRED]: {
    message: 'Exchange rate expired',
    description: 'The locked exchange rate has expired',
    httpStatus: 409,
    category: ErrorCategory.TECHNICAL,
    retryable: true,
    retryAfterAction: 'refresh_rate',
    detailFields: ['expired_at', 'rate_id'],
    resolutionSteps: [
      'Get a new exchange rate quote',
      'Retry transfer with fresh rate',
    ],
    docsUrl: 'https://docs.payos.com/errors/RATE_EXPIRED',
  },

  [ErrorCode.QUOTE_EXPIRED]: {
    message: 'Quote expired',
    description: 'The transfer quote has expired',
    httpStatus: 409,
    category: ErrorCategory.TECHNICAL,
    retryable: true,
    retryAfterAction: 'refresh_quote',
    detailFields: ['expired_at', 'quote_id'],
    resolutionSteps: [
      'Get a new quote',
      'Retry transfer with fresh quote',
    ],
    docsUrl: 'https://docs.payos.com/errors/QUOTE_EXPIRED',
  },

  [ErrorCode.IDEMPOTENCY_CONFLICT]: {
    message: 'Idempotency conflict',
    description: 'A request with this idempotency key already exists with different parameters',
    httpStatus: 409,
    category: ErrorCategory.TECHNICAL,
    retryable: false,
    detailFields: ['idempotency_key', 'existing_request_id'],
    resolutionSteps: [
      'Use a different idempotency key for a new request',
      'Retrieve the existing request if it was intended',
    ],
    docsUrl: 'https://docs.payos.com/errors/IDEMPOTENCY_CONFLICT',
  },

  [ErrorCode.CONCURRENT_MODIFICATION]: {
    message: 'Concurrent modification detected',
    description: 'Resource was modified by another request',
    httpStatus: 409,
    category: ErrorCategory.TECHNICAL,
    retryable: true,
    retryAfterAction: 'retry',
    detailFields: ['resource_id', 'resource_type'],
    resolutionSteps: [
      'Fetch the latest resource state',
      'Retry operation with updated data',
    ],
    docsUrl: 'https://docs.payos.com/errors/CONCURRENT_MODIFICATION',
  },

  [ErrorCode.SERVICE_UNAVAILABLE]: {
    message: 'Service temporarily unavailable',
    description: 'The service is temporarily unavailable',
    httpStatus: 503,
    category: ErrorCategory.TECHNICAL,
    retryable: true,
    retryAfterAction: 'wait',
    detailFields: ['retry_after_seconds', 'estimated_restoration'],
    resolutionSteps: [
      'Wait and retry with exponential backoff',
      'Check status page for updates',
    ],
    docsUrl: 'https://docs.payos.com/errors/SERVICE_UNAVAILABLE',
  },

  [ErrorCode.DATABASE_ERROR]: {
    message: 'Database error',
    description: 'An internal database error occurred',
    httpStatus: 500,
    category: ErrorCategory.TECHNICAL,
    retryable: true,
    retryAfterAction: 'retry',
    detailFields: [],
    resolutionSteps: [
      'Retry the operation',
      'Contact support if error persists',
    ],
    docsUrl: 'https://docs.payos.com/errors/DATABASE_ERROR',
  },

  [ErrorCode.NETWORK_ERROR]: {
    message: 'Network error',
    description: 'A network error occurred while communicating with external service',
    httpStatus: 500,
    category: ErrorCategory.TECHNICAL,
    retryable: true,
    retryAfterAction: 'retry',
    detailFields: ['external_service'],
    resolutionSteps: [
      'Retry the operation',
      'Contact support if error persists',
    ],
    docsUrl: 'https://docs.payos.com/errors/NETWORK_ERROR',
  },

  [ErrorCode.TIMEOUT]: {
    message: 'Request timeout',
    description: 'The request timed out before completing',
    httpStatus: 504,
    category: ErrorCategory.TECHNICAL,
    retryable: true,
    retryAfterAction: 'retry',
    detailFields: ['timeout_seconds'],
    resolutionSteps: [
      'Retry the operation',
      'Check if operation completed despite timeout',
    ],
    docsUrl: 'https://docs.payos.com/errors/TIMEOUT',
  },

  [ErrorCode.INTERNAL_ERROR]: {
    message: 'Internal server error',
    description: 'An unexpected internal error occurred',
    httpStatus: 500,
    category: ErrorCategory.TECHNICAL,
    retryable: true,
    retryAfterAction: 'retry',
    detailFields: ['error_id'],
    resolutionSteps: [
      'Retry the operation',
      'Contact support with error ID if error persists',
    ],
    docsUrl: 'https://docs.payos.com/errors/INTERNAL_ERROR',
  },

  [ErrorCode.EXTERNAL_SERVICE_ERROR]: {
    message: 'External service error',
    description: 'An external service returned an error',
    httpStatus: 502,
    category: ErrorCategory.TECHNICAL,
    retryable: true,
    retryAfterAction: 'retry',
    detailFields: ['service_name', 'service_error'],
    resolutionSteps: [
      'Retry the operation',
      'Use alternative service if available',
    ],
    docsUrl: 'https://docs.payos.com/errors/EXTERNAL_SERVICE_ERROR',
  },

  // ============================================
  // WORKFLOW ERRORS
  // ============================================
  [ErrorCode.APPROVAL_REQUIRED]: {
    message: 'Approval required',
    description: 'This operation requires approval before execution',
    httpStatus: 403,
    category: ErrorCategory.WORKFLOW,
    retryable: true,
    retryAfterAction: 'submit_for_approval',
    detailFields: ['approval_policy', 'approvers', 'workflow_id'],
    resolutionSteps: [
      'Submit for approval',
      'Wait for approver response',
    ],
    docsUrl: 'https://docs.payos.com/errors/APPROVAL_REQUIRED',
  },

  [ErrorCode.APPROVAL_PENDING]: {
    message: 'Approval pending',
    description: 'This operation is pending approval',
    httpStatus: 400,
    category: ErrorCategory.WORKFLOW,
    retryable: true,
    retryAfterAction: 'wait_for_approval',
    detailFields: ['workflow_id', 'submitted_at', 'pending_approvers'],
    resolutionSteps: [
      'Wait for approval',
      'Contact approvers',
    ],
    docsUrl: 'https://docs.payos.com/errors/APPROVAL_PENDING',
  },

  [ErrorCode.APPROVAL_REJECTED]: {
    message: 'Approval rejected',
    description: 'This operation was rejected by an approver',
    httpStatus: 403,
    category: ErrorCategory.WORKFLOW,
    retryable: false,
    detailFields: ['workflow_id', 'rejected_by', 'rejected_at', 'rejection_reason'],
    resolutionSteps: [
      'Review rejection reason',
      'Modify and resubmit if appropriate',
    ],
    docsUrl: 'https://docs.payos.com/errors/APPROVAL_REJECTED',
  },

  [ErrorCode.WORKFLOW_NOT_FOUND]: {
    message: 'Workflow not found',
    description: 'The specified workflow does not exist',
    httpStatus: 404,
    category: ErrorCategory.WORKFLOW,
    retryable: false,
    detailFields: ['workflow_id'],
    resolutionSteps: [
      'Verify workflow ID',
      'Check if workflow was deleted',
    ],
    docsUrl: 'https://docs.payos.com/errors/WORKFLOW_NOT_FOUND',
  },

  [ErrorCode.WORKFLOW_ALREADY_COMPLETED]: {
    message: 'Workflow already completed',
    description: 'This workflow has already been completed',
    httpStatus: 409,
    category: ErrorCategory.WORKFLOW,
    retryable: false,
    detailFields: ['workflow_id', 'completed_at'],
    resolutionSteps: [
      'No action needed - workflow is complete',
    ],
    docsUrl: 'https://docs.payos.com/errors/WORKFLOW_ALREADY_COMPLETED',
  },

  [ErrorCode.INVALID_WORKFLOW_STATE]: {
    message: 'Invalid workflow state',
    description: 'Operation not allowed in current workflow state',
    httpStatus: 400,
    category: ErrorCategory.WORKFLOW,
    retryable: false,
    detailFields: ['workflow_id', 'current_state', 'required_state'],
    resolutionSteps: [
      'Check workflow state',
      'Perform operations in correct order',
    ],
    docsUrl: 'https://docs.payos.com/errors/INVALID_WORKFLOW_STATE',
  },

  // ============================================
  // AUTH ERRORS
  // ============================================
  [ErrorCode.UNAUTHORIZED]: {
    message: 'Unauthorized',
    description: 'Authentication is required',
    httpStatus: 401,
    category: ErrorCategory.AUTH,
    retryable: false,
    detailFields: ['auth_method'],
    resolutionSteps: [
      'Provide valid authentication credentials',
      'Check API key or token',
    ],
    docsUrl: 'https://docs.payos.com/errors/UNAUTHORIZED',
  },

  [ErrorCode.FORBIDDEN]: {
    message: 'Forbidden',
    description: 'You do not have permission to perform this action',
    httpStatus: 403,
    category: ErrorCategory.AUTH,
    retryable: false,
    detailFields: ['required_permission', 'current_permissions'],
    resolutionSteps: [
      'Request required permissions',
      'Use account with appropriate permissions',
    ],
    docsUrl: 'https://docs.payos.com/errors/FORBIDDEN',
  },

  [ErrorCode.API_KEY_INVALID]: {
    message: 'Invalid API key',
    description: 'The provided API key is not valid',
    httpStatus: 401,
    category: ErrorCategory.AUTH,
    retryable: false,
    detailFields: [],
    resolutionSteps: [
      'Verify API key is correct',
      'Generate new API key if needed',
    ],
    docsUrl: 'https://docs.payos.com/errors/API_KEY_INVALID',
  },

  [ErrorCode.API_KEY_EXPIRED]: {
    message: 'API key expired',
    description: 'The API key has expired',
    httpStatus: 401,
    category: ErrorCategory.AUTH,
    retryable: false,
    detailFields: ['expired_at'],
    resolutionSteps: [
      'Generate a new API key',
      'Update application with new key',
    ],
    docsUrl: 'https://docs.payos.com/errors/API_KEY_EXPIRED',
  },

  [ErrorCode.API_KEY_REVOKED]: {
    message: 'API key revoked',
    description: 'The API key has been revoked',
    httpStatus: 401,
    category: ErrorCategory.AUTH,
    retryable: false,
    detailFields: ['revoked_at', 'revoked_reason'],
    resolutionSteps: [
      'Generate a new API key',
      'Contact support if unexpected',
    ],
    docsUrl: 'https://docs.payos.com/errors/API_KEY_REVOKED',
  },

  [ErrorCode.INSUFFICIENT_PERMISSIONS]: {
    message: 'Insufficient permissions',
    description: 'Your account does not have sufficient permissions for this operation',
    httpStatus: 403,
    category: ErrorCategory.AUTH,
    retryable: false,
    detailFields: ['required_permissions', 'current_permissions'],
    resolutionSteps: [
      'Request required permissions from account owner',
      'Use different API key with sufficient permissions',
    ],
    docsUrl: 'https://docs.payos.com/errors/INSUFFICIENT_PERMISSIONS',
  },

  [ErrorCode.TOKEN_EXPIRED]: {
    message: 'Token expired',
    description: 'The authentication token has expired',
    httpStatus: 401,
    category: ErrorCategory.AUTH,
    retryable: true,
    retryAfterAction: 'refresh_token',
    detailFields: ['expired_at'],
    resolutionSteps: [
      'Refresh authentication token',
      'Re-authenticate',
    ],
    docsUrl: 'https://docs.payos.com/errors/TOKEN_EXPIRED',
  },

  [ErrorCode.TOKEN_INVALID]: {
    message: 'Invalid token',
    description: 'The authentication token is not valid',
    httpStatus: 401,
    category: ErrorCategory.AUTH,
    retryable: false,
    detailFields: [],
    resolutionSteps: [
      'Verify token is correct',
      'Re-authenticate to get new token',
    ],
    docsUrl: 'https://docs.payos.com/errors/TOKEN_INVALID',
  },

  [ErrorCode.MISSING_AUTHENTICATION]: {
    message: 'Missing authentication',
    description: 'No authentication credentials provided',
    httpStatus: 401,
    category: ErrorCategory.AUTH,
    retryable: false,
    detailFields: ['accepted_methods'],
    resolutionSteps: [
      'Provide API key or authentication token',
      'Check authentication header format',
    ],
    docsUrl: 'https://docs.payos.com/errors/MISSING_AUTHENTICATION',
  },

  // ============================================
  // RESOURCE ERRORS
  // ============================================
  [ErrorCode.ACCOUNT_NOT_FOUND]: {
    message: 'Account not found',
    description: 'The specified account does not exist',
    httpStatus: 404,
    category: ErrorCategory.RESOURCE,
    retryable: false,
    detailFields: ['account_id'],
    resolutionSteps: [
      'Verify account ID is correct',
      'Check if account was deleted',
    ],
    docsUrl: 'https://docs.payos.com/errors/ACCOUNT_NOT_FOUND',
  },

  [ErrorCode.TRANSFER_NOT_FOUND]: {
    message: 'Transfer not found',
    description: 'The specified transfer does not exist',
    httpStatus: 404,
    category: ErrorCategory.RESOURCE,
    retryable: false,
    detailFields: ['transfer_id'],
    resolutionSteps: [
      'Verify transfer ID is correct',
      'Check if transfer was cancelled',
    ],
    docsUrl: 'https://docs.payos.com/errors/TRANSFER_NOT_FOUND',
  },

  [ErrorCode.AGENT_NOT_FOUND]: {
    message: 'Agent not found',
    description: 'The specified agent does not exist',
    httpStatus: 404,
    category: ErrorCategory.RESOURCE,
    retryable: false,
    detailFields: ['agent_id'],
    resolutionSteps: [
      'Verify agent ID is correct',
      'Check if agent was deleted',
    ],
    docsUrl: 'https://docs.payos.com/errors/AGENT_NOT_FOUND',
  },

  [ErrorCode.WALLET_NOT_FOUND]: {
    message: 'Wallet not found',
    description: 'The specified wallet does not exist',
    httpStatus: 404,
    category: ErrorCategory.RESOURCE,
    retryable: false,
    detailFields: ['wallet_id'],
    resolutionSteps: [
      'Verify wallet ID is correct',
      'Create wallet if needed',
    ],
    docsUrl: 'https://docs.payos.com/errors/WALLET_NOT_FOUND',
  },

  [ErrorCode.STREAM_NOT_FOUND]: {
    message: 'Stream not found',
    description: 'The specified stream does not exist',
    httpStatus: 404,
    category: ErrorCategory.RESOURCE,
    retryable: false,
    detailFields: ['stream_id'],
    resolutionSteps: [
      'Verify stream ID is correct',
      'Check if stream was cancelled',
    ],
    docsUrl: 'https://docs.payos.com/errors/STREAM_NOT_FOUND',
  },

  [ErrorCode.QUOTE_NOT_FOUND]: {
    message: 'Quote not found',
    description: 'The specified quote does not exist',
    httpStatus: 404,
    category: ErrorCategory.RESOURCE,
    retryable: false,
    detailFields: ['quote_id'],
    resolutionSteps: [
      'Verify quote ID is correct',
      'Get a new quote',
    ],
    docsUrl: 'https://docs.payos.com/errors/QUOTE_NOT_FOUND',
  },

  [ErrorCode.REFUND_NOT_FOUND]: {
    message: 'Refund not found',
    description: 'The specified refund does not exist',
    httpStatus: 404,
    category: ErrorCategory.RESOURCE,
    retryable: false,
    detailFields: ['refund_id'],
    resolutionSteps: [
      'Verify refund ID is correct',
    ],
    docsUrl: 'https://docs.payos.com/errors/REFUND_NOT_FOUND',
  },

  [ErrorCode.DISPUTE_NOT_FOUND]: {
    message: 'Dispute not found',
    description: 'The specified dispute does not exist',
    httpStatus: 404,
    category: ErrorCategory.RESOURCE,
    retryable: false,
    detailFields: ['dispute_id'],
    resolutionSteps: [
      'Verify dispute ID is correct',
    ],
    docsUrl: 'https://docs.payos.com/errors/DISPUTE_NOT_FOUND',
  },

  [ErrorCode.BATCH_NOT_FOUND]: {
    message: 'Batch not found',
    description: 'The specified batch does not exist',
    httpStatus: 404,
    category: ErrorCategory.RESOURCE,
    retryable: false,
    detailFields: ['batch_id'],
    resolutionSteps: [
      'Verify batch ID is correct',
    ],
    docsUrl: 'https://docs.payos.com/errors/BATCH_NOT_FOUND',
  },

  [ErrorCode.MANDATE_NOT_FOUND]: {
    message: 'Mandate not found',
    description: 'The specified AP2 mandate does not exist',
    httpStatus: 404,
    category: ErrorCategory.RESOURCE,
    retryable: false,
    detailFields: ['mandate_id'],
    resolutionSteps: [
      'Verify mandate ID is correct',
      'Check if mandate expired',
    ],
    docsUrl: 'https://docs.payos.com/errors/MANDATE_NOT_FOUND',
  },

  [ErrorCode.CHECKOUT_NOT_FOUND]: {
    message: 'Checkout not found',
    description: 'The specified ACP checkout session does not exist',
    httpStatus: 404,
    category: ErrorCategory.RESOURCE,
    retryable: false,
    detailFields: ['checkout_id'],
    resolutionSteps: [
      'Verify checkout ID is correct',
      'Check if checkout session expired',
    ],
    docsUrl: 'https://docs.payos.com/errors/CHECKOUT_NOT_FOUND',
  },

  [ErrorCode.ENDPOINT_NOT_FOUND]: {
    message: 'Endpoint not found',
    description: 'The specified x402 endpoint does not exist',
    httpStatus: 404,
    category: ErrorCategory.RESOURCE,
    retryable: false,
    detailFields: ['endpoint_id'],
    resolutionSteps: [
      'Verify endpoint ID is correct',
      'Check if endpoint was deleted',
    ],
    docsUrl: 'https://docs.payos.com/errors/ENDPOINT_NOT_FOUND',
  },

  // ============================================
  // STATE ERRORS
  // ============================================
  [ErrorCode.ACCOUNT_INACTIVE]: {
    message: 'Account inactive',
    description: 'This account is inactive and cannot perform operations',
    httpStatus: 400,
    category: ErrorCategory.STATE,
    retryable: true,
    retryAfterAction: 'activate_account',
    detailFields: ['account_id', 'deactivated_at', 'reason'],
    resolutionSteps: [
      'Activate the account',
      'Contact support if needed',
    ],
    docsUrl: 'https://docs.payos.com/errors/ACCOUNT_INACTIVE',
  },

  [ErrorCode.ACCOUNT_SUSPENDED]: {
    message: 'Account suspended',
    description: 'This account has been suspended',
    httpStatus: 403,
    category: ErrorCategory.STATE,
    retryable: false,
    detailFields: ['account_id', 'suspended_at', 'reason', 'support_contact'],
    resolutionSteps: [
      'Contact support for suspension reason',
      'Resolve suspension issues',
    ],
    docsUrl: 'https://docs.payos.com/errors/ACCOUNT_SUSPENDED',
  },

  [ErrorCode.AGENT_SUSPENDED]: {
    message: 'Agent suspended',
    description: 'This agent has been suspended',
    httpStatus: 403,
    category: ErrorCategory.STATE,
    retryable: false,
    detailFields: ['agent_id', 'suspended_at', 'reason'],
    resolutionSteps: [
      'Contact account owner',
      'Resolve suspension issues',
    ],
    docsUrl: 'https://docs.payos.com/errors/AGENT_SUSPENDED',
  },

  [ErrorCode.AGENT_NAME_TAKEN]: {
    message: 'Agent name already taken',
    description: 'An agent with this name already exists',
    httpStatus: 409,
    category: ErrorCategory.STATE,
    retryable: false,
    detailFields: ['provided_name'],
    resolutionSteps: [
      'Choose a different agent name',
    ],
    docsUrl: 'https://docs.payos.com/errors/AGENT_NAME_TAKEN',
  },

  [ErrorCode.TRANSFER_ALREADY_COMPLETED]: {
    message: 'Transfer already completed',
    description: 'This transfer has already been completed',
    httpStatus: 409,
    category: ErrorCategory.STATE,
    retryable: false,
    detailFields: ['transfer_id', 'completed_at'],
    resolutionSteps: [
      'No action needed - transfer is complete',
    ],
    docsUrl: 'https://docs.payos.com/errors/TRANSFER_ALREADY_COMPLETED',
  },

  [ErrorCode.TRANSFER_ALREADY_CANCELLED]: {
    message: 'Transfer already cancelled',
    description: 'This transfer has already been cancelled',
    httpStatus: 409,
    category: ErrorCategory.STATE,
    retryable: false,
    detailFields: ['transfer_id', 'cancelled_at'],
    resolutionSteps: [
      'No action needed - transfer is cancelled',
    ],
    docsUrl: 'https://docs.payos.com/errors/TRANSFER_ALREADY_CANCELLED',
  },

  [ErrorCode.TRANSFER_NOT_CANCELLABLE]: {
    message: 'Transfer cannot be cancelled',
    description: 'This transfer is in a state that cannot be cancelled',
    httpStatus: 400,
    category: ErrorCategory.STATE,
    retryable: false,
    detailFields: ['transfer_id', 'current_status'],
    resolutionSteps: [
      'Transfer can only be cancelled while pending',
      'Consider refund if transfer completed',
    ],
    docsUrl: 'https://docs.payos.com/errors/TRANSFER_NOT_CANCELLABLE',
  },

  [ErrorCode.STREAM_ALREADY_ACTIVE]: {
    message: 'Stream already active',
    description: 'This stream is already active',
    httpStatus: 409,
    category: ErrorCategory.STATE,
    retryable: false,
    detailFields: ['stream_id'],
    resolutionSteps: [
      'No action needed - stream is active',
    ],
    docsUrl: 'https://docs.payos.com/errors/STREAM_ALREADY_ACTIVE',
  },

  [ErrorCode.STREAM_ALREADY_CANCELLED]: {
    message: 'Stream already cancelled',
    description: 'This stream has already been cancelled',
    httpStatus: 409,
    category: ErrorCategory.STATE,
    retryable: false,
    detailFields: ['stream_id', 'cancelled_at'],
    resolutionSteps: [
      'Create a new stream if needed',
    ],
    docsUrl: 'https://docs.payos.com/errors/STREAM_ALREADY_CANCELLED',
  },

  [ErrorCode.STREAM_INSUFFICIENT_FUNDING]: {
    message: 'Stream has insufficient funding',
    description: 'The stream does not have enough funding to continue',
    httpStatus: 400,
    category: ErrorCategory.STATE,
    retryable: true,
    retryAfterAction: 'fund_stream',
    detailFields: ['stream_id', 'current_funding', 'runway_seconds'],
    resolutionSteps: [
      'Add funding to the stream',
      'Reduce flow rate',
      'Cancel stream if no longer needed',
    ],
    docsUrl: 'https://docs.payos.com/errors/STREAM_INSUFFICIENT_FUNDING',
  },

  [ErrorCode.REFUND_NOT_ALLOWED]: {
    message: 'Refund not allowed',
    description: 'This transfer cannot be refunded',
    httpStatus: 400,
    category: ErrorCategory.STATE,
    retryable: false,
    detailFields: ['transfer_id', 'reason'],
    resolutionSteps: [
      'Check refund eligibility requirements',
      'Contact support if needed',
    ],
    docsUrl: 'https://docs.payos.com/errors/REFUND_NOT_ALLOWED',
  },

  [ErrorCode.REFUND_EXCEEDS_ORIGINAL]: {
    message: 'Refund exceeds original amount',
    description: 'The refund amount exceeds the original transfer amount',
    httpStatus: 400,
    category: ErrorCategory.STATE,
    retryable: false,
    detailFields: ['original_amount', 'requested_refund', 'already_refunded'],
    resolutionSteps: [
      'Reduce refund amount',
      'Check already refunded amount',
    ],
    docsUrl: 'https://docs.payos.com/errors/REFUND_EXCEEDS_ORIGINAL',
  },

  [ErrorCode.REFUND_WINDOW_EXPIRED]: {
    message: 'Refund window expired',
    description: 'The window for refunding this transfer has expired',
    httpStatus: 400,
    category: ErrorCategory.STATE,
    retryable: false,
    detailFields: ['transfer_id', 'window_expired_at'],
    resolutionSteps: [
      'File a dispute if appropriate',
      'Contact support for exceptions',
    ],
    docsUrl: 'https://docs.payos.com/errors/REFUND_WINDOW_EXPIRED',
  },

  [ErrorCode.DISPUTE_ALREADY_EXISTS]: {
    message: 'Dispute already exists',
    description: 'A dispute already exists for this transfer',
    httpStatus: 409,
    category: ErrorCategory.STATE,
    retryable: false,
    detailFields: ['dispute_id', 'transfer_id'],
    resolutionSteps: [
      'View existing dispute',
      'Add evidence to existing dispute',
    ],
    docsUrl: 'https://docs.payos.com/errors/DISPUTE_ALREADY_EXISTS',
  },

  [ErrorCode.DISPUTE_WINDOW_EXPIRED]: {
    message: 'Dispute window expired',
    description: 'The window for disputing this transfer has expired',
    httpStatus: 400,
    category: ErrorCategory.STATE,
    retryable: false,
    detailFields: ['transfer_id', 'window_expired_at'],
    resolutionSteps: [
      'Contact support for exceptional cases',
    ],
    docsUrl: 'https://docs.payos.com/errors/DISPUTE_WINDOW_EXPIRED',
  },

  [ErrorCode.DISPUTE_ALREADY_RESOLVED]: {
    message: 'Dispute already resolved',
    description: 'This dispute has already been resolved',
    httpStatus: 409,
    category: ErrorCategory.STATE,
    retryable: false,
    detailFields: ['dispute_id', 'resolved_at', 'resolution'],
    resolutionSteps: [
      'No action needed - dispute is resolved',
    ],
    docsUrl: 'https://docs.payos.com/errors/DISPUTE_ALREADY_RESOLVED',
  },

  [ErrorCode.EVIDENCE_REQUIRED]: {
    message: 'Evidence required',
    description: 'Additional evidence is required for this dispute',
    httpStatus: 400,
    category: ErrorCategory.STATE,
    retryable: true,
    retryAfterAction: 'submit_evidence',
    detailFields: ['dispute_id', 'required_evidence_types', 'deadline'],
    resolutionSteps: [
      'Submit required evidence',
      'Review evidence requirements',
    ],
    docsUrl: 'https://docs.payos.com/errors/EVIDENCE_REQUIRED',
  },

  // ============================================
  // PROTOCOL ERRORS
  // ============================================
  [ErrorCode.X402_PAYMENT_REQUIRED]: {
    message: 'x402 payment required',
    description: 'This endpoint requires x402 payment',
    httpStatus: 402,
    category: ErrorCategory.PROTOCOL,
    retryable: true,
    retryAfterAction: 'make_x402_payment',
    detailFields: ['endpoint_id', 'price', 'currency', 'payment_methods'],
    resolutionSteps: [
      'Make x402 payment for this endpoint',
      'Include payment proof in request',
    ],
    docsUrl: 'https://docs.payos.com/errors/X402_PAYMENT_REQUIRED',
  },

  [ErrorCode.X402_PAYMENT_INVALID]: {
    message: 'Invalid x402 payment',
    description: 'The x402 payment is invalid or insufficient',
    httpStatus: 400,
    category: ErrorCategory.PROTOCOL,
    retryable: true,
    retryAfterAction: 'make_x402_payment',
    detailFields: ['reason', 'required_amount', 'provided_amount'],
    resolutionSteps: [
      'Verify payment amount',
      'Get fresh payment proof',
      'Retry with valid payment',
    ],
    docsUrl: 'https://docs.payos.com/errors/X402_PAYMENT_INVALID',
  },

  [ErrorCode.X402_PROOF_INVALID]: {
    message: 'Invalid x402 payment proof',
    description: 'The x402 payment proof is invalid or expired',
    httpStatus: 400,
    category: ErrorCategory.PROTOCOL,
    retryable: true,
    retryAfterAction: 'refresh_proof',
    detailFields: ['reason'],
    resolutionSteps: [
      'Get fresh payment proof',
      'Verify proof signature',
    ],
    docsUrl: 'https://docs.payos.com/errors/X402_PROOF_INVALID',
  },

  [ErrorCode.X402_ENDPOINT_NOT_FOUND]: {
    message: 'x402 endpoint not found',
    description: 'The specified x402 endpoint does not exist',
    httpStatus: 404,
    category: ErrorCategory.PROTOCOL,
    retryable: false,
    detailFields: ['endpoint_id'],
    resolutionSteps: [
      'Verify endpoint ID',
      'Check available endpoints',
    ],
    docsUrl: 'https://docs.payos.com/errors/X402_ENDPOINT_NOT_FOUND',
  },

  [ErrorCode.AP2_MANDATE_EXPIRED]: {
    message: 'AP2 mandate expired',
    description: 'The AP2 mandate has expired',
    httpStatus: 400,
    category: ErrorCategory.PROTOCOL,
    retryable: true,
    retryAfterAction: 'refresh_mandate',
    detailFields: ['mandate_id', 'expired_at'],
    resolutionSteps: [
      'Get new AP2 mandate',
      'Retry payment with fresh mandate',
    ],
    docsUrl: 'https://docs.payos.com/errors/AP2_MANDATE_EXPIRED',
  },

  [ErrorCode.AP2_MANDATE_INVALID]: {
    message: 'Invalid AP2 mandate',
    description: 'The AP2 mandate is invalid or malformed',
    httpStatus: 400,
    category: ErrorCategory.PROTOCOL,
    retryable: false,
    detailFields: ['mandate_id', 'validation_errors'],
    resolutionSteps: [
      'Verify mandate structure',
      'Get new mandate from agent',
    ],
    docsUrl: 'https://docs.payos.com/errors/AP2_MANDATE_INVALID',
  },

  [ErrorCode.AP2_EXECUTION_FAILED]: {
    message: 'AP2 mandate execution failed',
    description: 'Failed to execute AP2 mandate',
    httpStatus: 400,
    category: ErrorCategory.PROTOCOL,
    retryable: true,
    retryAfterAction: 'retry',
    detailFields: ['mandate_id', 'failure_reason'],
    resolutionSteps: [
      'Review failure reason',
      'Retry execution',
      'Get new mandate if needed',
    ],
    docsUrl: 'https://docs.payos.com/errors/AP2_EXECUTION_FAILED',
  },

  [ErrorCode.ACP_CHECKOUT_INVALID]: {
    message: 'Invalid ACP checkout',
    description: 'The ACP checkout session is invalid',
    httpStatus: 400,
    category: ErrorCategory.PROTOCOL,
    retryable: false,
    detailFields: ['checkout_id', 'validation_errors'],
    resolutionSteps: [
      'Verify checkout session',
      'Create new checkout session',
    ],
    docsUrl: 'https://docs.payos.com/errors/ACP_CHECKOUT_INVALID',
  },

  [ErrorCode.ACP_TOKEN_INVALID]: {
    message: 'Invalid ACP payment token',
    description: 'The ACP shared payment token is invalid',
    httpStatus: 400,
    category: ErrorCategory.PROTOCOL,
    retryable: false,
    detailFields: ['reason'],
    resolutionSteps: [
      'Get new payment token',
      'Verify token signature',
    ],
    docsUrl: 'https://docs.payos.com/errors/ACP_TOKEN_INVALID',
  },

  [ErrorCode.ACP_SESSION_EXPIRED]: {
    message: 'ACP checkout session expired',
    description: 'The ACP checkout session has expired',
    httpStatus: 400,
    category: ErrorCategory.PROTOCOL,
    retryable: true,
    retryAfterAction: 'refresh_session',
    detailFields: ['checkout_id', 'expired_at'],
    resolutionSteps: [
      'Create new checkout session',
      'Retry payment',
    ],
    docsUrl: 'https://docs.payos.com/errors/ACP_SESSION_EXPIRED',
  },

  // ============================================
  // SETTLEMENT ERRORS
  // ============================================
  [ErrorCode.RAIL_UNAVAILABLE]: {
    message: 'Settlement rail unavailable',
    description: 'The payment rail is temporarily unavailable',
    httpStatus: 503,
    category: ErrorCategory.TECHNICAL,
    retryable: true,
    retryAfterAction: 'wait',
    detailFields: ['rail', 'estimated_restoration'],
    resolutionSteps: [
      'Wait for rail to come back online',
      'Use alternative rail if available',
    ],
    docsUrl: 'https://docs.payos.com/errors/RAIL_UNAVAILABLE',
  },

  [ErrorCode.RECIPIENT_VALIDATION_FAILED]: {
    message: 'Recipient validation failed',
    description: 'The recipient details failed validation',
    httpStatus: 400,
    category: ErrorCategory.VALIDATION,
    retryable: false,
    detailFields: ['rail', 'validation_errors'],
    resolutionSteps: [
      'Verify recipient details are correct',
      'Check PIX key or CLABE format',
    ],
    docsUrl: 'https://docs.payos.com/errors/RECIPIENT_VALIDATION_FAILED',
  },

  [ErrorCode.SETTLEMENT_FAILED]: {
    message: 'Settlement failed',
    description: 'The settlement to the payment rail failed',
    httpStatus: 400,
    category: ErrorCategory.TECHNICAL,
    retryable: true,
    retryAfterAction: 'retry',
    detailFields: ['rail', 'failure_reason', 'transfer_id'],
    resolutionSteps: [
      'Review failure reason',
      'Verify recipient details',
      'Retry settlement',
    ],
    docsUrl: 'https://docs.payos.com/errors/SETTLEMENT_FAILED',
  },

  [ErrorCode.FUNDING_SOURCE_INSUFFICIENT]: {
    message: 'Funding source insufficient balance',
    description: 'The parent account does not have sufficient funds',
    httpStatus: 400,
    category: ErrorCategory.BALANCE,
    retryable: true,
    retryAfterAction: 'top_up_account',
    detailFields: ['funding_account_id', 'available_balance', 'required_amount'],
    resolutionSteps: [
      'Add funds to parent account',
      'Use different funding source',
    ],
    docsUrl: 'https://docs.payos.com/errors/FUNDING_SOURCE_INSUFFICIENT',
  },

  // ============================================
  // SIMULATION ERRORS
  // ============================================

  [ErrorCode.SIMULATION_EXPIRED]: {
    message: 'Simulation has expired',
    description: 'The simulation TTL (1 hour) has passed. Create a new simulation to proceed.',
    httpStatus: 410,
    category: ErrorCategory.STATE,
    retryable: false,
    detailFields: ['simulation_id', 'created_at', 'expires_at'],
    resolutionSteps: [
      'Create a new simulation',
      'Execute simulations within 1 hour of creation',
    ],
    docsUrl: 'https://docs.payos.com/errors/SIMULATION_EXPIRED',
  },

  [ErrorCode.SIMULATION_CANNOT_EXECUTE]: {
    message: 'Simulation has errors and cannot be executed',
    description: 'The simulation failed validation. Review errors and create a corrected simulation.',
    httpStatus: 400,
    category: ErrorCategory.VALIDATION,
    retryable: false,
    detailFields: ['simulation_id', 'errors'],
    resolutionSteps: [
      'Review simulation errors',
      'Fix issues and create new simulation',
    ],
    docsUrl: 'https://docs.payos.com/errors/SIMULATION_CANNOT_EXECUTE',
  },

  [ErrorCode.SIMULATION_STALE]: {
    message: 'Conditions have changed since simulation',
    description: 'Re-validation failed because balances, rates, or other conditions changed.',
    httpStatus: 409,
    category: ErrorCategory.STATE,
    retryable: true,
    retryAfterAction: 'create_new_simulation',
    detailFields: ['simulation_id', 'changed_conditions'],
    resolutionSteps: [
      'Create a new simulation to get updated preview',
      'Execute immediately after creation for time-sensitive operations',
    ],
    docsUrl: 'https://docs.payos.com/errors/SIMULATION_STALE',
  },

  [ErrorCode.SIMULATION_NOT_FOUND]: {
    message: 'Simulation not found',
    description: 'No simulation exists with the provided ID, or it belongs to a different tenant.',
    httpStatus: 404,
    category: ErrorCategory.RESOURCE,
    retryable: false,
    detailFields: ['simulation_id'],
    resolutionSteps: [
      'Verify simulation ID is correct',
      'Create a new simulation if needed',
    ],
    docsUrl: 'https://docs.payos.com/errors/SIMULATION_NOT_FOUND',
  },

  [ErrorCode.NOT_IMPLEMENTED]: {
    message: 'Feature not implemented',
    description: 'This feature is not yet available.',
    httpStatus: 501,
    category: ErrorCategory.TECHNICAL,
    retryable: false,
    detailFields: ['feature', 'available_alternatives'],
    resolutionSteps: [
      'Check available alternatives',
      'Contact support for feature availability',
    ],
    docsUrl: 'https://docs.payos.com/errors/NOT_IMPLEMENTED',
  },

  [ErrorCode.VALIDATION_FAILED]: {
    message: 'Validation failed',
    description: 'The request failed validation. Review the errors and correct your request.',
    httpStatus: 400,
    category: ErrorCategory.VALIDATION,
    retryable: false,
    detailFields: ['validation_errors'],
    resolutionSteps: [
      'Review validation errors',
      'Correct request and retry',
    ],
    docsUrl: 'https://docs.payos.com/errors/VALIDATION_FAILED',
  },
};

// ============================================
// ERROR CATEGORY MAPPING
// ============================================

/**
 * Map error codes to categories
 */
export const ERROR_CATEGORIES: Record<ErrorCode, ErrorCategory> = Object.entries(ERROR_METADATA).reduce(
  (acc, [code, metadata]) => {
    acc[code as ErrorCode] = metadata.category;
    return acc;
  },
  {} as Record<ErrorCode, ErrorCategory>
);

