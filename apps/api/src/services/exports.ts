import type { SupabaseClient } from '@supabase/supabase-js';

export interface ExportOptions {
  startDate: string;
  endDate: string;
  format: 'quickbooks' | 'quickbooks4' | 'xero' | 'netsuite' | 'payos';
  dateFormat?: 'US' | 'UK';
  includeRefunds?: boolean;
  includeStreams?: boolean;
  includeFees?: boolean;
  accountId?: string;
  corridor?: string;
  currency?: string;
}

export interface ExportRow {
  date: string;
  description: string;
  amount: number;
  [key: string]: any;
}

/**
 * Export service for generating transaction exports in various formats
 */
export class ExportService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Generate CSV content for a specific format
   */
  async generateExport(
    tenantId: string,
    options: ExportOptions
  ): Promise<{ rows: ExportRow[]; headers: string[] }> {
    // Fetch transfers
    let query = this.supabase
      .from('transfers')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('created_at', options.startDate)
      .lte('created_at', options.endDate)
      .order('created_at', { ascending: true });

    if (options.accountId) {
      query = query.or(`from_account_id.eq.${options.accountId},to_account_id.eq.${options.accountId}`);
    }

    const { data: transfers, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch transfers: ${error.message}`);
    }

    // Fetch refunds if included
    let refunds: any[] = [];
    if (options.includeRefunds !== false) {
      const { data: refundsData } = await this.supabase
        .from('refunds')
        .select('*, transfers!refunds_original_transfer_id_fkey(*)')
        .eq('tenant_id', tenantId)
        .gte('created_at', options.startDate)
        .lte('created_at', options.endDate)
        .eq('status', 'completed');

      refunds = refundsData || [];
    }

    // Format based on export type
    switch (options.format) {
      case 'quickbooks':
        return this.formatQuickBooks(transfers || [], refunds, options);
      case 'quickbooks4':
        return this.formatQuickBooks4(transfers || [], refunds, options);
      case 'xero':
        return this.formatXero(transfers || [], refunds, options);
      case 'netsuite':
        return this.formatNetSuite(transfers || [], refunds, options);
      case 'payos':
        return this.formatPayOS(transfers || [], refunds, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * QuickBooks 3-Column format
   */
  private formatQuickBooks(
    transfers: any[],
    refunds: any[],
    options: ExportOptions
  ): { rows: ExportRow[]; headers: string[] } {
    const rows: ExportRow[] = [];
    const dateFormat = options.dateFormat || 'US';

    // Add transfers
    for (const transfer of transfers) {
      const date = this.formatDate(transfer.created_at, dateFormat);
      const description = `${transfer.type === 'payout' ? 'Payout' : 'Transfer'} to ${transfer.to_account_name} (${transfer.id.substring(0, 8)})`;
      const amount = -parseFloat(transfer.amount); // Negative for outbound

      rows.push({
        Date: date,
        Description: description,
        Amount: amount,
      });
    }

    // Add refunds
    for (const refund of refunds) {
      const date = this.formatDate(refund.created_at, dateFormat);
      const description = `Refund from ${refund.to_account_id} (REF-${refund.id.substring(0, 8)})`;
      const amount = parseFloat(refund.amount); // Positive for refunds

      rows.push({
        Date: date,
        Description: description,
        Amount: amount,
      });
    }

    return {
      rows,
      headers: ['Date', 'Description', 'Amount'],
    };
  }

  /**
   * QuickBooks 4-Column format (with Account)
   */
  private formatQuickBooks4(
    transfers: any[],
    refunds: any[],
    options: ExportOptions
  ): { rows: ExportRow[]; headers: string[] } {
    const rows: ExportRow[] = [];
    const dateFormat = options.dateFormat || 'US';

    // Similar to QuickBooks 3-column but with Account column
    for (const transfer of transfers) {
      const date = this.formatDate(transfer.created_at, dateFormat);
      const description = `${transfer.type === 'payout' ? 'Payout' : 'Transfer'} to ${transfer.to_account_name}`;
      const amount = -parseFloat(transfer.amount);

      rows.push({
        Date: date,
        Description: description,
        Account: transfer.to_account_name,
        Amount: amount,
      });
    }

    for (const refund of refunds) {
      const date = this.formatDate(refund.created_at, dateFormat);
      const description = `Refund`;
      const amount = parseFloat(refund.amount);

      rows.push({
        Date: date,
        Description: description,
        Account: refund.to_account_id,
        Amount: amount,
      });
    }

    return {
      rows,
      headers: ['Date', 'Description', 'Account', 'Amount'],
    };
  }

  /**
   * Xero format
   */
  private formatXero(
    transfers: any[],
    refunds: any[],
    options: ExportOptions
  ): { rows: ExportRow[]; headers: string[] } {
    const rows: ExportRow[] = [];
    const dateFormat = options.dateFormat || 'UK'; // Xero defaults to UK format

    for (const transfer of transfers) {
      const date = this.formatDate(transfer.created_at, dateFormat);
      const amount = -parseFloat(transfer.amount);
      const payee = transfer.to_account_name;
      const description = transfer.description || `${transfer.type} payment`;
      const reference = transfer.id.substring(0, 8);

      rows.push({
        '*Date': date,
        '*Amount': amount,
        Payee: payee,
        Description: description,
        Reference: reference,
      });
    }

    for (const refund of refunds) {
      const date = this.formatDate(refund.created_at, dateFormat);
      const amount = parseFloat(refund.amount);

      rows.push({
        '*Date': date,
        '*Amount': amount,
        Payee: refund.to_account_id,
        Description: 'Refund',
        Reference: `REF-${refund.id.substring(0, 8)}`,
      });
    }

    return {
      rows,
      headers: ['*Date', '*Amount', 'Payee', 'Description', 'Reference'],
    };
  }

  /**
   * NetSuite format (simplified)
   */
  private formatNetSuite(
    transfers: any[],
    refunds: any[],
    options: ExportOptions
  ): { rows: ExportRow[]; headers: string[] } {
    // Similar to Xero but with NetSuite-specific fields
    const xeroFormat = this.formatXero(transfers, refunds, options);
    
    // Map Xero format to NetSuite (can be customized further)
    return {
      rows: xeroFormat.rows.map(row => ({
        Date: row['*Date'],
        Amount: row['*Amount'],
        Payee: row.Payee,
        Memo: row.Description,
        Reference: row.Reference,
      })),
      headers: ['Date', 'Amount', 'Payee', 'Memo', 'Reference'],
    };
  }

  /**
   * PayOS Full format (comprehensive)
   */
  private formatPayOS(
    transfers: any[],
    refunds: any[],
    options: ExportOptions
  ): { rows: ExportRow[]; headers: string[] } {
    const rows: ExportRow[] = [];

    for (const transfer of transfers) {
      const created = new Date(transfer.created_at);
      const date = created.toISOString().split('T')[0];
      const timeUtc = created.toISOString().split('T')[1].split('.')[0] + 'Z';
      
      rows.push({
        date,
        time_utc: timeUtc,
        transaction_id: transfer.id,
        type: transfer.type,
        status: transfer.status,
        from_account_id: transfer.from_account_id,
        from_account_name: transfer.from_account_name,
        to_account_id: transfer.to_account_id,
        to_account_name: transfer.to_account_name,
        amount: parseFloat(transfer.amount),
        currency: transfer.currency || 'USDC',
        usd_equivalent: parseFloat(transfer.amount), // Simplified
        destination_amount: parseFloat(transfer.destination_amount || transfer.amount),
        destination_currency: transfer.destination_currency || transfer.currency || 'USDC',
        fx_rate: parseFloat(transfer.fx_rate || '1'),
        fee_amount: parseFloat(transfer.fee_amount || '0'),
        net_amount: parseFloat(transfer.amount) - parseFloat(transfer.fee_amount || '0'),
        corridor: this.calculateCorridor(transfer),
        description: transfer.description || '',
        initiated_by_type: transfer.initiated_by_type,
        initiated_by_id: transfer.initiated_by_id,
      });
    }

    // Add refunds as separate rows
    for (const refund of refunds) {
      const created = new Date(refund.created_at);
      const date = created.toISOString().split('T')[0];
      const timeUtc = created.toISOString().split('T')[1].split('.')[0] + 'Z';

      rows.push({
        date,
        time_utc: timeUtc,
        transaction_id: `REF-${refund.id}`,
        type: 'refund',
        status: refund.status,
        from_account_id: refund.from_account_id,
        from_account_name: '', // Would need to join
        to_account_id: refund.to_account_id,
        to_account_name: '',
        amount: parseFloat(refund.amount),
        currency: refund.currency || 'USDC',
        usd_equivalent: parseFloat(refund.amount),
        destination_amount: parseFloat(refund.amount),
        destination_currency: refund.currency || 'USDC',
        fx_rate: 1,
        fee_amount: 0,
        net_amount: parseFloat(refund.amount),
        corridor: '',
        description: `Refund: ${refund.reason}`,
        initiated_by_type: 'user',
        initiated_by_id: '',
      });
    }

    return {
      rows,
      headers: [
        'date',
        'time_utc',
        'transaction_id',
        'type',
        'status',
        'from_account_id',
        'from_account_name',
        'to_account_id',
        'to_account_name',
        'amount',
        'currency',
        'usd_equivalent',
        'destination_amount',
        'destination_currency',
        'fx_rate',
        'fee_amount',
        'net_amount',
        'corridor',
        'description',
        'initiated_by_type',
        'initiated_by_id',
      ],
    };
  }

  /**
   * Convert rows to CSV string
   */
  toCSV(rows: ExportRow[], headers: string[]): string {
    const csvRows: string[] = [];
    
    // Add headers
    csvRows.push(headers.map(h => this.escapeCSV(h)).join(','));
    
    // Add data rows
    for (const row of rows) {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) {
          return '';
        }
        return this.escapeCSV(String(value));
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }

  /**
   * Escape CSV values
   */
  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Format date based on locale
   */
  private formatDate(dateString: string, format: 'US' | 'UK'): string {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();

    if (format === 'US') {
      return `${month}/${day}/${year}`;
    } else {
      return `${day}/${month}/${year}`;
    }
  }

  /**
   * Calculate corridor from transfer
   */
  private calculateCorridor(transfer: any): string {
    // This would ideally join with accounts to get country codes
    // For now, return empty or a placeholder
    return '';
  }
}

/**
 * Create an export service instance
 */
export function createExportService(supabase: SupabaseClient): ExportService {
  return new ExportService(supabase);
}

