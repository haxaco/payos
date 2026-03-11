/**
 * Compliance Service Exports
 * 
 * @module services/compliance
 */

export {
  MockComplianceProvider,
  getMockComplianceProvider,
  MOCK_BLOCKLIST,
  type RiskLevel,
  type WalletScreeningParams,
  type WalletScreeningResult,
  type EntityScreeningParams,
  type EntityScreeningResult,
  type BankScreeningParams,
  type BankScreeningResult,
} from './mock-provider.js';

// =============================================================================
// Compliance Provider Interface (for future real providers)
// =============================================================================

import type {
  WalletScreeningParams,
  WalletScreeningResult,
  EntityScreeningParams,
  EntityScreeningResult,
  BankScreeningParams,
  BankScreeningResult,
} from './mock-provider.js';

import { trackOp } from '../ops/track-op.js';
import { OpType } from '../ops/operation-types.js';

export interface ComplianceProvider {
  name: string;
  screenWallet(params: WalletScreeningParams): Promise<WalletScreeningResult>;
  screenEntity(params: EntityScreeningParams): Promise<EntityScreeningResult>;
  screenBankAccount(params: BankScreeningParams): Promise<BankScreeningResult>;
}

// =============================================================================
// Provider Factory
// =============================================================================

import { getMockComplianceProvider } from './mock-provider.js';

/**
 * Get compliance provider based on configuration
 *
 * Currently only mock provider is available.
 * Future: Add Elliptic, Chainalysis, ComplyAdvantage
 */
export function getComplianceProvider(): ComplianceProvider {
  const providerName = process.env.COMPLIANCE_PROVIDER || 'mock';

  switch (providerName) {
    case 'mock':
    default:
      return getMockComplianceProvider();
    // Future providers:
    // case 'elliptic':
    //   return getEllipticProvider();
    // case 'chainalysis':
    //   return getChainalysisProvider();
    // case 'complyadvantage':
    //   return getComplyAdvantageProvider();
  }
}

// =============================================================================
// Tracked Compliance Operations (Story 65.7)
// =============================================================================

/**
 * Screen a wallet for sanctions with trackOp instrumentation.
 */
export async function trackedSanctionsScreen(
  tenantId: string,
  params: WalletScreeningParams,
  correlationId?: string
): Promise<WalletScreeningResult> {
  const provider = getComplianceProvider();
  const start = Date.now();
  const result = await provider.screenWallet(params);
  const durationMs = Date.now() - start;
  const isClean = result.result.risk_level === 'LOW';

  trackOp({
    tenantId,
    operation: OpType.COMPLIANCE_SANCTIONS,
    subject: `wallet/${params.address}`,
    correlationId,
    success: isClean,
    durationMs,
    data: {
      chain: params.chain,
      riskLevel: result.result.risk_level,
      riskScore: result.result.risk_score,
      flags: result.result.flags,
      provider: result.result.provider,
    },
  });

  return result;
}

/**
 * Screen an entity for KYC/KYB with trackOp instrumentation.
 * Uses COMPLIANCE_KYC for individuals and COMPLIANCE_KYB for companies.
 */
export async function trackedEntityScreen(
  tenantId: string,
  params: EntityScreeningParams,
  correlationId?: string
): Promise<EntityScreeningResult> {
  const provider = getComplianceProvider();
  const start = Date.now();
  const result = await provider.screenEntity(params);
  const durationMs = Date.now() - start;
  const opType = params.type === 'company' ? OpType.COMPLIANCE_KYB : OpType.COMPLIANCE_KYC;
  const isClean = result.result.risk_level === 'LOW' && result.result.matches.length === 0;

  trackOp({
    tenantId,
    operation: opType,
    subject: `entity/${params.name}`,
    correlationId,
    success: isClean,
    durationMs,
    data: {
      entityType: params.type,
      country: params.country,
      riskLevel: result.result.risk_level,
      matchCount: result.result.matches.length,
      pepStatus: result.result.pep_status,
      adverseMedia: result.result.adverse_media,
      provider: result.result.provider,
    },
  });

  return result;
}

/**
 * Screen a bank account for transaction monitoring with trackOp instrumentation.
 */
export async function trackedBankScreen(
  tenantId: string,
  params: BankScreeningParams,
  correlationId?: string
): Promise<BankScreeningResult> {
  const provider = getComplianceProvider();
  const start = Date.now();
  const result = await provider.screenBankAccount(params);
  const durationMs = Date.now() - start;
  const isClean = result.result.risk_level === 'LOW' && result.result.account_status === 'active';

  trackOp({
    tenantId,
    operation: OpType.COMPLIANCE_TM,
    subject: `bank/${params.account_type}/${params.account_id}`,
    correlationId,
    success: isClean,
    durationMs,
    data: {
      accountType: params.account_type,
      country: params.country,
      riskLevel: result.result.risk_level,
      accountStatus: result.result.account_status,
      flags: result.result.flags,
      provider: result.result.provider,
    },
  });

  return result;
}



