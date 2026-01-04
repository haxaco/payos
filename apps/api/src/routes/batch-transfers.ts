/**
 * Batch Transfer API Routes (Epic 27, Story 27.2)
 * 
 * Enables partners to submit multiple transfers in a single request.
 * Supports up to 1000 transfers per batch with CSV upload.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '../db/client.js';
import { createBatchProcessor, BatchStatus, BatchItemStatus } from '../services/batch-processor.js';
import { isValidUUID, getPaginationParams, paginationResponse, logAudit } from '../utils/helpers.js';
import { ValidationError, NotFoundError } from '../middleware/error.js';
import { storeIdempotencyResponse } from '../middleware/idempotency.js';

const batch = new Hono();

// ============================================
// Validation Schemas
// ============================================

const batchItemSchema = z.object({
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().default('USDC'),
  destinationCurrency: z.string().optional(),
  description: z.string().max(500).optional(),
  reference: z.string().max(100).optional(),
  metadata: z.record(z.any()).optional(),
});

const createBatchSchema = z.object({
  name: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  type: z.enum(['payout', 'payroll', 'procurement', 'refund']).default('payout'),
  items: z.array(batchItemSchema).min(1).max(1000),
  webhookUrl: z.string().url().optional(),
  autoProcess: z.boolean().default(false), // If true, process immediately after validation
});

// ============================================
// Routes
// ============================================

/**
 * POST /v1/transfers/batch
 * Create a new batch transfer
 */
batch.post('/', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  const processor = createBatchProcessor(supabase);
  
  // Get idempotency key
  const idempotencyKey = c.get('idempotencyKey') || c.req.header('Idempotency-Key');
  const requestHash = c.get('idempotencyRequestHash');

  // Parse and validate body
  let body;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON body');
  }

  const parsed = createBatchSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Validation failed', parsed.error.flatten());
  }

  const { name, description, type, items, webhookUrl, autoProcess } = parsed.data;

  try {
    // Create batch
    const batch = await processor.createBatch({
      tenantId: ctx.tenantId,
      name,
      description,
      type,
      items,
      webhookUrl,
      idempotencyKey,
      createdBy: {
        type: ctx.actorType,
        id: ctx.actorId || ctx.userId || ctx.apiKeyId,
        name: ctx.actorName || ctx.userName,
      },
    });

    // Validate batch
    const validation = await processor.validateBatch(batch.id, ctx.tenantId);

    // Auto-process if requested and validation passed
    if (autoProcess && validation.isValid) {
      const processedBatch = await processor.processBatch(batch.id, ctx.tenantId);
      
      // Log audit
      await logAudit(supabase, {
        tenantId: ctx.tenantId,
        entityType: 'batch',
        entityId: processedBatch.id,
        action: 'created_and_processed',
        actorType: ctx.actorType,
        actorId: ctx.actorId || ctx.userId || ctx.apiKeyId || 'unknown',
        actorName: ctx.actorName || ctx.userName || 'API',
        metadata: {
          totalItems: processedBatch.totalItems,
          completedItems: processedBatch.completedItems,
          failedItems: processedBatch.failedItems,
          totalAmount: processedBatch.totalAmount,
        },
      });

      const responseBody = {
        data: processedBatch,
        validation,
        message: 'Batch created and processed',
      };

      // Store idempotency response
      if (idempotencyKey && requestHash) {
        storeIdempotencyResponse(
          ctx.tenantId,
          idempotencyKey,
          requestHash,
          '/v1/transfers/batch',
          'POST',
          201,
          responseBody
        ).catch(console.error);
      }

      return c.json(responseBody, 201);
    }

    // Log audit
    await logAudit(supabase, {
      tenantId: ctx.tenantId,
      entityType: 'batch',
      entityId: batch.id,
      action: 'created',
      actorType: ctx.actorType,
      actorId: ctx.actorId || ctx.userId || ctx.apiKeyId || 'unknown',
      actorName: ctx.actorName || ctx.userName || 'API',
      metadata: {
        totalItems: batch.totalItems,
        totalAmount: batch.totalAmount,
        validItems: validation.validItems,
        invalidItems: validation.invalidItems,
      },
    });

    const responseBody = {
      data: batch,
      validation,
      message: validation.isValid
        ? 'Batch created and validated. Call POST /v1/transfers/batch/:id/process to execute.'
        : `Batch created with ${validation.invalidItems} invalid items. Review and fix before processing.`,
    };

    // Store idempotency response
    if (idempotencyKey && requestHash) {
      storeIdempotencyResponse(
        ctx.tenantId,
        idempotencyKey,
        requestHash,
        '/v1/transfers/batch',
        'POST',
        201,
        responseBody
      ).catch(console.error);
    }

    return c.json(responseBody, 201);

  } catch (error: any) {
    console.error('Error creating batch:', error);
    return c.json({
      error: 'Failed to create batch',
      message: error.message,
    }, 500);
  }
});

