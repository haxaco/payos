/**
 * LangChain Tools Wrapper for PayOS SDK
 */

import { PayOS } from '../index';

export class LangChainTools {
  private payos: PayOS;

  constructor(payos: PayOS) {
    this.payos = payos;
  }

  /**
   * Get all PayOS capabilities as LangChain tools
   */
  public async getTools() {
    return this.payos.capabilities.toLangChain();
  }

  /**
   * Get a specific tool by name
   */
  public async getTool(name: string) {
    const tools = await this.getTools();
    return tools.find(tool => tool.name === name);
  }
}
