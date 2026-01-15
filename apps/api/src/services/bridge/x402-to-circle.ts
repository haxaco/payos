/**
 * x402 → Circle Settlement Bridge
 * Story 40.10: Critical Path for YC Demo
 * 
 * Flow:
 * 1. x402 payment settles USDC to PayOS wallet on Base
 * 2. PayOS detects incoming USDC via balance change or event
 * 3. PayOS triggers Circle Pix/SPEI payout
 * 4. Settlement record links x402 payment to fiat payout
 * 
 * This bridges on-chain USDC payments to real-world fiat settlements.
 */

import { randomUUID } from 'crypto';
import { getPublicClient, getWalletAddress, getUsdcBalance, getChainConfig } from '../../config/blockchain.js';
import { getCirclePayoutsClient, PixKeyType, validatePixKey, validateClabe } from '../circle/payouts.js';
import { getX402FacilitatorClient, toUsdcUnits, fromUsdcUnits, createPaymentPayload } from '../x402/facilitator.js';
import { createClient } from '../../db/client.js';

// ============================================
// Types
// ============================================

export type BridgeSettlementRail = 'pix' | 'spei';

export interface X402ToPixRequest {
  rail: 'pix';
  // x402 payment details
  x402TransferId: string;
  amount: string;              // USDC amount (e.g., "10.00")
  
  // Pix destination
  pixKey: string;
  pixKeyType: PixKeyType;
  recipientName: string;
  recipientTaxId?: string;     // CPF or CNPJ
  
  // Optional
  metadata?: Record<string, string>;
}

export interface X402ToSpeiRequest {
  rail: 'spei';
  // x402 payment details
  x402TransferId: string;
  amount: string;              // USDC amount (e.g., "10.00")
  
  // SPEI destination
  clabe: string;               // 18-digit CLABE
  recipientName: string;
  recipientTaxId?: string;     // RFC
  bankName?: string;
  
  // Optional
  metadata?: Record<string, string>;
}

export type X402ToBridgeRequest = X402ToPixRequest | X402ToSpeiRequest;

export interface BridgeSettlement {
  id: string;
  x402TransferId: string;
  x402TxHash?: string;
  usdcAmount: string;
  fiatAmount: string;
  fiatCurrency: string;
  rail: BridgeSettlementRail;
  circlePayoutId?: string;
  status: 'pending' | 'usdc_received' | 'payout_created' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BridgeConfig {
  // Exchange rates (USDC → Fiat) - In production, fetch from Circle API
  exchangeRates: {
    BRL: number;  // 1 USDC = X BRL
    MXN: number;  // 1 USDC = X MXN
  };
  // Fee percentage for bridge (basis points)
  bridgeFeeBps: number;
  // Minimum amounts
  minimumUsdc: string;
}

// Default configuration for sandbox
const DEFAULT_CONFIG: BridgeConfig = {
  exchangeRates: {
    BRL: 5.00,   // ~$1 = R$5
    MXN: 17.50,  // ~$1 = $17.50 MXN
  },
  bridgeFeeBps: 50, // 0.5% bridge fee
  minimumUsdc: '1.00',
};

// ============================================
// x402 → Circle Bridge Service
// ============================================

export class X402ToCircleBridge {
  private config: BridgeConfig;
  private tenantId: string;

