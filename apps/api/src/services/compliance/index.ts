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



