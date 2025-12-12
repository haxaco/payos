import { beforeAll, afterAll, vi } from 'vitest';

// Set up test environment variables
beforeAll(() => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  vi.clearAllMocks();
});

// Global test utilities
export const TEST_TENANT_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
export const TEST_API_KEY = 'pk_test_demo_fintech_key_12345';
export const TEST_AGENT_TOKEN = 'agent_techcorp_payroll_001';

export const TEST_ACCOUNTS = {
  techcorp: 'bbbbbbbb-0000-0000-0000-000000000001',
  acme: 'bbbbbbbb-0000-0000-0000-000000000002',
  startup: 'bbbbbbbb-0000-0000-0000-000000000003',
  maria: 'cccccccc-0000-0000-0000-000000000001',
  carlos: 'cccccccc-0000-0000-0000-000000000002',
  ana: 'cccccccc-0000-0000-0000-000000000003',
  pedro: 'cccccccc-0000-0000-0000-000000000004',
  sofia: 'cccccccc-0000-0000-0000-000000000005',
};

export const TEST_AGENTS = {
  payroll: 'dddddddd-0000-0000-0000-000000000001',
  invoice: 'dddddddd-0000-0000-0000-000000000002',
  treasury: 'dddddddd-0000-0000-0000-000000000003',
};

