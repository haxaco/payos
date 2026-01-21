/**
 * Onboarding API
 * Epic 51: Unified platform onboarding endpoints
 */

import { Hono } from 'hono';
import { createClient } from '../db/client';
import {
  getTenantOnboardingState,
  getProtocolOnboardingState,
  updateOnboardingProgress,
  skipOnboardingStep,
  resetProtocolOnboarding,
  getQuickStartTemplates,
  getQuickStartTemplate,
  setSandboxMode,
  ProtocolId,
  OnboardingStepStatus,
} from '../services/onboarding';

const app = new Hono();

/**
 * GET /v1/onboarding
 * Get complete onboarding state for the organization
 */
app.get('/', async (c) => {
  const ctx = c.get('ctx');
  if (!ctx?.tenantId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const supabase = createClient();
    const state = await getTenantOnboardingState(supabase, ctx.tenantId);
    return c.json(state);
  } catch (error) {
    console.error('Failed to get onboarding state:', error);
    return c.json({ error: 'Failed to get onboarding state' }, 500);
  }
});

/**
 * GET /v1/onboarding/protocols/:protocolId
 * Get onboarding state for a specific protocol
 */
app.get('/protocols/:protocolId', async (c) => {
  const ctx = c.get('ctx');
  if (!ctx?.tenantId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const protocolId = c.req.param('protocolId') as ProtocolId;
  const validProtocols = ['x402', 'ap2', 'acp', 'ucp'];

  if (!validProtocols.includes(protocolId)) {
    return c.json({
      error: 'Invalid protocol',
      details: { valid_protocols: validProtocols },
    }, 400);
  }

  try {
    const supabase = createClient();
    const state = await getProtocolOnboardingState(supabase, ctx.tenantId, protocolId);

    if (!state) {
      return c.json({ error: 'Protocol not found' }, 404);
    }

    return c.json(state);
  } catch (error) {
    console.error('Failed to get protocol onboarding state:', error);
    return c.json({ error: 'Failed to get protocol onboarding state' }, 500);
  }
});

/**
 * POST /v1/onboarding/protocols/:protocolId/steps/:stepId/complete
 * Mark an onboarding step as completed
 */
app.post('/protocols/:protocolId/steps/:stepId/complete', async (c) => {
  const ctx = c.get('ctx');
  if (!ctx?.tenantId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const protocolId = c.req.param('protocolId') as ProtocolId;
  const stepId = c.req.param('stepId');
  const validProtocols = ['x402', 'ap2', 'acp', 'ucp'];

  if (!validProtocols.includes(protocolId)) {
    return c.json({ error: 'Invalid protocol' }, 400);
  }

  try {
    const supabase = createClient();
    const result = await updateOnboardingProgress(supabase, ctx.tenantId, {
      protocol_id: protocolId,
      step_id: stepId,
      status: 'completed',
    });

    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }

    // Return updated state
    const state = await getProtocolOnboardingState(supabase, ctx.tenantId, protocolId);
    return c.json(state);
  } catch (error) {
    console.error('Failed to complete onboarding step:', error);
    return c.json({ error: 'Failed to complete onboarding step' }, 500);
  }
});

/**
 * POST /v1/onboarding/protocols/:protocolId/steps/:stepId/skip
 * Skip an onboarding step
 */
app.post('/protocols/:protocolId/steps/:stepId/skip', async (c) => {
  const ctx = c.get('ctx');
  if (!ctx?.tenantId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const protocolId = c.req.param('protocolId') as ProtocolId;
  const stepId = c.req.param('stepId');
  const validProtocols = ['x402', 'ap2', 'acp', 'ucp'];

  if (!validProtocols.includes(protocolId)) {
    return c.json({ error: 'Invalid protocol' }, 400);
  }

  try {
    const supabase = createClient();
    const result = await skipOnboardingStep(supabase, ctx.tenantId, protocolId, stepId);

    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }

    // Return updated state
    const state = await getProtocolOnboardingState(supabase, ctx.tenantId, protocolId);
    return c.json(state);
  } catch (error) {
    console.error('Failed to skip onboarding step:', error);
    return c.json({ error: 'Failed to skip onboarding step' }, 500);
  }
});

/**
 * POST /v1/onboarding/protocols/:protocolId/reset
 * Reset onboarding progress for a protocol
 */
app.post('/protocols/:protocolId/reset', async (c) => {
  const ctx = c.get('ctx');
  if (!ctx?.tenantId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const protocolId = c.req.param('protocolId') as ProtocolId;
  const validProtocols = ['x402', 'ap2', 'acp', 'ucp'];

  if (!validProtocols.includes(protocolId)) {
    return c.json({ error: 'Invalid protocol' }, 400);
  }

  try {
    const supabase = createClient();
    const result = await resetProtocolOnboarding(supabase, ctx.tenantId, protocolId);

    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }

    // Return updated state
    const state = await getProtocolOnboardingState(supabase, ctx.tenantId, protocolId);
    return c.json(state);
  } catch (error) {
    console.error('Failed to reset onboarding:', error);
    return c.json({ error: 'Failed to reset onboarding' }, 500);
  }
});

/**
 * GET /v1/onboarding/templates
 * Get all quick start templates
 */
app.get('/templates', async (c) => {
  const templates = getQuickStartTemplates();
  return c.json({ data: templates });
});

/**
 * GET /v1/onboarding/templates/:templateId
 * Get a specific quick start template
 */
app.get('/templates/:templateId', async (c) => {
  const templateId = c.req.param('templateId');
  const template = getQuickStartTemplate(templateId);

  if (!template) {
    return c.json({ error: 'Template not found' }, 404);
  }

  return c.json(template);
});

/**
 * POST /v1/onboarding/sandbox
 * Toggle sandbox mode
 */
app.post('/sandbox', async (c) => {
  const ctx = c.get('ctx');
  if (!ctx?.tenantId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json();
  const enabled = body.enabled ?? true;

  try {
    const supabase = createClient();
    const result = await setSandboxMode(supabase, ctx.tenantId, enabled);

    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }

    return c.json({ success: true, sandbox_mode: enabled });
  } catch (error) {
    console.error('Failed to set sandbox mode:', error);
    return c.json({ error: 'Failed to set sandbox mode' }, 500);
  }
});

export default app;
