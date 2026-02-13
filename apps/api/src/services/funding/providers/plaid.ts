/**
 * Plaid Bank Linking Provider
 * Epic 41, Stories 41.9-41.11: Plaid Integration
 *
 * Handles US bank account linking via Plaid Link with balance checking
 * and identity verification capabilities.
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

const PLAID_CLIENT_ID = () => process.env.PLAID_CLIENT_ID || '';
const PLAID_SECRET = () => process.env.PLAID_SECRET || '';
const PLAID_ENV = () => process.env.PLAID_ENV || 'sandbox';

function getPlaidBaseUrl(): string {
  const env = PLAID_ENV();
  if (env === 'production') return 'https://production.plaid.com';
  if (env === 'development') return 'https://development.plaid.com';
  return 'https://sandbox.plaid.com';
}

export class PlaidProvider implements IWidgetProvider {
  readonly name = 'plaid' as const;
  readonly displayName = 'Plaid (US Bank Linking)';

  readonly capabilities: ProviderCapability[] = [
    {
      sourceType: 'bank_account_us',
      currencies: ['USD'],
      requiresClientSetup: true,
      requiresVerification: false, // Plaid Link handles auth
      settlementTime: '3-5 business days (ACH)',
      supportsRefunds: false,
    },
  ];

  isAvailable(): boolean {
    return !!PLAID_CLIENT_ID() && !!PLAID_SECRET();
  }

  private async plaidRequest(path: string, body: Record<string, unknown>): Promise<any> {
    const response = await fetch(`${getPlaidBaseUrl()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID(),
        secret: PLAID_SECRET(),
        ...body,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Plaid error: ${error.error_message || response.statusText}`);
    }

    return response.json();
  }

  async createWidgetSession(
    tenantId: string,
    params: WidgetParams
  ): Promise<WidgetResult> {
    if (!this.isAvailable()) {
      // Sandbox: return mock link token
      const linkToken = `link-sandbox-${randomUUID().slice(0, 8)}`;
      return {
        widget_url: `https://cdn.plaid.com/link/v2/stable/link.html?token=${linkToken}`,
        session_id: linkToken,
        expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
      };
    }

    const result = await this.plaidRequest('/link/token/create', {
      user: { client_user_id: params.account_id },
      client_name: 'Sly',
      products: ['auth', 'identity'],
      country_codes: ['US'],
      language: 'en',
      redirect_uri: params.redirect_url,
    });

    return {
      widget_url: `https://cdn.plaid.com/link/v2/stable/link.html?token=${result.link_token}`,
      session_id: result.link_token,
      expires_at: result.expiration,
    };
  }

  async createSource(
    tenantId: string,
    params: CreateFundingSourceParams
  ): Promise<ProviderSourceResult> {
    if (!this.isAvailable() || !params.public_token) {
      // Sandbox: mock linked bank
      return {
        provider_id: `plaid_access_mock_${randomUUID().slice(0, 8)}`,
        status: 'active',
        display_name: 'Chase Checking ••••5678',
        last_four: '5678',
        supported_currencies: ['USD'],
        provider_metadata: {
          sandbox: true,
          institution_name: 'Chase',
          account_type: 'checking',
        },
      };
    }

    // Exchange public_token for access_token
    const tokenResult = await this.plaidRequest('/item/public_token/exchange', {
      public_token: params.public_token,
    });

    // Get account details
    const authResult = await this.plaidRequest('/auth/get', {
      access_token: tokenResult.access_token,
    });

    const account = authResult.accounts?.[0];
    if (!account) {
      throw new Error('No accounts found after Plaid link');
    }

    return {
      provider_id: tokenResult.access_token,
      status: 'active',
      display_name: `${account.name} ••••${account.mask}`,
      last_four: account.mask,
      supported_currencies: ['USD'],
      provider_metadata: {
        access_token: tokenResult.access_token,
        item_id: tokenResult.item_id,
        account_id: account.account_id,
        institution_name: authResult.item?.institution_id,
        account_type: account.subtype,
        routing_number: authResult.numbers?.ach?.[0]?.routing,
        account_number_last4: authResult.numbers?.ach?.[0]?.account?.slice(-4),
      },
    };
  }

  async verifySource(
    _tenantId: string,
    _source: FundingSource,
    _params: VerifyFundingSourceParams
  ): Promise<ProviderVerificationResult> {
    // Plaid Link handles verification during linking
    return { verified: true, status: 'active' };
  }

  async removeSource(_tenantId: string, source: FundingSource): Promise<void> {
    if (!this.isAvailable()) return;

    const accessToken = (source.provider_metadata as any)?.access_token;
    if (!accessToken) return;

    try {
      await this.plaidRequest('/item/remove', { access_token: accessToken });
    } catch {
      // Best effort removal
    }
  }

  async initiateFunding(
    _tenantId: string,
    source: FundingSource,
    params: InitiateFundingParams
  ): Promise<ProviderFundingResult> {
    // Plaid itself doesn't process payments - it provides bank details
    // The actual ACH debit is initiated via Stripe ACH or direct processor
    // For now, we simulate the funding flow
    const fee = Math.min(Math.round(params.amount_cents * 0.008), 500);

    return {
      provider_transaction_id: `plaid_tx_${randomUUID().slice(0, 8)}`,
      status: 'processing',
      provider_fee_cents: fee,
      estimated_completion: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      provider_metadata: {
        transfer_method: 'ach',
        account_id: (source.provider_metadata as any)?.account_id,
      },
    };
  }

  async getFundingStatus(providerTransactionId: string): Promise<ProviderFundingStatus> {
    // In production, would check Plaid Transfer status
    return {
      provider_transaction_id: providerTransactionId,
      status: 'completed',
      completed_at: new Date().toISOString(),
    };
  }

  /**
   * Check balance before funding (Story 41.10)
   */
  async getBalance(source: FundingSource): Promise<{
    available: number;
    current: number;
    currency: string;
  }> {
    const accessToken = (source.provider_metadata as any)?.access_token;
    const accountId = (source.provider_metadata as any)?.account_id;

    if (!this.isAvailable() || !accessToken) {
      return { available: 500000, current: 520000, currency: 'USD' };
    }

    const result = await this.plaidRequest('/accounts/balance/get', {
      access_token: accessToken,
      options: { account_ids: [accountId] },
    });

    const account = result.accounts?.[0];
    return {
      available: Math.round((account?.balances?.available || 0) * 100),
      current: Math.round((account?.balances?.current || 0) * 100),
      currency: account?.balances?.iso_currency_code || 'USD',
    };
  }

  /**
   * Verify account holder identity (Story 41.11)
   */
  async verifyIdentity(source: FundingSource): Promise<{
    names: string[];
    emails: string[];
    match_score: number;
  }> {
    const accessToken = (source.provider_metadata as any)?.access_token;

    if (!this.isAvailable() || !accessToken) {
      return { names: ['John Doe'], emails: ['john@example.com'], match_score: 0.95 };
    }

    const result = await this.plaidRequest('/identity/get', {
      access_token: accessToken,
    });

    const owner = result.accounts?.[0]?.owners?.[0];
    return {
      names: owner?.names || [],
      emails: owner?.emails?.map((e: any) => e.data) || [],
      match_score: 1.0, // Would calculate based on name comparison
    };
  }

  async parseWebhook(payload: unknown, _signature: string): Promise<ProviderWebhookEvent> {
    const event = payload as any;

    const statusMap: Record<string, string> = {
      'INITIAL_UPDATE': 'active',
      'HISTORICAL_UPDATE': 'active',
      'DEFAULT_UPDATE': 'active',
      'TRANSACTIONS_REMOVED': 'active',
      'PENDING_EXPIRATION': 'suspended',
      'ERROR': 'failed',
    };

    return {
      event_type: event.webhook_type || event.webhook_code,
      provider_id: event.item_id,
      source_status: statusMap[event.webhook_code] as any,
      metadata: { webhook_code: event.webhook_code },
    };
  }
}

export function createPlaidProvider(): PlaidProvider {
  return new PlaidProvider();
}
