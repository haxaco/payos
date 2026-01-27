import type {
  X402ClientConfig,
  X402ClientStatus,
  X402PaymentInfo,
  X402SettlementInfo,
  X402Response,
} from './types';
import { getEnvironmentConfig, validateEnvironment } from '../../config';
import { SandboxFacilitator } from '../../facilitator/sandbox-facilitator';

/**
 * x402 Client for making payments
 *
 * Automatically handles 402 responses by creating payments and retrying.
 * Supports sandbox mode (no blockchain) and production mode (real EVM).
 */
export class SlyX402Client {
  private config: Required<Omit<X402ClientConfig, 'evmPrivateKey' | 'onPayment' | 'onSettlement' | 'settleToRail'>> & {
    evmPrivateKey?: string;
    onPayment?: (payment: X402PaymentInfo) => void | Promise<void>;
    onSettlement?: (settlement: X402SettlementInfo) => void | Promise<void>;
    settleToRail?: 'pix' | 'spei' | 'none';
  };
  private dailySpent: number = 0;
  private lastResetDate: string;
  private sandboxFacilitator?: SandboxFacilitator;

  constructor(config: X402ClientConfig) {
    validateEnvironment(config.environment, config.evmPrivateKey);

    const envConfig = getEnvironmentConfig(config.environment);

    this.config = {
      apiKey: config.apiKey,
      environment: config.environment,
      evmPrivateKey: config.evmPrivateKey,
      facilitatorUrl: config.facilitatorUrl || envConfig.facilitatorUrl || '',
      maxAutoPayAmount: config.maxAutoPayAmount || '1.00',
      maxDailySpend: config.maxDailySpend || '100.00',
      onPayment: config.onPayment,
      onSettlement: config.onSettlement,
      settleToRail: config.settleToRail,
    };

    this.lastResetDate = new Date().toISOString().split('T')[0];

    // Initialize sandbox facilitator if in sandbox mode
    if (this.config.environment === 'sandbox') {
      this.sandboxFacilitator = new SandboxFacilitator({
        apiUrl: envConfig.apiUrl,
        apiKey: this.config.apiKey,
      });
    }
  }

  /**
   * Fetch a resource with automatic 402 payment handling
   */
  async fetch(url: string, options: RequestInit & { maxPayment?: string } = {}): Promise<Response> {
    const { maxPayment, ...fetchOptions } = options;

    // Make initial request
    let response = await fetch(url, fetchOptions);

    // If not 402, return response
    if (response.status !== 402) {
      return response;
    }

    // Parse 402 response
    const paymentRequired = await this.parse402Response(response);

    // Find acceptable payment option
    const acceptedOption = paymentRequired.accepts[0];
    if (!acceptedOption) {
      throw new Error('No acceptable payment options in 402 response');
    }

    // Check payment amount against limits
    const amount = parseFloat(acceptedOption.amount);
    const maxAmount = parseFloat(maxPayment || this.config.maxAutoPayAmount);

    if (amount > maxAmount) {
      throw new Error(
        `Payment amount ${acceptedOption.amount} exceeds max auto-pay amount ${maxPayment || this.config.maxAutoPayAmount}`
      );
    }

    // Check daily limit
    this.resetDailySpendIfNeeded();
    if (this.dailySpent + amount > parseFloat(this.config.maxDailySpend)) {
      throw new Error(
        `Payment would exceed daily limit. Spent: ${this.dailySpent}, Limit: ${this.config.maxDailySpend}`
      );
    }

    // Create payment
    const payment = await this.createPayment(acceptedOption);

    // Fire onPayment callback
    if (this.config.onPayment) {
      await this.config.onPayment({
        amount: acceptedOption.amount,
        currency: acceptedOption.token,
        from: payment.from,
        to: payment.to,
        scheme: acceptedOption.scheme,
        network: acceptedOption.network,
        timestamp: new Date().toISOString(),
      });
    }

    // Update daily spend
    this.dailySpent += amount;

    // Retry request with payment header
    response = await fetch(url, {
      ...fetchOptions,
      headers: {
        ...fetchOptions.headers,
        'X-Payment': JSON.stringify(payment),
      },
    });

    // Fire onSettlement callback
    if (this.config.onSettlement && payment.transactionHash) {
      await this.config.onSettlement({
        transactionHash: payment.transactionHash,
        amount: acceptedOption.amount,
        currency: acceptedOption.token,
        timestamp: new Date().toISOString(),
      });
    }

    return response;
  }

  /**
   * Get client status
   */
  getStatus(): X402ClientStatus {
    this.resetDailySpendIfNeeded();

    return {
      environment: this.config.environment,
      dailySpent: this.dailySpent.toFixed(2),
      dailyLimit: this.config.maxDailySpend,
      walletAddress: this.getWalletAddress(),
    };
  }

  /**
   * Parse 402 response
   */
  private async parse402Response(response: Response): Promise<X402Response> {
    const body: any = await response.json();
    
    if (!body.accepts || !Array.isArray(body.accepts)) {
      throw new Error('Invalid 402 response: missing accepts array');
    }

    return {
      statusCode: 402,
      accepts: body.accepts,
    };
  }

  /**
   * Create payment based on environment
   */
  private async createPayment(option: X402Response['accepts'][0]): Promise<any> {
    if (this.config.environment === 'sandbox') {
      return this.createSandboxPayment(option);
    } else {
      return this.createBlockchainPayment(option);
    }
  }

  /**
   * Create sandbox payment (mock)
   */
  private async createSandboxPayment(option: X402Response['accepts'][0]): Promise<any> {
    if (!this.sandboxFacilitator) {
      throw new Error('Sandbox facilitator not initialized');
    }

    const payment = {
      scheme: option.scheme,
      network: option.network,
      amount: option.amount,
      token: option.token,
      from: '0x0000000000000000000000000000000000000001', // Mock address
      to: '0x0000000000000000000000000000000000000002', // Mock address
    };

    // Settle through sandbox facilitator
    const settlement = await this.sandboxFacilitator.settle({ payment });

    return {
      ...payment,
      transactionHash: settlement.transactionHash,
    };
  }

  /**
   * Create blockchain payment (real EVM)
   */
  private async createBlockchainPayment(_option: X402Response['accepts'][0]): Promise<any> {
    if (!this.config.evmPrivateKey) {
      throw new Error('EVM private key required for blockchain payments');
    }

    // In a real implementation, this would:
    // 1. Use @x402/evm to create an EIP-3009 transfer
    // 2. Sign with the private key
    // 3. Submit to the facilitator
    // 4. Return the payment proof

    // For now, throw an error as this requires the full @x402 integration
    throw new Error('Blockchain payments not yet implemented - use sandbox mode');
  }

  /**
   * Get wallet address based on environment
   */
  private getWalletAddress(): string | undefined {
    if (this.config.environment === 'sandbox') {
      return '0x0000000000000000000000000000000000000001';
    }

    // In production, derive from private key
    return undefined;
  }

  /**
   * Reset daily spend if date has changed
   */
  private resetDailySpendIfNeeded(): void {
    const today = new Date().toISOString().split('T')[0];
    if (today !== this.lastResetDate) {
      this.dailySpent = 0;
      this.lastResetDate = today;
    }
  }
}

// Backward compatibility alias
export { SlyX402Client as PayOSX402Client };

