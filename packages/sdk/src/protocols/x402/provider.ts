import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { PayOSEnvironment } from '../../types';
import { getEnvironmentConfig } from '../../config';
import { SandboxFacilitator } from '../../facilitator/sandbox-facilitator';

/**
 * x402 Provider configuration
 */
export interface X402ProviderConfig {
  /**
   * PayOS API key
   */
  apiKey: string;

  /**
   * Environment (sandbox, testnet, production)
   */
  environment: PayOSEnvironment;

  /**
   * Route configuration
   * Maps route patterns to prices
   */
  routes: Record<string, {
    price: string;
    description?: string;
    token?: string;
  }>;

  /**
   * Custom facilitator URL (overrides environment default)
   */
  facilitatorUrl?: string;
}

/**
 * x402 Provider for accepting payments
 * 
 * Express middleware that returns 402 responses for protected routes
 * and verifies payments before serving content.
 */
export class PayOSX402Provider {
  private config: Required<Omit<X402ProviderConfig, 'facilitatorUrl'>> & {
    facilitatorUrl?: string;
  };
  private sandboxFacilitator?: SandboxFacilitator;

  constructor(config: X402ProviderConfig) {
    const envConfig = getEnvironmentConfig(config.environment);

    this.config = {
      apiKey: config.apiKey,
      environment: config.environment,
      routes: config.routes,
      facilitatorUrl: config.facilitatorUrl || envConfig.facilitatorUrl,
    };

    // Initialize sandbox facilitator if in sandbox mode
    if (this.config.environment === 'sandbox') {
      this.sandboxFacilitator = new SandboxFacilitator({
        apiUrl: envConfig.apiUrl,
        apiKey: this.config.apiKey,
      });
    }
  }

  /**
   * Create Express middleware
   */
  middleware(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Check if route is protected
        const routeConfig = this.getRouteConfig(req);
        if (!routeConfig) {
          // Route not protected, continue
          return next();
        }

        // Check for payment header
        const paymentHeader = req.headers['x-payment'] as string | undefined;

        if (!paymentHeader) {
          // No payment, return 402
          return this.return402(req, res, routeConfig);
        }

        // Verify payment
        const isValid = await this.verifyPayment(paymentHeader, routeConfig);

        if (!isValid) {
          // Invalid payment, return 402
          return this.return402(req, res, routeConfig);
        }

        // Payment valid, continue to route handler
        next();
      } catch (error: any) {
        res.status(500).json({
          error: 'Payment verification failed',
          message: error.message,
        });
      }
    };
  }

  /**
   * Get route configuration for request
   */
  private getRouteConfig(req: Request): X402ProviderConfig['routes'][string] | null {
    const routeKey = `${req.method} ${req.path}`;
    
    // Exact match
    if (this.config.routes[routeKey]) {
      return this.config.routes[routeKey];
    }

    // Pattern match (simple wildcard support)
    for (const [pattern, config] of Object.entries(this.config.routes)) {
      if (this.matchRoute(pattern, routeKey)) {
        return config;
      }
    }

    return null;
  }

  /**
   * Simple route pattern matching
   */
  private matchRoute(pattern: string, route: string): boolean {
    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\//g, '\\/');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(route);
  }

  /**
   * Return 402 Payment Required response
   */
  private return402(
    _req: Request,
    res: Response,
    routeConfig: X402ProviderConfig['routes'][string]
  ): void {
    const scheme = 'exact-evm';
    const network = this.config.environment === 'sandbox' 
      ? 'eip155:8453'  // Base mainnet (mock)
      : 'eip155:8453'; // Base mainnet (real)

    res.status(402).json({
      statusCode: 402,
      message: 'Payment Required',
      accepts: [
        {
          scheme,
          network,
          token: routeConfig.token || 'USDC',
          amount: routeConfig.price,
          facilitator: this.config.facilitatorUrl,
          description: routeConfig.description,
        },
      ],
    });
  }

  /**
   * Verify payment
   */
  private async verifyPayment(
    paymentHeader: string,
    routeConfig: X402ProviderConfig['routes'][string]
  ): Promise<boolean> {
    try {
      const payment = JSON.parse(paymentHeader);

      // Check amount matches
      if (payment.amount !== routeConfig.price) {
        return false;
      }

      // Check token matches
      const expectedToken = routeConfig.token || 'USDC';
      if (payment.token !== expectedToken) {
        return false;
      }

      // Verify with facilitator
      if (this.config.environment === 'sandbox') {
        return this.verifySandboxPayment(payment);
      } else {
        return this.verifyBlockchainPayment(payment);
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Verify sandbox payment
   */
  private async verifySandboxPayment(payment: any): Promise<boolean> {
    if (!this.sandboxFacilitator) {
      return false;
    }

    const result = await this.sandboxFacilitator.verify({ payment });
    return result.valid;
  }

  /**
   * Verify blockchain payment
   */
  private async verifyBlockchainPayment(_payment: any): Promise<boolean> {
    // In production, this would:
    // 1. Call the real facilitator to verify the payment
    // 2. Check the signature
    // 3. Verify the transaction on-chain

    // For now, throw an error as this requires full @x402 integration
    throw new Error('Blockchain payment verification not yet implemented - use sandbox mode');
  }
}

