/**
 * Capabilities Client - Tool Discovery for AI Agents
 */

import { PayOSClient } from '../client';
import { CapabilitiesResponse, CapabilitiesFilter, Capability } from './types';

export class CapabilitiesClient {
  private client: PayOSClient;
  private cachedCapabilities: CapabilitiesResponse | null = null;
  private cacheTimestamp: number = 0;
  private cacheTTL: number = 3600000; // 1 hour

  constructor(client: PayOSClient) {
    this.client = client;
  }

  /**
   * Get all PayOS capabilities
   * Results are cached for 1 hour by default
   */
  public async getAll(forceFresh = false): Promise<CapabilitiesResponse> {
    const now = Date.now();
    
    if (!forceFresh && this.cachedCapabilities && (now - this.cacheTimestamp < this.cacheTTL)) {
      return this.cachedCapabilities;
    }

    const capabilities = await this.client.getCapabilities();
    this.cachedCapabilities = capabilities;
    this.cacheTimestamp = now;
    
    return capabilities;
  }

  /**
   * Get capabilities filtered by category or name
   */
  public async filter(filter: CapabilitiesFilter): Promise<Capability[]> {
    const all = await this.getAll();
    
    return all.capabilities.filter(cap => {
      if (filter.category && cap.category !== filter.category) {
        return false;
      }
      if (filter.name && cap.name !== filter.name) {
        return false;
      }
      return true;
    });
  }

  /**
   * Get a single capability by name
   */
  public async get(name: string): Promise<Capability | undefined> {
    const all = await this.getAll();
    return all.capabilities.find(cap => cap.name === name);
  }

  /**
   * Get all available categories
   */
  public async getCategories(): Promise<string[]> {
    const all = await this.getAll();
    const categories = new Set(all.capabilities.map(cap => cap.category));
    return Array.from(categories);
  }

  /**
   * Clear the capabilities cache
   */
  public clearCache(): void {
    this.cachedCapabilities = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Get capabilities in OpenAI function-calling format
   */
  public async toOpenAI() {
    const response = await this.getAll();
    const { toOpenAIFunctions, getOpenAISystemMessage } = await import('./formatters');
    return {
      functions: toOpenAIFunctions(response.capabilities),
      systemMessage: getOpenAISystemMessage(),
    };
  }

  /**
   * Get capabilities in OpenAI function-calling format (alias)
   */
  public async toOpenAIFunctions() {
    const response = await this.getAll();
    const { toOpenAIFunctions } = await import('./formatters');
    return toOpenAIFunctions(response.capabilities);
  }

  /**
   * Get capabilities in Claude tool format
   */
  public async toClaude() {
    const response = await this.getAll();
    const { toClaudeTools, getClaudeSystemMessage } = await import('./formatters');
    return {
      tools: toClaudeTools(response.capabilities),
      systemMessage: getClaudeSystemMessage(),
    };
  }

  /**
   * Get capabilities in Claude tool format (alias)
   */
  public async toClaudeTools() {
    const response = await this.getAll();
    const { toClaudeTools } = await import('./formatters');
    return toClaudeTools(response.capabilities);
  }

  /**
   * Get capabilities in LangChain tool format
   */
  public async toLangChain() {
    const response = await this.getAll();
    const { toLangChainTools } = await import('./formatters');
    return toLangChainTools(response.capabilities);
  }
}

