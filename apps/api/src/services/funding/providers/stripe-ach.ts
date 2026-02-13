/**
 * Stripe ACH Payment Provider
 * Epic 41, Story 41.6: Stripe ACH Payments (US Banks)
 *
 * Handles ACH bank payment collection via Stripe Financial Connections.
 * ACH processing time: 3-5 business days.
 */

import { randomUUID } from 'crypto';
import type { IFundingProvider, ProviderCapability } from './interface.js';
import type {
  FundingSource,
  CreateFundingSourceParams,
  VerifyFundingSourceParams,
  InitiateFundingParams,
  ProviderSourceResult,
  ProviderVerificationResult,
  ProviderFundingResult,
  ProviderFundingStatus,
  ProviderWebhookEvent,
} from '../types.js';

const STRIPE_API_KEY = () => process.env.STRIPE_SECRET_KEY || '';

export class StripeAchProvider implements IFundingProvider {
  readonly name = 'stripe' as const;
  readonly displayName = 'Stripe ACH (US Banks)';

  readonly capabilities: ProviderCapability[] = [
    {
      sourceType: 'bank_account_us',
      currencies: ['USD'],
      requiresClientSetup: true,
      requiresVerification: true,
      settlementTime: '3-5 business days',
      supportsRefunds: true,
    },
  ];

  isAvailable(): boolean {
    return !!STRIPE_API_KEY();
  }

  async createSource(
    tenantId: string,
    params: CreateFundingSourceParams
  ): Promise<ProviderSourceResult> {
    const apiKey = STRIPE_API_KEY();

    if (!apiKey) {
      // Sandbox: mock Financial Connections session
      return {
        provider_id: `fcs_mock_${randomUUID().slice(0, 8)}`,
        status: 'verifying',
        client_secret: `fcs_mock_secret_${randomUUID().slice(0, 12)}`,
        display_name: 'Chase Checking ••••1234',
        last_four: '1234',
        supported_currencies: ['USD'],
        provider_metadata: {
          sandbox: true,
          session_type: 'financial_connections',
        },
      };
    }

    // Create Financial Connections session for bank linking
    const response = await fetch('https://api.stripe.com/v1/financial_connections/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'account_holder[type]': 'customer',
        'permissions[]': 'payment_method',
        'filters[countries][]': 'US',
        'metadata[tenant_id]': tenantId,
        'metadata[account_id]': params.account_id,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Stripe Financial Connections failed: ${error.error?.message}`);
    }

    const session = await response.json();

    return {
      provider_id: session.id,
      status: 'verifying',
      client_secret: session.client_secret,
      provider_metadata: {
        session_id: session.id,
        session_type: 'financial_connections',
      },
    };
  }

  async verifySource(
    _tenantId: string,
    source: FundingSource,
    params: VerifyFundingSourceParams
  ): Promise<ProviderVerificationResult> {
    const apiKey = STRIPE_API_KEY();

    if (!apiKey) {
      // Sandbox: auto-verify with micro-deposit check
      if (params.amounts && params.amounts.length === 2) {
        // Simulate micro-deposit verification
        if (params.amounts[0] === 32 && params.amounts[1] === 45) {
          return { verified: true, status: 'active' };
        }
        return { verified: false, status: 'verifying', failure_reason: 'Incorrect amounts' };
      }
      return { verified: true, status: 'active', provider_metadata: { sandbox: true } };
    }

    // Check session status at Stripe
    const response = await fetch(
      `https://api.stripe.com/v1/financial_connections/sessions/${source.provider_id}`,
      { headers: { 'Authorization': `Bearer ${apiKey}` } }
    );

    if (!response.ok) {
      return { verified: false, status: 'failed', failure_reason: 'Session verification failed' };
    }

    const session = await response.json();

    if (session.accounts?.data?.length > 0) {
      const account = session.accounts.data[0];
      return {
        verified: true,
        status: 'active',
        provider_metadata: {
          financial_account_id: account.id,
          institution_name: account.institution_name,
          last4: account.last4,
          account_holder_name: account.account_holder?.name,
        },
      };
    }

    return { verified: false, status: 'verifying' };
  }

  async removeSource(_tenantId: string, _source: FundingSource): Promise<void> {
    // ACH sources don't need explicit removal at Stripe
  }

  async initiateFunding(
    tenantId: string,
    source: FundingSource,
    params: InitiateFundingParams
  ): Promise<ProviderFundingResult> {
    const apiKey = STRIPE_API_KEY();
    const achAccountId = (source.provider_metadata as any)?.financial_account_id;

    if (!apiKey || !achAccountId) {
      // Sandbox mode
      const fee = Math.min(Math.round(params.amount_cents * 0.008), 500);
      return {
        provider_transaction_id: `pi_ach_mock_${randomUUID().slice(0, 8)}`,
        status: 'processing',
        provider_fee_cents: fee,
        estimated_completion: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
        provider_metadata: { sandbox: true, processing_days: 3 },
      };
    }

    // Create PaymentIntent with ACH debit
    const body = new URLSearchParams({
      amount: String(params.amount_cents),
      currency: 'usd',
      'payment_method_types[]': 'us_bank_account',
      'payment_method_data[type]': 'us_bank_account',
      'payment_method_data[us_bank_account][financial_connections_account]': achAccountId,
      confirm: 'true',
      'metadata[tenant_id]': tenantId,
      'metadata[account_id]': source.account_id,
      'metadata[funding_source_id]': source.id,
    });

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    if (params.idempotency_key) {
      headers['Idempotency-Key'] = params.idempotency_key;
    }

    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`ACH payment failed: ${error.error?.message}`);
    }

    const pi = await response.json();
    const fee = Math.min(Math.round(params.amount_cents * 0.008), 500);

    return {
      provider_transaction_id: pi.id,
      status: 'processing',
      provider_fee_cents: fee,
      estimated_completion: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      provider_metadata: { payment_intent_id: pi.id, stripe_status: pi.status },
    };
  }

  async getFundingStatus(providerTransactionId: string): Promise<ProviderFundingStatus> {
    const apiKey = STRIPE_API_KEY();

    if (!apiKey) {
      return {
        provider_transaction_id: providerTransactionId,
        status: 'completed',
        completed_at: new Date().toISOString(),
      };
    }

    const response = await fetch(
      `https://api.stripe.com/v1/payment_intents/${providerTransactionId}`,
      { headers: { 'Authorization': `Bearer ${apiKey}` } }
    );

    if (!response.ok) {
      return { provider_transaction_id: providerTransactionId, status: 'failed', failure_reason: 'Status check failed' };
    }

    const pi = await response.json();
    const statusMap: Record<string, any> = {
      succeeded: 'completed',
      processing: 'processing',
      requires_payment_method: 'failed',
      canceled: 'cancelled',
    };

    return {
      provider_transaction_id: pi.id,
      status: statusMap[pi.status] || 'processing',
      failure_reason: pi.last_payment_error?.message,
      completed_at: pi.status === 'succeeded' ? new Date().toISOString() : undefined,
    };
  }

  async parseWebhook(payload: unknown, _signature: string): Promise<ProviderWebhookEvent> {
    const event = payload as any;

    return {
      event_type: event.type,
      provider_id: event.data?.object?.metadata?.funding_source_id || event.data?.object?.id,
      provider_transaction_id: event.data?.object?.id,
      status: event.type === 'payment_intent.succeeded' ? 'completed' :
              event.type === 'payment_intent.payment_failed' ? 'failed' : undefined,
      metadata: event.data?.object?.metadata,
    };
  }
}

export function createStripeAchProvider(): StripeAchProvider {
  return new StripeAchProvider();
}
