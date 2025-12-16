/**
 * API Hooks
 * 
 * Reusable React hooks for fetching data from the PayOS API.
 * All hooks handle loading states, errors, authentication, and retries automatically.
 * 
 * Usage:
 * ```typescript
 * import { useAccounts, useAccount } from '@/hooks/api';
 * 
 * function AccountsPage() {
 *   const { data, loading, error, refetch } = useAccounts({ type: 'person' });
 *   
 *   if (loading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage error={error} />;
 *   
 *   return <AccountsList accounts={data?.accounts || []} />;
 * }
 * ```
 */

// Base hooks
export { useApi, useApiMutation, buildQueryString } from './useApi';
export type { ApiResponse, PaginatedResponse } from './useApi';

// Resource hooks
export { useAccounts, useAccount } from './useAccounts';
export { useTransfers, useTransfer } from './useTransfers';
export { usePaymentMethods, usePaymentMethod, useAccountPaymentMethods } from './usePaymentMethods';
export { useAgents, useAgent } from './useAgents';
export { useStreams, useStream, useAccountStreams } from './useStreams';
export { useReports, useReport, useSummaryReport, generateReport, deleteReport, downloadReport } from './useReports';
export {
  useComplianceFlags,
  useComplianceFlag,
  useComplianceStats,
  useCreateComplianceFlag,
  useUpdateComplianceFlag,
  useResolveComplianceFlag,
  useAssignComplianceFlag,
} from './useCompliance';
export type {
  ComplianceFlag,
  ComplianceFlagFilters,
  CreateFlagPayload,
  UpdateFlagPayload,
  ResolveFlagPayload,
  ComplianceStats,
} from './useCompliance';

// Types
export type {
  Account,
  AccountsResponse,
  AccountFilters,
  Transfer,
  TransfersResponse,
  TransferFilters,
  PaymentMethod,
  PaymentMethodsResponse,
  PaymentMethodFilters,
  Agent,
  AgentsResponse,
  AgentFilters,
  Stream,
  StreamsResponse,
  StreamFilters,
} from '../../types/api';

