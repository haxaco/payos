/**
 * Workflow Engine API Routes
 *
 * Epic 29: Composable, multi-step workflow processes
 *
 * Endpoints:
 * - POST   /v1/workflows/templates           - Create template (29.1)
 * - GET    /v1/workflows/templates           - List templates (29.1)
 * - GET    /v1/workflows/templates/:id       - Get template (29.1)
 * - PUT    /v1/workflows/templates/:id       - Update template (29.1)
 * - DELETE /v1/workflows/templates/:id       - Delete template (29.1)
 * - POST   /v1/workflows/instances           - Create instance (29.2)
 * - GET    /v1/workflows/instances           - List instances (29.2)
 * - GET    /v1/workflows/instances/:id       - Get instance with steps (29.2)
 * - POST   /v1/workflows/instances/:id/cancel - Cancel instance (29.2)
 * - POST   /v1/workflows/instances/:id/steps/:n/approve - Approve step (29.3)
 * - POST   /v1/workflows/instances/:id/steps/:n/reject  - Reject step (29.3)
 * - POST   /v1/workflows/instances/:id/advance          - Agent advance (29.12)
 * - POST   /v1/workflows/instances/:id/steps/:n/complete-external - Complete external (29.13)
 * - GET    /v1/workflows/pending             - Pending approvals (29.9)
 * - POST   /v1/workflows/agents/:agentId/permissions - Set agent permissions (29.12)
 * - GET    /v1/workflows/agents/:agentId/permissions  - Get agent permissions (29.12)
 * - POST   /v1/workflows/timeouts            - Process timeouts (29.8)
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '../db/client.js';
import {
  createWorkflowEngine,
  type WorkflowStepType,
  type WorkflowTriggerType,
  type WorkflowInstanceStatus,
} from '../services/workflow-engine.js';

const app = new Hono();

// ============================================
// Validation Schemas
// ============================================

const stepDefinitionSchema = z.object({
  type: z.enum(['approval', 'condition', 'action', 'wait', 'notification', 'external']),
  name: z.string().min(1).max(200),
  config: z.record(z.unknown()).default({}),
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  trigger_type: z.enum(['manual', 'on_transfer', 'on_event']).optional().default('manual'),
  trigger_config: z.record(z.unknown()).optional(),
  steps: z.array(stepDefinitionSchema).min(1).max(50),
  is_active: z.boolean().optional(),
  timeout_hours: z.number().min(1).max(8760).optional(), // max 1 year
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  trigger_type: z.enum(['manual', 'on_transfer', 'on_event']).optional(),
  trigger_config: z.record(z.unknown()).optional(),
  steps: z.array(stepDefinitionSchema).min(1).max(50).optional(),
  is_active: z.boolean().optional(),
  timeout_hours: z.number().min(1).max(8760).optional(),
});

const createInstanceSchema = z.object({
  template_id: z.string().uuid(),
  trigger_data: z.record(z.unknown()).optional(),
  agent_context: z.record(z.unknown()).optional(),
});

const approvalSchema = z.object({
  reason: z.string().max(1000).optional(),
  agent_reasoning: z.string().max(2000).optional(),
});

const completeExternalSchema = z.object({
  status: z.enum(['completed', 'failed']),
  result: z.record(z.unknown()).optional(),
  error: z.string().max(2000).optional(),
  signature: z.string().optional(),
});

const setAgentPermissionsSchema = z.object({
  template_id: z.string().uuid(),
  can_initiate: z.boolean().optional(),
  can_approve: z.boolean().optional(),
  approval_conditions: z.record(z.unknown()).optional(),
});

// ============================================
// Template Routes (Story 29.1)
// ============================================

/**
 * POST /v1/workflows/templates
 */
app.post('/templates', async (c) => {
  try {
    const ctx = c.get('ctx');
    const body = await c.req.json();
    const validated = createTemplateSchema.parse(body);

    const supabase = createClient();
    const engine = createWorkflowEngine(supabase);

    const template = await engine.createTemplate(ctx.tenantId, {
      name: validated.name,
      description: validated.description,
      triggerType: validated.trigger_type as WorkflowTriggerType,
      triggerConfig: validated.trigger_config,
      steps: validated.steps.map(s => ({
        type: s.type as WorkflowStepType,
        name: s.name,
        config: s.config,
      })),
      isActive: validated.is_active,
      timeoutHours: validated.timeout_hours,
      createdBy: ctx.userId || ctx.actorId || ctx.apiKeyId,
    });

    return c.json(mapTemplateResponse(template), 201);
  } catch (error) {
    return handleError(c, error, 'POST /v1/workflows/templates');
  }
});

