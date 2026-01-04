import type {
  SandboxFacilitatorConfig,
  X402Payment,
  VerifyRequest,
  VerifyResponse,
  SettleRequest,
  SettleResponse,
  SupportedResponse,
} from './types';

/**
 * Sandbox Facilitator for x402 protocol
 * 
 * Provides a mock blockchain facilitator that implements the x402
 * facilitator interface but skips actual blockchain verification.
 * 
 * This enables local development and testing without:
 * - Gas fees
 * - Real USDC
 * - Network delays
 * - EVM private keys
 */
export class SandboxFacilitator {
  private config: Required<SandboxFacilitatorConfig>;

  constructor(config: SandboxFacilitatorConfig) {
    this.config = {
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      settlementDelayMs: config.settlementDelayMs ?? 0,
      failureRate: config.failureRate ?? 0,
      debug: config.debug ?? false,
      supportedSchemes: config.supportedSchemes ?? [
        {
          scheme: 'exact-evm',
          networks: ['eip155:8453', 'eip155:84532'], // Base mainnet and Sepolia
        },
      ],
    };

    if (this.config.debug) {
      console.log('[SandboxFacilitator] Initialized with config:', {
        apiUrl: this.config.apiUrl,
        settlementDelayMs: this.config.settlementDelayMs,
        failureRate: this.config.failureRate,
      });
    }
  }

  /**
   * Verify a payment payload
   * 
   * In sandbox mode, this validates the structure but skips signature verification
   */
  async verify(request: VerifyRequest): Promise<VerifyResponse> {
    const { payment } = request;

    if (this.config.debug) {
      console.log('[SandboxFacilitator] Verifying payment:', payment);
    }

    // Validate required fields
    const requiredFields = ['scheme', 'network', 'amount', 'token', 'from', 'to'];
    for (const field of requiredFields) {
      if (!payment[field]) {
        return {
          valid: false,
          reason: `Missing required field: ${field}`,
        };
      }
    }

    // Validate scheme is supported
    const schemeSupported = this.config.supportedSchemes.some(
      (s) => s.scheme === payment.scheme
    );
    if (!schemeSupported) {
      return {
        valid: false,
        reason: `Unsupported scheme: ${payment.scheme}`,
        details: {
          supportedSchemes: this.config.supportedSchemes.map((s) => s.scheme),
        },
      };
    }

    // Validate network is supported for scheme
    const scheme = this.config.supportedSchemes.find(
      (s) => s.scheme === payment.scheme
    );
    if (scheme && !scheme.networks.includes(payment.network)) {
      return {
        valid: false,
        reason: `Unsupported network: ${payment.network} for scheme: ${payment.scheme}`,
        details: {
          supportedNetworks: scheme.networks,
        },
      };
    }

    // Validate amount is a valid number
    const amount = parseFloat(payment.amount);
    if (isNaN(amount) || amount <= 0) {
      return {
        valid: false,
        reason: `Invalid amount: ${payment.amount}`,
      };
    }

    // In sandbox mode, we skip signature verification
    // In production, this would verify the EIP-3009 signature

    return {
      valid: true,
    };
  }

  /**
   * Settle a payment
   * 
   * In sandbox mode, this generates a mock transaction hash and
   * optionally records the payment in PayOS
   */
  async settle(request: SettleRequest): Promise<SettleResponse> {
    const { payment } = request;

    if (this.config.debug) {
      console.log('[SandboxFacilitator] Settling payment:', payment);
    }

    // First verify the payment
    const verification = await this.verify({ payment });
    if (!verification.valid) {
      throw new Error(`Payment verification failed: ${verification.reason}`);
    }

    // Simulate random failures if configured
    if (this.config.failureRate > 0) {
      const random = Math.random() * 100;
      if (random < this.config.failureRate) {
        throw new Error('Simulated settlement failure');
      }
    }

    // Simulate settlement delay if configured
    if (this.config.settlementDelayMs > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.config.settlementDelayMs)
      );
    }

    // Generate mock transaction hash
    const txHash = this.generateMockTxHash();

    // Record payment in PayOS (optional - may not be needed in pure sandbox)
    // This would call the PayOS API to create a transfer record
    // For now, we'll skip this to keep the facilitator independent

    if (this.config.debug) {
      console.log('[SandboxFacilitator] Settlement complete:', {
        txHash,
        amount: payment.amount,
        from: payment.from,
        to: payment.to,
      });
    }

    return {
      transactionHash: txHash,
      settled: true,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get supported schemes and networks
   */
  async supported(): Promise<SupportedResponse> {
    return {
      schemes: this.config.supportedSchemes,
    };
  }

  /**
   * Generate a realistic-looking mock transaction hash
   */
  private generateMockTxHash(): string {
    const chars = '0123456789abcdef';
    let hash = '0x';
    for (let i = 0; i < 64; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
  }
}