/**
 * GET /v1/transfers/batch
 * List batch transfers
 */
batch.get('/', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  const processor = createBatchProcessor(supabase);

  const query = c.req.query();
  const { page, limit } = getPaginationParams(query);
  const status = query.status as BatchStatus | undefined;
  const type = query.type;

  try {
    const result = await processor.listBatches(ctx.tenantId, {
      status,
      type,
      page,
      limit,
    });

    return c.json(paginationResponse(result.data, result.total, { page, limit }));
  } catch (error: any) {
    console.error('Error listing batches:', error);
    return c.json({
      error: 'Failed to list batches',
      message: error.message,
    }, 500);
  }
});

/**
 * GET /v1/transfers/batch/:id
 * Get batch details
 */
batch.get('/:id', async (c) => {
  const ctx = c.get('ctx');
  const batchId = c.req.param('id');
  const supabase = createClient();
  const processor = createBatchProcessor(supabase);

  if (!isValidUUID(batchId)) {
    throw new ValidationError('Invalid batch ID format');
  }

  const batch = await processor.getBatch(batchId, ctx.tenantId);

  if (!batch) {
    throw new NotFoundError('Batch', batchId);
  }

  return c.json({ data: batch });
});

/**
 * GET /v1/transfers/batch/:id/items
 * Get items in a batch
 */
batch.get('/:id/items', async (c) => {
  const ctx = c.get('ctx');
  const batchId = c.req.param('id');
  const supabase = createClient();
  const processor = createBatchProcessor(supabase);

  if (!isValidUUID(batchId)) {
    throw new ValidationError('Invalid batch ID format');
  }

  const query = c.req.query();
  const { page, limit } = getPaginationParams(query);
  const status = query.status as BatchItemStatus | undefined;

  try {
    const result = await processor.getBatchItems(batchId, ctx.tenantId, {
      status,
      page,
      limit,
    });

    return c.json(paginationResponse(result.data, result.total, { page, limit }));
  } catch (error: any) {
    if (error.message === 'Batch not found') {
      throw new NotFoundError('Batch', batchId);
    }
    throw error;
  }
});

/**
 * POST /v1/transfers/batch/:id/process
 * Process a batch (execute transfers)
 */
batch.post('/:id/process', async (c) => {
  const ctx = c.get('ctx');
  const batchId = c.req.param('id');
  const supabase = createClient();
  const processor = createBatchProcessor(supabase);

  if (!isValidUUID(batchId)) {
    throw new ValidationError('Invalid batch ID format');
  }

  try {
    // Get batch to check status
    const existingBatch = await processor.getBatch(batchId, ctx.tenantId);
    
    if (!existingBatch) {
      throw new NotFoundError('Batch', batchId);
    }

    if (!['pending', 'validating'].includes(existingBatch.status)) {
      throw new ValidationError(`Cannot process batch with status: ${existingBatch.status}`);
    }

    // Process batch
    const batch = await processor.processBatch(batchId, ctx.tenantId);

    // Log audit
    await logAudit(supabase, {
      tenantId: ctx.tenantId,
      entityType: 'batch',
      entityId: batchId,
      action: 'processed',
      actorType: ctx.actorType,
      actorId: ctx.actorId || ctx.userId || ctx.apiKeyId || 'unknown',
      actorName: ctx.actorName || ctx.userName || 'API',
      metadata: {
        completedItems: batch.completedItems,
        failedItems: batch.failedItems,
        totalAmount: batch.totalAmount,
      },
    });

    return c.json({
      data: batch,
      message: batch.failedItems > 0
        ? `Batch processed with ${batch.failedItems} failures. Use /retry to reprocess failed items.`
        : 'Batch processed successfully',
    });

  } catch (error: any) {
    console.error('Error processing batch:', error);
    
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    
    return c.json({
      error: 'Failed to process batch',
      message: error.message,
    }, 500);
  }
});

/**
 * POST /v1/transfers/batch/:id/retry
 * Retry failed items in a batch
 */
