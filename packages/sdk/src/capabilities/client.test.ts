/**
 * Tests for CapabilitiesClient
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CapabilitiesClient } from './client';
import { PayOSClient } from '../client';
import { PayOSConfig } from '../config';
import { CapabilitiesResponse } from './types';

describe('CapabilitiesClient', () => {
  let payosClient: PayOSClient;
  let capabilitiesClient: CapabilitiesClient;

  const mockCapabilities: CapabilitiesResponse = {
    apiVersion: '2025-12-01',
    capabilities: [
      {
        name: 'get_settlement_quote',
        description: 'Get a settlement quote',
        category: 'settlements',
        endpoint: 'POST /v1/settlements/quote',
        parameters: 'GET',
        returns: 'SettlementQuote',
        errors: ['INVALID_CURRENCY', 'INVALID_AMOUNT'],
        supportsSimulation: false,
        supportsIdempotency: false,
      },
      {
        name: 'create_transfer',
        description: 'Create a transfer',
        category: 'payments',
        endpoint: 'POST /v1/transfers',
        parameters: 'CreateTransferRequest',
        returns: 'Transfer',
        errors: ['INSUFFICIENT_BALANCE'],
        supportsSimulation: true,
        supportsIdempotency: true,
      },
    ],
    limits: {
      rateLimit: '1000/hour',
      maxTransfer: '100000.00',
    },
    supportedCurrencies: ['USD', 'BRL', 'MXN'],
    supportedRails: ['pix', 'spei', 'wire'],
    webhookEvents: ['transfer.created', 'transfer.completed'],
  };

  beforeEach(() => {
    const config: PayOSConfig = {
      apiKey: 'test-api-key',
      environment: 'sandbox',
    };
    payosClient = new PayOSClient(config);
    capabilitiesClient = new CapabilitiesClient(payosClient);

    // Mock fetch to return capabilities
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCapabilities,
    } as Response);
  });

  it('should fetch all capabilities', async () => {
    const capabilities = await capabilitiesClient.getAll();
    
    expect(capabilities).toEqual(mockCapabilities);
    expect(capabilities.capabilities).toHaveLength(2);
    expect(global.fetch).toHaveBeenCalled();
  });

  it('should cache capabilities for 1 hour', async () => {
    const first = await capabilitiesClient.getAll();
    const second = await capabilitiesClient.getAll();
    
    expect(first).toEqual(second);
    expect(global.fetch).toHaveBeenCalledTimes(1); // Only called once
  });

  it('should force refresh when requested', async () => {
    await capabilitiesClient.getAll();
    await capabilitiesClient.getAll(true); // Force fresh
    
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should filter capabilities by category', async () => {
    const payments = await capabilitiesClient.filter({ category: 'payments' });
    
    expect(payments).toHaveLength(1);
    expect(payments[0].name).toBe('create_transfer');
  });

  it('should filter capabilities by name', async () => {
    const quote = await capabilitiesClient.filter({ name: 'get_settlement_quote' });
    
    expect(quote).toHaveLength(1);
    expect(quote[0].category).toBe('settlements');
  });

  it('should get a single capability by name', async () => {
    const capability = await capabilitiesClient.get('create_transfer');
    
    expect(capability).toBeDefined();
    expect(capability?.name).toBe('create_transfer');
    expect(capability?.category).toBe('payments');
  });

  it('should return undefined for non-existent capability', async () => {
    const capability = await capabilitiesClient.get('non_existent');
    
    expect(capability).toBeUndefined();
  });

  it('should get all unique categories', async () => {
    const categories = await capabilitiesClient.getCategories();
    
    expect(categories).toHaveLength(2);
    expect(categories).toContain('settlements');
    expect(categories).toContain('payments');
  });

  it('should clear cache', async () => {
    await capabilitiesClient.getAll();
    capabilitiesClient.clearCache();
    await capabilitiesClient.getAll();
    
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

