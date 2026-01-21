/**
 * UCP Checkout Service
 *
 * Manages checkout session lifecycle per UCP specification.
 *
 * Operations:
 * - Create checkout session
 * - Update checkout (line items, buyer, addresses, payment)
 * - Complete checkout (process payment, create order)
 * - Cancel checkout
 *
 * @see Story 43.2: Checkout Capability
 * @see https://ucp.dev/specification/checkout/
 */

import { createHash } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  UCPCheckoutSession,
  UCPLineItem,
  UCPTotal,
  UCPBuyer,
  UCPAddress,
  UCPPaymentConfig,
  UCPPaymentInstrument,
  UCPCheckoutMessage,
  UCPLink,
  UCPOrder,
  CreateCheckoutRequest,
  UpdateCheckoutRequest,
  CheckoutStatus,
} from './types.js';
import {
  computeStatus,
  canComplete,
  canModify,
  canCancel,
  isTerminal,
  validateTransition,
  getMissingRequirements,
} from './checkout-status.js';
import {
  createError,
  createWarning,
  addMessage,
  removeMessagesByCode,
  hasBlockingErrors,
  getMessageSummary,
  type UCPMessage,
} from './messages.js';

// =============================================================================
// In-Memory Store (for PoC - replace with Supabase in production)
// =============================================================================

