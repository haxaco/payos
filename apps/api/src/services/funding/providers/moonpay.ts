/**
 * MoonPay Crypto On-Ramp Widget Provider
 * Epic 41, Story 41.17: MoonPay Widget Integration
 *
 * Enables direct card-to-USDC purchases via MoonPay's hosted widget.
 * Simplest on-ramp for users who want USDC without managing bank transfers.
 * MoonPay fees: Card 4.5%, Bank 1%, Minimum $30.
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

const MOONPAY_API_KEY = () => process.env.MOONPAY_API_KEY || '';
const MOONPAY_SECRET_KEY = () => process.env.MOONPAY_SECRET_KEY || '';
const MOONPAY_WEBHOOK_KEY = () => process.env.MOONPAY_WEBHOOK_KEY || '';

function getMoonPayBaseUrl(): string {
  return MOONPAY_API_KEY().startsWith('pk_test')
    ? 'https://buy-sandbox.moonpay.com'
    : 'https://buy.moonpay.com';
}

export class MoonPayProvider implements IWidgetProvider {
  readonly name = 'moonpay' as const;
  readonly displayName = 'MoonPay';

  readonly capabilities: ProviderCapability[] = [
    {
      sourceType: 'card',
      currencies: ['USD', 'EUR', 'GBP', 'BRL', 'MXN'],
      requiresClientSetup: true,
      requiresVerification: false,
      settlementTime: '5-30 minutes',
      supportsRefunds: false,
    },
    {
      sourceType: 'crypto_wallet',
      currencies: ['USD', 'EUR', 'GBP'],
      requiresClientSetup: true,
      requiresVerification: false,
      settlementTime: '5-30 minutes',
      supportsRefunds: false,
    },
  ];

  isAvailable(): boolean {
    return !!MOONPAY_API_KEY();
  }

  private signUrl(url: string): string {
    const secretKey = MOONPAY_SECRET_KEY();
    if (!secretKey) return url;

    const searchParams = new URL(url).search;
    const signature = createHmac('sha256', secretKey)
      .update(searchParams)
      .digest('base64');
    return `${url}&signature=${encodeURIComponent(signature)}`;
  }

  async createWidgetSession(
    tenantId: string,
    params: WidgetParams
  ): Promise<WidgetResult> {
    const apiKey = MOONPAY_API_KEY();

    if (!apiKey) {
      const sessionId = `mp_session_mock_${randomUUID().slice(0, 8)}`;
      return {
        widget_url: `https://buy-sandbox.moonpay.com/?currencyCode=usdc_base&apiKey=mock_key&externalCustomerId=${params.account_id}`,
        session_id: sessionId,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
      };
    }

    const walletAddress = params.metadata?.wallet_address || '';
    const baseUrl = getMoonPayBaseUrl();

    const urlParams = new URLSearchParams({
      apiKey,
      currencyCode: 'usdc_base',
      walletAddress: String(walletAddress),
      externalCustomerId: params.account_id,
      externalTransactionId: `${tenantId}_${randomUUID().slice(0, 8)}`,
    });

    if (params.amount_cents) {
      urlParams.set('baseCurrencyAmount', String(params.amount_cents / 100));
    }
    if (params.currency) {
      urlParams.set('baseCurrencyCode', params.currency.toLowerCase());
    }
    if (params.redirect_url) {
      urlParams.set('redirectURL', params.redirect_url);
    }

    let widgetUrl = `${baseUrl}?${urlParams.toString()}`;
    widgetUrl = this.signUrl(widgetUrl);

    return {
      widget_url: widgetUrl,
      session_id: urlParams.get('externalTransactionId')!,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };
  }

  async createSource(
    _tenantId: string,
    _params: CreateFundingSourceParams
  ): Promise<ProviderSourceResult> {
    // MoonPay doesn't save payment methods; each purchase is standalone via widget
    return {
      provider_id: `mp_source_${randomUUID().slice(0, 8)}`,
      status: 'active',
      display_name: 'MoonPay (Card/Bank)',
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
    // No-op: MoonPay is widget-based, no stored payment methods
  }

  async initiateFunding(
    tenantId: string,
    source: FundingSource,
    params: InitiateFundingParams
  ): Promise<ProviderFundingResult> {
    // MoonPay funding is initiated via the widget, not API
    // This method creates a tracking record and returns the widget URL
    const session = await this.createWidgetSession(tenantId, {
      account_id: source.account_id,
      amount_cents: params.amount_cents,
      currency: params.currency,
      metadata: params.metadata,
    });

    return {
      provider_transaction_id: session.session_id,
      status: 'pending',
      provider_fee_cents: Math.round(params.amount_cents * 0.045), // 4.5% for cards
      estimated_completion: new Date(Date.now() + 15 * 60000).toISOString(), // ~15 min
      redirect_url: session.widget_url,
      provider_metadata: { widget_url: session.widget_url },
    };
  }

  async getFundingStatus(providerTransactionId: string): Promise<ProviderFundingStatus> {
    const apiKey = MOONPAY_API_KEY();

    if (!apiKey) {
      return {
        provider_transaction_id: providerTransactionId,
        status: 'completed',
        completed_at: new Date().toISOString(),
      };
    }

    try {
      const response = await fetch(
        `https://api.moonpay.com/v1/transactions/ext/${providerTransactionId}`,
        { headers: { 'Authorization': `Api-Key ${apiKey}` } }
      );

      if (!response.ok) {
        return { provider_transaction_id: providerTransactionId, status: 'processing' };
      }

      const tx = await response.json();
      const statusMap: Record<string, any> = {
        completed: 'completed',
        failed: 'failed',
        pending: 'processing',
        waitingPayment: 'pending',
        waitingAuthorization: 'pending',
      };

      return {
        provider_transaction_id: tx.id || providerTransactionId,
        status: statusMap[tx.status] || 'processing',
        completed_at: tx.status === 'completed' ? tx.completedAt : undefined,
        failure_reason: tx.failureReason,
      };
    } catch {
      return { provider_transaction_id: providerTransactionId, status: 'processing' };
    }
  }

  async parseWebhook(payload: unknown, signature: string): Promise<ProviderWebhookEvent> {
    const event = payload as any;

    // Verify webhook signature if configured
    const webhookKey = MOONPAY_WEBHOOK_KEY();
    if (webhookKey && signature) {
      const computed = createHmac('sha256', webhookKey)
        .update(JSON.stringify(payload))
        .digest('hex');
      if (computed !== signature) {
        throw new Error('Invalid MoonPay webhook signature');
      }
    }

    const statusMap: Record<string, string> = {
      completed: 'completed',
      failed: 'failed',
      pending: 'processing',
    };

    return {
      event_type: event.type || 'transaction_updated',
      provider_id: event.data?.externalCustomerId,
      provider_transaction_id: event.data?.externalTransactionId || event.data?.id,
      status: statusMap[event.data?.status] as any,
      metadata: {
        crypto_amount: event.data?.cryptoTransactionId,
        fiat_amount: event.data?.baseCurrencyAmount,
        fiat_currency: event.data?.baseCurrency?.code,
      },
    };
  }
}

export function createMoonPayProvider(): MoonPayProvider {
  return new MoonPayProvider();
}
