/**
 * UCP Checkout Status State Machine
 *
 * Manages the checkout status lifecycle per UCP specification.
 *
 * State Machine:
 *
 *                     ┌─────────────┐
 *                     │  incomplete │
 *                     └──────┬──────┘
 *                            │
 *            ┌───────────────┼───────────────┐
 *            ▼               ▼               ▼
 * ┌─────────────────┐  ┌───────────┐  ┌──────────┐
 * │requires_escalation│  │ready_for_ │  │ canceled │
 * │(needs buyer input)│  │ complete  │  │          │
 * └────────┬────────┘  └─────┬─────┘  └──────────┘
 *          │                 │
 *          └────────┬────────┘
 *                   ▼
 *          ┌───────────────────┐
 *          │complete_in_progress│
 *          └─────────┬─────────┘
 *                    ▼
 *             ┌───────────┐
 *             │ completed │
 *             └───────────┘
 *
 * @see Story 43.2: Checkout Capability
 * @see https://ucp.dev/specification/checkout/
 */

// =============================================================================
// Types
// =============================================================================

export type CheckoutStatus =
  | 'incomplete'
  | 'requires_escalation'
  | 'ready_for_complete'
  | 'complete_in_progress'
  | 'completed'
  | 'canceled';

export interface StatusTransition {
  from: CheckoutStatus;
  to: CheckoutStatus;
  allowed: boolean;
  reason?: string;
}

export interface CheckoutRequirements {
  hasLineItems: boolean;
  hasBuyer: boolean;
  hasShippingAddress: boolean;
  hasBillingAddress: boolean;
  hasPaymentInstrument: boolean;
  hasRecoverableErrors: boolean;
  requiresEscalation: boolean;
}

// =============================================================================
// Status Transitions
// =============================================================================

/**
 * Valid status transitions
 *
 * incomplete -> requires_escalation (buyer input needed)
 * incomplete -> ready_for_complete (all requirements met)
 * incomplete -> canceled (user cancels)
 *
 * requires_escalation -> incomplete (requirements no longer met)
 * requires_escalation -> ready_for_complete (buyer provided input)
 * requires_escalation -> canceled (user cancels)
 *
 * ready_for_complete -> incomplete (requirements no longer met)
 * ready_for_complete -> requires_escalation (needs buyer review)
 * ready_for_complete -> complete_in_progress (completion started)
 * ready_for_complete -> canceled (user cancels)
 *
 * complete_in_progress -> completed (success)
 * complete_in_progress -> ready_for_complete (payment failed, retry)
 * complete_in_progress -> requires_escalation (buyer action needed)
 *
 * completed -> (terminal state)
 * canceled -> (terminal state)
 */
const VALID_TRANSITIONS: Record<CheckoutStatus, CheckoutStatus[]> = {
  incomplete: ['requires_escalation', 'ready_for_complete', 'canceled'],
  requires_escalation: ['incomplete', 'ready_for_complete', 'canceled'],
  ready_for_complete: ['incomplete', 'requires_escalation', 'complete_in_progress', 'canceled'],
  complete_in_progress: ['completed', 'ready_for_complete', 'requires_escalation'],
  completed: [], // Terminal state
  canceled: [], // Terminal state
};

/**
 * Check if a status transition is valid
 */
