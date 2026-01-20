/**
 * UCP Messages System
 *
 * Manages checkout messages (errors, warnings, info) per UCP specification.
 * Messages communicate issues and guidance to the buyer/agent.
 *
 * Severity levels:
 * - recoverable: Can be fixed automatically (e.g., price adjustment)
 * - requires_buyer_input: Needs buyer to provide data (e.g., address)
 * - requires_buyer_review: Needs buyer acknowledgment (e.g., price change)
 *
 * @see Story 43.2: Checkout Capability
 * @see https://ucp.dev/specification/checkout/#messages
 */

// =============================================================================
// Types
// =============================================================================

export type MessageType = 'error' | 'warning' | 'info';

export type MessageSeverity =
  | 'recoverable'
  | 'requires_buyer_input'
  | 'requires_buyer_review';

export type ContentType = 'plain' | 'markdown';

export interface UCPMessage {
  /** Unique ID for this message */
  id: string;
  /** Message type */
  type: MessageType;
  /** Error/warning code for programmatic handling */
  code: string;
  /** Severity (for errors) */
  severity?: MessageSeverity;
  /** JSONPath to affected field */
  path?: string;
  /** Human-readable content */
  content: string;
  /** Content format */
  content_type: ContentType;
  /** Timestamp */
  created_at: string;
}

// =============================================================================
// Error Codes
// =============================================================================

/**
 * Standard UCP error codes with default severity
 */
export const ErrorCodes = {
  // Cart errors
  CART_EMPTY: { severity: 'requires_buyer_input' as MessageSeverity, path: '$.line_items' },
  ITEM_OUT_OF_STOCK: { severity: 'requires_buyer_input' as MessageSeverity },
  ITEM_PRICE_CHANGED: { severity: 'requires_buyer_review' as MessageSeverity },
  ITEM_UNAVAILABLE: { severity: 'requires_buyer_input' as MessageSeverity },
  QUANTITY_EXCEEDED: { severity: 'requires_buyer_input' as MessageSeverity },

  // Buyer errors
  MISSING_EMAIL: { severity: 'requires_buyer_input' as MessageSeverity, path: '$.buyer.email' },
  INVALID_EMAIL: { severity: 'requires_buyer_input' as MessageSeverity, path: '$.buyer.email' },
  MISSING_PHONE: { severity: 'requires_buyer_input' as MessageSeverity, path: '$.buyer.phone' },

  // Address errors
  MISSING_SHIPPING_ADDRESS: { severity: 'requires_buyer_input' as MessageSeverity, path: '$.shipping_address' },
  INVALID_SHIPPING_ADDRESS: { severity: 'requires_buyer_input' as MessageSeverity, path: '$.shipping_address' },
  SHIPPING_UNAVAILABLE: { severity: 'requires_buyer_input' as MessageSeverity, path: '$.shipping_address' },
  MISSING_BILLING_ADDRESS: { severity: 'requires_buyer_input' as MessageSeverity, path: '$.billing_address' },
  INVALID_BILLING_ADDRESS: { severity: 'requires_buyer_input' as MessageSeverity, path: '$.billing_address' },

  // Payment errors
  MISSING_PAYMENT_METHOD: { severity: 'requires_buyer_input' as MessageSeverity, path: '$.payment_instruments' },
  INVALID_PAYMENT_METHOD: { severity: 'requires_buyer_input' as MessageSeverity, path: '$.payment_instruments' },
  PAYMENT_DECLINED: { severity: 'requires_buyer_input' as MessageSeverity },
  PAYMENT_EXPIRED: { severity: 'recoverable' as MessageSeverity },
  INSUFFICIENT_FUNDS: { severity: 'requires_buyer_input' as MessageSeverity },

  // Checkout errors
  CHECKOUT_EXPIRED: { severity: 'recoverable' as MessageSeverity },
  CHECKOUT_INVALID: { severity: 'recoverable' as MessageSeverity },

  // Settlement errors (PayOS specific)
  CORRIDOR_UNAVAILABLE: { severity: 'requires_buyer_input' as MessageSeverity },
  RECIPIENT_INVALID: { severity: 'requires_buyer_input' as MessageSeverity },
  AMOUNT_EXCEEDED: { severity: 'requires_buyer_input' as MessageSeverity },
  FX_RATE_EXPIRED: { severity: 'recoverable' as MessageSeverity },
} as const;

export type ErrorCode = keyof typeof ErrorCodes;

// =============================================================================
// Warning Codes
// =============================================================================

/**
 * Standard UCP warning codes
 */
export const WarningCodes = {
  PRICE_MAY_CHANGE: {},
  SHIPPING_DELAYED: {},
  LIMITED_STOCK: {},
  PROMOTION_EXPIRING: {},
  FX_RATE_VOLATILE: {},
} as const;

export type WarningCode = keyof typeof WarningCodes;

// =============================================================================
// Info Codes
// =============================================================================

/**
 * Standard UCP info codes
 */
export const InfoCodes = {
  PROMOTION_APPLIED: {},
  FREE_SHIPPING_ELIGIBLE: {},
  LOYALTY_POINTS_EARNED: {},
  ESTIMATED_DELIVERY: {},
} as const;

export type InfoCode = keyof typeof InfoCodes;

// =============================================================================
// Message Factory Functions
// =============================================================================

