/**
 * Protocol Enablement API
 * Epic 49, Story 49.3: Tenant-specific protocol management
 */

import { Hono } from 'hono';
import { createClient } from '../../db/client';
import {
  getOrganizationProtocolStatus,
  enableProtocol,
  disableProtocol,
  isValidProtocolId,
  getPrerequisiteMessage,
  ProtocolId,
} from '../../services/protocol-registry';

const app = new Hono();

/**
 * GET /v1/organization/protocol-status
 * Get current protocol enablement status for the organization
 */
app.get('/protocol-status', async (c) => {
  const ctx = c.get('ctx');
  if (!ctx?.tenantId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const supabase = createClient();
    const status = await getOrganizationProtocolStatus(supabase, ctx.tenantId);
    return c.json(status);
  } catch (error) {
    console.error('Failed to get protocol status:', error);
    return c.json({ error: 'Failed to get protocol status' }, 500);
  }
});

/**
 * POST /v1/organization/protocols/:id/enable
 * Enable a protocol for the organization
 */
app.post('/protocols/:id/enable', async (c) => {
  const ctx = c.get('ctx');
  if (!ctx?.tenantId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const protocolId = c.req.param('id');

  if (!isValidProtocolId(protocolId)) {
    return c.json(
      {
        error: 'Invalid protocol',
        details: {
          protocol: protocolId,
          available: ['x402', 'ap2', 'acp', 'ucp'],
        },
      },
      400
    );
  }

  try {
    const supabase = createClient();
    const result = await enableProtocol(supabase, ctx.tenantId, protocolId as ProtocolId);

    if (!result.success) {
      const statusCode = result.error === 'prerequisites_not_met' ? 400 : 500;
      return c.json(
        {
          error: result.error,
          details: {
            protocol: protocolId,
            missing: result.missing_prerequisites,
            message: result.missing_prerequisites
              ? getPrerequisiteMessage(protocolId as ProtocolId, result.missing_prerequisites)
              : undefined,
          },
        },
        statusCode
      );
    }

    // Log the action
    console.log(`Protocol ${protocolId} enabled for tenant ${ctx.tenantId}`);

    return c.json({
      success: true,
      protocol: protocolId,
      enabled_at: result.enabled_at,
    });
  } catch (error) {
    console.error('Failed to enable protocol:', error);
    return c.json({ error: 'Failed to enable protocol' }, 500);
  }
});

/**
 * POST /v1/organization/protocols/:id/disable
 * Disable a protocol for the organization
 */
app.post('/protocols/:id/disable', async (c) => {
  const ctx = c.get('ctx');
  if (!ctx?.tenantId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const protocolId = c.req.param('id');

  if (!isValidProtocolId(protocolId)) {
    return c.json(
      {
        error: 'Invalid protocol',
        details: {
          protocol: protocolId,
          available: ['x402', 'ap2', 'acp', 'ucp'],
        },
      },
      400
    );
  }

  try {
    const supabase = createClient();
    const result = await disableProtocol(supabase, ctx.tenantId, protocolId as ProtocolId);

    if (!result.success) {
      return c.json(
        {
          error: result.error,
          details: { protocol: protocolId },
        },
        500
      );
    }

    // Log the action
    console.log(`Protocol ${protocolId} disabled for tenant ${ctx.tenantId}`);

    return c.json({
      success: true,
      protocol: protocolId,
    });
  } catch (error) {
    console.error('Failed to disable protocol:', error);
    return c.json({ error: 'Failed to disable protocol' }, 500);
  }
});

export default app;
