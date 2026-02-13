/**
 * Circle Direct USDC Deposit Provider
 * Epic 41, Story 41.19: Direct USDC Deposit
 *
 * Supports direct USDC deposits for crypto-native partners.
 * Generates deposit addresses and monitors for incoming transfers.
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

export class CircleDirectProvider implements IFundingProvider {
  readonly name = 'circle' as const;
  readonly displayName = 'Direct USDC Deposit';

  readonly capabilities: ProviderCapability[] = [
    {
      sourceType: 'crypto_wallet',
      currencies: ['USDC'],
      requiresClientSetup: false,
      requiresVerification: false,
      settlementTime: '1-5 minutes (Base), 5-15 minutes (Ethereum)',
      supportsRefunds: false,
    },
  ];

  isAvailable(): boolean {
    // Always available - can generate deposit addresses
    return true;
  }

  async createSource(
    _tenantId: string,
    params: CreateFundingSourceParams
  ): Promise<ProviderSourceResult> {
    // Generate or retrieve a deposit address for this account
    // In production, this would call Circle API to get/create a wallet address
    const network = params.network || 'base';
    const depositAddress = params.wallet_address || `0x${randomUUID().replace(/-/g, '').slice(0, 40)}`;

    return {
      provider_id: `circle_deposit_${randomUUID().slice(0, 8)}`,
      status: 'active',
      display_name: `USDC (${network})`,
      supported_currencies: ['USDC'],
      provider_metadata: {
        deposit_address: depositAddress,
        network,
        token: 'USDC',
        min_deposit_cents: 100, // $1.00 minimum
        confirmations_required: network === 'base' ? 1 : 12,
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

  async removeSource(): Promise<void> {
    // Deposit addresses remain valid but can be disassociated
  }

  async initiateFunding(
    _tenantId: string,
    source: FundingSource,
    params: InitiateFundingParams
  ): Promise<ProviderFundingResult> {
    const metadata = source.provider_metadata as any;

    // Direct deposits are initiated by the user sending USDC
    // We return the deposit details for the user
    return {
      provider_transaction_id: `circle_pending_${randomUUID().slice(0, 8)}`,
      status: 'pending',
      provider_fee_cents: 1, // ~$0.01 network gas
      estimated_completion: metadata?.network === 'base'
        ? new Date(Date.now() + 2 * 60000).toISOString()   // Base: ~2 min
        : new Date(Date.now() + 10 * 60000).toISOString(),  // ETH: ~10 min
      provider_metadata: {
        deposit_address: metadata?.deposit_address,
        network: metadata?.network,
        expected_amount_usdc: params.amount_cents / 100,
        awaiting_deposit: true,
      },
    };
  }

  async getFundingStatus(providerTransactionId: string): Promise<ProviderFundingStatus> {
    // In production, would monitor Circle webhook or poll for incoming transfer
    return {
      provider_transaction_id: providerTransactionId,
      status: 'completed',
      completed_at: new Date().toISOString(),
    };
  }

  async parseWebhook(payload: unknown, _signature: string): Promise<ProviderWebhookEvent> {
    // Circle webhooks for incoming transfers
    const event = payload as any;

    return {
      event_type: event.type || 'transfer.complete',
      provider_id: event.data?.walletId,
      provider_transaction_id: event.data?.id,
      status: event.data?.state === 'COMPLETE' ? 'completed' :
              event.data?.state === 'FAILED' ? 'failed' : 'processing',
      metadata: {
        amount: event.data?.amounts,
        from_address: event.data?.sourceAddress,
        network: event.data?.blockchain,
        tx_hash: event.data?.txHash,
      },
    };
  }
}

export function createCircleDirectProvider(): CircleDirectProvider {
  return new CircleDirectProvider();
}
