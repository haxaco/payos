import { useMemo } from 'react';
import { useApi, buildQueryString, ApiResponse } from './useApi';
import { PaymentMethod, PaymentMethodsResponse, PaymentMethodFilters } from '../../types/api';

/**
 * Hook to fetch payment methods list with optional filters
 */
export function usePaymentMethods(filters: PaymentMethodFilters = {}): ApiResponse<PaymentMethodsResponse> {
  const queryString = useMemo(() => buildQueryString(filters), [filters]);
  const endpoint = `/v1/payment-methods${queryString}`;
  
  return useApi<PaymentMethodsResponse>(endpoint);
}

/**
 * Hook to fetch a single payment method by ID
 */
export function usePaymentMethod(paymentMethodId: string | undefined, options?: { skip?: boolean }): ApiResponse<PaymentMethod> {
  const endpoint = paymentMethodId ? `/v1/payment-methods/${paymentMethodId}` : '';
  
  return useApi<PaymentMethod>(endpoint, {
    skip: !paymentMethodId || options?.skip,
  });
}

/**
 * Hook to fetch payment methods for a specific account
 */
export function useAccountPaymentMethods(accountId: string | undefined): ApiResponse<PaymentMethodsResponse> {
  const endpoint = accountId ? `/v1/accounts/${accountId}/payment-methods` : '';
  
  return useApi<PaymentMethodsResponse>(endpoint, {
    skip: !accountId,
  });
}

