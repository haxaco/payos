'use client';

import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { PayOSClient, createPayOSClient } from '@payos/api-client';

interface ApiClientContextType {
  client: PayOSClient | null;
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
  isConfigured: boolean;
}

const ApiClientContext = createContext<ApiClientContextType>({
  client: null,
  apiKey: null,
  setApiKey: () => {},
  isConfigured: false,
});

const API_KEY_STORAGE_KEY = 'payos_api_key';

export function ApiClientProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load API key from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (stored) {
      setApiKeyState(stored);
    }
    setIsInitialized(true);
  }, []);

  // Save API key to localStorage when it changes
  const setApiKey = (key: string | null) => {
    if (key) {
      localStorage.setItem(API_KEY_STORAGE_KEY, key);
    } else {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
    setApiKeyState(key);
  };

  // Create client instance when API key is available
  const client = useMemo(() => {
    if (!apiKey) return null;
    
    return createPayOSClient({
      baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
      apiKey,
      onError: (error) => {
        console.error('API Error:', error);
        // Handle 401 by clearing the API key
        if (error.status === 401) {
          setApiKey(null);
        }
      },
    });
  }, [apiKey]);

  const value = {
    client,
    apiKey,
    setApiKey,
    isConfigured: isInitialized && !!apiKey,
  };

  return (
    <ApiClientContext.Provider value={value}>
      {children}
    </ApiClientContext.Provider>
  );
}

export function useApiClient() {
  const context = useContext(ApiClientContext);
  return context.client;
}

export function useApiConfig() {
  const context = useContext(ApiClientContext);
  return {
    apiKey: context.apiKey,
    setApiKey: context.setApiKey,
    isConfigured: context.isConfigured,
  };
}

