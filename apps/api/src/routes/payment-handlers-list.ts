/**
 * Payment Handlers List API
 * GET /v1/payment-handlers — list active handlers from payment_handlers table
 *
 * Returns global handlers (tenant_id IS NULL) plus tenant-specific handlers.
 * Excludes sensitive fields (webhook_config, validation_config, credentials).
 */

import { Hono } from 'hono';
import { createClient } from '../db/client.js';

const paymentHandlersList = new Hono();

paymentHandlersList.get('/', async (c) => {
  const ctx = c.get('ctx') as { tenantId: string };
  const supabase = createClient();

  // Fetch global handlers (tenant_id IS NULL) and tenant-specific handlers
  const { data, error } = await supabase
    .from('payment_handlers')
    .select('id, display_name, name, version, status, supported_types, supported_currencies, integration_mode, metadata, tenant_id, created_at, updated_at')
    .or(`tenant_id.is.null,tenant_id.eq.${ctx.tenantId}`)
    .eq('status', 'active')
    .order('display_name');

  if (error) {
    console.error('Failed to fetch payment handlers:', error);
    return c.json({ error: 'Failed to fetch payment handlers' }, 500);
  }

  return c.json({
    data: (data || []).map((handler) => ({
      id: handler.id,
      displayName: handler.display_name,
      description: handler.metadata?.description || `${handler.display_name} payment handler`,
      status: handler.status,
      integrationMode: handler.integration_mode,
      supportedTypes: handler.supported_types,
      supportedCurrencies: handler.supported_currencies,
      scope: handler.tenant_id ? 'tenant' : 'global',
      version: handler.version,
      createdAt: handler.created_at,
      updatedAt: handler.updated_at,
    })),
  });
});

export default paymentHandlersList;
