/**
 * Treasury Worker
 * Story 27.7: Liquidity & Float Management Dashboard
 *
 * Background worker for:
 * - Periodic balance syncing from external rails
 * - Hourly/daily balance snapshots
 * - Alert generation
 * - Recommendation generation
 */

import { createClient, SupabaseClient } from '../db/client.js';
import { TreasuryService } from '../services/treasury.js';
import { logAudit } from '../utils/helpers.js';

// Configuration
const SYNC_INTERVAL_MS = 15 * 60 * 1000; // Sync balances every 15 minutes
const SNAPSHOT_INTERVAL_MS = 60 * 60 * 1000; // Take snapshots every hour
const ALERT_CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check alerts every 5 minutes

export class TreasuryWorker {
  private isRunning = false;
  private syncTimer?: NodeJS.Timeout;
  private snapshotTimer?: NodeJS.Timeout;
  private alertTimer?: NodeJS.Timeout;
  private supabase: SupabaseClient;
  private treasuryService: TreasuryService;
  private lastDailySnapshot?: string; // Track daily snapshot date

  constructor() {
    this.supabase = createClient();
    this.treasuryService = new TreasuryService();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('[TreasuryWorker] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[TreasuryWorker] Starting treasury worker');
    console.log(`[TreasuryWorker] Balance sync interval: ${SYNC_INTERVAL_MS / (1000 * 60)}min`);
    console.log(`[TreasuryWorker] Snapshot interval: ${SNAPSHOT_INTERVAL_MS / (1000 * 60)}min`);
    console.log(`[TreasuryWorker] Alert check interval: ${ALERT_CHECK_INTERVAL_MS / (1000 * 60)}min`);

    // Start the loops
    this.syncLoop();
    this.snapshotLoop();
    this.alertLoop();
  }

  private async syncLoop(): Promise<void> {
    if (!this.isRunning) return;

    console.log('[TreasuryWorker] Starting balance sync...');
    const startTime = Date.now();

    try {
      // Get all active tenant IDs
      const tenantIds = await this.getAllTenantIds();

      let totalSynced = 0;
      const allErrors: string[] = [];

      for (const tenantId of tenantIds) {
        try {
          const result = await this.treasuryService.syncBalances(tenantId);
          totalSynced += result.synced;
          allErrors.push(...result.errors);
        } catch (err) {
          console.error(`[TreasuryWorker] Failed to sync tenant ${tenantId}:`, err);
        }
      }

      console.log(`[TreasuryWorker] Sync completed: ${totalSynced} accounts across ${tenantIds.length} tenants`);

      if (allErrors.length > 0) {
        console.warn(`[TreasuryWorker] Sync errors:`, allErrors);
      }
    } catch (error) {
      console.error('[TreasuryWorker] Fatal error during sync:', error);
    } finally {
      const endTime = Date.now();
      console.log(`[TreasuryWorker] Sync loop completed in ${endTime - startTime}ms`);
      this.syncTimer = setTimeout(() => this.syncLoop(), SYNC_INTERVAL_MS);
    }
  }

  private async snapshotLoop(): Promise<void> {
    if (!this.isRunning) return;

    console.log('[TreasuryWorker] Starting snapshot cycle...');
    const startTime = Date.now();
    const today = new Date().toISOString().split('T')[0];

    try {
      const tenantIds = await this.getAllTenantIds();
      let totalSnapshots = 0;

      // Determine snapshot type
      const snapshotType = this.lastDailySnapshot !== today ? 'daily' : 'hourly';

      if (snapshotType === 'daily') {
        this.lastDailySnapshot = today;
        console.log('[TreasuryWorker] Taking daily snapshot');
      }

      for (const tenantId of tenantIds) {
        try {
          const count = await this.treasuryService.takeSnapshot(tenantId, snapshotType);
          totalSnapshots += count;
        } catch (err) {
          console.error(`[TreasuryWorker] Failed to snapshot tenant ${tenantId}:`, err);
        }
      }

      console.log(`[TreasuryWorker] Snapshot completed: ${totalSnapshots} snapshots (${snapshotType})`);

      await logAudit(this.supabase, {
        tenantId: null,
        actorType: 'system',
        actorId: null,
        actorName: 'TreasuryWorker',
        action: 'treasury.snapshot.batch',
        entityType: 'treasury_balance_history',
        entityId: null,
        description: `Created ${totalSnapshots} ${snapshotType} snapshots`,
        metadata: { totalSnapshots, snapshotType, tenantCount: tenantIds.length },
      });
    } catch (error) {
      console.error('[TreasuryWorker] Fatal error during snapshot:', error);
    } finally {
      const endTime = Date.now();
      console.log(`[TreasuryWorker] Snapshot loop completed in ${endTime - startTime}ms`);
      this.snapshotTimer = setTimeout(() => this.snapshotLoop(), SNAPSHOT_INTERVAL_MS);
    }
  }

  private async alertLoop(): Promise<void> {
    if (!this.isRunning) return;

    console.log('[TreasuryWorker] Starting alert check...');
    const startTime = Date.now();

    try {
      const tenantIds = await this.getAllTenantIds();
      let totalAlerts = 0;
      let criticalAlerts = 0;

      for (const tenantId of tenantIds) {
        try {
          const alerts = await this.treasuryService.checkAndGenerateAlerts(tenantId);
          totalAlerts += alerts.length;
          criticalAlerts += alerts.filter((a) => a.severity === 'critical').length;
        } catch (err) {
          console.error(`[TreasuryWorker] Failed to check alerts for tenant ${tenantId}:`, err);
        }
      }

      if (totalAlerts > 0) {
        console.log(`[TreasuryWorker] Alert check completed: ${totalAlerts} alerts (${criticalAlerts} critical)`);
      }
    } catch (error) {
      console.error('[TreasuryWorker] Fatal error during alert check:', error);
    } finally {
      const endTime = Date.now();
      console.log(`[TreasuryWorker] Alert loop completed in ${endTime - startTime}ms`);
      this.alertTimer = setTimeout(() => this.alertLoop(), ALERT_CHECK_INTERVAL_MS);
    }
  }

  private async getAllTenantIds(): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('tenants')
      .select('id')
      .eq('status', 'active');

    if (error) {
      console.error('[TreasuryWorker] Failed to get tenant IDs:', error);
      return [];
    }

    return (data || []).map((t) => t.id);
  }

  stop(): void {
    console.log('[TreasuryWorker] Stopping treasury worker');
    this.isRunning = false;

    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }
    if (this.snapshotTimer) {
      clearTimeout(this.snapshotTimer);
    }
    if (this.alertTimer) {
      clearTimeout(this.alertTimer);
    }
  }
}