interface StoredCheckout {
  id: string;
  tenant_id: string;
  status: CheckoutStatus;
  currency: string;
  line_items: UCPLineItem[];
  totals: UCPTotal[];
  buyer: UCPBuyer | null;
  shipping_address: UCPAddress | null;
  billing_address: UCPAddress | null;
  payment_config: UCPPaymentConfig;
  payment_instruments: UCPPaymentInstrument[];
  selected_instrument_id: string | null;
  messages: UCPCheckoutMessage[];
  continue_url: string | null;
  cancel_url: string | null;
  links: UCPLink[];
  metadata: Record<string, unknown>;
  order_id: string | null;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

const checkoutStore = new Map<string, StoredCheckout>();

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate checkout ID
 */
function generateCheckoutId(): string {
  const random = createHash('sha256')
    .update(`${Date.now()}-${Math.random()}`)
    .digest('hex')
    .slice(0, 24);
  return `chk_${random}`;
}

/**
 * Calculate totals from line items
 */
export function calculateTotals(
  lineItems: UCPLineItem[],
  options: {
    taxRate?: number;
    shippingAmount?: number;
    discountAmount?: number;
  } = {}
): UCPTotal[] {
  const { taxRate = 0, shippingAmount = 0, discountAmount = 0 } = options;

  // Calculate subtotal
  const subtotal = lineItems.reduce((sum, item) => sum + item.total_price, 0);

  // Calculate tax
  const tax = Math.round(subtotal * taxRate);

  // Build totals array
  const totals: UCPTotal[] = [
    { type: 'subtotal', amount: subtotal, label: 'Subtotal' },
  ];

  if (tax > 0) {
    totals.push({ type: 'tax', amount: tax, label: `Tax (${(taxRate * 100).toFixed(0)}%)` });
  }

  if (shippingAmount > 0) {
    totals.push({ type: 'shipping', amount: shippingAmount, label: 'Shipping' });
  }

  if (discountAmount > 0) {
    totals.push({ type: 'discount', amount: -discountAmount, label: 'Discount' });
  }

  // Calculate total
  const total = subtotal + tax + shippingAmount - discountAmount;
  totals.push({ type: 'total', amount: total, label: 'Total' });

  return totals;
}

/**
 * Convert stored checkout to API response
 */
function toCheckoutSession(stored: StoredCheckout): UCPCheckoutSession {
  return {
    id: stored.id,
    tenant_id: stored.tenant_id,
    status: stored.status,
    currency: stored.currency,
    line_items: stored.line_items,
    totals: stored.totals,
    buyer: stored.buyer,
    shipping_address: stored.shipping_address,
    billing_address: stored.billing_address,
    payment_config: stored.payment_config,
    payment_instruments: stored.payment_instruments,
    selected_instrument_id: stored.selected_instrument_id,
    messages: stored.messages,
    continue_url: stored.continue_url,
    cancel_url: stored.cancel_url,
    links: stored.links,
    metadata: stored.metadata,
    order_id: stored.order_id,
    expires_at: stored.expires_at.toISOString(),
    created_at: stored.created_at.toISOString(),
    updated_at: stored.updated_at.toISOString(),
  };
}

/**
 * Validate line items
 */
function validateLineItems(lineItems: UCPLineItem[]): UCPMessage[] {
  const messages: UCPMessage[] = [];

  for (let i = 0; i < lineItems.length; i++) {
    const item = lineItems[i];

    if (!item.id) {
      messages.push(
        createError('ITEM_UNAVAILABLE', `Line item ${i + 1} is missing ID`, {
          path: `$.line_items[${i}].id`,
        })
      );
    }

    if (!item.name) {
      messages.push(
        createError('ITEM_UNAVAILABLE', `Line item ${i + 1} is missing name`, {
          path: `$.line_items[${i}].name`,
        })
      );
    }

    if (item.quantity <= 0) {
      messages.push(
        createError('QUANTITY_EXCEEDED', `Line item ${i + 1} has invalid quantity`, {
          path: `$.line_items[${i}].quantity`,
        })
      );
    }

    if (item.unit_price < 0) {
      messages.push(
        createError('ITEM_UNAVAILABLE', `Line item ${i + 1} has invalid price`, {
          path: `$.line_items[${i}].unit_price`,
        })
      );
    }
  }

  return messages;
}

// =============================================================================
// Checkout Operations
// =============================================================================

/**
 * Create a new checkout session
 */
export async function createCheckout(
  tenantId: string,
  request: CreateCheckoutRequest,
  _supabase?: SupabaseClient
): Promise<UCPCheckoutSession> {
  const id = generateCheckoutId();
  const now = new Date();
  const expiresInHours = request.expires_in_hours || 6;

  // Initialize line items
  const lineItems = request.line_items || [];

  // Calculate totals
  const totals = calculateTotals(lineItems);

  // Default payment config
  const paymentConfig: UCPPaymentConfig = {
    handlers: ['payos'],
    ...request.payment_config,
  };

  // Initialize messages
  let messages: UCPCheckoutMessage[] = [];

  // Validate line items
  if (lineItems.length > 0) {
    const itemErrors = validateLineItems(lineItems);
    messages = [...messages, ...itemErrors];
  }

  // Create stored checkout
  const stored: StoredCheckout = {
    id,
    tenant_id: tenantId,
    status: 'incomplete',
    currency: request.currency,
    line_items: lineItems,
    totals,
    buyer: request.buyer || null,
    shipping_address: request.shipping_address || null,
    billing_address: request.billing_address || null,
    payment_config: paymentConfig,
    payment_instruments: [],
    selected_instrument_id: null,
    messages,
    continue_url: request.continue_url || null,
    cancel_url: request.cancel_url || null,
    links: request.links || [],
    metadata: request.metadata || {},
    order_id: null,
    expires_at: new Date(now.getTime() + expiresInHours * 60 * 60 * 1000),
    created_at: now,
    updated_at: now,
  };

  // Compute initial status
  stored.status = computeStatus(stored);

  // Store checkout
  checkoutStore.set(id, stored);

  console.log(`[UCP Checkout] Created checkout ${id} for tenant ${tenantId}, status=${stored.status}`);

  return toCheckoutSession(stored);
}

/**
 * Get checkout by ID
 */
export async function getCheckout(
  tenantId: string,
  checkoutId: string,
  supabase?: SupabaseClient
): Promise<UCPCheckoutSession | null> {
  // If supabase client provided, query database
  if (supabase) {
    const { data, error } = await supabase
      .from('ucp_checkout_sessions')
      .select('*')
      .eq('id', checkoutId)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      return null;
    }

    return dbRowToCheckoutSession(data);
  }

