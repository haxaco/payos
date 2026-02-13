/**
 * Stripe SEPA Direct Debit Provider
 * Epic 41, Story 41.7: Stripe SEPA Payments (EU Banks)
 *
 * Handles SEPA Direct Debit collection via Stripe for European bank accounts.
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

export class StripeSepaProvider implements IFundingProvider {
  readonly name = 'stripe' as const;
  readonly displayName = 'Stripe SEPA (EU Banks)';

  readonly capabilities: ProviderCapability[] = [
    {
      sourceType: 'bank_account_eu',
      currencies: ['EUR'],
      requiresClientSetup: true,
      requiresVerification: false,
      settlementTime: '5-14 business days',
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
      return {
        provider_id: `seti_sepa_mock_${randomUUID().slice(0, 8)}`,
        status: 'pending',
        client_secret: `seti_sepa_secret_${randomUUID().slice(0, 12)}`,
        provider_metadata: { sandbox: true, payment_type: 'sepa_debit' },
      };
    }

    const response = await fetch('https://api.stripe.com/v1/setup_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'payment_method_types[]': 'sepa_debit',
        'metadata[tenant_id]': tenantId,
        'metadata[account_id]': params.account_id,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Stripe SEPA setup failed: ${error.error?.message}`);
    }

    const si = await response.json();
    return {
      provider_id: si.id,
      status: 'pending',
      client_secret: si.client_secret,
      provider_metadata: { setup_intent_id: si.id, payment_type: 'sepa_debit' },
    };
  }

  async verifySource(
    _tenantId: string,
    source: FundingSource,
    _params: VerifyFundingSourceParams
  ): Promise<ProviderVerificationResult> {
    const apiKey = STRIPE_API_KEY();

    if (!apiKey) {
      return { verified: true, status: 'active', provider_metadata: { sandbox: true } };
    }

    const response = await fetch(
      `https://api.stripe.com/v1/setup_intents/${source.provider_id}`,
      { headers: { 'Authorization': `Bearer ${apiKey}` } }
    );

    if (!response.ok) {
      return { verified: false, status: 'failed', failure_reason: 'Verification failed' };
    }

    const si = await response.json();

    if (si.status === 'succeeded') {
      return {
        verified: true,
        status: 'active',
        provider_metadata: {
          payment_method_id: si.payment_method,
          mandate_id: si.mandate,
        },
      };
    }

    return { verified: false, status: si.status === 'canceled' ? 'failed' : 'verifying' };
  }

  async removeSource(_tenantId: string, source: FundingSource): Promise<void> {
    const apiKey = STRIPE_API_KEY();
    if (!apiKey) return;

    const pmId = (source.provider_metadata as any)?.payment_method_id;
    if (!pmId) return;

    await fetch(`https://api.stripe.com/v1/payment_methods/${pmId}/detach`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
  }

  async initiateFunding(
    tenantId: string,
    source: FundingSource,
    params: InitiateFundingParams
  ): Promise<ProviderFundingResult> {
    const apiKey = STRIPE_API_KEY();
    const pmId = (source.provider_metadata as any)?.payment_method_id;

    if (!apiKey || !pmId) {
      return {
        provider_transaction_id: `pi_sepa_mock_${randomUUID().slice(0, 8)}`,
        status: 'processing',
        provider_fee_cents: 35, // €0.35 flat fee
        estimated_completion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        provider_metadata: { sandbox: true },
      };
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    if (params.idempotency_key) headers['Idempotency-Key'] = params.idempotency_key;

    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers,
      body: new URLSearchParams({
        amount: String(params.amount_cents),
        currency: 'eur',
        payment_method: pmId,
        confirm: 'true',
        'payment_method_types[]': 'sepa_debit',
        'metadata[tenant_id]': tenantId,
        'metadata[funding_source_id]': source.id,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`SEPA payment failed: ${error.error?.message}`);
    }

    const pi = await response.json();
    return {
      provider_transaction_id: pi.id,
      status: 'processing',
      provider_fee_cents: 35,
      estimated_completion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      provider_metadata: { payment_intent_id: pi.id, stripe_status: pi.status },
    };
  }

  async getFundingStatus(providerTransactionId: string): Promise<ProviderFundingStatus> {
    const apiKey = STRIPE_API_KEY();
    if (!apiKey) {
      return { provider_transaction_id: providerTransactionId, status: 'completed', completed_at: new Date().toISOString() };
    }

    const response = await fetch(
      `https://api.stripe.com/v1/payment_intents/${providerTransactionId}`,
      { headers: { 'Authorization': `Bearer ${apiKey}` } }
    );
    if (!response.ok) {
      return { provider_transaction_id: providerTransactionId, status: 'failed', failure_reason: 'Status check failed' };
    }

    const pi = await response.json();
    const statusMap: Record<string, any> = { succeeded: 'completed', processing: 'processing', canceled: 'cancelled' };
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

export function createStripeSepaProvider(): StripeSepaProvider {
  return new StripeSepaProvider();
}