  constructor(tenantId: string, config?: Partial<BridgeConfig>) {
    this.tenantId = tenantId;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================
  // Quote
  // ============================================

  /**
   * Get a quote for converting USDC to fiat via the bridge
   */
  getQuote(usdcAmount: string, destinationCurrency: 'BRL' | 'MXN'): {
    usdcAmount: string;
    fiatAmount: string;
    fiatCurrency: string;
    exchangeRate: number;
    bridgeFee: string;
    estimatedDelivery: string;
  } {
    const usdc = parseFloat(usdcAmount);
    const rate = this.config.exchangeRates[destinationCurrency];
    const bridgeFee = (usdc * this.config.bridgeFeeBps) / 10000;
    const netUsdc = usdc - bridgeFee;
    const fiatAmount = netUsdc * rate;

    return {
      usdcAmount,
      fiatAmount: fiatAmount.toFixed(2),
      fiatCurrency: destinationCurrency,
      exchangeRate: rate,
      bridgeFee: bridgeFee.toFixed(6),
      estimatedDelivery: destinationCurrency === 'BRL' ? '< 5 minutes' : '< 30 minutes',
    };
  }

  // ============================================
  // Settlement: x402 → Pix
  // ============================================

  /**
   * Settle x402 USDC payment to Brazilian Pix
   * 
   * This is the main E2E flow:
   * 1. Verify x402 transfer exists and is completed
   * 2. Create bridge settlement record
   * 3. Calculate fiat amount with FX rate
   * 4. Create Circle Pix payout
   * 5. Link settlement to Circle payout
   */
  async settleX402ToPix(request: X402ToPixRequest): Promise<BridgeSettlement> {
    console.log(`[Bridge] Starting x402 → Pix settlement for ${request.x402TransferId}`);

    // Validate Pix key
    if (!validatePixKey(request.pixKey, request.pixKeyType)) {
      throw new BridgeError(`Invalid Pix key format for type: ${request.pixKeyType}`, 'INVALID_PIX_KEY');
    }

    // Validate minimum amount
    if (parseFloat(request.amount) < parseFloat(this.config.minimumUsdc)) {
      throw new BridgeError(
        `Amount below minimum (${this.config.minimumUsdc} USDC)`,
        'AMOUNT_TOO_LOW'
      );
    }

    const settlementId = randomUUID();
    const supabase = createClient();

    // Calculate fiat amount
    const quote = this.getQuote(request.amount, 'BRL');

    try {
      // 1. Create settlement record
      const { error: insertError } = await supabase
        .from('settlements')
        .insert({
          id: settlementId,
          tenant_id: this.tenantId,
          transfer_id: request.x402TransferId,
          rail: 'pix',
          provider: 'circle',
          status: 'pending',
          amount: parseFloat(request.amount),
          currency: 'USDC',
          fee_amount: parseFloat(quote.bridgeFee),
          destination_details: {
            pixKey: request.pixKey,
            pixKeyType: request.pixKeyType,
            recipientName: request.recipientName,
            fiatAmount: quote.fiatAmount,
            fiatCurrency: 'BRL',
            fxRate: quote.exchangeRate,
            ...request.metadata,
          },
        });

      if (insertError) {
        console.error('[Bridge] Failed to create settlement record:', insertError);
        throw new BridgeError('Failed to create settlement record', 'DATABASE_ERROR');
      }

      // 2. Create Circle Pix payout
      const circleClient = getCirclePayoutsClient();
      const payout = await circleClient.createPixPayout({
        amount: quote.fiatAmount,
        pixKey: request.pixKey,
        pixKeyType: request.pixKeyType,
        recipientName: request.recipientName,
        taxId: request.recipientTaxId,
        metadata: {
          settlementId,
          transferId: request.x402TransferId,
          ...request.metadata,
        },
      });

      // 3. Update settlement with Circle payout ID
      const { error: updateError } = await supabase
        .from('settlements')
        .update({
          external_id: payout.id,
          status: 'payout_created',
          provider_response: payout,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settlementId);

      if (updateError) {
        console.error('[Bridge] Failed to update settlement:', updateError);
      }

      console.log(`[Bridge] x402 → Pix settlement created: ${settlementId} → Circle payout: ${payout.id}`);

      return {
        id: settlementId,
        x402TransferId: request.x402TransferId,
        usdcAmount: request.amount,
        fiatAmount: quote.fiatAmount,
        fiatCurrency: 'BRL',
        rail: 'pix',
        circlePayoutId: payout.id,
        status: 'payout_created',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

    } catch (error) {
      // Update settlement as failed
      await supabase
        .from('settlements')
        .update({
          status: 'failed',
          return_details: { error: error instanceof Error ? error.message : 'Unknown error' },
          failed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', settlementId);

      throw error;
    }
  }

  // ============================================
  // Settlement: x402 → SPEI
  // ============================================

  /**
   * Settle x402 USDC payment to Mexican SPEI
   */
  async settleX402ToSpei(request: X402ToSpeiRequest): Promise<BridgeSettlement> {
    console.log(`[Bridge] Starting x402 → SPEI settlement for ${request.x402TransferId}`);

    // Validate CLABE
    if (!validateClabe(request.clabe)) {
      throw new BridgeError('Invalid CLABE format', 'INVALID_CLABE');
    }

    // Validate minimum amount
    if (parseFloat(request.amount) < parseFloat(this.config.minimumUsdc)) {
      throw new BridgeError(
        `Amount below minimum (${this.config.minimumUsdc} USDC)`,
        'AMOUNT_TOO_LOW'
      );
    }

    const settlementId = randomUUID();
    const supabase = createClient();

    // Calculate fiat amount
    const quote = this.getQuote(request.amount, 'MXN');

    try {
      // 1. Create settlement record
      const { error: insertError } = await supabase
        .from('settlements')
        .insert({
          id: settlementId,
          tenant_id: this.tenantId,
          transfer_id: request.x402TransferId,
          rail: 'spei',
          provider: 'circle',
          status: 'pending',
          amount: parseFloat(request.amount),
          currency: 'USDC',
          fee_amount: parseFloat(quote.bridgeFee),
          destination_details: {
            clabe: request.clabe,
            recipientName: request.recipientName,
            bankName: request.bankName,
            fiatAmount: quote.fiatAmount,
            fiatCurrency: 'MXN',
            fxRate: quote.exchangeRate,
            ...request.metadata,
          },
        });

      if (insertError) {
        console.error('[Bridge] Failed to create settlement record:', insertError);
        throw new BridgeError('Failed to create settlement record', 'DATABASE_ERROR');
      }

      // 2. Create Circle SPEI payout
      const circleClient = getCirclePayoutsClient();
      const payout = await circleClient.createSpeiPayout({
        amount: quote.fiatAmount,
        clabe: request.clabe,
        recipientName: request.recipientName,
        taxId: request.recipientTaxId,
        bankName: request.bankName,
        metadata: {
          settlementId,
          transferId: request.x402TransferId,
          ...request.metadata,
        },
      });

      // 3. Update settlement with Circle payout ID
      const { error: updateError } = await supabase
        .from('settlements')
        .update({
          external_id: payout.id,
          status: 'payout_created',
          provider_response: payout,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settlementId);

      if (updateError) {
        console.error('[Bridge] Failed to update settlement:', updateError);
      }

      console.log(`[Bridge] x402 → SPEI settlement created: ${settlementId} → Circle payout: ${payout.id}`);

      return {
        id: settlementId,
        x402TransferId: request.x402TransferId,
        usdcAmount: request.amount,
        fiatAmount: quote.fiatAmount,
        fiatCurrency: 'MXN',
        rail: 'spei',
        circlePayoutId: payout.id,
        status: 'payout_created',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

    } catch (error) {
      // Update settlement as failed
      await supabase
        .from('settlements')
        .update({
          status: 'failed',
          return_details: { error: error instanceof Error ? error.message : 'Unknown error' },
          failed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', settlementId);

      throw error;
    }
  }

  // ============================================
  // Webhook Handler
  // ============================================

  /**
   * Handle Circle payout webhook to update settlement status
   */
  async handleCirclePayoutWebhook(
    circlePayoutId: string,
    status: 'confirmed' | 'complete' | 'failed' | 'returned',
    details?: Record<string, unknown>
  ): Promise<void> {
    console.log(`[Bridge] Handling webhook for payout ${circlePayoutId}: ${status}`);

    const supabase = createClient();

    // Map Circle status to our status
    const statusMap: Record<string, BridgeSettlement['status']> = {
      confirmed: 'payout_created',
      complete: 'completed',
      failed: 'failed',
      returned: 'failed',
    };

    const settlementStatus = statusMap[status] || 'pending';

    const updateData: Record<string, unknown> = {
      status: settlementStatus,
      updated_at: new Date().toISOString(),
    };

    if (status === 'complete') {
      updateData.completed_at = new Date().toISOString();
      updateData.provider_response = details;
    }

    if (status === 'failed' || status === 'returned') {
      updateData.failed_at = new Date().toISOString();
      updateData.return_details = { 
        errorCode: details?.errorCode,
        reason: details?.reason || 'Payout failed' 
      };
    }

    await supabase
      .from('settlements')
      .update(updateData)
      .eq('external_id', circlePayoutId)
      .eq('tenant_id', this.tenantId);
  }

  // ============================================
  // Status Tracking
  // ============================================

  /**
   * Get settlement status by ID
   */
  async getSettlement(settlementId: string): Promise<BridgeSettlement | null> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('settlements')
      .select('*')
      .eq('id', settlementId)
      .eq('tenant_id', this.tenantId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapSettlementData(data);
  }

  /**
   * Get settlement by x402 transfer ID
   */
  async getSettlementByTransfer(transferId: string): Promise<BridgeSettlement | null> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('settlements')
      .select('*')
      .eq('transfer_id', transferId)
      .eq('tenant_id', this.tenantId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapSettlementData(data);
  }

  /**
   * Map database settlement data to BridgeSettlement type
   */
  private mapSettlementData(data: any): BridgeSettlement {
    return {
      id: data.id,
      x402TransferId: data.transfer_id,
      x402TxHash: data.destination_details?.txHash,
      usdcAmount: String(data.amount),
      fiatAmount: String(data.destination_details?.fiatAmount || 0),
      fiatCurrency: data.destination_details?.fiatCurrency || data.currency,
      rail: data.rail as BridgeSettlementRail,
      circlePayoutId: data.external_id,
      status: data.status,
      errorMessage: data.return_details?.reason || data.return_details?.error,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  // ============================================
  // USDC Detection (for inbound x402 payments)
  // ============================================

  /**
   * Monitor for incoming USDC transfers (polling method)
   * In production, use webhook/event subscription instead
   */
  async detectUsdcDeposit(
    expectedAmount: string,
    previousBalance: string,
    timeoutMs: number = 60000
  ): Promise<{ received: boolean; newBalance: string }> {
    const startTime = Date.now();
    const expectedUsdc = parseFloat(expectedAmount);
    const prevBalance = parseFloat(previousBalance);
    const walletAddress = getWalletAddress();

    console.log(`[Bridge] Monitoring for ${expectedAmount} USDC deposit to ${walletAddress}`);

    while (Date.now() - startTime < timeoutMs) {
      try {
        const currentBalance = await getUsdcBalance(walletAddress);
        const balanceChange = parseFloat(currentBalance) - prevBalance;

        if (balanceChange >= expectedUsdc * 0.99) { // 1% tolerance
          console.log(`[Bridge] USDC deposit detected: ${balanceChange} USDC`);
          return { received: true, newBalance: currentBalance };
        }
      } catch (error) {
        console.warn('[Bridge] Error checking balance:', error);
      }

      // Poll every 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const finalBalance = await getUsdcBalance(walletAddress);
    return { received: false, newBalance: finalBalance };
  }
}

// ============================================
// Error Class
// ============================================

export class BridgeError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'BridgeError';
  }
}

// ============================================
// Factory
// ============================================

/**
 * Create an x402 → Circle bridge for a tenant
 */
export function createX402ToCircleBridge(
  tenantId: string,
  config?: Partial<BridgeConfig>
): X402ToCircleBridge {
  return new X402ToCircleBridge(tenantId, config);
}

