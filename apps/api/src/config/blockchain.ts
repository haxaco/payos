/**
 * Blockchain Configuration
 * Story 40.7: Base Sepolia Wallet Setup & Funding
 * 
 * Configuration for blockchain integrations:
 * - Base Sepolia (testnet) for development/sandbox
 * - Base Mainnet for production
 * - EVM wallet management
 * - USDC contract addresses
 */

import { createPublicClient, createWalletClient, http, formatEther, parseEther, type WalletClient, type Transport, type Chain, type Account } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia, base } from 'viem/chains';
import { getEnvironment, getServiceConfig } from './environment.js';

// ============================================
// Types
// ============================================

export interface BlockchainConfig {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  blockExplorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  contracts: {
    usdc: string;
    eurc?: string;
  };
  faucets?: {
    eth: string;
    usdc: string;
  };
}

export interface WalletInfo {
  address: string;
  chainId: number;
  balanceEth: string;
  balanceUsdc: string;
}

// ============================================
// Chain Configurations
// ============================================

export const CHAIN_CONFIGS: Record<'base-sepolia' | 'base-mainnet', BlockchainConfig> = {
  'base-sepolia': {
    chainId: 84532,
    chainName: 'Base Sepolia',
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
    blockExplorerUrl: 'https://sepolia.basescan.org',
    nativeCurrency: {
      name: 'Sepolia ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    contracts: {
      // Official USDC on Base Sepolia
      usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    },
    faucets: {
      eth: 'https://www.alchemy.com/faucets/base-sepolia',
      usdc: 'https://faucet.circle.com/',
    },
  },
  'base-mainnet': {
    chainId: 8453,
    chainName: 'Base',
    rpcUrl: process.env.BASE_MAINNET_RPC_URL || 'https://mainnet.base.org',
    blockExplorerUrl: 'https://basescan.org',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    contracts: {
      usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      eurc: '0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42',
    },
  },
};

// ============================================
// Default Configuration
// ============================================

/**
 * Get the current chain based on environment
 */
export function getCurrentChain(): 'base-sepolia' | 'base-mainnet' {
  const env = getEnvironment();
  return env === 'production' ? 'base-mainnet' : 'base-sepolia';
}

/**
 * Get chain configuration for current environment
 */
export function getChainConfig(): BlockchainConfig {
  return CHAIN_CONFIGS[getCurrentChain()];
}

/**
 * Get the RPC URL for current environment
 */
export function getRpcUrl(): string {
  // Environment variable override always takes precedence
  if (process.env.BASE_SEPOLIA_RPC_URL) {
    return process.env.BASE_SEPOLIA_RPC_URL;
  }
  
  const env = getEnvironment();
  if (env === 'mock') {
    // In mock mode, still use real RPC for reading (no writes)
    // This allows balance checking etc. without running local node
    return 'https://sepolia.base.org';
  }
  return getChainConfig().rpcUrl;
}

// ============================================
// Viem Clients
// ============================================

/**
 * Get a public client for reading blockchain state
 */
export function getPublicClient() {
  const chain = getCurrentChain() === 'base-mainnet' ? base : baseSepolia;
  const rpcUrl = getRpcUrl();

  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
}

/**
 * Get a wallet client for signing transactions
 * Requires EVM_PRIVATE_KEY environment variable
 */
export function getWalletClient(): WalletClient<Transport, Chain, Account> {
  const privateKey = process.env.EVM_PRIVATE_KEY;
  
  if (!privateKey) {
    throw new Error(
      'EVM_PRIVATE_KEY environment variable is required. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  // Ensure key has 0x prefix
  const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  const account = privateKeyToAccount(formattedKey as `0x${string}`);
  const chain = getCurrentChain() === 'base-mainnet' ? base : baseSepolia;
  const rpcUrl = getRpcUrl();

  return createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });
}

/**
 * Get the wallet address from environment
 */
export function getWalletAddress(): string {
  const privateKey = process.env.EVM_PRIVATE_KEY;
  
  if (!privateKey) {
    throw new Error('EVM_PRIVATE_KEY environment variable is required');
  }

  const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  const account = privateKeyToAccount(formattedKey as `0x${string}`);
  return account.address;
}

// ============================================
// Balance Checking
// ============================================

/**
 * Get ETH balance for an address
 */
export async function getEthBalance(address: string): Promise<string> {
  const client = getPublicClient();
  const balance = await client.getBalance({ address: address as `0x${string}` });
  return formatEther(balance);
}

/**
 * Get USDC balance for an address
 */
