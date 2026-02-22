/**
 * Permission → Tool Mapping (Story 58.2)
 *
 * Maps agent permissions to the MCP tools they're allowed to use.
 * An empty array means the tool is always available.
 */

export const TOOL_PERMISSION_MAP: Record<string, string[]> = {
  // Settlement tools
  get_settlement_quote: ['transactions.view'],
  create_settlement: ['transactions.initiate'],
  get_settlement_status: ['transactions.view'],

  // Wallet tools
  list_wallets: ['treasury.view'],
  get_wallet: ['treasury.view'],
  get_wallet_balance: ['treasury.view'],
  create_wallet: ['treasury.rebalance'],
  wallet_deposit: ['treasury.rebalance'],
  wallet_withdraw: ['treasury.rebalance'],
  wallet_test_fund: ['treasury.rebalance'],

  // Account tools
  list_accounts: ['accounts.view'],
  create_account: ['accounts.create'],
  update_account: ['accounts.create'],
  get_tenant_info: [],

  // Agent tools
  create_agent: ['accounts.create'],
  verify_agent: ['accounts.create'],
  get_agent: ['accounts.view'],
  get_agent_limits: ['accounts.view'],
  get_agent_transactions: ['transactions.view'],
  delete_agent: ['accounts.create'],

  // AP2 (Mandate) tools
  ap2_create_mandate: ['transactions.initiate'],
  ap2_get_mandate: ['transactions.view'],
  ap2_update_mandate: ['transactions.initiate'],
  ap2_execute_mandate: ['transactions.initiate'],
  ap2_list_mandates: ['transactions.view'],
  ap2_cancel_mandate: ['transactions.initiate'],

  // ACP (Commerce) tools
  acp_create_checkout: ['transactions.initiate'],
  acp_get_checkout: ['transactions.view'],
  acp_list_checkouts: ['transactions.view'],
  acp_complete_checkout: ['transactions.initiate'],
  acp_batch_checkout: ['transactions.initiate'],

  // UCP tools
  ucp_discover: [],
  ucp_create_checkout: ['transactions.initiate'],
  ucp_get_checkout: ['transactions.view'],
  ucp_list_checkouts: ['transactions.view'],
  ucp_update_checkout: ['transactions.initiate'],
  ucp_complete_checkout: ['transactions.initiate'],
  ucp_cancel_checkout: ['transactions.initiate'],
  ucp_add_payment_instrument: ['transactions.initiate'],
  ucp_batch_checkout: ['transactions.initiate'],
  ucp_batch_complete: ['transactions.initiate'],
  ucp_list_orders: ['transactions.view'],
  ucp_get_order: ['transactions.view'],
  ucp_update_order_status: ['transactions.initiate'],
  ucp_cancel_order: ['transactions.initiate'],
  ucp_add_fulfillment_event: ['transactions.initiate'],

  // x402 tools
  x402_create_endpoint: ['transactions.initiate'],
  x402_get_endpoint: ['transactions.view'],
  x402_list_endpoints: ['transactions.view'],
  x402_pay: ['transactions.initiate'],
  x402_verify: ['transactions.view'],

  // Merchant tools
  list_merchants: [],
  get_merchant: [],

  // A2A tools (always available for managed agents)
  a2a_discover_agent: [],
  a2a_send_task: [],
  a2a_get_task: [],
  a2a_list_tasks: [],

  // Synthetic tools (Story 58.2)
  get_agent_info: [],

  // Human-in-the-loop escalation (Story 58.6)
  escalate_to_human: [],
};

/**
 * Flatten agent permissions object to a list of permission strings.
 * e.g. { transactions: { initiate: true, view: true } } → ['transactions.initiate', 'transactions.view']
 */
export function flattenPermissions(permissions: Record<string, Record<string, boolean>>): string[] {
  const result: string[] = [];
  for (const [category, actions] of Object.entries(permissions)) {
    for (const [action, allowed] of Object.entries(actions)) {
      if (allowed) {
        result.push(`${category}.${action}`);
      }
    }
  }
  return result;
}