/**
 * GET /v1/workflows/templates
 */
app.get('/templates', async (c) => {
  try {
    const ctx = c.get('ctx');
    const query = c.req.query();

    const supabase = createClient();
    const engine = createWorkflowEngine(supabase);

    const { data, total } = await engine.listTemplates(ctx.tenantId, {
      isActive: query.is_active !== undefined ? query.is_active === 'true' : undefined,
      triggerType: query.trigger_type as WorkflowTriggerType | undefined,
      limit: query.limit ? parseInt(query.limit) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
    });

    return c.json({
      data: data.map(mapTemplateResponse),
      pagination: {
        total,
        limit: parseInt(query.limit || '50'),
        offset: parseInt(query.offset || '0'),
        hasMore: parseInt(query.offset || '0') + data.length < total,
      },
    });
  } catch (error) {
    return handleError(c, error, 'GET /v1/workflows/templates');
  }
});

/**
 * GET /v1/workflows/templates/:id
 */
app.get('/templates/:id', async (c) => {
  try {
    const ctx = c.get('ctx');
    const { id } = c.req.param();

    const supabase = createClient();
    const engine = createWorkflowEngine(supabase);

    const template = await engine.getTemplate(ctx.tenantId, id);
    if (!template) return c.json({ error: 'Template not found' }, 404);

    return c.json(mapTemplateResponse(template));
  } catch (error) {
    return handleError(c, error, 'GET /v1/workflows/templates/:id');
  }
});

/**
 * PUT /v1/workflows/templates/:id
 */
app.put('/templates/:id', async (c) => {
  try {
    const ctx = c.get('ctx');
    const { id } = c.req.param();
    const body = await c.req.json();
    const validated = updateTemplateSchema.parse(body);

    const supabase = createClient();
    const engine = createWorkflowEngine(supabase);

    const template = await engine.updateTemplate(ctx.tenantId, id, {
      name: validated.name,
      description: validated.description,
      triggerType: validated.trigger_type as WorkflowTriggerType | undefined,
      triggerConfig: validated.trigger_config,
      steps: validated.steps?.map(s => ({
        type: s.type as WorkflowStepType,
        name: s.name,
        config: s.config,
      })),
      isActive: validated.is_active,
      timeoutHours: validated.timeout_hours,
    });

    return c.json(mapTemplateResponse(template));
  } catch (error) {
    return handleError(c, error, 'PUT /v1/workflows/templates/:id');
  }
});

/**
 * DELETE /v1/workflows/templates/:id
 */
app.delete('/templates/:id', async (c) => {
  try {
    const ctx = c.get('ctx');
    const { id } = c.req.param();

    const supabase = createClient();
    const engine = createWorkflowEngine(supabase);

    await engine.deleteTemplate(ctx.tenantId, id);
    return c.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    return handleError(c, error, 'DELETE /v1/workflows/templates/:id');
  }
});

// ============================================
// Instance Routes (Story 29.2)
// ============================================

/**
 * POST /v1/workflows/instances
 */
app.post('/instances', async (c) => {
  try {
    const ctx = c.get('ctx');
    const body = await c.req.json();
    const validated = createInstanceSchema.parse(body);

    const supabase = createClient();
    const engine = createWorkflowEngine(supabase);

    const instance = await engine.createInstance(ctx.tenantId, {
      templateId: validated.template_id,
      triggerData: validated.trigger_data,
      initiatedBy: ctx.userId || ctx.actorId || ctx.apiKeyId,
      initiatedByType: ctx.actorType === 'agent' ? 'agent' : ctx.actorType === 'user' ? 'user' : 'api_key',
      initiatedByAgentId: ctx.actorType === 'agent' ? ctx.actorId : undefined,
      agentContext: validated.agent_context,
    });

    return c.json(mapInstanceResponse(instance), 201);
  } catch (error) {
    return handleError(c, error, 'POST /v1/workflows/instances');
  }
});

