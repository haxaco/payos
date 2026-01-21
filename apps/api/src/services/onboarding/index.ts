/**
 * Onboarding Service
 * Epic 51, Story 51.1-51.4: Unified platform onboarding
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  ProtocolId,
  OnboardingStep,
  OnboardingStepStatus,
  ProtocolOnboardingState,
  TenantOnboardingState,
  QuickStartTemplate,
  OnboardingProgressUpdate,
  PROTOCOL_ONBOARDING_STEPS,
  QUICK_START_TEMPLATES,
} from './types';
import { getOrganizationProtocolStatus } from '../protocol-registry';

export * from './types';

/**
 * Get the complete onboarding state for a tenant
 */
export async function getTenantOnboardingState(
  supabase: SupabaseClient,
  tenantId: string
): Promise<TenantOnboardingState> {
  // Get protocol status
  const protocolStatus = await getOrganizationProtocolStatus(supabase, tenantId);

  // Check for payment handlers
  const { data: handlers } = await supabase
    .from('connected_accounts')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .limit(1);
  const hasPaymentHandler = (handlers?.length || 0) > 0;

  // Check for wallets
  const { data: wallets } = await supabase
    .from('wallets')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .limit(1);
  const hasWallet = (wallets?.length || 0) > 0;

  // Get saved onboarding progress from tenant settings
  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const savedProgress = tenant?.settings?.onboarding_progress || {};

  // Build protocol states
  const protocols: Record<ProtocolId, ProtocolOnboardingState> = {} as Record<ProtocolId, ProtocolOnboardingState>;
  const protocolIds: ProtocolId[] = ['x402', 'ap2', 'acp', 'ucp'];

  for (const protocolId of protocolIds) {
    const status = protocolStatus.protocols[protocolId];
    const protocolProgress = savedProgress[protocolId] || {};

    protocols[protocolId] = await buildProtocolOnboardingState(
      supabase,
      tenantId,
      protocolId,
      status?.enabled || false,
      status?.prerequisites_met || false,
      protocolProgress,
      hasWallet,
      hasPaymentHandler
    );
  }

  // Calculate overall progress
  const enabledProtocols = Object.values(protocols).filter(p => p.enabled);
  const overallProgress = enabledProtocols.length > 0
    ? Math.round(enabledProtocols.reduce((sum, p) => sum + p.progress_percentage, 0) / enabledProtocols.length)
    : 0;

  // Determine recommended template
  const recommendedTemplate = determineRecommendedTemplate(
    hasWallet,
    hasPaymentHandler,
    protocols
  );

  // Check sandbox mode
  const sandboxMode = tenant?.settings?.sandbox_mode ?? true;

  return {
    tenant_id: tenantId,
    overall_progress: overallProgress,
    has_any_protocol_enabled: enabledProtocols.length > 0,
    has_payment_handler: hasPaymentHandler,
    has_wallet: hasWallet,
    protocols,
    recommended_template: recommendedTemplate,
    sandbox_mode: sandboxMode,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Build onboarding state for a single protocol
 */
async function buildProtocolOnboardingState(
  supabase: SupabaseClient,
  tenantId: string,
  protocolId: ProtocolId,
  enabled: boolean,
  prerequisitesMet: boolean,
  savedProgress: Record<string, OnboardingStepStatus>,
  hasWallet: boolean,
  hasPaymentHandler: boolean
): Promise<ProtocolOnboardingState> {
  const stepDefinitions = PROTOCOL_ONBOARDING_STEPS[protocolId];
  const protocolNames: Record<ProtocolId, string> = {
    x402: 'x402 Micropayments',
    ap2: 'AP2 Agent Payments',
    acp: 'Agent Commerce Protocol',
    ucp: 'Universal Commerce Protocol',
  };

  // Build steps with status
  const steps: OnboardingStep[] = await Promise.all(
    stepDefinitions.map(async (def) => {
      // Check if step is auto-completed based on system state
      let status = savedProgress[def.id] || 'pending';

      // Auto-detect completion for certain steps
      if (status === 'pending') {
        status = await autoDetectStepCompletion(
          supabase,
          tenantId,
          protocolId,
          def.id,
          hasWallet,
          hasPaymentHandler
        );
      }

      return {
        ...def,
        status,
      };
    })
  );

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const totalSteps = steps.length;
  const progressPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // Find current step (first non-completed step)
  const currentStepIndex = steps.findIndex(s => s.status !== 'completed' && s.status !== 'skipped');
  const currentStep = currentStepIndex >= 0 ? currentStepIndex : totalSteps - 1;

  return {
    protocol_id: protocolId,
    protocol_name: protocolNames[protocolId],
    enabled,
    prerequisites_met: prerequisitesMet,
    steps,
    current_step: currentStep,
    total_steps: totalSteps,
    completed_steps: completedSteps,
    progress_percentage: progressPercentage,
    is_complete: completedSteps === totalSteps,
  };
}

/**
 * Auto-detect step completion based on system state
 */
async function autoDetectStepCompletion(
  supabase: SupabaseClient,
  tenantId: string,
  protocolId: ProtocolId,
  stepId: string,
  hasWallet: boolean,
  hasPaymentHandler: boolean
): Promise<OnboardingStepStatus> {
  // Wallet steps
  if (stepId === 'create-wallet' && hasWallet) {
    return 'completed';
  }

  // Payment handler steps
  if (stepId === 'connect-handler' && hasPaymentHandler) {
    return 'completed';
  }

  // Check for agents (for AP2)
  if (stepId === 'register-agent') {
    const { data: agents } = await supabase
      .from('agents')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1);
    if (agents && agents.length > 0) {
      return 'completed';
    }
  }

  // Check for x402 endpoints
  if (stepId === 'register-endpoint' && protocolId === 'x402') {
    const { data: endpoints } = await supabase
      .from('x402_endpoints')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1);
    if (endpoints && endpoints.length > 0) {
      return 'completed';
    }
  }

  // Check for mandates (AP2)
  if (stepId === 'create-mandate' && protocolId === 'ap2') {
    const { data: mandates } = await supabase
      .from('ap2_mandates')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1);
    if (mandates && mandates.length > 0) {
      return 'completed';
    }
  }

  return 'pending';
}

