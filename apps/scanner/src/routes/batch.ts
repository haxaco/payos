import { Hono } from 'hono';
import { z } from 'zod';
import { BatchProcessor } from '../queue/batch-processor.js';
import * as queries from '../db/queries.js';

export const batchRouter = new Hono();

const DEFAULT_TENANT_ID = process.env.SCANNER_TENANT_ID || 'dad4308f-f9b6-4529-a406-7c2bdf3c6071';
const batchProcessor = new BatchProcessor();

const batchRequestSchema = z.object({
  domains: z.array(z.object({
    domain: z.string().min(1),
    merchant_name: z.string().optional(),
    merchant_category: z.string().optional(),
    country_code: z.string().optional(),
    region: z.string().optional(),
  })).min(1).max(parseInt(process.env.SCANNER_MAX_BATCH_SIZE || '500')),
  name: z.string().optional(),
  description: z.string().optional(),
  skip_if_fresh: z.boolean().optional().default(true),
});

// POST /v1/scanner/scan/batch — submit a batch scan
batchRouter.post('/scan/batch', async (c) => {
  const tenantId = c.req.header('x-tenant-id') || DEFAULT_TENANT_ID;

  // Check content type for CSV upload
  const contentType = c.req.header('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    const csvText = await file.text();
    const { parseCSV } = await import('../queue/csv-parser.js');
    const domains = await parseCSV(csvText);

    if (domains.length === 0) {
      return c.json({ error: 'No valid domains found in CSV' }, 400);
    }

    const batch = await queries.createBatch(tenantId, {
      name: formData.get('name')?.toString() || `CSV Batch ${new Date().toISOString()}`,
      description: formData.get('description')?.toString(),
      target_domains: domains.map(d => d.domain),
    });

    batchProcessor.processBatch(batch.id, tenantId, domains);

    return c.json({
      batch_id: batch.id,
      status: 'pending',
      total_targets: domains.length,
      message: 'Batch scan started',
    }, 202);
  }

  // JSON body
  const body = await c.req.json();
  const parsed = batchRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation error', details: parsed.error.flatten() }, 400);
  }

  const batch = await queries.createBatch(tenantId, {
    name: parsed.data.name || `Batch ${new Date().toISOString()}`,
    description: parsed.data.description,
    target_domains: parsed.data.domains.map(d => d.domain),
  });

  batchProcessor.processBatch(
    batch.id,
    tenantId,
    parsed.data.domains,
    { skipIfFresh: parsed.data.skip_if_fresh },
  );

  return c.json({
    batch_id: batch.id,
    status: 'pending',
    total_targets: parsed.data.domains.length,
    message: 'Batch scan started',
  }, 202);
});

// GET /v1/scanner/scan/batch/:id — batch progress
batchRouter.get('/scan/batch/:id', async (c) => {
  const id = c.req.param('id');
  const batch = await queries.getBatch(id);

  if (!batch) {
    return c.json({ error: 'Batch not found' }, 404);
  }

  return c.json(batch);
});

// DELETE /v1/scanner/scan/batch/:id — cancel batch
batchRouter.delete('/scan/batch/:id', async (c) => {
  const id = c.req.param('id');
  const batch = await queries.getBatch(id);

  if (!batch) {
    return c.json({ error: 'Batch not found' }, 404);
  }

  if (batch.status === 'completed' || batch.status === 'cancelled') {
    return c.json({ error: `Batch is already ${batch.status}` }, 400);
  }

  batchProcessor.cancelBatch(id);
  await queries.updateBatch(id, { status: 'cancelled' });

  return c.json({ status: 'cancelled', batch_id: id });
});