  // Fallback to in-memory store
  const stored = checkoutStore.get(checkoutId);

  if (!stored) {
    return null;
  }

  // Verify tenant
  if (stored.tenant_id !== tenantId) {
    return null;
  }

  // Check expiration
  if (stored.expires_at < new Date() && !isTerminal(stored.status)) {
    stored.status = 'canceled';
    stored.messages = addMessage(stored.messages, createError(
      'CHECKOUT_EXPIRED',
      'This checkout session has expired'
    ));
    checkoutStore.set(checkoutId, stored);
  }

  return toCheckoutSession(stored);
}

/**
 * Update checkout
 */
export async function updateCheckout(
  tenantId: string,
  checkoutId: string,
  request: UpdateCheckoutRequest,
  _supabase?: SupabaseClient
): Promise<UCPCheckoutSession> {
  const stored = checkoutStore.get(checkoutId);

  if (!stored) {
    throw new Error('Checkout not found');
  }

  if (stored.tenant_id !== tenantId) {
    throw new Error('Checkout not found');
  }

  if (!canModify(stored.status)) {
    throw new Error(`Cannot modify checkout in ${stored.status} status`);
  }

  // Check expiration
  if (stored.expires_at < new Date()) {
    throw new Error('Checkout has expired');
  }

  // Update fields
  if (request.line_items !== undefined) {
    stored.line_items = request.line_items;
    stored.totals = calculateTotals(request.line_items);

    // Re-validate line items
    stored.messages = removeMessagesByCode(stored.messages, 'ITEM_UNAVAILABLE');
    stored.messages = removeMessagesByCode(stored.messages, 'QUANTITY_EXCEEDED');
    const itemErrors = validateLineItems(request.line_items);
    stored.messages = [...stored.messages, ...itemErrors];
  }

  if (request.buyer !== undefined) {
    stored.buyer = request.buyer;
    // Clear email errors if email is now provided
    if (request.buyer?.email) {
      stored.messages = removeMessagesByCode(stored.messages, 'MISSING_EMAIL');
      stored.messages = removeMessagesByCode(stored.messages, 'INVALID_EMAIL');
    }
  }

  if (request.shipping_address !== undefined) {
    stored.shipping_address = request.shipping_address;
    if (request.shipping_address) {
      stored.messages = removeMessagesByCode(stored.messages, 'MISSING_SHIPPING_ADDRESS');
      stored.messages = removeMessagesByCode(stored.messages, 'INVALID_SHIPPING_ADDRESS');
    }
  }

  if (request.billing_address !== undefined) {
    stored.billing_address = request.billing_address;
    if (request.billing_address) {
      stored.messages = removeMessagesByCode(stored.messages, 'MISSING_BILLING_ADDRESS');
    }
  }

  if (request.payment_instruments !== undefined) {
    stored.payment_instruments = request.payment_instruments;
    if (request.payment_instruments.length > 0) {
      stored.messages = removeMessagesByCode(stored.messages, 'MISSING_PAYMENT_METHOD');
    }
  }

  if (request.selected_instrument_id !== undefined) {
    stored.selected_instrument_id = request.selected_instrument_id;
  }

  if (request.continue_url !== undefined) {
    stored.continue_url = request.continue_url;
  }

  if (request.cancel_url !== undefined) {
    stored.cancel_url = request.cancel_url;
  }

  if (request.metadata !== undefined) {
    stored.metadata = { ...stored.metadata, ...request.metadata };
  }

  // Recompute status
  stored.status = computeStatus(stored);
  stored.updated_at = new Date();

  checkoutStore.set(checkoutId, stored);

  console.log(`[UCP Checkout] Updated checkout ${checkoutId}, status=${stored.status}`);

  return toCheckoutSession(stored);
}

/**
 * Complete checkout - process payment and create order
 */
