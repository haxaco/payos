/**
 * Reconciliation Service - Epic 27, Story 27.3
 * 
 * Core reconciliation logic that compares PayOS ledger records
 * with external rail settlements to detect discrepancies.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  RailId,
  RailTransaction,
  ReconciliationDiscrepancy,
  ReconciliationReport,
  DiscrepancyType,
  DiscrepancySeverity,
  getAdapter,
  getAllAdapters,
} from './rail-adapters/index.js';

export interface ReconciliationConfig {
  amountTolerancePercent: number;
  amountToleranceFixed: number;
  timingToleranceMinutes: number;
  autoResolveEnabled: boolean;
  autoResolveMaxAmount: number;
}

export interface RunReconciliationRequest {
  tenantId?: string; // NULL for all tenants
  rail: RailId;
  periodStart: Date;
  periodEnd: Date;
  reportType?: 'scheduled' | 'manual' | 'triggered';
}

export interface ReconciliationResult {
  report: ReconciliationReport;
  discrepancies: ReconciliationDiscrepancy[];
}

const DEFAULT_CONFIG: ReconciliationConfig = {
  amountTolerancePercent: 0.01, // 0.01%
  amountToleranceFixed: 0.01, // $0.01
  timingToleranceMinutes: 60, // 1 hour
  autoResolveEnabled: false,
  autoResolveMaxAmount: 1.00,
};

export class ReconciliationService {
  private supabase: SupabaseClient;
  
  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }
  
  /**
   * Run reconciliation for a specific rail and time period
   */
  async runReconciliation(request: RunReconciliationRequest): Promise<ReconciliationResult> {
    const startTime = Date.now();
    
    // Get config
    const config = await this.getConfig(request.tenantId, request.rail);
    
    // Create report record
    const { data: report, error: reportError } = await this.supabase
      .from('reconciliation_reports')
      .insert({
        tenant_id: request.tenantId || null,
        rail: request.rail,
        period_start: request.periodStart.toISOString(),
        period_end: request.periodEnd.toISOString(),
        report_type: request.reportType || 'manual',
        status: 'running',
      })
      .select()
      .single();
    
    if (reportError || !report) {
      throw new Error(`Failed to create reconciliation report: ${reportError?.message}`);
    }
    
    try {
      // Get our ledger records
      const ledgerRecords = await this.getLedgerRecords(
        request.tenantId,
        request.rail,
        request.periodStart,
        request.periodEnd
      );
      
      // Get external rail records
      const adapter = getAdapter(request.rail);
      const railResponse = await adapter.getTransactions({
        startDate: request.periodStart.toISOString(),
        endDate: request.periodEnd.toISOString(),
      });
      
      // Run matching algorithm
      const { matched, discrepancies } = await this.matchRecords(
        ledgerRecords,
        railResponse.transactions,
        config,
        request.rail
      );
      
      // Calculate summary
      const totalExpected = ledgerRecords.reduce((sum, r) => sum + r.expected_amount, 0);
      const totalActual = railResponse.transactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);
      
      // Group discrepancies
      const discrepanciesByType: Record<string, number> = {};
      const discrepanciesBySeverity: Record<string, number> = {};
      
      for (const d of discrepancies) {
        discrepanciesByType[d.type] = (discrepanciesByType[d.type] || 0) + 1;
        discrepanciesBySeverity[d.severity] = (discrepanciesBySeverity[d.severity] || 0) + 1;
      }
      
      // Save discrepancies
      const savedDiscrepancies: ReconciliationDiscrepancy[] = [];
      console.log(`[Reconciliation] Saving ${discrepancies.length} discrepancies...`);
      
      // Batch insert all discrepancies
      if (discrepancies.length > 0) {
        // UUID regex for validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        
        const discrepancyInserts = discrepancies.map(d => ({
          tenant_id: request.tenantId || null,
          report_id: report.id,
          settlement_record_id: d.settlementRecordId || null,
          // Only include transfer_id if it's a valid UUID
          transfer_id: d.transferId && uuidRegex.test(d.transferId) ? d.transferId : null,
          external_id: d.externalId || null,
          rail: request.rail,
          type: d.type,
          severity: d.severity,
          expected_amount: d.expectedAmount || null,
          actual_amount: d.actualAmount || null,
          expected_status: d.expectedStatus || null,
          actual_status: d.actualStatus || null,
          description: d.description,
          // Store non-UUID transferId in metadata for reference
          metadata: {
            ...(d.metadata || {}),
            originalTransferId: d.transferId,
          },
        }));
        
        const { data: savedData, error: saveError } = await this.supabase
          .from('reconciliation_discrepancies')
          .insert(discrepancyInserts)
          .select();
        
        if (saveError) {
          console.error('[Reconciliation] Failed to save discrepancies:', saveError.message);
        }
        if (savedData) {
          for (const saved of savedData) {
            savedDiscrepancies.push(this.mapDiscrepancy(saved));
          }
        }
      }
      
      console.log(`[Reconciliation] Saved ${savedDiscrepancies.length} discrepancies`);
      
      // Update report with results
      const duration = Date.now() - startTime;
      const { data: updatedReport, error: updateError } = await this.supabase
        .from('reconciliation_reports')
        .update({
          status: 'completed',
          total_transactions: ledgerRecords.length,
          matched_transactions: matched.length,
          discrepancy_count: discrepancies.length,
          total_expected_amount: totalExpected,
          total_actual_amount: totalActual,
          amount_difference: Math.abs(totalExpected - totalActual),
          discrepancies_by_type: discrepanciesByType,
          discrepancies_by_severity: discrepanciesBySeverity,
          completed_at: new Date().toISOString(),
          duration_ms: duration,
          results: {
            matchedCount: matched.length,
            unmatchedLedger: ledgerRecords.length - matched.length,
            railTransactionCount: railResponse.transactions.length,
          },
        })
        .eq('id', report.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('Failed to update reconciliation report:', updateError);
      }
      
      // Update matched settlement records
      for (const m of matched) {
        await this.supabase
          .from('settlement_records')
          .update({
            reconciled_at: new Date().toISOString(),
            reconciliation_status: 'matched',
            actual_amount: m.railTransaction?.amount,
          })
          .eq('id', m.ledgerRecord.id);
      }
      
      return {
        report: this.mapReport(updatedReport || report),
        discrepancies: savedDiscrepancies,
      };
      
    } catch (error: any) {
      // Update report as failed
      await this.supabase
        .from('reconciliation_reports')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
        })
        .eq('id', report.id);
      
      throw error;
    }
  }
  
  /**
   * Get reconciliation reports
   */
  async getReports(options: {
    tenantId?: string;
    rail?: RailId;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: ReconciliationReport[]; total: number }> {
    let query = this.supabase
      .from('reconciliation_reports')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });
    
    if (options.tenantId) {
      query = query.eq('tenant_id', options.tenantId);
    }
    if (options.rail) {
      query = query.eq('rail', options.rail);
    }
    if (options.status) {
      query = query.eq('status', options.status);
    }
    
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    query = query.range(offset, offset + limit - 1);
    
    const { data, count, error } = await query;
    
    if (error) {
      throw new Error(`Failed to get reconciliation reports: ${error.message}`);
    }
    
    return {
      data: (data || []).map(this.mapReport),
      total: count || 0,
    };
  }
  
  /**
   * Get discrepancies
   */
  async getDiscrepancies(options: {
    tenantId?: string;
    reportId?: string;
    rail?: RailId;
    status?: string;
    severity?: DiscrepancySeverity;
    limit?: number;
    offset?: number;
  }): Promise<{ data: ReconciliationDiscrepancy[]; total: number }> {
    let query = this.supabase
      .from('reconciliation_discrepancies')
      .select('*', { count: 'exact' })
      .order('detected_at', { ascending: false });
    
    if (options.tenantId) {
      query = query.eq('tenant_id', options.tenantId);
    }
    if (options.reportId) {
      query = query.eq('report_id', options.reportId);
    }
    if (options.rail) {
      query = query.eq('rail', options.rail);
    }
    if (options.status) {
      query = query.eq('status', options.status);
    }
    if (options.severity) {
      query = query.eq('severity', options.severity);
    }
    
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    query = query.range(offset, offset + limit - 1);
    
    const { data, count, error } = await query;
    
    if (error) {
      throw new Error(`Failed to get discrepancies: ${error.message}`);
    }
    
    return {
      data: (data || []).map(this.mapDiscrepancy),
      total: count || 0,
    };
  }
  
  /**
   * Resolve a discrepancy
   */
  async resolveDiscrepancy(
    discrepancyId: string,
    resolution: string,
    resolvedBy: string,
    notes?: string
  ): Promise<ReconciliationDiscrepancy> {
    const { data, error } = await this.supabase
      .from('reconciliation_discrepancies')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy,
        resolution,
        resolution_notes: notes,
      })
      .eq('id', discrepancyId)
      .select()
      .single();
    
    if (error || !data) {
      throw new Error(`Failed to resolve discrepancy: ${error?.message}`);
    }
    
    return this.mapDiscrepancy(data);
  }
  
  /**
   * Get rail health status for all adapters
   */
  async getRailHealth(): Promise<Record<RailId, { healthy: boolean; message?: string; isSandbox: boolean }>> {
    const adapters = getAllAdapters();
    const health: Record<string, { healthy: boolean; message?: string; isSandbox: boolean }> = {};
    
    for (const adapter of adapters) {
      try {
        const result = await adapter.healthCheck();
        health[adapter.railId] = {
          ...result,
          isSandbox: adapter.isSandbox,
        };
      } catch (error: any) {
        health[adapter.railId] = {
          healthy: false,
          message: error.message,
          isSandbox: adapter.isSandbox,
        };
      }
    }
    
    return health as Record<RailId, { healthy: boolean; message?: string; isSandbox: boolean }>;
  }
  
  /**
   * Get settlement summary by rail
   */
  async getSettlementSummary(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    byRail: Record<string, {
      totalCount: number;
      completedCount: number;
      failedCount: number;
      pendingCount: number;
      totalAmount: number;
      completedAmount: number;
    }>;
    totals: {
      totalCount: number;
      completedCount: number;
      failedCount: number;
      totalAmount: number;
    };
  }> {
    const { data, error } = await this.supabase
      .from('settlement_records')
      .select('rail, status, expected_amount')
      .eq('tenant_id', tenantId)
      .gte('submitted_at', startDate.toISOString())
      .lte('submitted_at', endDate.toISOString());
    
    if (error) {
      throw new Error(`Failed to get settlement summary: ${error.message}`);
    }
    
    const byRail: Record<string, any> = {};
    const totals = {
      totalCount: 0,
      completedCount: 0,
      failedCount: 0,
      totalAmount: 0,
    };
    
    for (const record of data || []) {
      if (!byRail[record.rail]) {
        byRail[record.rail] = {
          totalCount: 0,
          completedCount: 0,
          failedCount: 0,
          pendingCount: 0,
          totalAmount: 0,
          completedAmount: 0,
        };
      }
      
      const railStats = byRail[record.rail];
      railStats.totalCount++;
      railStats.totalAmount += parseFloat(record.expected_amount);
      totals.totalCount++;
      totals.totalAmount += parseFloat(record.expected_amount);
      
      if (record.status === 'completed') {
        railStats.completedCount++;
        railStats.completedAmount += parseFloat(record.expected_amount);
        totals.completedCount++;
      } else if (record.status === 'failed') {
        railStats.failedCount++;
        totals.failedCount++;
      } else {
        railStats.pendingCount++;
      }
    }
    
    return { byRail, totals };
  }
  
  // ============================================
  // Private Methods
  // ============================================
  
  private async getConfig(tenantId: string | undefined, rail: RailId): Promise<ReconciliationConfig> {
    // Try tenant + rail specific config
    let { data: config } = await this.supabase
      .from('reconciliation_config')
      .select('*')
      .eq('tenant_id', tenantId || null)
      .eq('rail', rail)
      .single();
    
    // Fall back to tenant config
    if (!config && tenantId) {
      const { data } = await this.supabase
        .from('reconciliation_config')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('rail', null)
        .single();
      config = data;
    }
    
    // Fall back to global config
    if (!config) {
      const { data } = await this.supabase
        .from('reconciliation_config')
        .select('*')
        .is('tenant_id', null)
        .is('rail', null)
        .single();
      config = data;
    }
    
    if (!config) {
      return DEFAULT_CONFIG;
    }
    
    return {
      amountTolerancePercent: parseFloat(config.amount_tolerance_percent) || DEFAULT_CONFIG.amountTolerancePercent,
      amountToleranceFixed: parseFloat(config.amount_tolerance_fixed) || DEFAULT_CONFIG.amountToleranceFixed,
      timingToleranceMinutes: config.timing_tolerance_minutes || DEFAULT_CONFIG.timingToleranceMinutes,
      autoResolveEnabled: config.auto_resolve_enabled || DEFAULT_CONFIG.autoResolveEnabled,
      autoResolveMaxAmount: parseFloat(config.auto_resolve_max_amount) || DEFAULT_CONFIG.autoResolveMaxAmount,
    };
  }
  
  private async getLedgerRecords(
    tenantId: string | undefined,
    rail: RailId,
    periodStart: Date,
    periodEnd: Date
  ): Promise<any[]> {
    let query = this.supabase
      .from('settlement_records')
      .select('*')
      .eq('rail', rail)
      .gte('submitted_at', periodStart.toISOString())
      .lte('submitted_at', periodEnd.toISOString());
    
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to get ledger records: ${error.message}`);
    }
    
    return data || [];
  }
  
  private async matchRecords(
    ledgerRecords: any[],
    railTransactions: RailTransaction[],
    config: ReconciliationConfig,
    rail: RailId
  ): Promise<{
    matched: Array<{ ledgerRecord: any; railTransaction: RailTransaction | null }>;
    discrepancies: Array<{
      type: DiscrepancyType;
      severity: DiscrepancySeverity;
      settlementRecordId?: string;
      transferId?: string;
      externalId?: string;
      expectedAmount?: number;
      actualAmount?: number;
      expectedStatus?: string;
      actualStatus?: string;
      description: string;
      metadata?: Record<string, any>;
    }>;
  }> {
    const matched: Array<{ ledgerRecord: any; railTransaction: RailTransaction | null }> = [];
    const discrepancies: Array<any> = [];
    
    // Index rail transactions by external ID and transfer ID
    const railByExternalId = new Map<string, RailTransaction>();
    const railByTransferId = new Map<string, RailTransaction>();
    
    for (const tx of railTransactions) {
      railByExternalId.set(tx.externalId, tx);
      if (tx.transferId) {
        railByTransferId.set(tx.transferId, tx);
      }
    }
    
    // Track which rail transactions have been matched
    const matchedRailIds = new Set<string>();
    
    // Match ledger records
    for (const ledger of ledgerRecords) {
      let railTx: RailTransaction | undefined;
      
      // Try matching by external ID first
      if (ledger.external_id) {
        railTx = railByExternalId.get(ledger.external_id);
      }
      
      // Fall back to transfer ID
      if (!railTx && ledger.transfer_id) {
        railTx = railByTransferId.get(ledger.transfer_id);
      }
      
      if (railTx) {
        matchedRailIds.add(railTx.externalId);
        
        // Check for amount mismatch
        const expectedAmount = parseFloat(ledger.expected_amount);
        const actualAmount = railTx.amount;
        const amountDiff = Math.abs(expectedAmount - actualAmount);
        const toleranceAmount = Math.max(
          config.amountToleranceFixed,
          expectedAmount * (config.amountTolerancePercent / 100)
        );
        
        if (amountDiff > toleranceAmount) {
          discrepancies.push({
            type: 'amount_mismatch' as DiscrepancyType,
            severity: this.calculateSeverity(amountDiff, expectedAmount),
            settlementRecordId: ledger.id,
            transferId: ledger.transfer_id,
            externalId: railTx.externalId,
            expectedAmount,
            actualAmount,
            description: `Amount mismatch: expected ${expectedAmount}, got ${actualAmount} (diff: ${amountDiff.toFixed(4)})`,
            metadata: { toleranceAmount, percentDiff: (amountDiff / expectedAmount * 100).toFixed(4) },
          });
        }
        
        // Check for status mismatch
        if (ledger.status !== railTx.status) {
          discrepancies.push({
            type: 'status_mismatch' as DiscrepancyType,
            severity: this.getStatusMismatchSeverity(ledger.status, railTx.status),
            settlementRecordId: ledger.id,
            transferId: ledger.transfer_id,
            externalId: railTx.externalId,
            expectedStatus: ledger.status,
            actualStatus: railTx.status,
            description: `Status mismatch: ledger=${ledger.status}, rail=${railTx.status}`,
          });
        }
        
        matched.push({ ledgerRecord: ledger, railTransaction: railTx });
        
      } else {
        // Missing in rail
        discrepancies.push({
          type: 'missing_in_rail' as DiscrepancyType,
          severity: 'high' as DiscrepancySeverity,
          settlementRecordId: ledger.id,
          transferId: ledger.transfer_id,
          externalId: ledger.external_id,
          expectedAmount: parseFloat(ledger.expected_amount),
          description: `Settlement record ${ledger.id} not found in ${rail} rail data`,
          metadata: { submittedAt: ledger.submitted_at },
        });
        
        matched.push({ ledgerRecord: ledger, railTransaction: null });
      }
    }
    
    // Find rail transactions missing from our ledger
    for (const tx of railTransactions) {
      if (!matchedRailIds.has(tx.externalId)) {
        discrepancies.push({
          type: 'missing_in_ledger' as DiscrepancyType,
          severity: 'critical' as DiscrepancySeverity,
          externalId: tx.externalId,
          transferId: tx.transferId,
          actualAmount: tx.amount,
          actualStatus: tx.status,
          description: `Rail transaction ${tx.externalId} not found in PayOS ledger`,
          metadata: { 
            submittedAt: tx.submittedAt,
            completedAt: tx.completedAt,
            rawResponse: tx.rawResponse,
          },
        });
      }
    }
    
    return { matched, discrepancies };
  }
  
  private calculateSeverity(amountDiff: number, expectedAmount: number): DiscrepancySeverity {
    const percentDiff = (amountDiff / expectedAmount) * 100;
    
    if (percentDiff > 5 || amountDiff > 100) return 'critical';
    if (percentDiff > 1 || amountDiff > 10) return 'high';
    if (percentDiff > 0.1 || amountDiff > 1) return 'medium';
    return 'low';
  }
  
  private getStatusMismatchSeverity(ledgerStatus: string, railStatus: string): DiscrepancySeverity {
    // Completed in ledger but not in rail = critical
    if (ledgerStatus === 'completed' && railStatus !== 'completed') return 'critical';
    // Failed in rail but not in ledger = high
    if (railStatus === 'failed' && ledgerStatus !== 'failed') return 'high';
    // Other mismatches
    return 'medium';
  }
  
  private mapReport(row: any): ReconciliationReport {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      rail: row.rail,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      status: row.status,
      totalTransactions: row.total_transactions || 0,
      matchedTransactions: row.matched_transactions || 0,
      discrepancyCount: row.discrepancy_count || 0,
      totalExpectedAmount: parseFloat(row.total_expected_amount) || 0,
      totalActualAmount: parseFloat(row.total_actual_amount) || 0,
      amountDifference: parseFloat(row.amount_difference) || 0,
      discrepanciesByType: row.discrepancies_by_type || {},
      discrepanciesBySeverity: row.discrepancies_by_severity || {},
      startedAt: row.started_at,
      completedAt: row.completed_at,
      durationMs: row.duration_ms,
      errorMessage: row.error_message,
    };
  }
  
  private mapDiscrepancy(row: any): ReconciliationDiscrepancy {
    return {
      id: row.id,
      rail: row.rail,
      type: row.type,
      severity: row.severity,
      transferId: row.transfer_id,
      externalId: row.external_id,
      expectedAmount: row.expected_amount ? parseFloat(row.expected_amount) : undefined,
      actualAmount: row.actual_amount ? parseFloat(row.actual_amount) : undefined,
      expectedStatus: row.expected_status,
      actualStatus: row.actual_status,
      description: row.description,
      detectedAt: row.detected_at,
      resolvedAt: row.resolved_at,
      resolvedBy: row.resolved_by,
      resolution: row.resolution,
      metadata: row.metadata,
    };
  }
}

export function createReconciliationService(supabase: SupabaseClient): ReconciliationService {
  return new ReconciliationService(supabase);
}