batch.post('/:id/retry', async (c) => {
  const ctx = c.get('ctx');
  const batchId = c.req.param('id');
  const supabase = createClient();
  const processor = createBatchProcessor(supabase);

  if (!isValidUUID(batchId)) {
    throw new ValidationError('Invalid batch ID format');
  }

  try {
    const existingBatch = await processor.getBatch(batchId, ctx.tenantId);
    
    if (!existingBatch) {
      throw new NotFoundError('Batch', batchId);
    }

    if (existingBatch.failedItems === 0) {
      return c.json({
        data: existingBatch,
        message: 'No failed items to retry',
      });
    }

    const batch = await processor.retryFailedItems(batchId, ctx.tenantId);

    // Log audit
    await logAudit(supabase, {
      tenantId: ctx.tenantId,
      entityType: 'batch',
      entityId: batchId,
      action: 'retried',
      actorType: ctx.actorType,
      actorId: ctx.actorId || ctx.userId || ctx.apiKeyId || 'unknown',
      actorName: ctx.actorName || ctx.userName || 'API',
      metadata: {
        retriedItems: existingBatch.failedItems,
        nowCompleted: batch.completedItems,
        stillFailed: batch.failedItems,
      },
    });

    return c.json({
      data: batch,
      message: `Retried ${existingBatch.failedItems} failed items`,
    });

  } catch (error: any) {
    console.error('Error retrying batch:', error);
    return c.json({
      error: 'Failed to retry batch',
      message: error.message,
    }, 500);
  }
});

/**
 * POST /v1/transfers/batch/:id/cancel
 * Cancel a pending batch
 */
batch.post('/:id/cancel', async (c) => {
  const ctx = c.get('ctx');
  const batchId = c.req.param('id');
  const supabase = createClient();
  const processor = createBatchProcessor(supabase);

  if (!isValidUUID(batchId)) {
    throw new ValidationError('Invalid batch ID format');
  }

  try {
    const batch = await processor.cancelBatch(batchId, ctx.tenantId);

    // Log audit
    await logAudit(supabase, {
      tenantId: ctx.tenantId,
      entityType: 'batch',
      entityId: batchId,
      action: 'cancelled',
      actorType: ctx.actorType,
      actorId: ctx.actorId || ctx.userId || ctx.apiKeyId || 'unknown',
      actorName: ctx.actorName || ctx.userName || 'API',
    });

    return c.json({
      data: batch,
      message: 'Batch cancelled successfully',
    });

  } catch (error: any) {
    console.error('Error cancelling batch:', error);
    
    if (error.message.includes('Cannot cancel')) {
      throw new ValidationError(error.message);
    }
    if (error.message === 'Batch not found') {
      throw new NotFoundError('Batch', batchId);
    }
    
    return c.json({
      error: 'Failed to cancel batch',
      message: error.message,
    }, 500);
  }
});

/**
 * POST /v1/transfers/batch/csv
 * Upload CSV file to create batch
 */
batch.post('/csv', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  const processor = createBatchProcessor(supabase);

  try {
    // Get form data
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string || 'CSV Upload';
    const type = (formData.get('type') as string) || 'payout';
    const webhookUrl = formData.get('webhookUrl') as string;
    const autoProcess = formData.get('autoProcess') === 'true';

    if (!file) {
      throw new ValidationError('CSV file is required');
    }

    // Read file content
    const csvContent = await file.text();

    // Parse CSV
    const items = processor.parseCSV(csvContent);

    if (items.length === 0) {
      throw new ValidationError('CSV file contains no valid items');
    }

    if (items.length > 1000) {
      throw new ValidationError('CSV file exceeds maximum of 1000 items');
    }

    // Create batch using parsed items
    const batch = await processor.createBatch({
      tenantId: ctx.tenantId,
      name,
      description: `Uploaded from ${file.name}`,
      type: type as any,
      items,
      webhookUrl,
      createdBy: {
        type: ctx.actorType,
        id: ctx.actorId || ctx.userId || ctx.apiKeyId,
        name: ctx.actorName || ctx.userName,
      },
    });

    // Validate
    const validation = await processor.validateBatch(batch.id, ctx.tenantId);

    // Auto-process if requested
    if (autoProcess && validation.isValid) {
      const processedBatch = await processor.processBatch(batch.id, ctx.tenantId);
      return c.json({
        data: processedBatch,
        validation,
        message: 'CSV batch created and processed',
        parsedItems: items.length,
      }, 201);
    }

    return c.json({
      data: batch,
      validation,
      message: `CSV batch created with ${items.length} items`,
      parsedItems: items.length,
    }, 201);

  } catch (error: any) {
    console.error('Error processing CSV batch:', error);
    
    if (error instanceof ValidationError) {
      throw error;
    }
    
    return c.json({
      error: 'Failed to process CSV',
      message: error.message,
    }, 500);
  }
});

export default batch;

