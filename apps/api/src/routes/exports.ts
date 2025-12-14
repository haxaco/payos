import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '../db/client.js';
import { 
  isValidUUID,
  getPaginationParams,
  paginationResponse,
} from '../utils/helpers.js';
import { createExportService } from '../services/exports.js';
import { ValidationError, NotFoundError } from '../middleware/error.js';

const exports = new Hono();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createExportSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  format: z.enum(['quickbooks', 'quickbooks4', 'xero', 'netsuite', 'payos']),
  dateFormat: z.enum(['US', 'UK']).optional().default('US'),
  includeRefunds: z.boolean().optional().default(true),
  includeStreams: z.boolean().optional().default(true),
  includeFees: z.boolean().optional().default(true),
  accountId: z.string().uuid().optional(),
  corridor: z.string().optional(),
  currency: z.string().optional(),
});

// ============================================
// GET /v1/exports/transactions - Generate export
// ============================================
exports.get('/transactions', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  
  const query = c.req.query();
  
  // Validate query params
  const parsed = createExportSchema.safeParse({
    startDate: query.start_date,
    endDate: query.end_date,
    format: query.format || 'payos',
    dateFormat: query.date_format || 'US',
    includeRefunds: query.include_refunds !== 'false',
    includeStreams: query.include_streams !== 'false',
    includeFees: query.include_fees !== 'false',
    accountId: query.account_id,
    corridor: query.corridor,
    currency: query.currency,
  });
  
  if (!parsed.success) {
    throw new ValidationError('Invalid query parameters', parsed.error.flatten());
  }
  
  const options = parsed.data;
  
  // Generate export
  const exportService = createExportService(supabase);
  const { rows, headers } = await exportService.generateExport(ctx.tenantId, options);
  
  // For small exports (< 10k records), return immediately
  if (rows.length < 10000) {
    const csv = exportService.toCSV(rows, headers);
    
    // Create export record
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    
    const { data: exportRecord } = await supabase
      .from('exports')
      .insert({
        tenant_id: ctx.tenantId,
        export_type: 'transactions',
        format: options.format,
        status: 'ready',
        start_date: options.startDate,
        end_date: options.endDate,
        account_id: options.accountId || null,
        corridor: options.corridor || null,
        currency: options.currency || null,
        include_refunds: options.includeRefunds,
        include_streams: options.includeStreams,
        include_fees: options.includeFees,
        record_count: rows.length,
        file_url: '', // In production, upload to S3
        download_url: '', // In production, generate signed URL
        expires_at: expiresAt.toISOString(),
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    // For now, return CSV directly in response
    // In production, this would be stored and a download URL returned
    return c.text(csv, 200, {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="transactions_${options.startDate}_${options.endDate}.csv"`,
    });
  }
  
  // For large exports, create async job
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  const { data: exportRecord, error: createError } = await supabase
    .from('exports')
    .insert({
      tenant_id: ctx.tenantId,
      export_type: 'transactions',
      format: options.format,
      status: 'processing',
      start_date: options.startDate,
      end_date: options.endDate,
      account_id: options.accountId || null,
      corridor: options.corridor || null,
      currency: options.currency || null,
      include_refunds: options.includeRefunds,
      include_streams: options.includeStreams,
      include_fees: options.includeFees,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();
  
  if (createError) {
    console.error('Error creating export:', createError);
    return c.json({ error: 'Failed to create export' }, 500);
  }
  
  // In production, trigger background job here
  // For now, return processing status
  
  return c.json({
    export_id: exportRecord.id,
    status: 'processing',
    format: options.format,
    message: 'Export is being processed. Check status via GET /v1/exports/:id',
  }, 202);
});

// ============================================
// GET /v1/exports/:id - Get export status
// ============================================
exports.get('/:id', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  const exportId = c.req.param('id');
  
  if (!isValidUUID(exportId)) {
    throw new ValidationError('Invalid export ID format');
  }
  
  const { data: exportRecord, error } = await supabase
    .from('exports')
    .select('*')
    .eq('id', exportId)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (error || !exportRecord) {
    throw new NotFoundError('Export', exportId);
  }
  
  return c.json({
    export_id: exportRecord.id,
    status: exportRecord.status,
    format: exportRecord.format,
    record_count: exportRecord.record_count,
    download_url: exportRecord.download_url,
    expires_at: exportRecord.expires_at,
    created_at: exportRecord.created_at,
    completed_at: exportRecord.completed_at,
  });
});

// ============================================
// GET /v1/exports/:id/download - Download export
// ============================================
exports.get('/:id/download', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  const exportId = c.req.param('id');
  
  if (!isValidUUID(exportId)) {
    throw new ValidationError('Invalid export ID format');
  }
  
  const { data: exportRecord, error } = await supabase
    .from('exports')
    .select('*')
    .eq('id', exportId)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (error || !exportRecord) {
    throw new NotFoundError('Export', exportId);
  }
  
  if (exportRecord.status !== 'ready') {
    return c.json({ error: 'Export is not ready yet' }, 400);
  }
  
  // Check expiration
  if (exportRecord.expires_at && new Date(exportRecord.expires_at) < new Date()) {
    return c.json({ error: 'Export has expired' }, 410);
  }
  
  // For now, regenerate on-demand (in production, serve from storage)
  const exportService = createExportService(supabase);
  const options = {
    startDate: exportRecord.start_date,
    endDate: exportRecord.end_date,
    format: exportRecord.format as any,
    dateFormat: 'US' as const,
    includeRefunds: exportRecord.include_refunds,
    includeStreams: exportRecord.include_streams,
    includeFees: exportRecord.include_fees,
    accountId: exportRecord.account_id || undefined,
    corridor: exportRecord.corridor || undefined,
    currency: exportRecord.currency || undefined,
  };
  
  const { rows, headers } = await exportService.generateExport(ctx.tenantId, options);
  const csv = exportService.toCSV(rows, headers);
  
  return c.text(csv, 200, {
    'Content-Type': 'text/csv',
    'Content-Disposition': `attachment; filename="export_${exportRecord.id}.csv"`,
  });
});

export default exports;