export async function completeCheckout(
  tenantId: string,
  checkoutId: string,
  _supabase?: SupabaseClient
): Promise<UCPCheckoutSession> {
  const stored = checkoutStore.get(checkoutId);

  if (!stored) {
    throw new Error('Checkout not found');
  }

  if (stored.tenant_id !== tenantId) {
    throw new Error('Checkout not found');
  }

  if (!canComplete(stored.status)) {
    // Check what's missing
    const missing = getMissingRequirements(stored);
    if (missing.length > 0) {
      throw new Error(`Cannot complete checkout: missing ${missing.join(', ')}`);
    }
    throw new Error(`Cannot complete checkout in ${stored.status} status`);
  }

  // Check for blocking errors
  if (hasBlockingErrors(stored.messages)) {
    const summary = getMessageSummary(stored.messages);
    throw new Error(`Cannot complete checkout: ${summary.blocking} blocking error(s)`);
  }

  // Transition to complete_in_progress
  const transition = validateTransition(stored.status, 'complete_in_progress');
  if (!transition.allowed) {
    throw new Error(transition.reason || 'Invalid status transition');
  }

  stored.status = 'complete_in_progress';
  stored.updated_at = new Date();
  checkoutStore.set(checkoutId, stored);

  console.log(`[UCP Checkout] Starting completion for checkout ${checkoutId}`);

  // Simulate payment processing (in production, this would call the payment handler)
  try {
    // Create order
    const orderId = `ord_${createHash('sha256')
      .update(`${checkoutId}-${Date.now()}`)
      .digest('hex')
      .slice(0, 24)}`;

    // Get total amount
    const totalLine = stored.totals.find(t => t.type === 'total');
    const totalAmount = totalLine?.amount || 0;

    // Mark as completed
    stored.status = 'completed';
    stored.order_id = orderId;
    stored.updated_at = new Date();

    console.log(`[UCP Checkout] Checkout ${checkoutId} completed, order ${orderId} created`);

    // In production, we would:
    // 1. Process payment via selected handler
    // 2. Create order in ucp_orders table
    // 3. Send webhook to merchant

    checkoutStore.set(checkoutId, stored);

    return toCheckoutSession(stored);
  } catch (error: any) {
    // Payment failed - return to ready_for_complete
    stored.status = 'ready_for_complete';
    stored.messages = addMessage(stored.messages, createError(
      'PAYMENT_DECLINED',
      error.message || 'Payment processing failed'
    ));
    stored.updated_at = new Date();
    checkoutStore.set(checkoutId, stored);

    throw new Error(`Payment failed: ${error.message}`);
  }
}

/**
 * Cancel checkout
 */
export async function cancelCheckout(
  tenantId: string,
  checkoutId: string,
  _supabase?: SupabaseClient
): Promise<UCPCheckoutSession> {
  const stored = checkoutStore.get(checkoutId);

  if (!stored) {
    throw new Error('Checkout not found');
  }

  if (stored.tenant_id !== tenantId) {
    throw new Error('Checkout not found');
  }

  if (!canCancel(stored.status)) {
    throw new Error(`Cannot cancel checkout in ${stored.status} status`);
  }

  stored.status = 'canceled';
  stored.updated_at = new Date();
  checkoutStore.set(checkoutId, stored);

  console.log(`[UCP Checkout] Checkout ${checkoutId} canceled`);

  return toCheckoutSession(stored);
}

// =============================================================================
// List & Query Operations
// =============================================================================

/**
 * List checkouts for a tenant
 */
