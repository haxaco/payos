/**
 * Transak Crypto On-Ramp Widget Provider
 * Epic 41, Story 41.18: Transak Widget Integration
 *
 * Alternative crypto on-ramp widget with different coverage and fees.
 * Transak fees: Card 5%, Bank 1%, 150+ countries.
 */

import { randomUUID, createHmac } from 'crypto';
import type { IWidgetProvider, ProviderCapability } from './interface.js';
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
  WidgetParams,
  WidgetResult,
} from '../types.js';

const TRANSAK_API_KEY = () => process.env.TRANSAK_API_KEY || '';
const TRANSAK_SECRET = () => process.env.TRANSAK_SECRET || '';

function getTransakBaseUrl(): string {
  return TRANSAK_API_KEY().startsWith('test')
    ? 'https://global-stg.transak.com'
    : 'https://global.transak.com';
}

export class TransakProvider implements IWidgetProvider {
  readonly name = 'transak' as const;
  readonly displayName = 'Transak';

  readonly capabilities: ProviderCapability[] = [
    {
      sourceType: 'card',
      currencies: ['USD', 'EUR', 'GBP', 'BRL', 'MXN', 'INR', 'ARS'],
      requiresClientSetup: true,
      requiresVerification: false,
      settlementTime: '5-30 minutes',
      supportsRefunds: false,
    },
  ];

  isAvailable(): boolean {
    return !!TRANSAK_API_KEY();
  }

  async createWidgetSession(
    tenantId: string,
    params: WidgetParams
  ): Promise<WidgetResult> {
    const apiKey = TRANSAK_API_KEY();

    if (!apiKey) {
      const sessionId = `transak_session_mock_${randomUUID().slice(0, 8)}`;
      return {
        widget_url: `https://global-stg.transak.com/?apiKey=mock_key&cryptoCurrencyCode=USDC`,
        session_id: sessionId,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      };
    }

    const baseUrl = getTransakBaseUrl();
    const urlParams = new URLSearchParams({
      apiKey,
      cryptoCurrencyCode: 'USDC',
      network: 'base',
      defaultCryptoCurrency: 'USDC',
      exchangeScreenTitle: 'Fund Your Account',
      isFeeCalculationHidden: 'false',
      hideMenu: 'true',
      partnerOrderId: `${tenantId}_${randomUUID().slice(0, 8)}`,
      partnerCustomerId: params.account_id,
    });

    if (params.amount_cents) {
      urlParams.set('defaultFiatAmount', String(params.amount_cents / 100));
    }
    if (params.currency) {
      urlParams.set('defaultFiatCurrency', params.currency);
    }
    if (params.metadata?.wallet_address) {
      urlParams.set('walletAddress', String(params.metadata.wallet_address));
    }
    if (params.redirect_url) {
      urlParams.set('redirectURL', params.redirect_url);
    }

    return {
      widget_url: `${baseUrl}?${urlParams.toString()}`,
      session_id: urlParams.get('partnerOrderId')!,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };
  }

  async createSource(
    _tenantId: string,
    _params: CreateFundingSourceParams
  ): Promise<ProviderSourceResult> {
    return {
      provider_id: `transak_source_${randomUUID().slice(0, 8)}`,
      status: 'active',
      display_name: 'Transak (Card/Bank)',
      supported_currencies: ['USD', 'EUR', 'GBP', 'BRL', 'MXN'],
      provider_metadata: { widget_based: true },
    };
  }

  async verifySource(
    _tenantId: string,
    _source: FundingSource,
    _params: VerifyFundingSourceParams
  ): Promise<ProviderVerificationResult> {
    return { verified: true, status: 'active' };
  }

  async removeSource(): Promise<void> {
    // No-op: widget-based
  }

  async initiateFunding(
    tenantId: string,
    source: FundingSource,
    params: InitiateFundingParams
  ): Promise<ProviderFundingResult> {
    const session = await this.createWidgetSession(tenantId, {
      account_id: source.account_id,
      amount_cents: params.amount_cents,
      currency: params.currency,
      metadata: params.metadata,
    });

    return {
      provider_transaction_id: session.session_id,
      status: 'pending',
      provider_fee_cents: Math.round(params.amount_cents * 0.05), // 5% for cards
      estimated_completion: new Date(Date.now() + 15 * 60000).toISOString(),
      redirect_url: session.widget_url,
      provider_metadata: { widget_url: session.widget_url },
    };
  }

  async getFundingStatus(providerTransactionId: string): Promise<ProviderFundingStatus> {
    const apiKey = TRANSAK_API_KEY();

    if (!apiKey) {
      return {
        provider_transaction_id: providerTransactionId,
        status: 'completed',
        completed_at: new Date().toISOString(),
      };
    }

    try {
      const response = await fetch(
        `https://api.transak.com/api/v2/order/${providerTransactionId}`,
        { headers: { 'Authorization': `Bearer ${apiKey}` } }
      );

      if (!response.ok) {
        return { provider_transaction_id: providerTransactionId, status: 'processing' };
      }

      const result = await response.json();
      const statusMap: Record<string, any> = {
        COMPLETED: 'completed',
        FAILED: 'failed',
        CANCELLED: 'cancelled',
        PENDING_PAYMENT: 'pending',
        PROCESSING: 'processing',
        AWAITING_PAYMENT_FROM_USER: 'pending',
      };

      return {
        provider_transaction_id: result.data?.id || providerTransactionId,
        status: statusMap[result.data?.status] || 'processing',
        completed_at: result.data?.status === 'COMPLETED' ? result.data?.completedAt : undefined,
        failure_reason: result.data?.errorMessage,
      };
    } catch {
      return { provider_transaction_id: providerTransactionId, status: 'processing' };
    }
  }

  async parseWebhook(payload: unknown, _signature: string): Promise<ProviderWebhookEvent> {
    const event = payload as any;

    const statusMap: Record<string, string> = {
      ORDER_COMPLETED: 'completed',
      ORDER_FAILED: 'failed',
      ORDER_PROCESSING: 'processing',
    };

    return {
      event_type: event.eventID || event.webhookData?.type,
      provider_id: event.webhookData?.partnerCustomerId,
      provider_transaction_id: event.webhookData?.partnerOrderId || event.webhookData?.id,
      status: statusMap[event.eventID] as any,
      metadata: {
        crypto_amount: event.webhookData?.cryptoAmount,
        fiat_amount: event.webhookData?.fiatAmount,
        fiat_currency: event.webhookData?.fiatCurrency,
      },
    };
  }
}

export function createTransakProvider(): TransakProvider {
  return new TransakProvider();
}
