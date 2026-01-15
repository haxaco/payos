/**
 * Wallet Verification Service
 * 
 * Provides EIP-712 signature verification for BYOW (Bring Your Own Wallet).
 * 
 * @see Story 40.11: Wallet Management BYOW
 * @module services/wallet/verification
 */

import { verifyMessage, recoverMessageAddress, hashMessage } from 'viem';
import { createPublicClient, http } from 'viem';
import { baseSepolia, mainnet } from 'viem/chains';

// =============================================================================
// Types
// =============================================================================

export interface VerificationChallenge {
  message: string;
  nonce: string;
  issued_at: string;
  expires_at: string;
  wallet_address: string;
  domain: {
    name: string;
    version: string;
    chainId: number;
  };
}

export interface VerificationResult {
  verified: boolean;
  address?: string;
  error?: string;
  method: 'eip191' | 'eip712' | 'mock';
}

export interface WalletInfo {
  address: string;
  balance: string;
  nonce?: number;
  isContract: boolean;
  chain: string;
}

// =============================================================================
// EIP-712 Domain
// =============================================================================

const EIP712_DOMAIN = {
  name: 'PayOS Wallet Verification',
  version: '1',
};

const EIP712_TYPES = {
  WalletOwnership: [
    { name: 'wallet', type: 'address' },
    { name: 'nonce', type: 'string' },
    { name: 'statement', type: 'string' },
    { name: 'issuedAt', type: 'string' },
  ],
} as const;

// =============================================================================
// Wallet Verification Service
// =============================================================================

export class WalletVerificationService {
  private readonly rpcUrl: string;
  private readonly chainId: number;
  private readonly useMock: boolean;

  constructor(options?: { rpcUrl?: string; chainId?: number; mock?: boolean }) {
    this.rpcUrl = options?.rpcUrl || process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
    this.chainId = options?.chainId || 84532;  // Base Sepolia
    this.useMock = options?.mock ?? process.env.PAYOS_ENVIRONMENT === 'mock';
  }

  /**
   * Generate a verification challenge for wallet ownership
   */
  generateChallenge(walletAddress: string): VerificationChallenge {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);  // 5 minutes
    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    
    const message = `PayOS Wallet Verification

I confirm that I own this wallet and authorize PayOS to:
- Link this wallet to my account
- Monitor transaction activity
- Use this address for x402 payments

Wallet: ${walletAddress}
Nonce: ${nonce}
Issued: ${now.toISOString()}

This request will expire at ${expiresAt.toISOString()}`;

    return {
      message,
      nonce,
      issued_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      wallet_address: walletAddress,
      domain: {
        name: EIP712_DOMAIN.name,
        version: EIP712_DOMAIN.version,
        chainId: this.chainId,
      },
    };
  }

  /**
   * Verify a signed message (EIP-191 personal sign)
   */
  async verifyPersonalSign(
    address: string,
    signature: string,
    message: string
  ): Promise<VerificationResult> {
    if (this.useMock) {
      return this.mockVerify(address, signature);
    }

    try {
      // Normalize address
      const normalizedAddress = address.toLowerCase() as `0x${string}`;
      const sig = signature as `0x${string}`;
      
      // Recover address from signature
      const recoveredAddress = await recoverMessageAddress({
        message,
        signature: sig,
      });
      
      const verified = recoveredAddress.toLowerCase() === normalizedAddress;
      
      return {
        verified,
        address: verified ? recoveredAddress : undefined,
        method: 'eip191',
        error: verified ? undefined : 'Signature does not match wallet address',
      };
    } catch (error: any) {
      return {
        verified: false,
        method: 'eip191',
        error: `Verification failed: ${error.message}`,
      };
    }
  }

  /**
   * Verify wallet balance and get info
   */
  async getWalletInfo(address: string): Promise<WalletInfo> {
    if (this.useMock) {
      return {
        address,
        balance: '1000000',  // 1 USDC (6 decimals)
        nonce: 0,
        isContract: false,
        chain: 'base-sepolia',
      };
    }

    try {
      const client = createPublicClient({
        chain: baseSepolia,
        transport: http(this.rpcUrl),
      });

      const [balance, nonce, code] = await Promise.all([
        client.getBalance({ address: address as `0x${string}` }),
        client.getTransactionCount({ address: address as `0x${string}` }),
        client.getCode({ address: address as `0x${string}` }),
      ]);

      return {
        address,
        balance: balance.toString(),
        nonce,
        isContract: !!code && code !== '0x',
        chain: 'base-sepolia',
      };
    } catch (error: any) {
      console.error('Error fetching wallet info:', error);
      return {
        address,
        balance: '0',
        isContract: false,
        chain: 'base-sepolia',
      };
    }
  }

  /**
   * Sync wallet balance from chain
   */
  async syncBalance(
    address: string,
    tokenAddress?: string
  ): Promise<{ balance: string; decimals: number }> {
    if (this.useMock) {
      return { balance: '1000000000', decimals: 6 };  // 1000 USDC
    }

    try {
      const client = createPublicClient({
        chain: baseSepolia,
        transport: http(this.rpcUrl),
      });

      if (tokenAddress) {
        // ERC20 balance
        const balance = await client.readContract({
          address: tokenAddress as `0x${string}`,
          abi: [
            {
              name: 'balanceOf',
              type: 'function',
              inputs: [{ name: 'account', type: 'address' }],
              outputs: [{ type: 'uint256' }],
              stateMutability: 'view',
            },
          ],
          functionName: 'balanceOf',
          args: [address as `0x${string}`],
        });

        return { balance: (balance as bigint).toString(), decimals: 6 };
      } else {
        // Native ETH balance
        const balance = await client.getBalance({
          address: address as `0x${string}`,
        });
        return { balance: balance.toString(), decimals: 18 };
      }
    } catch (error: any) {
      console.error('Error syncing balance:', error);
      return { balance: '0', decimals: 6 };
    }
  }

  /**
   * Mock verification for testing
   */
  private mockVerify(address: string, signature: string): VerificationResult {
    // In mock mode, accept any signature that starts with 0x
    const verified = signature.startsWith('0x') && signature.length >= 130;
    
    return {
      verified,
      address: verified ? address : undefined,
      method: 'mock',
      error: verified ? undefined : 'Invalid mock signature format',
    };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let verificationService: WalletVerificationService | null = null;

export function getWalletVerificationService(): WalletVerificationService {
  if (!verificationService) {
    verificationService = new WalletVerificationService();
  }
  return verificationService;
}