let messageCounter = 0;

/**
 * Generate unique message ID
 */
function generateMessageId(): string {
  messageCounter++;
  return `msg_${Date.now()}_${messageCounter}`;
}

/**
 * Create an error message
 */
export function createError(
  code: ErrorCode,
  content: string,
  options: {
    path?: string;
    severity?: MessageSeverity;
    contentType?: ContentType;
  } = {}
): UCPMessage {
  const codeConfig = ErrorCodes[code];

  return {
    id: generateMessageId(),
    type: 'error',
    code,
    severity: options.severity || codeConfig.severity,
    path: options.path || codeConfig.path,
    content,
    content_type: options.contentType || 'plain',
    created_at: new Date().toISOString(),
  };
}

/**
 * Create a warning message
 */
export function createWarning(
  code: WarningCode,
  content: string,
  options: {
    path?: string;
    contentType?: ContentType;
  } = {}
): UCPMessage {
  return {
    id: generateMessageId(),
    type: 'warning',
    code,
    path: options.path,
    content,
    content_type: options.contentType || 'plain',
    created_at: new Date().toISOString(),
  };
}

/**
 * Create an info message
 */
export function createInfo(
  code: InfoCode,
  content: string,
  options: {
    path?: string;
    contentType?: ContentType;
  } = {}
): UCPMessage {
  return {
    id: generateMessageId(),
    type: 'info',
    code,
    path: options.path,
    content,
    content_type: options.contentType || 'plain',
    created_at: new Date().toISOString(),
  };
}

// =============================================================================
// Message Management
// =============================================================================

/**
 * Add a message to the messages array
 */
export function addMessage(messages: UCPMessage[], message: UCPMessage): UCPMessage[] {
  return [...messages, message];
}

/**
 * Remove a message by ID
 */
export function removeMessage(messages: UCPMessage[], messageId: string): UCPMessage[] {
  return messages.filter((m) => m.id !== messageId);
}

/**
 * Remove messages by code
 */
export function removeMessagesByCode(messages: UCPMessage[], code: string): UCPMessage[] {
  return messages.filter((m) => m.code !== code);
}

/**
 * Clear all messages of a specific type
 */
export function clearMessagesByType(messages: UCPMessage[], type: MessageType): UCPMessage[] {
  return messages.filter((m) => m.type !== type);
}

/**
 * Clear all messages
 */
export function clearMessages(): UCPMessage[] {
  return [];
}

// =============================================================================
// Message Queries
// =============================================================================

/**
 * Get all error messages
 */
export function getErrors(messages: UCPMessage[]): UCPMessage[] {
  return messages.filter((m) => m.type === 'error');
}

/**
 * Get all warning messages
 */
export function getWarnings(messages: UCPMessage[]): UCPMessage[] {
  return messages.filter((m) => m.type === 'warning');
}

/**
 * Get all info messages
 */
export function getInfos(messages: UCPMessage[]): UCPMessage[] {
  return messages.filter((m) => m.type === 'info');
}

/**
 * Get recoverable errors (can be fixed automatically)
 */
export function getRecoverableErrors(messages: UCPMessage[]): UCPMessage[] {
  return messages.filter((m) => m.type === 'error' && m.severity === 'recoverable');
}

/**
 * Get errors requiring buyer input
 */
export function getInputRequiredErrors(messages: UCPMessage[]): UCPMessage[] {
  return messages.filter((m) => m.type === 'error' && m.severity === 'requires_buyer_input');
}

/**
 * Get errors requiring buyer review
 */
export function getReviewRequiredErrors(messages: UCPMessage[]): UCPMessage[] {
  return messages.filter((m) => m.type === 'error' && m.severity === 'requires_buyer_review');
}

/**
 * Check if there are any blocking errors (non-recoverable)
 */
export function hasBlockingErrors(messages: UCPMessage[]): boolean {
  return messages.some(
    (m) =>
      m.type === 'error' &&
      (m.severity === 'requires_buyer_input' || m.severity === 'requires_buyer_review')
  );
}

/**
 * Get messages for a specific path
 */
export function getMessagesForPath(messages: UCPMessage[], path: string): UCPMessage[] {
  return messages.filter((m) => m.path === path);
}

/**
 * Check if a specific error code exists
 */
export function hasError(messages: UCPMessage[], code: ErrorCode): boolean {
  return messages.some((m) => m.type === 'error' && m.code === code);
}

// =============================================================================
// Message Formatting
// =============================================================================

/**
 * Format messages for API response
 */
export function formatMessagesForResponse(messages: UCPMessage[]): UCPMessage[] {
  // Sort by type (errors first, then warnings, then info)
  const typeOrder: Record<MessageType, number> = {
    error: 0,
    warning: 1,
    info: 2,
  };

  return [...messages].sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);
}

/**
 * Get summary of messages
 */
export function getMessageSummary(messages: UCPMessage[]): {
  errors: number;
  warnings: number;
  infos: number;
  blocking: number;
} {
  const errors = getErrors(messages).length;
  const warnings = getWarnings(messages).length;
  const infos = getInfos(messages).length;
  const blocking = messages.filter(
    (m) =>
      m.type === 'error' &&
      m.severity !== 'recoverable'
  ).length;

  return { errors, warnings, infos, blocking };
}
