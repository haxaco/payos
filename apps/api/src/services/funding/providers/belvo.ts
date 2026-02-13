/**
 * Belvo LATAM Bank Provider
 * Epic 41, Stories 41.12-41.16: Belvo Integration
 *
 * Handles LATAM bank account linking (Brazil, Mexico, Colombia) via Belvo.
 * Supports Pix collection (Brazil) and SPEI collection (Mexico).
 */

import { randomUUID } from 'crypto';
import type { IFundingProvider, IWidgetProvider, ProviderCapability } from './interface.js';
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

const BELVO_SECRET_ID = () => process.env.BELVO_SECRET_ID || '';
const BELVO_SECRET_PASSWORD = () => process.env.BELVO_SECRET_PASSWORD || '';
const BELVO_ENV = () => process.env.BELVO_ENV || 'sandbox';

function getBelvoBaseUrl(): string {
  const env = BELVO_ENV();
  if (env === 'production') return 'https://api.belvo.com';
  if (env === 'development') return 'https://development.belvo.com';
  return 'https://sandbox.belvo.com';
}

export class BelvoProvider implements IWidgetProvider {
  readonly name = 'belvo' as const;
  readonly displayName = 'Belvo (LATAM Banks)';

  readonly capabilities: ProviderCapability[] = [
    {
      sourceType: 'bank_account_latam',
      currencies: ['BRL', 'MXN', 'COP'],
      requiresClientSetup: true,
      requiresVerification: false, // Belvo Connect handles auth
      settlementTime: 'Instant (Pix) / Minutes (SPEI)',
      supportsRefunds: false,
    },
  ];

  isAvailable(): boolean {
    return !!BELVO_SECRET_ID() && !!BELVO_SECRET_PASSWORD();
  }

  private getAuthHeader(): string {
    return 'Basic ' + Buffer.from(`${BELVO_SECRET_ID()}:${BELVO_SECRET_PASSWORD()}`).toString('base64');
  }

