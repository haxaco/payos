/**
 * Mock Circle Service
 * 
 * This is a mock implementation of Circle's Programmable Wallets API.
 * Replace with real Circle SDK integration in Phase 2.
 * 
 * Circle API Docs: https://developers.circle.com/w3s/docs
 */

import { randomUUID } from 'crypto';

// ============================================
// Types
// ============================================

export interface CircleWallet {
  id: string;                    // wa_xxxxx
  address: string;               // 0x...
  blockchain: string;            // BASE, ETH, POLYGON
  state: 'LIVE' | 'FROZEN';
  walletSetId: string;
  accountType: 'SCA' | 'EOA';
  custodyType: 'DEVELOPER' | 'USER';
  name?: string;
  refId?: string;
  createDate: string;
  updateDate: string;
}

export interface CircleWalletSet {
  id: string;                    // ws_xxxxx
  custodyType: 'DEVELOPER' | 'USER';
  name?: string;
  createDate: string;
  updateDate: string;
}

export interface CircleEntity {
  id: string;                    // ent_xxxxx
  type: 'INDIVIDUAL' | 'BUSINESS';
  createDate: string;
}

export interface CreateWalletParams {
  walletSetId: string;
  blockchain: 'BASE' | 'ETH' | 'POLYGON' | 'AVAX' | 'SOL';
  name?: string;
  refId?: string;                // PayOS account ID
  idempotencyKey?: string;
}

export interface CreateWalletSetParams {
  name?: string;
  idempotencyKey?: string;
}

export interface CircleBalance {
  amount: string;
  currency: string;
}

// ============================================
// Mock Database (in-memory for now)
// ============================================

const mockWallets = new Map<string, CircleWallet>();
const mockWalletSets = new Map<string, CircleWalletSet>();
const mockEntities = new Map<string, CircleEntity>();

// ============================================
// Mock USDC Contract Addresses
// ============================================

export const USDC_CONTRACTS: Record<string, string> = {
  'BASE': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  'ETH': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  'POLYGON': '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  'AVAX': '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
  'SOL': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
};

export const EURC_CONTRACTS: Record<string, string> = {
  'BASE': '0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42',
  'ETH': '0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c'
};

// ============================================
// Mock Implementation
// ============================================

export class CircleMockService {
  private entityId: string;
  private defaultWalletSetId: string;

  constructor(tenantId: string) {
    // Create default entity and wallet set for tenant
    this.entityId = this.getOrCreateEntity(tenantId);
    this.defaultWalletSetId = this.getOrCreateWalletSet(tenantId);
  }

  /**
   * Get or create entity for tenant
   */
  private getOrCreateEntity(tenantId: string): string {
    const entityKey = `ent_${tenantId.substring(0, 8)}`;
    
    if (!mockEntities.has(entityKey)) {
      mockEntities.set(entityKey, {
        id: entityKey,
        type: 'BUSINESS',
        createDate: new Date().toISOString()
      });
    }
    
    return entityKey;
  }

  /**
   * Get or create default wallet set for tenant
   */
  private getOrCreateWalletSet(tenantId: string): string {
    const setKey = `ws_${tenantId.substring(0, 8)}`;
    
    if (!mockWalletSets.has(setKey)) {
      mockWalletSets.set(setKey, {
        id: setKey,
        custodyType: 'DEVELOPER',
        name: 'PayOS Wallets',
        createDate: new Date().toISOString(),
        updateDate: new Date().toISOString()
      });
    }
    
    return setKey;
  }

  /**
   * Generate mock wallet address
   */
  private generateAddress(blockchain: string): string {
    if (blockchain === 'SOL') {
      // Solana addresses are base58 encoded
      return `${randomUUID().replace(/-/g, '').substring(0, 32)}`;
    }
    // EVM addresses
    return `0x${randomUUID().replace(/-/g, '').substring(0, 40)}`;
  }

