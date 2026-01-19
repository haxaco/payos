/**
 * UCP Unit Tests
 *
 * Tests for UCP profile, negotiation, tokens, and settlement.
 *
 * @see Epic 43: UCP Integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  generateUCPProfile,
  getCapabilities,
  getCorridors,
  getUCPVersion,
  isCorridorSupported,
  parseUCPAgentHeader,
  formatUCPAgentHeader,
  isVersionSupported,
  negotiateVersion,
  negotiateCapabilities,
  acquireToken,
  validateToken,
  getSettlementQuote,
  clearTokenStore,
  validateRecipient,
} from '../../src/services/ucp/index.js';

describe('UCP Profile Service', () => {
  describe('generateUCPProfile', () => {
    it('should generate a valid UCP profile', () => {
      const profile = generateUCPProfile();

      expect(profile.ucp).toBeDefined();
      expect(profile.ucp.version).toBe('2026-01-11');
      expect(profile.ucp.services).toBeDefined();
      expect(profile.ucp.capabilities).toBeInstanceOf(Array);
      expect(profile.payment).toBeDefined();
      expect(profile.payment!.handlers).toBeInstanceOf(Array);
    });

    it('should include settlement service definition', () => {
      const profile = generateUCPProfile();

      expect(profile.ucp.services['com.payos.settlement']).toBeDefined();
      expect(profile.ucp.services['com.payos.settlement'].version).toBe('2026-01-11');
      expect(profile.ucp.services['com.payos.settlement'].rest).toBeDefined();
    });

    it('should include payment handler', () => {
      const profile = generateUCPProfile();
      const handlers = profile.payment!.handlers;

      expect(handlers.length).toBeGreaterThan(0);
      const handler = handlers[0];
      expect(handler.id).toBe('payos_latam');
      expect(handler.name).toBe('com.payos.latam_settlement');
      expect(handler.supported_currencies).toContain('USD');
      expect(handler.supported_currencies).toContain('USDC');
    });
  });

  describe('getCapabilities', () => {
    it('should return PayOS capabilities', () => {
      const capabilities = getCapabilities();

      expect(capabilities.length).toBeGreaterThan(0);
      expect(capabilities.some((c) => c.name === 'com.payos.settlement.quote')).toBe(true);
      expect(capabilities.some((c) => c.name === 'com.payos.settlement.transfer')).toBe(true);
    });
  });

  describe('getCorridors', () => {
    it('should return supported corridors', () => {
      const corridors = getCorridors();

      expect(corridors.length).toBeGreaterThan(0);

      // Should have Pix corridor
      const pixCorridor = corridors.find((c) => c.rail === 'pix');
      expect(pixCorridor).toBeDefined();
      expect(pixCorridor!.destination_country).toBe('BR');
      expect(pixCorridor!.destination_currency).toBe('BRL');

      // Should have SPEI corridor
      const speiCorridor = corridors.find((c) => c.rail === 'spei');
      expect(speiCorridor).toBeDefined();
      expect(speiCorridor!.destination_country).toBe('MX');
      expect(speiCorridor!.destination_currency).toBe('MXN');
    });
  });

  describe('isCorridorSupported', () => {
    it('should return true for supported corridors', () => {
      expect(isCorridorSupported('USD', 'BRL', 'pix')).toBe(true);
      expect(isCorridorSupported('USDC', 'BRL', 'pix')).toBe(true);
      expect(isCorridorSupported('USD', 'MXN', 'spei')).toBe(true);
      expect(isCorridorSupported('USDC', 'MXN', 'spei')).toBe(true);
    });

    it('should return false for unsupported corridors', () => {
      expect(isCorridorSupported('EUR', 'BRL', 'pix')).toBe(false);
      expect(isCorridorSupported('USD', 'EUR', 'wire')).toBe(false);
    });
  });
});

describe('UCP Negotiation Service', () => {
  describe('parseUCPAgentHeader', () => {
    it('should parse valid UCP-Agent header with profile URL', () => {
      const header = 'GoogleAI/2026-01-11 (https://google.com/.well-known/ucp)';
      const result = parseUCPAgentHeader(header);

      expect(result).toBeDefined();
      expect(result!.name).toBe('GoogleAI');
      expect(result!.version).toBe('2026-01-11');
      expect(result!.profileUrl).toBe('https://google.com/.well-known/ucp');
    });

    it('should parse valid UCP-Agent header without profile URL', () => {
      const header = 'TestAgent/2026-01-11';
      const result = parseUCPAgentHeader(header);

      expect(result).toBeDefined();
      expect(result!.name).toBe('TestAgent');
      expect(result!.version).toBe('2026-01-11');
      expect(result!.profileUrl).toBeUndefined();
    });

    it('should return null for invalid headers', () => {
      expect(parseUCPAgentHeader('')).toBeNull();
      expect(parseUCPAgentHeader(undefined)).toBeNull();
      expect(parseUCPAgentHeader('InvalidFormat')).toBeNull();
    });
  });

  describe('formatUCPAgentHeader', () => {
    it('should format PayOS UCP-Agent header', () => {
      const header = formatUCPAgentHeader();

      expect(header).toContain('PayOS/');
      expect(header).toContain(getUCPVersion());
    });
  });

  describe('isVersionSupported', () => {
    it('should return true for supported versions', () => {
      expect(isVersionSupported('2026-01-11')).toBe(true);
    });

    it('should return false for unsupported versions', () => {
      expect(isVersionSupported('2025-01-01')).toBe(false);
      expect(isVersionSupported('invalid')).toBe(false);
    });
  });

  describe('negotiateVersion', () => {
    it('should return version for compatible platforms', () => {
      expect(negotiateVersion('2026-01-11')).toBe('2026-01-11');
    });

    it('should return null for incompatible versions', () => {
      expect(negotiateVersion('2025-01-01')).toBeNull();
    });
  });

  describe('negotiateCapabilities', () => {
    it('should return intersection of capabilities', () => {
      const platformCaps = [
        'com.payos.settlement.quote',
        'com.payos.settlement.transfer',
        'com.other.capability',
      ];

      const result = negotiateCapabilities(platformCaps);

      expect(result).toContain('com.payos.settlement.quote');
      expect(result).toContain('com.payos.settlement.transfer');
      expect(result).not.toContain('com.other.capability');
    });
  });
});

describe('UCP Token Service', () => {
  const testTenantId = 'test-tenant-123';

  beforeEach(() => {
    clearTokenStore();
  });

  afterEach(() => {
    clearTokenStore();
  });

  describe('validateRecipient', () => {
    it('should validate Pix recipient', () => {
      const result = validateRecipient(
        {
          type: 'pix',
          pix_key: '12345678901',
          pix_key_type: 'cpf',
          name: 'Test User',
        },
        'pix'
      );
      expect(result.valid).toBe(true);
    });

    it('should reject invalid Pix key type', () => {
      const result = validateRecipient(
        {
          type: 'pix',
          pix_key: '12345678901',
          pix_key_type: 'invalid' as any,
          name: 'Test User',
        },
        'pix'
      );
      expect(result.valid).toBe(false);
    });

    it('should validate SPEI recipient', () => {
      const result = validateRecipient(
        {
          type: 'spei',
          clabe: '012345678901234567',
          name: 'Test User',
        },
        'spei'
      );
      expect(result.valid).toBe(true);
    });

    it('should reject invalid CLABE', () => {
      const result = validateRecipient(
        {
          type: 'spei',
          clabe: '12345', // Too short
          name: 'Test User',
        },
        'spei'
      );
      expect(result.valid).toBe(false);
    });

    it('should reject wrong recipient type for corridor', () => {
      const result = validateRecipient(
        {
          type: 'spei',
          clabe: '012345678901234567',
          name: 'Test User',
        },
        'pix' // Wrong corridor
      );
      expect(result.valid).toBe(false);
    });
  });

  describe('acquireToken', () => {
    it('should acquire a token for Pix settlement', async () => {
      const token = await acquireToken(testTenantId, {
        corridor: 'pix',
        amount: 100,
        currency: 'USD',
        recipient: {
          type: 'pix',
          pix_key: '12345678901',
          pix_key_type: 'cpf',
          name: 'Test User',
        },
      });

      expect(token.token).toBeDefined();
      expect(token.token).toMatch(/^ucp_tok_/);
      expect(token.settlement_id).toBeDefined();
      expect(token.quote).toBeDefined();
      expect(token.quote.from_amount).toBe(100);
      expect(token.quote.from_currency).toBe('USD');
      expect(token.quote.to_currency).toBe('BRL');
      expect(token.expires_at).toBeDefined();
    });

    it('should acquire a token for SPEI settlement', async () => {
      const token = await acquireToken(testTenantId, {
        corridor: 'spei',
        amount: 500,
        currency: 'USDC',
        recipient: {
          type: 'spei',
          clabe: '012345678901234567',
          name: 'Test User',
        },
      });

      expect(token.token).toBeDefined();
      expect(token.quote.to_currency).toBe('MXN');
    });

    it('should reject invalid amount', async () => {
      await expect(
        acquireToken(testTenantId, {
          corridor: 'pix',
          amount: -100,
          currency: 'USD',
          recipient: {
            type: 'pix',
            pix_key: '12345678901',
            pix_key_type: 'cpf',
            name: 'Test User',
          },
        })
      ).rejects.toThrow('Amount must be greater than 0');
    });

    it('should reject amount over limit', async () => {
      await expect(
        acquireToken(testTenantId, {
          corridor: 'pix',
          amount: 200000,
          currency: 'USD',
          recipient: {
            type: 'pix',
            pix_key: '12345678901',
            pix_key_type: 'cpf',
            name: 'Test User',
          },
        })
      ).rejects.toThrow('exceeds maximum limit');
    });
  });

  describe('validateToken', () => {
    it('should validate a valid token', async () => {
      const tokenResponse = await acquireToken(testTenantId, {
        corridor: 'pix',
        amount: 100,
        currency: 'USD',
        recipient: {
          type: 'pix',
          pix_key: '12345678901',
          pix_key_type: 'cpf',
          name: 'Test User',
        },
      });

      const result = validateToken(tokenResponse.token, testTenantId);
      expect(result.valid).toBe(true);
      expect(result.stored).toBeDefined();
    });

    it('should reject invalid token', () => {
      const result = validateToken('invalid_token', testTenantId);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token not found');
    });

    it('should reject token for different tenant', async () => {
      const tokenResponse = await acquireToken(testTenantId, {
        corridor: 'pix',
        amount: 100,
        currency: 'USD',
        recipient: {
          type: 'pix',
          pix_key: '12345678901',
          pix_key_type: 'cpf',
          name: 'Test User',
        },
      });

      const result = validateToken(tokenResponse.token, 'other-tenant');
      expect(result.valid).toBe(false);
    });
  });

  describe('getSettlementQuote', () => {
    it('should return quote for Pix corridor', () => {
      const quote = getSettlementQuote(100, 'USD', 'pix');

      expect(quote.fromAmount).toBe(100);
      expect(quote.fromCurrency).toBe('USD');
      expect(quote.toCurrency).toBe('BRL');
      expect(quote.toAmount).toBeGreaterThan(0);
      expect(quote.fxRate).toBeGreaterThan(0);
      expect(quote.fees).toBeGreaterThan(0);
    });

    it('should return quote for SPEI corridor', () => {
      const quote = getSettlementQuote(100, 'USDC', 'spei');

      expect(quote.fromAmount).toBe(100);
      expect(quote.toCurrency).toBe('MXN');
    });
  });
});
