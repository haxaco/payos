/**
 * Smart Wallet Balance Sync Worker
 *
 * Periodically syncs all smart wallet on-chain USDC balances back to the
 * wallets table. Runs every 5 minutes. Ensures the dashboard's "Available
 * (Ledger)" matches the actual on-chain balance after UserOps.
 */
import { createClient } from '../db/client.js';

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let syncTimer: ReturnType<typeof setInterval> | null = null;

async function syncOnce(): Promise<void> {
  try {
    const supabase = createClient();
    const { syncAllSmartWalletBalances } = await import('../services/x402/smart-account.js');

    // Sync Base Sepolia (testnet)
    const sepolia = await syncAllSmartWalletBalances(supabase, 84532);
    // Sync Base mainnet
    const mainnet = await syncAllSmartWalletBalances(supabase, 8453);

    const total = sepolia.synced + mainnet.synced;
    const failed = sepolia.failed + mainnet.failed;
    if (total > 0 || failed > 0) {
      console.log(`[SmartWalletSync] Synced ${total} wallets (${failed} failed)`);
    }
  } catch (e: any) {
    console.warn(`[SmartWalletSync] Error: ${e.message?.slice(0, 100)}`);
  }
}

export function startSmartWalletSyncWorker(): void {
  if (syncTimer) return; // Already running
  console.log(`[SmartWalletSync] Starting (interval: ${SYNC_INTERVAL_MS / 1000}s)`);

  // Run once immediately on startup
  syncOnce();

  // Then periodically
  syncTimer = setInterval(syncOnce, SYNC_INTERVAL_MS);
}

export function stopSmartWalletSyncWorker(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
    console.log('[SmartWalletSync] Stopped');
  }
}