  /**
   * Create a new wallet (mocked)
   */
  async createWallet(params: CreateWalletParams): Promise<CircleWallet> {
    const walletId = `wa_${randomUUID().substring(0, 8)}`;
    const address = this.generateAddress(params.blockchain);
    
    const wallet: CircleWallet = {
      id: walletId,
      address: address,
      blockchain: params.blockchain,
      state: 'LIVE',
      walletSetId: params.walletSetId || this.defaultWalletSetId,
      accountType: 'SCA',
      custodyType: 'DEVELOPER',
      name: params.name,
      refId: params.refId,
      createDate: new Date().toISOString(),
      updateDate: new Date().toISOString()
    };
    
    mockWallets.set(walletId, wallet);
    
    console.log(`[Circle Mock] Created wallet: ${walletId} on ${params.blockchain}`);
    
    return wallet;
  }

  /**
   * Get wallet by ID (mocked)
   */
  async getWallet(walletId: string): Promise<CircleWallet | null> {
    return mockWallets.get(walletId) || null;
  }

  /**
   * Get wallet balance (mocked)
   */
  async getBalance(walletId: string, currency: 'USDC' | 'EURC' = 'USDC'): Promise<CircleBalance> {
    // In mock mode, we don't track real balances
    // The balance is managed in PayOS wallets table
    return {
      amount: '0',
      currency: currency
    };
  }

  /**
   * Create wallet set (mocked)
   */
  async createWalletSet(params: CreateWalletSetParams): Promise<CircleWalletSet> {
    const setId = `ws_${randomUUID().substring(0, 8)}`;
    
    const walletSet: CircleWalletSet = {
      id: setId,
      custodyType: 'DEVELOPER',
      name: params.name,
      createDate: new Date().toISOString(),
      updateDate: new Date().toISOString()
    };
    
    mockWalletSets.set(setId, walletSet);
    
    console.log(`[Circle Mock] Created wallet set: ${setId}`);
    
    return walletSet;
  }

  /**
   * Get entity ID
   */
  getEntityId(): string {
    return this.entityId;
  }

  /**
   * Get default wallet set ID
   */
  getDefaultWalletSetId(): string {
    return this.defaultWalletSetId;
  }

  /**
   * Verify external wallet ownership (mock)
   * In real implementation, this would verify EIP-712 signature
   */
  async verifyWalletOwnership(
    walletAddress: string,
    signature: string,
    message: string
  ): Promise<{ verified: boolean; recoveredAddress?: string }> {
    // Mock: Just check signature is not empty
    // Real: Use ethers.js or viem to recover address from signature
    if (!signature || signature.length < 10) {
      return { verified: false };
    }
    
    console.log(`[Circle Mock] Verified wallet ownership: ${walletAddress}`);
    
    return {
      verified: true,
      recoveredAddress: walletAddress
    };
  }
}

// ============================================
// Factory
// ============================================

const serviceInstances = new Map<string, CircleMockService>();

export function getCircleService(tenantId: string): CircleMockService {
  if (!serviceInstances.has(tenantId)) {
    serviceInstances.set(tenantId, new CircleMockService(tenantId));
  }
  return serviceInstances.get(tenantId)!;
}

// ============================================
// Note for Phase 2 Integration
// ============================================

/*
To integrate with real Circle API:

1. Install Circle SDK:
   npm install @circle-fin/w3s-pw-web-sdk

2. Replace this mock service with:

import { initiateDeveloperControlledWalletsClient } from '@circle-fin/w3s-pw-web-sdk';

const client = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY,
  entitySecretCipherText: process.env.CIRCLE_ENTITY_SECRET
});

// Create wallet
const response = await client.createWallets({
  idempotencyKey: uuid(),
  walletSetId: 'your-wallet-set-id',
  blockchains: ['ETH-GOERLI'], // or 'ETH', 'MATIC', etc.
  count: 1,
  metadata: [
    { name: 'PayOS Account', refId: accountId }
  ]
});

3. Circle Sandbox:
   - Use ETH-GOERLI, MATIC-MUMBAI for testing
   - Get test USDC from https://faucet.circle.com/

4. Circle Production:
   - Apply for production access
   - Use ETH, MATIC, BASE, etc.
   - Real USDC deposits/withdrawals
*/

