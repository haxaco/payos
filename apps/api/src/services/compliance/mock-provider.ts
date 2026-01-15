/**
 * Mock Compliance Provider
 * 
 * Provides wallet, entity, and bank account screening with configurable
 * test scenarios via blocklist. Designed to demonstrate compliance
 * integration points without requiring real provider access.
 * 
 * @see Story 40.18: Mock Compliance Service
 * @module services/compliance/mock-provider
 */

import { randomUUID } from 'crypto';

// =============================================================================
// Types
// =============================================================================

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'SEVERE';

export interface WalletScreeningParams {
  address: string;
  chain: string;
  context?: string;
}

export interface WalletScreeningResult {
  id: string;
  type: 'wallet';
  status: 'complete';
  result: {
    risk_score: number;        // 0-100
    risk_level: RiskLevel;
    flags: string[];
    exposure: {
      direct: number;          // Direct exposure percentage
      indirect: number;        // Indirect exposure (via hops)
    };
    categories: string[];      // e.g., ['mixer', 'gambling', 'darknet']
    provider: 'mock';
    checked_at: string;
  };
}

export interface EntityScreeningParams {
  name: string;
  type: 'individual' | 'company';
  country?: string;
  date_of_birth?: string;
  context?: string;
}

export interface EntityScreeningResult {
  id: string;
  type: 'entity';
  status: 'complete';
  result: {
    matches: Array<{
      list: string;            // e.g., 'OFAC SDN', 'UN Sanctions'
      match_score: number;     // 0-100
      matched_name: string;
      match_type: 'exact' | 'fuzzy' | 'alias';
    }>;
    risk_level: RiskLevel;
    pep_status: boolean;       // Politically Exposed Person
    adverse_media: boolean;
    provider: 'mock';
    checked_at: string;
  };
}

export interface BankScreeningParams {
  account_type: 'pix' | 'spei' | 'wire' | 'ach';
  account_id: string;          // Pix key, CLABE, routing+account
  country: string;
  context?: string;
}

export interface BankScreeningResult {
  id: string;
  type: 'bank';
  status: 'complete';
  result: {
    account_status: 'active' | 'blocked' | 'suspicious' | 'unknown';
    risk_level: RiskLevel;
    flags: string[];
    institution?: {
      name: string;
      code: string;
      country: string;
    };
    provider: 'mock';
    checked_at: string;
  };
}

// =============================================================================
// Mock Blocklist (Test Scenarios)
// =============================================================================

/**
 * Configurable blocklist for testing various compliance scenarios
 */
export const MOCK_BLOCKLIST = {
  wallets: {
    // Known bad addresses (return HIGH/SEVERE risk)
    '0xbad0000000000000000000000000000000000001': {
      risk_score: 95,
      risk_level: 'SEVERE' as RiskLevel,
      flags: ['known_mixer', 'sanctioned'],
      categories: ['mixer'],
      reason: 'Known mixer service',
    },
    '0xbad0000000000000000000000000000000000002': {
      risk_score: 90,
      risk_level: 'SEVERE' as RiskLevel,
      flags: ['ofac_sanctioned'],
      categories: ['sanctioned'],
      reason: 'OFAC sanctioned address',
    },
    '0xbad0000000000000000000000000000000000003': {
      risk_score: 85,
      risk_level: 'HIGH' as RiskLevel,
      flags: ['darknet_market'],
      categories: ['darknet'],
      reason: 'Associated with darknet market',
    },
    // Medium risk (indirect exposure)
    '0xmed0000000000000000000000000000000000001': {
      risk_score: 55,
      risk_level: 'MEDIUM' as RiskLevel,
      flags: ['indirect_mixer_exposure'],
      categories: ['gambling'],
      reason: 'Indirect exposure via 3 hops',
    },
  },
  
  entities: {
    // Sanctioned names (case-insensitive partial match)
    'TEST SANCTIONED ENTITY': {
      list: 'OFAC SDN',
      match_score: 100,
      match_type: 'exact' as const,
    },
    'BLOCKED PERSON': {
      list: 'UN Sanctions',
      match_score: 100,
      match_type: 'exact' as const,
    },
    'JUAN NARCO': {
      list: 'EU Sanctions',
      match_score: 95,
      match_type: 'fuzzy' as const,
    },
    // PEP test
    'JOHN POLITICIAN': {
      pep: true,
      pep_category: 'Foreign Government Official',
    },
  },
  
  bankAccounts: {
    // Invalid/blocked accounts
    '000000000000000001': {
      status: 'blocked' as const,
      flags: ['fraud_reported'],
      reason: 'Multiple fraud reports',
    },
    '000000000000000002': {
      status: 'suspicious' as const,
      flags: ['high_volume', 'new_account'],
      reason: 'Suspicious activity patterns',
    },
    // Invalid CLABE (Mexico)
    '123456789012345678': {
      status: 'blocked' as const,
      flags: ['invalid_institution'],
      reason: 'Invalid institution code',
    },
  },
};

// =============================================================================
// Mock Compliance Provider
// =============================================================================

export class MockComplianceProvider {
  readonly name = 'mock';
  
