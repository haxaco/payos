/**
 * Settlement Windows Service
 * 
 * Story 27.4: Settlement Windows & Cut-off Times
 * 
 * Manages configurable settlement windows and cut-off times:
 * - Per-rail window configuration
 * - Cut-off time enforcement
 * - Transfer queueing outside windows
 * - Holiday calendar support
 * - Emergency settlement overrides
 * 
 * @module services/settlement-windows
 */

import { createClient } from '../db/client.js';

// ============================================
// Types
// ============================================

export type SettlementFrequency = 'realtime' | 'hourly' | '4_per_day' | 'daily' | 'custom';

export type SettlementPriority = 'normal' | 'high' | 'urgent';

export interface SettlementWindowConfig {
  id: string;
  tenantId: string;
  rail: string;
  frequency: SettlementFrequency;
  scheduledTimes: string[]; // HH:MM format
  cutoffHour?: number;
  cutoffMinute?: number;
  timezone: string;
  minBatchAmount: number;
  maxBatchSize: number;
  isActive: boolean;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface QueuedTransfer {
  id: string;
  tenantId: string;
  transferId: string;
  rail: string;
  amount: number;
  currency: string;
  queuedAt: string;
  scheduledFor?: string;
  priority: SettlementPriority;
  status: string;
  settlementBatchId?: string;
  processedAt?: string;
  errorMessage?: string;
  metadata: Record<string, any>;
}

export interface Holiday {
  id: string;
  countryCode: string;
  holidayDate: string;
  name: string;
  description?: string;
  affectedRails: string[];
  isFullDay: boolean;
  closedFrom?: string;
  closedUntil?: string;
  year?: number;
}

export interface SettlementExecution {
  id: string;
  tenantId: string;
  rail: string;
  windowId?: string;
  scheduledAt: string;
  startedAt?: string;
  completedAt?: string;
  status: string;
  transferCount: number;
  totalAmount: number;
  currency?: string;
  successCount: number;
  failedCount: number;
  errorMessage?: string;
  metadata: Record<string, any>;
}

export interface NextWindowInfo {
  rail: string;
  nextWindowAt: string;
  isOpen: boolean;
  currentWindowCloses?: string;
  isHoliday: boolean;
  holidayName?: string;
  queuedCount: number;
  queuedAmount: number;
}

// ============================================
// Constants
// ============================================

const RAIL_COUNTRY_MAP: Record<string, string> = {
  pix: 'BR',
  spei: 'MX',
  wire: 'US',
  circle_usdc: 'US',
  base_chain: 'US',
};

const DEFAULT_WINDOW_CONFIGS: Record<string, Partial<SettlementWindowConfig>> = {
  pix: {
    frequency: 'hourly',
    cutoffHour: 17,
    cutoffMinute: 0,
    timezone: 'America/Sao_Paulo',
  },
  spei: {
    frequency: '4_per_day',
    scheduledTimes: ['09:00', '12:00', '15:00', '17:00'],
    cutoffHour: 17,
    timezone: 'America/Mexico_City',
  },
  circle_usdc: {
    frequency: 'realtime',
    timezone: 'UTC',
  },
  base_chain: {
    frequency: 'realtime',
    timezone: 'UTC',
  },
  wire: {
    frequency: 'daily',
    scheduledTimes: ['14:00'],
    cutoffHour: 14,
    timezone: 'America/New_York',
  },
};

// ============================================
// Settlement Windows Service
// ============================================

export class SettlementWindowsService {
  private supabase = createClient();

  // ============================================
  // Window Configuration
  // ============================================