/**
 * GET /v1/workflows/instances
 */
app.get('/instances', async (c) => {
  try {
    const ctx = c.get('ctx');
    const query = c.req.query();

    const supabase = createClient();
    const engine = createWorkflowEngine(supabase);

    const { data, total } = await engine.listInstances(ctx.tenantId, {
      status: query.status as WorkflowInstanceStatus | undefined,
      templateId: query.template_id,
      initiatedByAgentId: query.agent_id,
      limit: query.limit ? parseInt(query.limit) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
    });

    return c.json({
      data: data.map(mapInstanceResponse),
      pagination: {
        total,
        limit: parseInt(query.limit || '50'),
        offset: parseInt(query.offset || '0'),
        hasMore: parseInt(query.offset || '0') + data.length < total,
      },
    });
  } catch (error) {
    return handleError(c, error, 'GET /v1/workflows/instances');
  }
});

/**
 * GET /v1/workflows/instances/:id
 */
app.get('/instances/:id', async (c) => {
  try {
    const ctx = c.get('ctx');
    const { id } = c.req.param();

    const supabase = createClient();
    const engine = createWorkflowEngine(supabase);

    const result = await engine.getInstanceWithSteps(ctx.tenantId, id);
    if (!result) return c.json({ error: 'Instance not found' }, 404);

    return c.json({
      ...mapInstanceResponse(result.instance),
      steps: result.steps.map(mapStepResponse),
    });
  } catch (error) {
    return handleError(c, error, 'GET /v1/workflows/instances/:id');
  }
});

/**
 * POST /v1/workflows/instances/:id/cancel
 */
app.post('/instances/:id/cancel', async (c) => {
  try {
    const ctx = c.get('ctx');
    const { id } = c.req.param();

    const supabase = createClient();
    const engine = createWorkflowEngine(supabase);

    const instance = await engine.cancelInstance(ctx.tenantId, id);
    return c.json({ success: true, message: 'Workflow cancelled', data: mapInstanceResponse(instance) });
  } catch (error) {
    return handleError(c, error, 'POST /v1/workflows/instances/:id/cancel');
  }
});

// ============================================
// Step Approval Routes (Story 29.3)
// ============================================

/**
 * POST /v1/workflows/instances/:id/steps/:n/approve
 */
app.post('/instances/:id/steps/:n/approve', async (c) => {
  try {
    const ctx = c.get('ctx');
    const { id, n } = c.req.param();
    const stepIndex = parseInt(n);
    if (isNaN(stepIndex)) return c.json({ error: 'Invalid step index' }, 400);

    const body = await c.req.json().catch(() => ({}));
    const validated = approvalSchema.parse(body);

    const supabase = createClient();
    const engine = createWorkflowEngine(supabase);

    const step = await engine.approveStep(ctx.tenantId, id, stepIndex, {
      decision: 'approved',
      approvedBy: ctx.userId || ctx.actorId || ctx.apiKeyId || 'unknown',
      reason: validated.reason,
      approvedByAgentId: ctx.actorType === 'agent' ? ctx.actorId : undefined,
      agentReasoning: validated.agent_reasoning,
    });

    return c.json({ success: true, message: 'Step approved', data: mapStepResponse(step) });
  } catch (error) {
    return handleError(c, error, 'POST /v1/workflows/instances/:id/steps/:n/approve');
  }
});

/**
 * POST /v1/workflows/instances/:id/steps/:n/reject
 */
app.post('/instances/:id/steps/:n/reject', async (c) => {
  try {
    const ctx = c.get('ctx');
    const { id, n } = c.req.param();
    const stepIndex = parseInt(n);
    if (isNaN(stepIndex)) return c.json({ error: 'Invalid step index' }, 400);

    const body = await c.req.json().catch(() => ({}));
    const validated = approvalSchema.parse(body);

    const supabase = createClient();
    const engine = createWorkflowEngine(supabase);

    const step = await engine.approveStep(ctx.tenantId, id, stepIndex, {
      decision: 'rejected',
      approvedBy: ctx.userId || ctx.actorId || ctx.apiKeyId || 'unknown',
      reason: validated.reason,
      approvedByAgentId: ctx.actorType === 'agent' ? ctx.actorId : undefined,
      agentReasoning: validated.agent_reasoning,
    });

    return c.json({ success: true, message: 'Step rejected', data: mapStepResponse(step) });
  } catch (error) {
    return handleError(c, error, 'POST /v1/workflows/instances/:id/steps/:n/reject');
  }
});