  /**
   * Screen a cryptocurrency wallet address
   */
  async screenWallet(params: WalletScreeningParams): Promise<WalletScreeningResult> {
    const address = params.address.toLowerCase();
    
    // Check blocklist
    const blocklisted = Object.entries(MOCK_BLOCKLIST.wallets).find(
      ([addr]) => addr.toLowerCase() === address
    );
    
    if (blocklisted) {
      const [, data] = blocklisted;
      return {
        id: `scr_${randomUUID()}`,
        type: 'wallet',
        status: 'complete',
        result: {
          risk_score: data.risk_score,
          risk_level: data.risk_level,
          flags: data.flags,
          exposure: {
            direct: data.risk_level === 'SEVERE' ? 100 : 0,
            indirect: data.risk_level === 'MEDIUM' ? 45 : 0,
          },
          categories: data.categories,
          provider: 'mock',
          checked_at: new Date().toISOString(),
        },
      };
    }
    
    // Default: Low risk
    return {
      id: `scr_${randomUUID()}`,
      type: 'wallet',
      status: 'complete',
      result: {
        risk_score: Math.floor(Math.random() * 20),  // 0-19
        risk_level: 'LOW',
        flags: [],
        exposure: { direct: 0, indirect: 0 },
        categories: [],
        provider: 'mock',
        checked_at: new Date().toISOString(),
      },
    };
  }
  
  /**
   * Screen an entity (person or company)
   */
  async screenEntity(params: EntityScreeningParams): Promise<EntityScreeningResult> {
    const name = params.name.toUpperCase();
    const matches: EntityScreeningResult['result']['matches'] = [];
    let pepStatus = false;
    let riskLevel: RiskLevel = 'LOW';
    
    // Check blocklist for sanctions matches
    for (const [blockedName, data] of Object.entries(MOCK_BLOCKLIST.entities)) {
      if (name.includes(blockedName.toUpperCase())) {
        if ('list' in data) {
          matches.push({
            list: data.list,
            match_score: data.match_score,
            matched_name: blockedName,
            match_type: data.match_type,
          });
          riskLevel = 'SEVERE';
        }
        if ('pep' in data && data.pep) {
          pepStatus = true;
          if (riskLevel === 'LOW') riskLevel = 'MEDIUM';
        }
      }
    }
    
    // Fuzzy matching simulation for common test patterns
    if (name.includes('SANCTIONED') || name.includes('BLOCKED') || name.includes('NARCO')) {
      riskLevel = matches.length > 0 ? 'SEVERE' : 'HIGH';
    }
    
    return {
      id: `scr_${randomUUID()}`,
      type: 'entity',
      status: 'complete',
      result: {
        matches,
        risk_level: riskLevel,
        pep_status: pepStatus,
        adverse_media: name.includes('FRAUD') || name.includes('SCAM'),
        provider: 'mock',
        checked_at: new Date().toISOString(),
      },
    };
  }
  
  /**
   * Screen a bank account
   */
  async screenBankAccount(params: BankScreeningParams): Promise<BankScreeningResult> {
    const accountId = params.account_id.replace(/[^0-9]/g, '');  // Normalize
    
    // Check blocklist
    const blocklisted = MOCK_BLOCKLIST.bankAccounts[accountId as keyof typeof MOCK_BLOCKLIST.bankAccounts];
    
    if (blocklisted) {
      return {
        id: `scr_${randomUUID()}`,
        type: 'bank',
        status: 'complete',
        result: {
          account_status: blocklisted.status,
          risk_level: blocklisted.status === 'blocked' ? 'SEVERE' : 'HIGH',
          flags: blocklisted.flags,
          institution: this.getInstitution(params),
          provider: 'mock',
          checked_at: new Date().toISOString(),
        },
      };
    }
    
    // Default: Active account, low risk
    return {
      id: `scr_${randomUUID()}`,
      type: 'bank',
      status: 'complete',
      result: {
        account_status: 'active',
        risk_level: 'LOW',
        flags: [],
        institution: this.getInstitution(params),
        provider: 'mock',
        checked_at: new Date().toISOString(),
      },
    };
  }
  
  /**
   * Get institution info based on account type and country
   */
  private getInstitution(params: BankScreeningParams): BankScreeningResult['result']['institution'] {
    if (params.account_type === 'pix') {
      return {
        name: 'Banco do Brasil',
        code: '001',
        country: 'BR',
      };
    }
    if (params.account_type === 'spei') {
      const bankCode = params.account_id.substring(0, 3);
      return {
        name: bankCode === '012' ? 'BBVA México' : 'Unknown Bank',
        code: bankCode,
        country: 'MX',
      };
    }
    return undefined;
  }
  
  /**
   * Batch screen multiple items
   */
  async batchScreen(items: Array<{
    type: 'wallet' | 'entity' | 'bank';
    params: WalletScreeningParams | EntityScreeningParams | BankScreeningParams;
  }>): Promise<Array<WalletScreeningResult | EntityScreeningResult | BankScreeningResult>> {
    const results = await Promise.all(
      items.map(async (item) => {
        switch (item.type) {
          case 'wallet':
            return this.screenWallet(item.params as WalletScreeningParams);
          case 'entity':
            return this.screenEntity(item.params as EntityScreeningParams);
          case 'bank':
            return this.screenBankAccount(item.params as BankScreeningParams);
        }
      })
    );
    return results;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let mockProvider: MockComplianceProvider | null = null;

export function getMockComplianceProvider(): MockComplianceProvider {
  if (!mockProvider) {
    mockProvider = new MockComplianceProvider();
  }
  return mockProvider;
}



