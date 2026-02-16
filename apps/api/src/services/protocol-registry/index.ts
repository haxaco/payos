/**
 * Protocol Registry Service
 * Epic 49, Story 49.1-49.3: Protocol discovery and enablement
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  Protocol,
  ProtocolId,
  ProtocolEnablementStatus,
  OrganizationProtocolStatus,
  EnableProtocolResult,
} from './types';
import { PROTOCOLS, getAllProtocols, getProtocol, isValidProtocolId, getProtocolIds } from './protocols';

export * from './types';
export { getAllProtocols, getProtocol, isValidProtocolId, getProtocolIds };

/**
 * Check if prerequisites are met for a protocol
 */
export async function checkPrerequisites(
  supabase: SupabaseClient,
  tenantId: string,
  protocolId: ProtocolId
): Promise<{ met: boolean; missing: string[] }> {
  const protocol = getProtocol(protocolId);
  if (!protocol) {
    return { met: false, missing: ['invalid_protocol'] };
  }

  const missing: string[] = [];
  const prerequisites = protocol.prerequisites;

  // Check wallet prerequisite
  if (prerequisites.wallet) {
    const { data: wallets, error } = await supabase
      .from('wallets')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .limit(1);

    if (error || !wallets || wallets.length === 0) {
      missing.push('wallet');
    }
  }

  // Check payment handler prerequisite
  // A tenant satisfies this if they have EITHER:
  // 1. A connected account (Stripe, PayPal, etc.) in connected_accounts table
  // 2. A DB-driven payment handler (PayOS LATAM, Invu, etc.) in payment_handlers table
  if (prerequisites.paymentHandler) {
    let hasHandler = false;

    // Check connected_accounts (external provider credentials)
    const { data: connectedAccounts } = await supabase
      .from('connected_accounts')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .limit(1);

    if (connectedAccounts && connectedAccounts.length > 0) {
      hasHandler = true;
    }

    // Check payment_handlers (DB-driven handlers: global or tenant-specific)
    if (!hasHandler) {
      const { data: dbHandlers } = await supabase
        .from('payment_handlers')
        .select('id')
        .eq('status', 'active')
        .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
        .limit(1);

      if (dbHandlers && dbHandlers.length > 0) {
        hasHandler = true;
      }
    }

    if (!hasHandler) {
      missing.push('payment_handler');
    }
  }

  // Check KYA level if required
  if (prerequisites.kyaLevel !== undefined && prerequisites.kyaLevel > 0) {
    const { data: agents, error } = await supabase
      .from('agents')
      .select('kya_tier')
      .eq('tenant_id', tenantId)
      .gte('kya_tier', prerequisites.kyaLevel)
      .limit(1);

    if (error || !agents || agents.length === 0) {
      missing.push(`kya_level_${prerequisites.kyaLevel}`);
    }
  }

  return { met: missing.length === 0, missing };
}

/**
 * Get protocol enablement status for an organization
 */
export async function getOrganizationProtocolStatus(
  supabase: SupabaseClient,
  tenantId: string
): Promise<OrganizationProtocolStatus> {
  // Get tenant settings for enabled protocols
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const enabledProtocols: Record<string, { enabled_at: string }> =
    tenant?.settings?.enabled_protocols || {};

  const protocols: Record<ProtocolId, ProtocolEnablementStatus> = {} as Record<ProtocolId, ProtocolEnablementStatus>;

  // Check status for each protocol
  for (const protocolId of getProtocolIds()) {
    const { met, missing } = await checkPrerequisites(supabase, tenantId, protocolId);
    const enabledInfo = enabledProtocols[protocolId];

    protocols[protocolId] = {
      enabled: !!enabledInfo,
      enabled_at: enabledInfo?.enabled_at,
      prerequisites_met: met,
      missing_prerequisites: missing,
    };
  }

  return { protocols };
}

/**
 * Enable a protocol for an organization
 */
export async function enableProtocol(
  supabase: SupabaseClient,
  tenantId: string,
  protocolId: ProtocolId
): Promise<EnableProtocolResult> {
  // Validate protocol ID
  if (!isValidProtocolId(protocolId)) {
    return {
      success: false,
      protocol: protocolId,
      error: 'invalid_protocol',
    };
  }

  // Check prerequisites
  const { met, missing } = await checkPrerequisites(supabase, tenantId, protocolId);
  if (!met) {
    return {
      success: false,
      protocol: protocolId,
      error: 'prerequisites_not_met',
      missing_prerequisites: missing,
    };
  }

  // Get current tenant settings
  const { data: tenant, error: fetchError } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  if (fetchError) {
    return {
      success: false,
      protocol: protocolId,
      error: 'failed_to_fetch_settings',
    };
  }

  // Update enabled protocols
  const currentSettings = tenant?.settings || {};
  const enabledProtocols = currentSettings.enabled_protocols || {};
  const enabled_at = new Date().toISOString();

  const newSettings = {
    ...currentSettings,
    enabled_protocols: {
      ...enabledProtocols,
      [protocolId]: { enabled_at },
    },
  };

  // Save updated settings
  const { error: updateError } = await supabase
    .from('tenants')
    .update({ settings: newSettings })
    .eq('id', tenantId);

  if (updateError) {
    return {
      success: false,
      protocol: protocolId,
      error: 'failed_to_update_settings',
    };
  }

  return {
    success: true,
    protocol: protocolId,
    enabled_at,
  };
}

/**
 * Disable a protocol for an organization
 */
export async function disableProtocol(
  supabase: SupabaseClient,
  tenantId: string,
  protocolId: ProtocolId
): Promise<EnableProtocolResult> {
  // Validate protocol ID
  if (!isValidProtocolId(protocolId)) {
    return {
      success: false,
      protocol: protocolId,
      error: 'invalid_protocol',
    };
  }

  // Get current tenant settings
  const { data: tenant, error: fetchError } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  if (fetchError) {
    return {
      success: false,
      protocol: protocolId,
      error: 'failed_to_fetch_settings',
    };
  }

  // Remove from enabled protocols
  const currentSettings = tenant?.settings || {};
  const enabledProtocols = { ...currentSettings.enabled_protocols } || {};
  delete enabledProtocols[protocolId];

  const newSettings = {
    ...currentSettings,
    enabled_protocols: enabledProtocols,
  };

  // Save updated settings
  const { error: updateError } = await supabase
    .from('tenants')
    .update({ settings: newSettings })
    .eq('id', tenantId);

  if (updateError) {
    return {
      success: false,
      protocol: protocolId,
      error: 'failed_to_update_settings',
    };
  }

  return {
    success: true,
    protocol: protocolId,
  };
}

/**
 * Get human-readable message for missing prerequisites
 */
export function getPrerequisiteMessage(protocolId: ProtocolId, missing: string[]): string {
  const messages: Record<string, string> = {
    wallet: 'Create a USDC wallet to enable this protocol',
    payment_handler: 'Connect a payment handler to enable this protocol',
    kya_level_1: 'Register an agent with KYA tier 1 or higher',
    kya_level_2: 'Register an agent with KYA tier 2 or higher',
    kya_level_3: 'Register an agent with KYA tier 3 (enterprise)',
  };

  const readable = missing.map(m => messages[m] || m);
  return readable.join('. ');
}