export async function listCheckouts(
  tenantId: string,
  options: {
    status?: CheckoutStatus;
    limit?: number;
    offset?: number;
  } = {},
  supabase?: SupabaseClient
): Promise<{ data: UCPCheckoutSession[]; total: number }> {
  const { status, limit = 20, offset = 0 } = options;

  // If supabase client provided, query database
  if (supabase) {
    let query = supabase
      .from('ucp_checkout_sessions')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[UCP Checkout] List error:', error);
      throw new Error('Failed to list checkouts');
    }

    return {
      data: (data || []).map(dbRowToCheckoutSession),
      total: count || 0,
    };
  }

  // Fallback to in-memory store
  let checkouts = Array.from(checkoutStore.values())
    .filter(c => c.tenant_id === tenantId);

  if (status) {
    checkouts = checkouts.filter(c => c.status === status);
  }

  // Sort by created date descending
  checkouts.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

  const total = checkouts.length;
  const paged = checkouts.slice(offset, offset + limit);

  return {
    data: paged.map(toCheckoutSession),
    total,
  };
}

/**
 * Convert database row to UCPCheckoutSession
 */
function dbRowToCheckoutSession(row: any): UCPCheckoutSession {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    status: row.status,
    currency: row.currency,
    line_items: row.line_items || [],
    totals: row.totals || [],
    buyer: row.buyer,
    shipping_address: row.shipping_address,
    billing_address: row.billing_address,
    payment_config: row.payment_config || { handlers: ['payos'] },
    payment_instruments: row.payment_instruments || [],
    selected_instrument_id: row.selected_instrument_id,
    messages: row.messages || [],
    continue_url: row.continue_url,
    cancel_url: row.cancel_url,
    links: row.links || [],
    metadata: row.metadata || {},
    order_id: row.order_id,
    expires_at: row.expires_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// =============================================================================
// Payment Instrument Operations
// =============================================================================

/**
 * Add payment instrument to checkout
 */
export async function addPaymentInstrument(
  tenantId: string,
  checkoutId: string,
  instrument: Omit<UCPPaymentInstrument, 'created_at'>,
  _supabase?: SupabaseClient
): Promise<UCPCheckoutSession> {
  const stored = checkoutStore.get(checkoutId);

  if (!stored) {
    throw new Error('Checkout not found');
  }

  if (stored.tenant_id !== tenantId) {
    throw new Error('Checkout not found');
  }

  if (!canModify(stored.status)) {
    throw new Error(`Cannot modify checkout in ${stored.status} status`);
  }

  const fullInstrument: UCPPaymentInstrument = {
    ...instrument,
    created_at: new Date().toISOString(),
  };

  stored.payment_instruments.push(fullInstrument);

  // Auto-select if first instrument
  if (stored.payment_instruments.length === 1) {
    stored.selected_instrument_id = instrument.id;
  }

  // Clear payment method errors
  stored.messages = removeMessagesByCode(stored.messages, 'MISSING_PAYMENT_METHOD');

  // Recompute status
  stored.status = computeStatus(stored);
  stored.updated_at = new Date();

  checkoutStore.set(checkoutId, stored);

  console.log(`[UCP Checkout] Added payment instrument ${instrument.id} to checkout ${checkoutId}`);

  return toCheckoutSession(stored);
}

/**
 * Select payment instrument
 */
export async function selectPaymentInstrument(
  tenantId: string,
  checkoutId: string,
  instrumentId: string,
  _supabase?: SupabaseClient
): Promise<UCPCheckoutSession> {
  const stored = checkoutStore.get(checkoutId);

  if (!stored) {
    throw new Error('Checkout not found');
  }

  if (stored.tenant_id !== tenantId) {
    throw new Error('Checkout not found');
  }

  if (!canModify(stored.status)) {
    throw new Error(`Cannot modify checkout in ${stored.status} status`);
  }

  const instrument = stored.payment_instruments.find(i => i.id === instrumentId);
  if (!instrument) {
    throw new Error('Payment instrument not found');
  }

  stored.selected_instrument_id = instrumentId;
  stored.status = computeStatus(stored);
  stored.updated_at = new Date();

  checkoutStore.set(checkoutId, stored);

  return toCheckoutSession(stored);
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Clear checkout store (for testing)
 */
export function clearCheckoutStore(): void {
  checkoutStore.clear();
}

/**
 * Get checkout count (for testing)
 */
export function getCheckoutCount(): number {
  return checkoutStore.size;
}