  /**
   * Get settlement window configuration for a rail
   */
  async getWindowConfig(
    tenantId: string,
    rail: string
  ): Promise<SettlementWindowConfig | null> {
    const { data, error } = await this.supabase
      .from('settlement_windows')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('rail', rail)
      .single();

    if (error || !data) {
      // Return default config if no custom config exists
      const defaultConfig = DEFAULT_WINDOW_CONFIGS[rail];
      if (defaultConfig) {
        return {
          id: '',
          tenantId,
          rail,
          frequency: defaultConfig.frequency || 'realtime',
          scheduledTimes: defaultConfig.scheduledTimes || [],
          cutoffHour: defaultConfig.cutoffHour,
          cutoffMinute: defaultConfig.cutoffMinute || 0,
          timezone: defaultConfig.timezone || 'UTC',
          minBatchAmount: 0,
          maxBatchSize: 1000,
          isActive: true,
          metadata: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      return null;
    }

    return this.mapWindowConfig(data);
  }

  /**
   * Get all window configs for a tenant
   */
  async getAllWindowConfigs(tenantId: string): Promise<SettlementWindowConfig[]> {
    const { data, error } = await this.supabase
      .from('settlement_windows')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('rail');

    if (error) {
      console.error('[SettlementWindows] Error fetching configs:', error);
      return [];
    }

    // Merge with defaults
    const configs = data?.map(this.mapWindowConfig) || [];
    const configuredRails = new Set(configs.map(c => c.rail));

    // Add default configs for unconfigured rails
    for (const [rail, defaultConfig] of Object.entries(DEFAULT_WINDOW_CONFIGS)) {
      if (!configuredRails.has(rail)) {
        configs.push({
          id: '',
          tenantId,
          rail,
          frequency: defaultConfig.frequency || 'realtime',
          scheduledTimes: defaultConfig.scheduledTimes || [],
          cutoffHour: defaultConfig.cutoffHour,
          cutoffMinute: defaultConfig.cutoffMinute || 0,
          timezone: defaultConfig.timezone || 'UTC',
          minBatchAmount: 0,
          maxBatchSize: 1000,
          isActive: true,
          metadata: { isDefault: true },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return configs;
  }

  /**
   * Create or update settlement window configuration
   */
  async upsertWindowConfig(
    tenantId: string,
    rail: string,
    config: Partial<SettlementWindowConfig>
  ): Promise<SettlementWindowConfig> {
    const { data, error } = await this.supabase
      .from('settlement_windows')
      .upsert({
        tenant_id: tenantId,
        rail,
        frequency: config.frequency || 'realtime',
        scheduled_times: config.scheduledTimes || [],
        cutoff_hour: config.cutoffHour,
        cutoff_minute: config.cutoffMinute || 0,
        timezone: config.timezone || 'UTC',
        min_batch_amount: config.minBatchAmount || 0,
        max_batch_size: config.maxBatchSize || 1000,
        is_active: config.isActive !== false,
        metadata: config.metadata || {},
      }, {
        onConflict: 'tenant_id,rail',
      })
      .select()
      .single();

    if (error) {
      console.error('[SettlementWindows] Error upserting config:', error);
      throw error;
    }

    return this.mapWindowConfig(data);
  }

  // ============================================
  // Window Status & Scheduling
  // ============================================

  /**
   * Check if a rail's settlement window is currently open
   */
  async isWindowOpen(
    tenantId: string,
    rail: string,
    checkDate?: Date
  ): Promise<boolean> {
    const config = await this.getWindowConfig(tenantId, rail);
    if (!config) return true; // Default to open if no config

    // Realtime is always open
    if (config.frequency === 'realtime') return true;

    const now = checkDate || new Date();
    const localTime = this.toLocalTime(now, config.timezone);

    // Check for holidays
    const countryCode = RAIL_COUNTRY_MAP[rail];
    if (countryCode) {
      const isHoliday = await this.isHoliday(countryCode, localTime, rail);
      if (isHoliday) return false;
    }

    // Check cut-off time
    if (config.cutoffHour !== undefined) {
      const currentHour = localTime.getHours();
      const currentMinute = localTime.getMinutes();
      const cutoffMinutes = config.cutoffHour * 60 + (config.cutoffMinute || 0);
      const currentMinutes = currentHour * 60 + currentMinute;
      
      if (currentMinutes >= cutoffMinutes) {
        return false; // Past cut-off
      }
    }

    // Check scheduled times for specific frequencies
    if (config.frequency === '4_per_day' || config.frequency === 'custom') {
      return this.isWithinScheduledWindow(localTime, config.scheduledTimes);
    }

    // Hourly is open during business hours (before cutoff)
    if (config.frequency === 'hourly') {
      const currentHour = localTime.getHours();
      // Business hours: 8am to cutoff (default 5pm)
      return currentHour >= 8 && currentHour < (config.cutoffHour || 17);
    }

    // Daily - open until cutoff
    if (config.frequency === 'daily') {
      const currentHour = localTime.getHours();
      return currentHour < (config.cutoffHour || 17);
    }

    return true;
  }

  /**
   * Get the next settlement window time for a rail
   */
  async getNextWindow(
    tenantId: string,
    rail: string
  ): Promise<NextWindowInfo> {
    const config = await this.getWindowConfig(tenantId, rail);
    const now = new Date();
    
    // Get queued transfers count
    const { count: queuedCount } = await this.supabase
      .from('settlement_queue')
      .select('id', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('rail', rail)
      .eq('status', 'queued');

    const { data: queuedSum } = await this.supabase
      .from('settlement_queue')
      .select('amount')
      .eq('tenant_id', tenantId)
      .eq('rail', rail)
      .eq('status', 'queued');

    const queuedAmount = queuedSum?.reduce((sum, q) => sum + parseFloat(q.amount), 0) || 0;

    if (!config || config.frequency === 'realtime') {
      return {
        rail,
        nextWindowAt: now.toISOString(),
        isOpen: true,
        isHoliday: false,
        queuedCount: queuedCount || 0,
        queuedAmount,
      };
    }

    const isOpen = await this.isWindowOpen(tenantId, rail);
    const localTime = this.toLocalTime(now, config.timezone);
    
    // Check for holiday
    const countryCode = RAIL_COUNTRY_MAP[rail];
    let isHoliday = false;
    let holidayName: string | undefined;
    
    if (countryCode) {
      const holiday = await this.getHoliday(countryCode, localTime, rail);
      if (holiday) {
        isHoliday = true;
        holidayName = holiday.name;
      }
    }

    // Calculate next window
    const nextWindowAt = this.calculateNextWindow(config, now, isHoliday);
    
    // Calculate when current window closes
    let currentWindowCloses: string | undefined;
    if (isOpen && config.cutoffHour !== undefined) {
      const closesAt = new Date(localTime);
      closesAt.setHours(config.cutoffHour, config.cutoffMinute || 0, 0, 0);
      currentWindowCloses = closesAt.toISOString();
    }

    return {
      rail,
      nextWindowAt: nextWindowAt.toISOString(),
      isOpen,
      currentWindowCloses,
      isHoliday,
      holidayName,
      queuedCount: queuedCount || 0,
      queuedAmount,
    };
  }

  /**
   * Calculate the next settlement window time
   */
  private calculateNextWindow(
    config: SettlementWindowConfig,
    fromDate: Date,
    isHoliday: boolean
  ): Date {
    const localTime = this.toLocalTime(fromDate, config.timezone);
    const result = new Date(localTime);

    // If it's a holiday, move to next business day
    if (isHoliday) {
      result.setDate(result.getDate() + 1);
      result.setHours(8, 0, 0, 0); // Start of next business day
      return result;
    }

    switch (config.frequency) {
      case 'realtime':
        return fromDate;

      case 'hourly':
        // Next hour
        result.setMinutes(0, 0, 0);
        result.setHours(result.getHours() + 1);
        // If past cutoff, move to next day
        if (config.cutoffHour && result.getHours() >= config.cutoffHour) {
          result.setDate(result.getDate() + 1);
          result.setHours(8, 0, 0, 0);
        }
        return result;

      case '4_per_day':
      case 'custom':
        // Find next scheduled time
        if (config.scheduledTimes && config.scheduledTimes.length > 0) {
          const currentMinutes = localTime.getHours() * 60 + localTime.getMinutes();
          
          for (const time of config.scheduledTimes.sort()) {
            const [hours, minutes] = time.split(':').map(Number);
            const timeMinutes = hours * 60 + minutes;
            
            if (timeMinutes > currentMinutes) {
              result.setHours(hours, minutes, 0, 0);
              return result;
            }
          }
          
          // All times passed, move to first time next day
          const [hours, minutes] = config.scheduledTimes[0].split(':').map(Number);
          result.setDate(result.getDate() + 1);
          result.setHours(hours, minutes, 0, 0);
          return result;
        }
        return fromDate;

      case 'daily':
        // Next day at scheduled time (or 9am default)
        const [hours, minutes] = (config.scheduledTimes?.[0] || '09:00').split(':').map(Number);
        
        if (localTime.getHours() * 60 + localTime.getMinutes() < hours * 60 + minutes) {
          // Today's window hasn't happened yet
          result.setHours(hours, minutes, 0, 0);
        } else {
          // Move to tomorrow
          result.setDate(result.getDate() + 1);
          result.setHours(hours, minutes, 0, 0);
        }
        return result;

      default:
        return fromDate;
    }
  }

  // ============================================
  // Queue Management
  // ============================================

  /**
   * Queue a transfer for the next settlement window
   */
  async queueTransfer(
    tenantId: string,
    transferId: string,
    rail: string,
    amount: number,
    currency: string,
    priority: SettlementPriority = 'normal',
    metadata?: Record<string, any>
  ): Promise<QueuedTransfer> {
    // Get next window time
    const nextWindow = await this.getNextWindow(tenantId, rail);

    const { data, error } = await this.supabase
      .from('settlement_queue')
      .insert({
        tenant_id: tenantId,
        transfer_id: transferId,
        rail,
        amount,
        currency,
        scheduled_for: nextWindow.nextWindowAt,
        priority,
        status: 'queued',
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('[SettlementWindows] Error queueing transfer:', error);
      throw error;
    }

    return this.mapQueuedTransfer(data);
  }

  /**
   * Get queued transfers for a rail
   */
  async getQueuedTransfers(
    tenantId: string,
    rail?: string,
    status: string = 'queued'
  ): Promise<QueuedTransfer[]> {
    let query = this.supabase
      .from('settlement_queue')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', status);

    if (rail) {
      query = query.eq('rail', rail);
    }

    const { data, error } = await query.order('queued_at');

    if (error) {
      console.error('[SettlementWindows] Error fetching queue:', error);
      return [];
    }

    return data?.map(this.mapQueuedTransfer) || [];
  }

  /**
   * Process an emergency/urgent settlement outside normal windows
   */
  async processEmergencySettlement(
    tenantId: string,
    transferId: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    // Update queue item to urgent and mark for immediate processing
    const { data: queueItem, error: findError } = await this.supabase
      .from('settlement_queue')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('transfer_id', transferId)
      .eq('status', 'queued')
      .single();

    if (findError || !queueItem) {
      // Transfer might not be queued, process immediately
      return {
        success: true,
        message: 'Transfer not in queue - processing immediately',
      };
    }

    // Mark as urgent and schedule for immediate processing
    await this.supabase
      .from('settlement_queue')
      .update({
        priority: 'urgent',
        scheduled_for: new Date().toISOString(),
        metadata: {
          ...queueItem.metadata,
          emergency_override: true,
          emergency_reason: reason,
          emergency_at: new Date().toISOString(),
        },
      })
      .eq('id', queueItem.id);

    return {
      success: true,
      message: 'Transfer marked for emergency settlement',
    };
  }

  // ============================================
  // Holiday Management
  // ============================================

  /**
   * Check if a date is a holiday for a given country and rail
   */
  async isHoliday(
    countryCode: string,
    date: Date,
    rail?: string
  ): Promise<boolean> {
    const holiday = await this.getHoliday(countryCode, date, rail);
    return holiday !== null;
  }

  /**
   * Get holiday details for a date
   */
  async getHoliday(
    countryCode: string,
    date: Date,
    rail?: string
  ): Promise<Holiday | null> {
    const dateStr = date.toISOString().split('T')[0];

    const { data, error } = await this.supabase
      .from('settlement_holidays')
      .select('*')
      .eq('country_code', countryCode)
      .eq('holiday_date', dateStr)
      .single();

    if (error || !data) return null;

    // Check if rail is affected
    if (rail && data.affected_rails?.length > 0) {
      if (!data.affected_rails.includes(rail)) {
        return null; // Rail not affected by this holiday
      }
    }

    return this.mapHoliday(data);
  }

  /**
   * Get holidays for a date range
   */
  async getHolidays(
    countryCode: string,
    startDate: Date,
    endDate: Date
  ): Promise<Holiday[]> {
    const { data, error } = await this.supabase
      .from('settlement_holidays')
      .select('*')
      .eq('country_code', countryCode)
      .gte('holiday_date', startDate.toISOString().split('T')[0])
      .lte('holiday_date', endDate.toISOString().split('T')[0])
      .order('holiday_date');

    if (error) {
      console.error('[SettlementWindows] Error fetching holidays:', error);
      return [];
    }

    return data?.map(this.mapHoliday) || [];
  }

  /**
   * Add a custom holiday (admin only)
   */
  async addHoliday(holiday: Omit<Holiday, 'id'>): Promise<Holiday> {
    const { data, error } = await this.supabase
      .from('settlement_holidays')
      .insert({
        country_code: holiday.countryCode,
        holiday_date: holiday.holidayDate,
        name: holiday.name,
        description: holiday.description,
        affected_rails: holiday.affectedRails || [],
        is_full_day: holiday.isFullDay !== false,
        closed_from: holiday.closedFrom,
        closed_until: holiday.closedUntil,
        year: holiday.year,
      })
      .select()
      .single();

    if (error) {
      console.error('[SettlementWindows] Error adding holiday:', error);
      throw error;
    }

    return this.mapHoliday(data);
  }

  // ============================================
  // Execution Logging
  // ============================================

  /**
   * Log a settlement execution
   */
  async logExecution(execution: Omit<SettlementExecution, 'id' | 'metadata'>): Promise<SettlementExecution> {
    const { data, error } = await this.supabase
      .from('settlement_executions')
      .insert({
        tenant_id: execution.tenantId,
        rail: execution.rail,
        window_id: execution.windowId,
        scheduled_at: execution.scheduledAt,
        started_at: execution.startedAt,
        completed_at: execution.completedAt,
        status: execution.status,
        transfer_count: execution.transferCount,
        total_amount: execution.totalAmount,
        currency: execution.currency,
        success_count: execution.successCount,
        failed_count: execution.failedCount,
        error_message: execution.errorMessage,
      })
      .select()
      .single();

    if (error) {
      console.error('[SettlementWindows] Error logging execution:', error);
      throw error;
    }

    return this.mapExecution(data);
  }

  /**
   * Get recent executions
   */
  async getExecutions(
    tenantId: string,
    rail?: string,
    limit: number = 20
  ): Promise<SettlementExecution[]> {
    let query = this.supabase
      .from('settlement_executions')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('scheduled_at', { ascending: false })
      .limit(limit);

    if (rail) {
      query = query.eq('rail', rail);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[SettlementWindows] Error fetching executions:', error);
      return [];
    }

    return data?.map(this.mapExecution) || [];
  }

  // ============================================
  // Helper Methods
  // ============================================

  private toLocalTime(date: Date, timezone: string): Date {
    try {
      const localString = date.toLocaleString('en-US', { timeZone: timezone });
      return new Date(localString);
    } catch {
      return date;
    }
  }

  private isWithinScheduledWindow(
    localTime: Date,
    scheduledTimes: string[],
    windowMinutes: number = 30 // Window stays open for 30 minutes after scheduled time
  ): boolean {
    const currentMinutes = localTime.getHours() * 60 + localTime.getMinutes();

    for (const time of scheduledTimes) {
      const [hours, minutes] = time.split(':').map(Number);
      const scheduleMinutes = hours * 60 + minutes;
      
      // Check if within window (scheduled time to scheduled time + window)
      if (currentMinutes >= scheduleMinutes && currentMinutes < scheduleMinutes + windowMinutes) {
        return true;
      }
    }

    return false;
  }

  // ============================================
  // Mappers
  // ============================================

  private mapWindowConfig(data: any): SettlementWindowConfig {
    return {
      id: data.id,
      tenantId: data.tenant_id,
      rail: data.rail,
      frequency: data.frequency,
      scheduledTimes: data.scheduled_times || [],
      cutoffHour: data.cutoff_hour,
      cutoffMinute: data.cutoff_minute,
      timezone: data.timezone,
      minBatchAmount: parseFloat(data.min_batch_amount) || 0,
      maxBatchSize: data.max_batch_size,
      isActive: data.is_active,
      metadata: data.metadata || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapQueuedTransfer(data: any): QueuedTransfer {
    return {
      id: data.id,
      tenantId: data.tenant_id,
      transferId: data.transfer_id,
      rail: data.rail,
      amount: parseFloat(data.amount),
      currency: data.currency,
      queuedAt: data.queued_at,
      scheduledFor: data.scheduled_for,
      priority: data.priority,
      status: data.status,
      settlementBatchId: data.settlement_batch_id,
      processedAt: data.processed_at,
      errorMessage: data.error_message,
      metadata: data.metadata || {},
    };
  }

  private mapHoliday(data: any): Holiday {
    return {
      id: data.id,
      countryCode: data.country_code,
      holidayDate: data.holiday_date,
      name: data.name,
      description: data.description,
      affectedRails: data.affected_rails || [],
      isFullDay: data.is_full_day,
      closedFrom: data.closed_from,
      closedUntil: data.closed_until,
      year: data.year,
    };
  }

  private mapExecution(data: any): SettlementExecution {
    return {
      id: data.id,
      tenantId: data.tenant_id,
      rail: data.rail,
      windowId: data.window_id,
      scheduledAt: data.scheduled_at,
      startedAt: data.started_at,
      completedAt: data.completed_at,
      status: data.status,
      transferCount: data.transfer_count,
      totalAmount: parseFloat(data.total_amount) || 0,
      currency: data.currency,
      successCount: data.success_count,
      failedCount: data.failed_count,
      errorMessage: data.error_message,
      metadata: data.metadata || {},
    };
  }
}

// ============================================
// Singleton Instance
// ============================================

export const settlementWindowsService = new SettlementWindowsService();



