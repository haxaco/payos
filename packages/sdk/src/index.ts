/**
 * @payos/sdk - Unified SDK for PayOS multi-protocol settlement
 * 
 * This SDK provides:
 * - x402 micropayments (Coinbase/Cloudflare)
 * - AP2 agent mandates (Google)
 * - ACP checkout (Stripe/OpenAI)
 * - Direct settlement API
 * - Pix/SPEI local rails
 * 
 * @example Sandbox mode (no blockchain)
 * ```ts
 * const payos = new PayOS({
 *   apiKey: 'payos_...',
 *   environment: 'sandbox',
 * });
 * ```
 * 
 * @example Production mode
 * ```ts
 * const payos = new PayOS({
 *   apiKey: 'payos_...',
 *   environment: 'production',
 *   evmPrivateKey: '0x...',
 * });
 * ```
 */

import type { PayOSConfig } from './types';
import { PayOSClient } from './client';
import { PayOSX402Client } from './protocols/x402/client';
import { PayOSX402Provider } from './protocols/x402/provider';
import { AP2Client } from './protocols/ap2/client';
import { ACPClient } from './protocols/acp/client';
import { UCPClient } from './protocols/ucp/client';
import { CapabilitiesClient } from './capabilities';
import { LangChainTools } from './langchain/tools';

/**
 * Main PayOS SDK class
 *
 * Provides unified access to all PayOS settlement protocols:
 * - x402 (micropayments)
 * - AP2 (agent mandates)
 * - ACP (checkout)
 * - UCP (universal commerce - Google+Shopify)
 * - Direct settlement API
 * - Capabilities discovery for AI agents
 */
export class PayOS extends PayOSClient {
  /**
   * x402 protocol client
   * Create x402 payments with automatic 402 handling
   */
  public readonly x402: {
    /**
     * Create an x402 client for making payments
     */
    createClient: (config?: Partial<PayOSConfig>) => PayOSX402Client;
    
    /**
     * Create an x402 provider for accepting payments
     */
    createProvider: (routes: Record<string, { price: string; description?: string; token?: string }>) => PayOSX402Provider;
  };

  /**
   * AP2 (Agent-to-Agent Protocol) client
   * Google's mandate-based payment protocol
   */
  public readonly ap2: AP2Client;

  /**
   * ACP (Agentic Commerce Protocol) client
   * Stripe/OpenAI's checkout-based payment protocol
   */
  public readonly acp: ACPClient;

  /**
   * UCP (Universal Commerce Protocol) client
   * Google+Shopify's agentic commerce protocol
   */
  public readonly ucp: UCPClient;

  /**
   * Capabilities client for tool discovery
   * Enables AI agents to discover available PayOS operations
   */
  public readonly capabilities: CapabilitiesClient;

  /**
   * LangChain tools integration
   */
  public readonly langchain: LangChainTools;

  constructor(config: PayOSConfig) {
    // Validate API key
    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new Error('API key is required');
    }

    super(config);

    // Initialize x402 protocol helpers
    this.x402 = {
      createClient: (overrides?: Partial<PayOSConfig>) => {
        return new PayOSX402Client({
          ...config,
          ...overrides,
        });
      },
      createProvider: (routes) => {
        return new PayOSX402Provider({
          apiKey: config.apiKey,
          environment: config.environment,
          routes,
          facilitatorUrl: config.facilitatorUrl,
        });
      },
    };

    // Initialize protocol clients
    this.ap2 = new AP2Client(this);
    this.acp = new ACPClient(this);
    this.ucp = new UCPClient(this);

    // Initialize capabilities client
    this.capabilities = new CapabilitiesClient(this);

    // Initialize LangChain tools
    this.langchain = new LangChainTools(this);
  }
}

// Export types
export * from './types';
export * from './config';
export * from './client';
export * from './auth';

