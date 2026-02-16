/**
 * UCP Conformance Tests: Profile Discovery
 *
 * Validates PayOS compliance with UCP profile discovery specification.
 *
 * @see Story 43.7: UCP Conformance Tests
 * @see https://ucp.dev/specification/discovery/
 */

import { describe, it, expect } from 'vitest';
import {
  generateUCPProfile,
  getCapabilities,
  getCorridors,
  getUCPVersion,
} from '../../src/services/ucp/profile.js';
import {
  parseUCPAgentHeader,
  isVersionSupported,
  negotiateCapabilities,
} from '../../src/services/ucp/negotiation.js';

// UCP Specification version we're testing against
const UCP_SPEC_VERSION = '2026-01-11';

describe('UCP Conformance: Profile Discovery', () => {
  describe('Profile Structure', () => {
    it('MUST include ucp.version field', async () => {
      const profile = await generateUCPProfile();
      expect(profile.ucp.version).toBeDefined();
      expect(typeof profile.ucp.version).toBe('string');
      expect(profile.ucp.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('MUST include ucp.services object', async () => {
      const profile = await generateUCPProfile();
      expect(profile.ucp.services).toBeDefined();
      expect(typeof profile.ucp.services).toBe('object');
    });

    it('MUST include ucp.capabilities array', async () => {
      const profile = await generateUCPProfile();
      expect(profile.ucp.capabilities).toBeDefined();
      expect(Array.isArray(profile.ucp.capabilities)).toBe(true);
    });

    it('SHOULD include payment.handlers array', async () => {
      const profile = await generateUCPProfile();
      expect(profile.payment).toBeDefined();
      expect(profile.payment!.handlers).toBeDefined();
      expect(Array.isArray(profile.payment!.handlers)).toBe(true);
    });
  });

  describe('Service Definitions', () => {
    it('service definition MUST include version', async () => {
      const profile = await generateUCPProfile();
      const services = Object.values(profile.ucp.services);

      services.forEach((service) => {
        expect(service.version).toBeDefined();
        expect(typeof service.version).toBe('string');
      });
    });

    it('service definition MUST include spec URL', async () => {
      const profile = await generateUCPProfile();
      const services = Object.values(profile.ucp.services);

      services.forEach((service) => {
        expect(service.spec).toBeDefined();
        expect(service.spec).toMatch(/^https?:\/\//);
      });
    });

    it('REST binding MUST include schema and endpoint', async () => {
      const profile = await generateUCPProfile();
      const services = Object.values(profile.ucp.services);

      services.forEach((service) => {
        if (service.rest) {
          expect(service.rest.schema).toBeDefined();
          expect(service.rest.endpoint).toBeDefined();
          expect(service.rest.schema).toMatch(/^https?:\/\//);
          expect(service.rest.endpoint).toMatch(/^https?:\/\//);
        }
      });
    });
  });

  describe('Capability Definitions', () => {
    it('capability MUST include name', () => {
      const capabilities = getCapabilities();

      capabilities.forEach((cap) => {
        expect(cap.name).toBeDefined();
        expect(typeof cap.name).toBe('string');
        expect(cap.name.length).toBeGreaterThan(0);
      });
    });

    it('capability MUST include version', () => {
      const capabilities = getCapabilities();

      capabilities.forEach((cap) => {
        expect(cap.version).toBeDefined();
        expect(typeof cap.version).toBe('string');
      });
    });

    it('capability name SHOULD follow reverse domain notation', () => {
      const capabilities = getCapabilities();

      capabilities.forEach((cap) => {
        // e.g., com.payos.settlement.quote
        expect(cap.name).toMatch(/^[a-z]+(\.[a-z_]+)+$/);
      });
    });
  });

  describe('Payment Handler Definitions', () => {
    it('handler MUST include id', async () => {
      const profile = await generateUCPProfile();
      const handlers = profile.payment!.handlers;

      handlers.forEach((handler) => {
        expect(handler.id).toBeDefined();
        expect(typeof handler.id).toBe('string');
      });
    });

    it('handler MUST include name', async () => {
      const profile = await generateUCPProfile();
      const handlers = profile.payment!.handlers;

      handlers.forEach((handler) => {
        expect(handler.name).toBeDefined();
        expect(typeof handler.name).toBe('string');
      });
    });

    it('handler name SHOULD follow reverse domain notation', async () => {
      const profile = await generateUCPProfile();
      const handlers = profile.payment!.handlers;

      handlers.forEach((handler) => {
        expect(handler.name).toMatch(/^com\.[a-z]+\./);
      });
    });

    it('handler MUST include version', async () => {
      const profile = await generateUCPProfile();
      const handlers = profile.payment!.handlers;

      handlers.forEach((handler) => {
        expect(handler.version).toBeDefined();
      });
    });

    it('handler MUST include config with supported_currencies', async () => {
      const profile = await generateUCPProfile();
      const handlers = profile.payment!.handlers;

      handlers.forEach((handler) => {
        expect(handler.config).toBeDefined();
        const currencies = (handler.config as any).supported_currencies;
        expect(currencies).toBeDefined();
        expect(Array.isArray(currencies)).toBe(true);
        expect(currencies.length).toBeGreaterThan(0);
      });
    });

    it('capability MUST include schema URL', () => {
      const capabilities = getCapabilities();

      capabilities.forEach((cap) => {
        expect(cap.schema).toBeDefined();
        expect(typeof cap.schema).toBe('string');
        expect(cap.schema).toMatch(/^https?:\/\//);
      });
    });

    it('extension capability MUST declare extends field', () => {
      const capabilities = getCapabilities();
      const extensionCaps = capabilities.filter((c) => c.extends);

      expect(extensionCaps.length).toBeGreaterThan(0);
      extensionCaps.forEach((cap) => {
        expect(typeof cap.extends).toBe('string');
        // The parent capability must exist
        const parent = capabilities.find((c) => c.name === cap.extends);
        expect(parent).toBeDefined();
      });
    });
  });

  describe('Corridor Definitions', () => {
    it('corridor MUST include required fields', () => {
      const corridors = getCorridors();

      corridors.forEach((corridor) => {
        expect(corridor.id).toBeDefined();
        expect(corridor.source_currency).toBeDefined();
        expect(corridor.destination_currency).toBeDefined();
        expect(corridor.destination_country).toBeDefined();
        expect(corridor.rail).toBeDefined();
      });
    });

    it('corridor destination_country MUST be ISO 3166-1 alpha-2', () => {
      const corridors = getCorridors();

      corridors.forEach((corridor) => {
        expect(corridor.destination_country).toMatch(/^[A-Z]{2}$/);
      });
    });

    it('corridor currency MUST be ISO 4217', () => {
      const corridors = getCorridors();
      const validCurrencies = ['USD', 'USDC', 'BRL', 'MXN'];

      corridors.forEach((corridor) => {
        expect(validCurrencies).toContain(corridor.source_currency);
        expect(validCurrencies).toContain(corridor.destination_currency);
      });
    });
  });
});

describe('UCP Conformance: Version Negotiation', () => {
  describe('UCP-Agent Header Parsing', () => {
    it('MUST parse valid UCP-Agent header with profile URL', () => {
      const header = 'GoogleAI/2026-01-11 (https://google.com/.well-known/ucp)';
      const result = parseUCPAgentHeader(header);

      expect(result).not.toBeNull();
      expect(result!.name).toBe('GoogleAI');
      expect(result!.version).toBe('2026-01-11');
      expect(result!.profileUrl).toBe('https://google.com/.well-known/ucp');
    });

    it('MUST parse valid UCP-Agent header without profile URL', () => {
      const header = 'TestClient/2026-01-11';
      const result = parseUCPAgentHeader(header);

      expect(result).not.toBeNull();
      expect(result!.name).toBe('TestClient');
      expect(result!.version).toBe('2026-01-11');
    });

    it('MUST return null for invalid header format', () => {
      expect(parseUCPAgentHeader('')).toBeNull();
      expect(parseUCPAgentHeader('InvalidFormat')).toBeNull();
      expect(parseUCPAgentHeader('NoVersion/')).toBeNull();
    });
  });

  describe('Version Support', () => {
    it('MUST support current UCP specification version', () => {
      expect(isVersionSupported(UCP_SPEC_VERSION)).toBe(true);
    });

    it('MUST return PayOS UCP version', () => {
      const version = getUCPVersion();
      expect(version).toBe(UCP_SPEC_VERSION);
    });
  });

  describe('Capability Negotiation', () => {
    it('MUST return intersection of capabilities', () => {
      const platformCapabilities = [
        'com.payos.settlement.quote',
        'com.payos.settlement.transfer',
        'com.other.capability',
      ];

      const result = negotiateCapabilities(platformCapabilities);

      expect(result).toContain('com.payos.settlement.quote');
      expect(result).toContain('com.payos.settlement.transfer');
      expect(result).not.toContain('com.other.capability');
    });

    it('MUST return empty array if no common capabilities', () => {
      const platformCapabilities = ['com.other.capability1', 'com.other.capability2'];

      const result = negotiateCapabilities(platformCapabilities);

      expect(result).toEqual([]);
    });
  });
});

describe('UCP Conformance: PayOS LATAM Handler', () => {
  describe('Handler Registration', () => {
    it('MUST register payos_latam handler', async () => {
      const profile = await generateUCPProfile();
      const handler = profile.payment!.handlers.find((h) => h.id === 'payos_latam');

      expect(handler).toBeDefined();
      expect(handler!.name).toBe('com.payos.latam_settlement');
    });

    it('MUST support USD and USDC currencies', async () => {
      const profile = await generateUCPProfile();
      const handler = profile.payment!.handlers.find((h) => h.id === 'payos_latam');

      expect((handler!.config as any).supported_currencies).toContain('USD');
      expect((handler!.config as any).supported_currencies).toContain('USDC');
    });

    it('MUST include Pix and SPEI corridors', () => {
      const corridors = getCorridors();

      const pixCorridor = corridors.find((c) => c.rail === 'pix');
      const speiCorridor = corridors.find((c) => c.rail === 'spei');

      expect(pixCorridor).toBeDefined();
      expect(pixCorridor!.destination_country).toBe('BR');
      expect(pixCorridor!.destination_currency).toBe('BRL');

      expect(speiCorridor).toBeDefined();
      expect(speiCorridor!.destination_country).toBe('MX');
      expect(speiCorridor!.destination_currency).toBe('MXN');
    });
  });

  describe('Required Capabilities', () => {
    it('MUST support settlement.quote capability', () => {
      const capabilities = getCapabilities();
      const quoteCapability = capabilities.find(
        (c) => c.name === 'com.payos.settlement.quote'
      );
      expect(quoteCapability).toBeDefined();
    });

    it('MUST support settlement.transfer capability', () => {
      const capabilities = getCapabilities();
      const transferCapability = capabilities.find(
        (c) => c.name === 'com.payos.settlement.transfer'
      );
      expect(transferCapability).toBeDefined();
    });

    it('MUST support settlement.status capability', () => {
      const capabilities = getCapabilities();
      const statusCapability = capabilities.find(
        (c) => c.name === 'com.payos.settlement.status'
      );
      expect(statusCapability).toBeDefined();
    });
  });
});
