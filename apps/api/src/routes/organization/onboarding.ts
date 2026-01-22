/**
 * Organization Onboarding Routes
 *
 * Story 51.7: Onboarding State Tracking
 *
 * @see Epic 51: Unified Platform Onboarding
 */

import { Hono } from 'hono';
import { createClient } from '../../db/client.js';
import { authMiddleware } from '../../middleware/auth.js';
import { getTenantOnboardingState, getProtocolOnboardingState } from '../../services/onboarding/index.js';

const app = new Hono();

// Apply auth middleware
app.use('*', authMiddleware);

// ============================================
// GET /v1/organization/onboarding-status
// ============================================

/**
 * Get the complete onboarding status for the organization.
 *
 * Returns:
 * - Overall completion percentage
 * - Protocol-specific progress
 * - Prerequisites status
 * - Recommended next steps
 *
 * @see Story 51.7: Onboarding State Tracking
 */
app.get('/', async (c) => {
  const ctx = c.get('ctx');

  if (!ctx?.tenantId) {
    return c.json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Not authenticated',
      },
    }, 401);
  }

  try {
    const supabase = createClient();
    const state = await getTenantOnboardingState(supabase, ctx.tenantId);

    // Build response in the format specified by Story 51.7
    const response = {
      overall: {
        completed: state.overall_progress === 100,
        completion_percentage: state.overall_progress,
      },
      protocols: {} as Record<string, any>,
      prerequisites: {
        has_wallet: state.has_wallet,
        has_payment_handler: state.has_payment_handler,
        has_any_protocol_enabled: state.has_any_protocol_enabled,
      },
      recommended_template: state.recommended_template_id || null,
      sandbox_mode: state.sandbox_mode,
    };

    // Transform protocol states to the expected format
    for (const [protocolId, protocolState] of Object.entries(state.protocols)) {
      response.protocols[protocolId] = {
        enabled: protocolState.enabled,
        prerequisites_met: protocolState.prerequisites_met,
        steps: protocolState.steps.map((step: any) => ({
          id: step.id,
          name: step.name,
          completed: step.status === 'completed',
          completed_at: step.completed_at,
        })),
        current_step: protocolState.current_step_index,
        progress_percentage: protocolState.progress_percentage,
      };
    }

    return c.json(response);
  } catch (error) {
    console.error('Failed to get onboarding status:', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get onboarding status',
      },
    }, 500);
  }
});

/**
 * GET /v1/organization/onboarding-status/:protocolId
 * Get onboarding status for a specific protocol
 */
app.get('/:protocolId', async (c) => {
  const ctx = c.get('ctx');
  const protocolId = c.req.param('protocolId');

  if (!ctx?.tenantId) {
    return c.json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Not authenticated',
      },
    }, 401);
  }

  const validProtocols = ['x402', 'ap2', 'acp', 'ucp'];
  if (!validProtocols.includes(protocolId)) {
    return c.json({
      error: {
        code: 'INVALID_PROTOCOL',
        message: `Invalid protocol: ${protocolId}`,
        suggestion: `Valid protocols are: ${validProtocols.join(', ')}`,
      },
    }, 400);
  }

  try {
    const supabase = createClient();
    const state = await getProtocolOnboardingState(supabase, ctx.tenantId, protocolId as any);

    if (!state) {
      return c.json({
        error: {
          code: 'PROTOCOL_NOT_FOUND',
          message: `Protocol ${protocolId} not found`,
        },
      }, 404);
    }

    return c.json({
      protocol_id: protocolId,
      enabled: state.enabled,
      prerequisites_met: state.prerequisites_met,
      progress_percentage: state.progress_percentage,
      current_step: state.current_step_index,
      steps: state.steps.map((step: any) => ({
        id: step.id,
        name: step.name,
        description: step.description,
        status: step.status,
        completed: step.status === 'completed',
        completed_at: step.completed_at,
        action_label: step.action_label,
        action_path: step.action_path,
        is_skippable: step.is_skippable,
      })),
    });
  } catch (error) {
    console.error('Failed to get protocol onboarding status:', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get protocol onboarding status',
      },
    }, 500);
  }
});

export default app;