// ============================================
// Agent Advance Route (Story 29.12)
// ============================================

/**
 * POST /v1/workflows/instances/:id/advance
 */
app.post('/instances/:id/advance', async (c) => {
  try {
    const ctx = c.get('ctx');
    const { id } = c.req.param();

    const supabase = createClient();
    const engine = createWorkflowEngine(supabase);

    const instance = await engine.advanceInstance(ctx.tenantId, id);
    return c.json({ success: true, data: mapInstanceResponse(instance) });
  } catch (error) {
    return handleError(c, error, 'POST /v1/workflows/instances/:id/advance');
  }
});

// ============================================
// External Step Completion (Story 29.13)
// ============================================

/**
 * POST /v1/workflows/instances/:id/steps/:n/complete-external
 */
app.post('/instances/:id/steps/:n/complete-external', async (c) => {
  try {
    const ctx = c.get('ctx');
    const { id, n } = c.req.param();
    const stepIndex = parseInt(n);
    if (isNaN(stepIndex)) return c.json({ error: 'Invalid step index' }, 400);

    const body = await c.req.json();
    const validated = completeExternalSchema.parse(body);

    const supabase = createClient();
    const engine = createWorkflowEngine(supabase);

    const step = await engine.completeExternalStep(ctx.tenantId, id, stepIndex, {
      status: validated.status,
      result: validated.result,
      error: validated.error,
      signature: validated.signature,
    });

    return c.json({ success: true, data: mapStepResponse(step) });
  } catch (error) {
    return handleError(c, error, 'POST /v1/workflows/instances/:id/steps/:n/complete-external');
  }
});

// ============================================
// Pending Workflows API (Story 29.9)
// ============================================

/**
 * GET /v1/workflows/pending
 */
app.get('/pending', async (c) => {
  try {
    const ctx = c.get('ctx');
    const query = c.req.query();

    const supabase = createClient();
    const engine = createWorkflowEngine(supabase);

    const { data, total } = await engine.getPendingApprovals(ctx.tenantId, {
      limit: query.limit ? parseInt(query.limit) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
    });

    return c.json({
      data: data.map(mapStepResponse),
      pagination: {
        total,
        limit: parseInt(query.limit || '50'),
        offset: parseInt(query.offset || '0'),
        hasMore: parseInt(query.offset || '0') + data.length < total,
      },
    });
  } catch (error) {
    return handleError(c, error, 'GET /v1/workflows/pending');
  }
});

// ============================================
// Agent Permissions Routes (Story 29.12)
// ============================================

/**
 * POST /v1/workflows/agents/:agentId/permissions
 */
app.post('/agents/:agentId/permissions', async (c) => {
  try {
    const ctx = c.get('ctx');
    const { agentId } = c.req.param();
    const body = await c.req.json();
    const validated = setAgentPermissionsSchema.parse(body);

    const supabase = createClient();
    const engine = createWorkflowEngine(supabase);

    const perm = await engine.setAgentPermission(ctx.tenantId, agentId, validated.template_id, {
      canInitiate: validated.can_initiate,
      canApprove: validated.can_approve,
      approvalConditions: validated.approval_conditions,
    });

    return c.json(mapPermissionResponse(perm), 201);
  } catch (error) {
    return handleError(c, error, 'POST /v1/workflows/agents/:agentId/permissions');
  }
});

/**
 * GET /v1/workflows/agents/:agentId/permissions
 */
app.get('/agents/:agentId/permissions', async (c) => {
  try {
    const ctx = c.get('ctx');
    const { agentId } = c.req.param();

    const supabase = createClient();
    const engine = createWorkflowEngine(supabase);

    const permissions = await engine.listAgentPermissions(ctx.tenantId, agentId);
    return c.json({ data: permissions.map(mapPermissionResponse) });
  } catch (error) {
    return handleError(c, error, 'GET /v1/workflows/agents/:agentId/permissions');
  }
});