export function isValidTransition(from: CheckoutStatus, to: CheckoutStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

/**
 * Validate a status transition and return details
 */
export function validateTransition(from: CheckoutStatus, to: CheckoutStatus): StatusTransition {
  const allowed = isValidTransition(from, to);

  let reason: string | undefined;
  if (!allowed) {
    if (from === 'completed') {
      reason = 'Cannot transition from completed checkout';
    } else if (from === 'canceled') {
      reason = 'Cannot transition from canceled checkout';
    } else {
      reason = `Invalid transition from ${from} to ${to}`;
    }
  }

  return { from, to, allowed, reason };
}

// =============================================================================
// Status Computation
// =============================================================================

/**
 * Compute checkout requirements based on current state
 */
export function computeRequirements(checkout: {
  line_items: unknown[];
  buyer?: { email?: string } | null;
  shipping_address?: unknown | null;
  billing_address?: unknown | null;
  selected_instrument_id?: string | null;
  payment_instruments?: unknown[];
  messages?: Array<{ type: string; severity?: string }>;
}): CheckoutRequirements {
  const hasLineItems = Array.isArray(checkout.line_items) && checkout.line_items.length > 0;
  const hasBuyer = !!checkout.buyer?.email;
  const hasShippingAddress = !!checkout.shipping_address;
  const hasBillingAddress = !!checkout.billing_address;

  // Check if there's a selected payment instrument
  const hasPaymentInstrument = !!checkout.selected_instrument_id ||
    (Array.isArray(checkout.payment_instruments) && checkout.payment_instruments.length > 0);

  // Check for recoverable errors
  const messages = checkout.messages || [];
  const hasRecoverableErrors = messages.some(
    (m) => m.type === 'error' && m.severity === 'recoverable'
  );

  // Check if buyer action is required
  const requiresEscalation = messages.some(
    (m) => m.type === 'error' &&
      (m.severity === 'requires_buyer_input' || m.severity === 'requires_buyer_review')
  );

  return {
    hasLineItems,
    hasBuyer,
    hasShippingAddress,
    hasBillingAddress,
    hasPaymentInstrument,
    hasRecoverableErrors,
    requiresEscalation,
  };
}

/**
 * Compute the appropriate status based on checkout state
 *
 * This implements the UCP status computation logic:
 * - incomplete: Missing required fields
 * - requires_escalation: Has errors requiring buyer input
 * - ready_for_complete: All requirements met, can complete
 */
export function computeStatus(
  checkout: {
    status: CheckoutStatus;
    line_items: unknown[];
    buyer?: { email?: string } | null;
    shipping_address?: unknown | null;
    billing_address?: unknown | null;
    selected_instrument_id?: string | null;
    payment_instruments?: unknown[];
    messages?: Array<{ type: string; severity?: string }>;
  },
  options: {
    requireShipping?: boolean;
    requireBilling?: boolean;
  } = {}
): CheckoutStatus {
  const { requireShipping = true, requireBilling = false } = options;

  // Terminal states don't change
  if (checkout.status === 'completed' || checkout.status === 'canceled') {
    return checkout.status;
  }

  // During completion, only certain transitions are valid
  if (checkout.status === 'complete_in_progress') {
    return checkout.status; // Managed by completion flow
  }

  const req = computeRequirements(checkout);

  // Check for escalation requirements
  if (req.requiresEscalation) {
    return 'requires_escalation';
  }

  // Check all requirements
  const allRequirementsMet =
    req.hasLineItems &&
    req.hasBuyer &&
    (!requireShipping || req.hasShippingAddress) &&
    (!requireBilling || req.hasBillingAddress) &&
    req.hasPaymentInstrument &&
    !req.hasRecoverableErrors;

  if (allRequirementsMet) {
    return 'ready_for_complete';
  }

  return 'incomplete';
}

/**
 * Get missing requirements for a checkout
 */
export function getMissingRequirements(
  checkout: {
    line_items: unknown[];
    buyer?: { email?: string } | null;
    shipping_address?: unknown | null;
    billing_address?: unknown | null;
    selected_instrument_id?: string | null;
    payment_instruments?: unknown[];
    messages?: Array<{ type: string; severity?: string }>;
  },
  options: {
    requireShipping?: boolean;
    requireBilling?: boolean;
  } = {}
): string[] {
  const { requireShipping = true, requireBilling = false } = options;
  const req = computeRequirements(checkout);
  const missing: string[] = [];

  if (!req.hasLineItems) {
    missing.push('line_items');
  }
  if (!req.hasBuyer) {
    missing.push('buyer.email');
  }
  if (requireShipping && !req.hasShippingAddress) {
    missing.push('shipping_address');
  }
  if (requireBilling && !req.hasBillingAddress) {
    missing.push('billing_address');
  }
  if (!req.hasPaymentInstrument) {
    missing.push('payment_instrument');
  }

  return missing;
}

// =============================================================================
// Status Helpers
// =============================================================================

/**
 * Check if checkout can be completed
 */
export function canComplete(status: CheckoutStatus): boolean {
  return status === 'ready_for_complete';
}

/**
 * Check if checkout can be modified
 */
export function canModify(status: CheckoutStatus): boolean {
  return ['incomplete', 'requires_escalation', 'ready_for_complete'].includes(status);
}

/**
 * Check if checkout can be canceled
 */
export function canCancel(status: CheckoutStatus): boolean {
  return ['incomplete', 'requires_escalation', 'ready_for_complete'].includes(status);
}

/**
 * Check if checkout is in a terminal state
 */
export function isTerminal(status: CheckoutStatus): boolean {
  return status === 'completed' || status === 'canceled';
}

/**
 * Get human-readable status description
 */
export function getStatusDescription(status: CheckoutStatus): string {
  switch (status) {
    case 'incomplete':
      return 'Checkout is missing required information';
    case 'requires_escalation':
      return 'Checkout requires buyer input or review';
    case 'ready_for_complete':
      return 'Checkout is ready to be completed';
    case 'complete_in_progress':
      return 'Checkout completion is in progress';
    case 'completed':
      return 'Checkout has been completed successfully';
    case 'canceled':
      return 'Checkout has been canceled';
    default:
      return 'Unknown status';
  }
}
