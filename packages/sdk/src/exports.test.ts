import { describe, it, expect } from 'vitest';

describe('Package exports', () => {
  it('should export main PayOS class from index', async () => {
    const { PayOS } = await import('./index');
    expect(PayOS).toBeDefined();
    expect(typeof PayOS).toBe('function');
  });

  it('should export types from index', async () => {
    const exports = await import('./index');
    expect(exports.PayOS).toBeDefined();
    expect(exports.getEnvironmentConfig).toBeDefined();
    expect(exports.validateEnvironment).toBeDefined();
  });

  it('should export config utilities', async () => {
    const { getEnvironmentConfig, validateEnvironment, ENVIRONMENT_CONFIGS } = await import('./config');
    expect(getEnvironmentConfig).toBeDefined();
    expect(validateEnvironment).toBeDefined();
    expect(ENVIRONMENT_CONFIGS).toBeDefined();
  });

  it('should export x402 client', async () => {
    const x402 = await import('./protocols/x402/index');
    expect(x402.PayOSX402Client).toBeDefined();
  });

  it('should export AP2Client', async () => {
    const ap2 = await import('./protocols/ap2/index');
    expect(ap2.AP2Client).toBeDefined();
  });

  it('should export ACPClient', async () => {
    const acp = await import('./protocols/acp/index');
    expect(acp.ACPClient).toBeDefined();
  });

  it('should export facilitator classes', async () => {
    const facilitator = await import('./facilitator/index');
    expect(facilitator.SandboxFacilitator).toBeDefined();
    expect(facilitator.createSandboxFacilitatorRouter).toBeDefined();
  });

  it('should export CapabilitiesClient', async () => {
    const capabilities = await import('./capabilities/index');
    expect(capabilities.CapabilitiesClient).toBeDefined();
  });
});