// ============================================
// Timeout Processing (Story 29.8)
// ============================================

/**
 * POST /v1/workflows/timeouts
 * Admin endpoint to process expired workflows and steps
 */
app.post('/timeouts', async (c) => {
  try {
    const ctx = c.get('ctx');

    // Only allow users with admin role (or service calls)
    if (ctx.actorType === 'user' && ctx.userRole !== 'owner' && ctx.userRole !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const supabase = createClient();
    const engine = createWorkflowEngine(supabase);

    const result = await engine.processTimeouts();
    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleError(c, error, 'POST /v1/workflows/timeouts');
  }
});

// ============================================
// Response Mappers
// ============================================

function mapTemplateResponse(template: any) {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    trigger_type: template.triggerType,
    trigger_config: template.triggerConfig,
    steps: template.steps,
    is_active: template.isActive,
    version: template.version,
    timeout_hours: template.timeoutHours,
    created_by: template.createdBy,
    created_at: template.createdAt,
    updated_at: template.updatedAt,
  };
}

function mapInstanceResponse(instance: any) {
  return {
    id: instance.id,
    template_id: instance.templateId,
    template_version: instance.templateVersion,
    status: instance.status,
    current_step_index: instance.currentStepIndex,
    trigger_data: instance.triggerData,
    context: instance.context,
    initiated_by: instance.initiatedBy,
    initiated_by_type: instance.initiatedByType,
    initiated_by_agent_id: instance.initiatedByAgentId,
    agent_context: instance.agentContext,
    started_at: instance.startedAt,
    completed_at: instance.completedAt,
    timeout_at: instance.timeoutAt,
    error: instance.error,
    created_at: instance.createdAt,
    updated_at: instance.updatedAt,
  };
}

function mapStepResponse(step: any) {
  return {
    id: step.id,
    instance_id: step.instanceId,
    step_index: step.stepIndex,
    step_type: step.stepType,
    step_name: step.stepName,
    step_config: step.stepConfig,
    status: step.status,
    input: step.input,
    output: step.output,
    error: step.error,
    approved_by: step.approvedBy,
    approval_decision: step.approvalDecision,
    approval_reason: step.approvalReason,
    approved_by_agent_id: step.approvedByAgentId,
    agent_reasoning: step.agentReasoning,
    external_request: step.externalRequest,
    external_response: step.externalResponse,
    started_at: step.startedAt,
    completed_at: step.completedAt,
    expires_at: step.expiresAt,
    created_at: step.createdAt,
    updated_at: step.updatedAt,
  };
}

function mapPermissionResponse(perm: any) {
  return {
    id: perm.id,
    agent_id: perm.agentId,
    template_id: perm.templateId,
    can_initiate: perm.canInitiate,
    can_approve: perm.canApprove,
    approval_conditions: perm.approvalConditions,
    created_at: perm.createdAt,
    updated_at: perm.updatedAt,
  };
}

// ============================================
// Error Handler
// ============================================

function handleError(c: any, error: unknown, endpoint: string) {
  if (error instanceof z.ZodError) {
    return c.json({ error: 'Validation failed', details: error.errors }, 400);
  }
  if (error instanceof Error) {
    if (error.message.includes('not found')) {
      return c.json({ error: error.message }, 404);
    }
    if (error.message.includes('already exists')) {
      return c.json({ error: error.message }, 409);
    }
    if (error.message.includes('not active') || error.message.includes('Cannot cancel') ||
        error.message.includes('not waiting') || error.message.includes('not pending') ||
        error.message.includes('Cannot advance') || error.message.includes('no steps') ||
        error.message.includes('has no steps')) {
      return c.json({ error: error.message }, 400);
    }
    if (error.message.includes('permission') || error.message.includes('authorized')) {
      return c.json({ error: error.message }, 403);
    }
    if (error.message.includes('Invalid callback signature')) {
      return c.json({ error: error.message }, 401);
    }
  }
  console.error(`Error in ${endpoint}:`, error);
  return c.json({ error: 'Internal server error' }, 500);
}

export default app;
