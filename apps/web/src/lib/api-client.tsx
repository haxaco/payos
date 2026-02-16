'use client';

import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PayOSClient, createPayOSClient, PayOSError } from '@sly/api-client';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface ApiClientContextType {
  client: PayOSClient | null;
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
  isConfigured: boolean;
  isLoading: boolean;
  authToken: string | null;
}

const ApiClientContext = createContext<ApiClientContextType>({
  client: null,
  apiKey: null,
  setApiKey: () => {},
  isConfigured: false,
  isLoading: true,
  authToken: null,
});

const API_KEY_STORAGE_KEY = 'payos_api_key';

export function ApiClientProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const queryClient = useQueryClient();

  // Load API key from localStorage AND get JWT from Supabase session
  useEffect(() => {
    async function initialize() {
      // Check for stored API key (for programmatic access)
      const storedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
      if (storedApiKey) {
        setApiKeyState(storedApiKey);
      }

      // Get JWT token from Supabase session (for dashboard access)
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.access_token) {
        setAuthToken(session.access_token);
      }

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        setAuthToken(session?.access_token || null);
        // Clear all cached queries on sign-out to prevent cross-tenant data leakage
        if (event === 'SIGNED_OUT') {
          queryClient.clear();
        }
      });

      setIsInitialized(true);

      return () => {
        subscription.unsubscribe();
      };
    }

    initialize();
  }, [queryClient]);

  // Save API key to localStorage when it changes
  const setApiKey = (key: string | null) => {
    if (key) {
      localStorage.setItem(API_KEY_STORAGE_KEY, key);
    } else {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
    setApiKeyState(key);
  };

  // Create client instance with JWT token (preferred) or API key (fallback)
  const client = useMemo(() => {
    // Prefer JWT from session for dashboard access
    const token = authToken || apiKey;
    if (!token) return null;
    
    return createPayOSClient({
      baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
      apiKey: token, // API client uses this as the auth token
      onError: (error) => {
        console.error('API Error:', error);
        
        // Handle 429 Rate Limiting
        if (error.status === 429) {
          const retryAfter = error.retryAfter || 60;
          toast.error('Too Many Requests', {
            description: `Please wait ${retryAfter} seconds before trying again.`,
            duration: retryAfter * 1000, // Show toast for the retry duration
            action: {
              label: 'Dismiss',
              onClick: () => {},
            },
          });
          return;
        }
        
        // Handle 401 - if using API key, clear it
        if (error.status === 401) {
          if (apiKey) {
            setApiKey(null);
            toast.error('Invalid API Key', {
              description: 'Your API key is invalid or expired. Please re-enter it.',
            });
          }
          // If using JWT, Supabase will handle re-auth
          return;
        }
        
        // Generic error toast for other errors (don't show for validation errors)
        if (error.status >= 500) {
          toast.error('Server Error', {
            description: error.message || 'An unexpected error occurred. Please try again.',
          });
        }
      },
    });
  }, [authToken, apiKey]);

  const value = {
    client,
    apiKey,
    setApiKey,
    isConfigured: isInitialized && (!!authToken || !!apiKey), // Configured if we have either JWT or API key
    isLoading: !isInitialized,
    authToken,
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
    isLoading: context.isLoading,
    authToken: context.authToken,
  };
}