export async function getUsdcBalance(address: string): Promise<string> {
  const client = getPublicClient();
  const config = getChainConfig();
  
  // ERC20 balanceOf ABI
  const balance = await client.readContract({
    address: config.contracts.usdc as `0x${string}`,
    abi: [
      {
        name: 'balanceOf',
        type: 'function',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: 'balance', type: 'uint256' }],
        stateMutability: 'view',
      },
    ],
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
  });
  
  // USDC has 6 decimals
  return (Number(balance) / 1e6).toFixed(6);
}

/**
 * Get complete wallet info
 */
export async function getWalletInfo(address?: string): Promise<WalletInfo> {
  const walletAddress = address || getWalletAddress();
  const config = getChainConfig();
  
  const [ethBalance, usdcBalance] = await Promise.all([
    getEthBalance(walletAddress),
    getUsdcBalance(walletAddress),
  ]);
  
  return {
    address: walletAddress,
    chainId: config.chainId,
    balanceEth: ethBalance,
    balanceUsdc: usdcBalance,
  };
}

// ============================================
// Health Check
// ============================================

/**
 * Check blockchain connectivity and wallet status
 */
export async function blockchainHealthCheck(): Promise<{
  healthy: boolean;
  chain: string;
  rpcUrl: string;
  walletAddress?: string;
  blockNumber?: bigint;
  balances?: {
    eth: string;
    usdc: string;
  };
  error?: string;
}> {
  try {
    const config = getChainConfig();
    const client = getPublicClient();
    
    // Check RPC connectivity
    const blockNumber = await client.getBlockNumber();
    
    // Check wallet if configured
    let walletAddress: string | undefined;
    let balances: { eth: string; usdc: string } | undefined;
    
    try {
      walletAddress = getWalletAddress();
      const info = await getWalletInfo(walletAddress);
      balances = {
        eth: info.balanceEth,
        usdc: info.balanceUsdc,
      };
    } catch {
      // Wallet not configured - still healthy
    }
    
    return {
      healthy: true,
      chain: config.chainName,
      rpcUrl: config.rpcUrl,
      walletAddress,
      blockNumber,
      balances,
    };
  } catch (error: any) {
    return {
      healthy: false,
      chain: getChainConfig().chainName,
      rpcUrl: getRpcUrl(),
      error: error.message,
    };
  }
}

// ============================================
// USDC Transfer
// ============================================

/**
 * Transfer USDC to an address
 */
export async function transferUsdc(
  toAddress: string,
  amount: string // Human-readable amount (e.g., "10.50")
): Promise<{
  txHash: string;
  from: string;
  to: string;
  amount: string;
  blockExplorerUrl: string;
}> {
  const config = getChainConfig();
  const walletClient = getWalletClient();
  const publicClient = getPublicClient();
  
  // Convert to USDC units (6 decimals)
  const amountUnits = BigInt(Math.round(parseFloat(amount) * 1e6));
  
  // ERC20 transfer ABI
  const txHash = await walletClient.writeContract({
    address: config.contracts.usdc as `0x${string}`,
    abi: [
      {
        name: 'transfer',
        type: 'function',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: 'success', type: 'bool' }],
        stateMutability: 'nonpayable',
      },
    ],
    functionName: 'transfer',
    args: [toAddress as `0x${string}`, amountUnits],
  });
  
  // Wait for confirmation
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  
  return {
    txHash,
    from: walletClient.account.address,
    to: toAddress,
    amount,
    blockExplorerUrl: `${config.blockExplorerUrl}/tx/${txHash}`,
  };
}

// ============================================
// Logging
// ============================================

/**
 * Log blockchain configuration at startup
 */
export function logBlockchainConfig(): void {
  const env = getEnvironment();
  const config = getChainConfig();
  
  console.log('');
  console.log('🔗 Blockchain Configuration:');
  console.log(`   Chain: ${config.chainName} (${config.chainId})`);
  console.log(`   RPC: ${config.rpcUrl}`);
  console.log(`   Explorer: ${config.blockExplorerUrl}`);
  console.log(`   USDC Contract: ${config.contracts.usdc}`);
  
  if (env !== 'production') {
    try {
      const address = getWalletAddress();
      console.log(`   Wallet: ${address}`);
    } catch {
      console.log(`   Wallet: Not configured (set EVM_PRIVATE_KEY)`);
    }
    
    if (config.faucets) {
      console.log('   Faucets:');
      console.log(`     ETH: ${config.faucets.eth}`);
      console.log(`     USDC: ${config.faucets.usdc}`);
    }
  }
  console.log('');
}

// Export chain definitions for direct use
export { baseSepolia, base } from 'viem/chains';

