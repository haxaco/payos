/**
 * Types for ACP (Agentic Commerce Protocol) - Stripe/OpenAI
 */

export type CheckoutStatus = 'pending' | 'completed' | 'cancelled' | 'expired' | 'failed';

export interface CheckoutItem {
  item_id?: string;
  name: string;
  description?: string;
  image_url?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  currency?: string;
  item_data?: Record<string, any>;
}

export interface Checkout {
  id: string;
  checkout_id: string;
  agent_id: string;
  agent_name?: string;
  merchant_id: string;
  merchant_name?: string;
  customer_id?: string;
  customer_email?: string;
  total_amount: number;
  currency: string;
  status: CheckoutStatus;
  created_at: string;
  completed_at?: string;
}

export interface CheckoutWithItems extends Checkout {
  session_id?: string;
  account_id: string;
  merchant_url?: string;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  discount_amount: number;
  shared_payment_token?: string;
  payment_method?: string;
  transfer_id?: string;
  checkout_data?: Record<string, any>;
  shipping_address?: Record<string, any>;
  metadata?: Record<string, any>;
  updated_at?: string;
  cancelled_at?: string;
  expires_at?: string;
  items: CheckoutItem[];
}

export interface CreateCheckoutRequest {
  checkout_id: string;
  session_id?: string;
  agent_id: string;
  agent_name?: string;
  customer_id?: string;
  customer_email?: string;
  account_id: string;
  merchant_id: string;
  merchant_name?: string;
  merchant_url?: string;
  items: CheckoutItem[];
  tax_amount?: number;
  shipping_amount?: number;
  discount_amount?: number;
  currency?: string;
  shared_payment_token?: string;
  payment_method?: string;
  checkout_data?: Record<string, any>;
  shipping_address?: Record<string, any>;
  metadata?: Record<string, any>;
  expires_at?: string;
}

export interface CompleteCheckoutRequest {
  shared_payment_token: string;
  payment_method?: string;
  idempotency_key?: string;
}

export interface CompleteCheckoutResponse {
  checkout_id: string;
  transfer_id: string;
  status: CheckoutStatus;
  completed_at: string;
  total_amount: number;
  currency: string;
}

export interface ListCheckoutsOptions {
  status?: CheckoutStatus;
  agent_id?: string;
  merchant_id?: string;
  customer_id?: string;
  limit?: number;
  offset?: number;
}

export interface ListCheckoutsResponse {
  data: Checkout[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