/**
 * Update onboarding progress for a specific step
 */
export async function updateOnboardingProgress(
  supabase: SupabaseClient,
  tenantId: string,
  update: OnboardingProgressUpdate
): Promise<{ success: boolean; error?: string }> {
  // Get current settings
  const { data: tenant, error: fetchError } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  const currentSettings = tenant?.settings || {};
  const onboardingProgress = currentSettings.onboarding_progress || {};
  const protocolProgress = onboardingProgress[update.protocol_id] || {};

  // Update the step status
  protocolProgress[update.step_id] = update.status;

  // If completing a step, add timestamp
  if (update.status === 'completed') {
    protocolProgress[`${update.step_id}_completed_at`] = new Date().toISOString();
  }

  // Save updated progress
  const newSettings = {
    ...currentSettings,
    onboarding_progress: {
      ...onboardingProgress,
      [update.protocol_id]: protocolProgress,
    },
  };

  const { error: updateError } = await supabase
    .from('tenants')
    .update({ settings: newSettings })
    .eq('id', tenantId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  console.log(`[Onboarding] Updated ${update.protocol_id}/${update.step_id} to ${update.status} for tenant ${tenantId}`);

  return { success: true };
}

/**
 * Skip an onboarding step
 */
export async function skipOnboardingStep(
  supabase: SupabaseClient,
  tenantId: string,
  protocolId: ProtocolId,
  stepId: string
): Promise<{ success: boolean; error?: string }> {
  return updateOnboardingProgress(supabase, tenantId, {
    protocol_id: protocolId,
    step_id: stepId,
    status: 'skipped',
  });
}

/**
 * Reset onboarding progress for a protocol
 */
export async function resetProtocolOnboarding(
  supabase: SupabaseClient,
  tenantId: string,
  protocolId: ProtocolId
): Promise<{ success: boolean; error?: string }> {
  // Get current settings
  const { data: tenant, error: fetchError } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  const currentSettings = tenant?.settings || {};
  const onboardingProgress = { ...currentSettings.onboarding_progress } || {};

  // Remove protocol progress
  delete onboardingProgress[protocolId];

  // Save updated progress
  const newSettings = {
    ...currentSettings,
    onboarding_progress: onboardingProgress,
  };

  const { error: updateError } = await supabase
    .from('tenants')
    .update({ settings: newSettings })
    .eq('id', tenantId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

/**
 * Get all quick start templates
 */
export function getQuickStartTemplates(): QuickStartTemplate[] {
  return QUICK_START_TEMPLATES;
}

/**
 * Get a specific quick start template
 */
export function getQuickStartTemplate(templateId: string): QuickStartTemplate | undefined {
  return QUICK_START_TEMPLATES.find(t => t.id === templateId);
}

/**
 * Determine recommended template based on current state
 */
function determineRecommendedTemplate(
  hasWallet: boolean,
  hasPaymentHandler: boolean,
  protocols: Record<ProtocolId, ProtocolOnboardingState>
): QuickStartTemplate | undefined {
  // If they have a wallet but no handler, recommend x402 or AP2
  if (hasWallet && !hasPaymentHandler) {
    return QUICK_START_TEMPLATES.find(t => t.id === 'api-monetization');
  }

  // If they have a handler but no wallet, recommend UCP or ACP
  if (hasPaymentHandler && !hasWallet) {
    return QUICK_START_TEMPLATES.find(t => t.id === 'e-commerce');
  }

  // If they have nothing, recommend e-commerce (most common use case)
  if (!hasWallet && !hasPaymentHandler) {
    return QUICK_START_TEMPLATES.find(t => t.id === 'e-commerce');
  }

  // If they have both, check which protocol has more progress
  const protocolProgress = Object.entries(protocols)
    .filter(([_, state]) => state.enabled)
    .sort((a, b) => b[1].progress_percentage - a[1].progress_percentage);

  if (protocolProgress.length > 0 && protocolProgress[0][1].progress_percentage < 100) {
    // Recommend template for their most advanced protocol
    const topProtocol = protocolProgress[0][0] as ProtocolId;
    return QUICK_START_TEMPLATES.find(t => t.protocols.includes(topProtocol));
  }

  return undefined;
}

/**
 * Toggle sandbox mode for a tenant
 */
export async function setSandboxMode(
  supabase: SupabaseClient,
  tenantId: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  // Get current settings
  const { data: tenant, error: fetchError } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  const currentSettings = tenant?.settings || {};
  const newSettings = {
    ...currentSettings,
    sandbox_mode: enabled,
  };

  const { error: updateError } = await supabase
    .from('tenants')
    .update({ settings: newSettings })
    .eq('id', tenantId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  console.log(`[Onboarding] Sandbox mode ${enabled ? 'enabled' : 'disabled'} for tenant ${tenantId}`);

  return { success: true };
}

/**
 * Get protocol-specific onboarding state
 */
export async function getProtocolOnboardingState(
  supabase: SupabaseClient,
  tenantId: string,
  protocolId: ProtocolId
): Promise<ProtocolOnboardingState | null> {
  const state = await getTenantOnboardingState(supabase, tenantId);
  return state.protocols[protocolId] || null;
}
