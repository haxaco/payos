import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../useAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export interface ApiResponse<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

interface UseApiOptions {
  skip?: boolean; // Skip automatic fetching
  onError?: (error: Error) => void;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * Base hook for making authenticated API calls
 * Handles loading states, errors, auth tokens, and retries
 */
export function useApi<T>(
  endpoint: string,
  options: UseApiOptions = {}
): ApiResponse<T> {
  const { accessToken, logout } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(!options.skip);
  const [error, setError] = useState<Error | null>(null);

  const {
    skip = false,
    onError,
    retryAttempts = 2,
    retryDelay = 1000,
  } = options;

  const fetchData = useCallback(
    async (attemptNumber = 0): Promise<void> => {
      if (!accessToken) {
        setError(new Error('No access token available'));
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        // Handle 401 - Unauthorized (token expired)
        if (response.status === 401) {
          console.error('Authentication failed - logging out');
          logout();
          throw new Error('Session expired. Please log in again.');
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `API Error: ${response.status}`);
        }

        const result = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error occurred');
        
        // Retry logic for network errors (not auth errors)
        if (attemptNumber < retryAttempts && error.message !== 'Session expired. Please log in again.') {
          console.warn(`Retrying API call (attempt ${attemptNumber + 1}/${retryAttempts})...`);
          setTimeout(() => fetchData(attemptNumber + 1), retryDelay);
          return;
        }

        setError(error);
        if (onError) {
          onError(error);
        }
      } finally {
        setLoading(false);
      }
    },
    [accessToken, endpoint, logout, onError, retryAttempts, retryDelay]
  );

  useEffect(() => {
    if (!skip) {
      fetchData();
    }
  }, [skip, fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

/**
 * Hook for making POST/PUT/DELETE API calls
 */
export function useApiMutation<TRequest, TResponse>() {
  const { accessToken, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (
      endpoint: string,
      method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
      body?: TRequest
    ): Promise<TResponse> => {
      if (!accessToken) {
        throw new Error('No access token available');
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method,
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        // Handle 401 - Unauthorized
        if (response.status === 401) {
          console.error('Authentication failed - logging out');
          logout();
          throw new Error('Session expired. Please log in again.');
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `API Error: ${response.status}`);
        }

        const result = await response.json();
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error occurred');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [accessToken, logout]
  );

  return {
    mutate,
    loading,
    error,
  };
}

/**
 * Build query string from filters object
 */
export function buildQueryString(filters: Record<string, any>): string {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(v => params.append(key, String(v)));
      } else {
        params.append(key, String(value));
      }
    }
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