  private async belvoRequest(method: string, path: string, body?: Record<string, unknown>): Promise<any> {
    const response = await fetch(`${getBelvoBaseUrl()}${path}`, {
      method,
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Belvo error: ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  async createWidgetSession(
    tenantId: string,
    params: WidgetParams
  ): Promise<WidgetResult> {
    if (!this.isAvailable()) {
      const token = `belvo_token_mock_${randomUUID().slice(0, 8)}`;
      return {
        widget_url: `https://widget.belvo.io/?access_token=${token}`,
        session_id: token,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      };
    }

    const result = await this.belvoRequest('POST', '/api/token/', {
      id: BELVO_SECRET_ID(),
      password: BELVO_SECRET_PASSWORD(),
      scopes: 'read_institutions,write_links,read_accounts',
    });

    return {
      widget_url: `https://widget.belvo.io/?access_token=${result.access}`,
      session_id: result.access,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };
  }

  async createSource(
    tenantId: string,
    params: CreateFundingSourceParams
  ): Promise<ProviderSourceResult> {
    if (!this.isAvailable() || !params.link_id) {
      // Sandbox: mock linked LATAM bank
      const isBrazil = params.metadata?.country === 'BR';
      return {
        provider_id: `belvo_link_mock_${randomUUID().slice(0, 8)}`,
        status: 'active',
        display_name: isBrazil ? 'Banco do Brasil ••••9012' : 'BBVA ••••3456',
        last_four: isBrazil ? '9012' : '3456',
        supported_currencies: isBrazil ? ['BRL'] : ['MXN'],
        provider_metadata: {
          sandbox: true,
          country: isBrazil ? 'BR' : 'MX',
          institution: isBrazil ? 'banco_do_brasil' : 'bbva_mx',
          payment_method: isBrazil ? 'pix' : 'spei',
        },
      };
    }

    // Retrieve link details from Belvo
    const link = await this.belvoRequest('GET', `/api/links/${params.link_id}/`);

    // Get accounts for this link
    const accounts = await this.belvoRequest('POST', '/api/accounts/', {
      link: params.link_id,
    });

    const account = accounts?.[0];
    const country = link.institution_country || 'BR';

    return {
      provider_id: params.link_id,
      status: 'active',
      display_name: `${link.institution} ••••${account?.number?.slice(-4) || '0000'}`,
      last_four: account?.number?.slice(-4),
      supported_currencies: country === 'BR' ? ['BRL'] : country === 'MX' ? ['MXN'] : ['COP'],
      provider_metadata: {
        link_id: params.link_id,
        account_id: account?.id,
        institution: link.institution,
        country,
        payment_method: country === 'BR' ? 'pix' : 'spei',
      },
    };
  }

  async verifySource(
    _tenantId: string,
    _source: FundingSource,
    _params: VerifyFundingSourceParams
  ): Promise<ProviderVerificationResult> {
    return { verified: true, status: 'active' };
  }

  async removeSource(_tenantId: string, source: FundingSource): Promise<void> {
    if (!this.isAvailable()) return;

    const linkId = (source.provider_metadata as any)?.link_id || source.provider_id;
    try {
      await this.belvoRequest('DELETE', `/api/links/${linkId}/`);
    } catch {
      // Best effort
    }
  }

  async initiateFunding(
    _tenantId: string,
    source: FundingSource,
    params: InitiateFundingParams
  ): Promise<ProviderFundingResult> {
    const country = (source.provider_metadata as any)?.country;
    const paymentMethod = (source.provider_metadata as any)?.payment_method;

    if (!this.isAvailable()) {
      // Sandbox
      const feeRate = paymentMethod === 'pix' ? 0.01 : 0.005;
      return {
        provider_transaction_id: `belvo_tx_mock_${randomUUID().slice(0, 8)}`,
        status: 'processing',
        provider_fee_cents: Math.round(params.amount_cents * feeRate),
        estimated_completion: paymentMethod === 'pix'
          ? new Date(Date.now() + 60000).toISOString()        // Pix: ~1 minute
          : new Date(Date.now() + 5 * 60000).toISOString(),  // SPEI: ~5 minutes
        provider_metadata: { sandbox: true, payment_method: paymentMethod, country },
      };
    }

    if (paymentMethod === 'pix') {
      return this.initiatePixCollection(source, params);
    } else {
      return this.initiateSpeiCollection(source, params);
    }
  }

  /**
   * Generate Pix QR code for Brazil inbound payment (Story 41.14)
   */
  private async initiatePixCollection(
    source: FundingSource,
    params: InitiateFundingParams
  ): Promise<ProviderFundingResult> {
    const result = await this.belvoRequest('POST', '/payments/br/pix/charges/', {
      description: `Sly funding ${params.idempotency_key || randomUUID().slice(0, 8)}`,
      amount: params.amount_cents / 100,
      customer: (source.provider_metadata as any)?.account_id,
    });

    return {
      provider_transaction_id: result.id,
      status: 'pending',
      provider_fee_cents: Math.round(params.amount_cents * 0.01),
      estimated_completion: new Date(Date.now() + 60000).toISOString(),
      provider_metadata: {
        pix_qr_code: result.qr_code,
        pix_copy_paste: result.pix_code,
        expires_at: result.expires_at,
      },
    };
  }

  /**
   * Provide SPEI CLABE for Mexico inbound payment (Story 41.15)
   */
  private async initiateSpeiCollection(
    source: FundingSource,
    params: InitiateFundingParams
  ): Promise<ProviderFundingResult> {
    const result = await this.belvoRequest('POST', '/payments/mx/spei/charges/', {
      description: `Sly funding ${params.idempotency_key || randomUUID().slice(0, 8)}`,
      amount: params.amount_cents / 100,
    });

    return {
      provider_transaction_id: result.id,
      status: 'pending',
      provider_fee_cents: Math.round(params.amount_cents * 0.005),
      estimated_completion: new Date(Date.now() + 5 * 60000).toISOString(),
      provider_metadata: {
        clabe: result.clabe,
        reference: result.reference,
        beneficiary: result.beneficiary_name,
      },
    };
  }

  async getFundingStatus(providerTransactionId: string): Promise<ProviderFundingStatus> {
    if (!this.isAvailable()) {
      return {
        provider_transaction_id: providerTransactionId,
        status: 'completed',
        completed_at: new Date().toISOString(),
      };
    }

    // Check payment status at Belvo
    try {
      const result = await this.belvoRequest('GET', `/payments/charges/${providerTransactionId}/`);
      const statusMap: Record<string, any> = {
        created: 'pending',
        pending: 'processing',
        succeeded: 'completed',
        failed: 'failed',
      };
      return {
        provider_transaction_id: result.id,
        status: statusMap[result.status] || 'processing',
        completed_at: result.status === 'succeeded' ? result.completed_at : undefined,
        failure_reason: result.failure_message,
      };
    } catch {
      return { provider_transaction_id: providerTransactionId, status: 'processing' };
    }
  }

  async parseWebhook(payload: unknown, _signature: string): Promise<ProviderWebhookEvent> {
    const event = payload as any;

    const statusMap: Record<string, string> = {
      'PAYMENT_SUCCEEDED': 'completed',
      'PAYMENT_FAILED': 'failed',
      'PAYMENT_PENDING': 'processing',
    };

    return {
      event_type: event.event_type || event.webhook_type,
      provider_id: event.data?.link_id,
      provider_transaction_id: event.data?.charge_id || event.data?.id,
      status: statusMap[event.event_type] as any,
      source_status: event.event_type === 'LINK_UPDATED' ? 'active' :
                     event.event_type === 'LINK_ERROR' ? 'failed' : undefined,
      metadata: event.data,
    };
  }
}

export function createBelvoProvider(): BelvoProvider {
  return new BelvoProvider();
}
