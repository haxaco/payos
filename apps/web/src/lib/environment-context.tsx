'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { createSupabaseBrowserClient } from './supabase/client';

export type Environment = 'sandbox' | 'production';
export type ApiEnvironment = 'test' | 'live';

export type ProductionAccessStatus =
  | 'sandbox_only'
  | 'declaration_pending'
  | 'production_approved'
  | 'production_denied'
  | 'production_suspended'
  | 'unknown';

interface EnvironmentContextType {
  environment: Environment;
  apiEnvironment: ApiEnvironment;
  setEnvironment: (env: Environment) => void;
  /** Open beta: production is gated until the tenant is approved. */
  productionApproved: boolean;
  productionStatus: ProductionAccessStatus;
  /** True when the user tried to switch to production but isn't approved. */
  productionLocked: boolean;
  refreshProductionStatus: () => void;
}

const STORAGE_KEY = 'sly_environment';

function loadPersistedEnvironment(): Environment {
  if (typeof window === 'undefined') return 'sandbox';
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'production') return 'production';
    return 'sandbox';
  } catch {
    return 'sandbox';
  }
}

function toApiEnvironment(env: Environment): ApiEnvironment {
  return env === 'production' ? 'live' : 'test';
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined);

export function EnvironmentProvider({ children }: { children: ReactNode }) {
  const [environment, setEnvironmentRaw] = useState<Environment>('sandbox');
  const [hydrated, setHydrated] = useState(false);
  const [productionStatus, setProductionStatus] = useState<ProductionAccessStatus>('unknown');
  const [productionLocked, setProductionLocked] = useState(false);

  const productionApproved = productionStatus === 'production_approved';

  // Hydrate from localStorage on mount
  useEffect(() => {
    setEnvironmentRaw(loadPersistedEnvironment());
    setHydrated(true);
  }, []);

  const refreshProductionStatus = useCallback(async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/v1/tenants/production-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const body = await res.json();
      setProductionStatus((body?.status as ProductionAccessStatus) || 'unknown');
    } catch {
      // Non-fatal — leave status 'unknown' (treated as not approved).
    }
  }, []);

  useEffect(() => {
    if (hydrated) void refreshProductionStatus();
  }, [hydrated, refreshProductionStatus]);

  // If the persisted env is production but the tenant isn't approved, snap
  // back to sandbox (the server downgrades anyway — keep the UI honest).
  useEffect(() => {
    if (hydrated && environment === 'production' && productionStatus !== 'unknown' && !productionApproved) {
      setEnvironmentRaw('sandbox');
      setProductionLocked(true);
    }
  }, [hydrated, environment, productionStatus, productionApproved]);

  // Persist to localStorage on change
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, environment);
  }, [environment, hydrated]);

  const setEnvironment = (env: Environment) => {
    if (env === 'production' && !productionApproved) {
      // Gate the toggle: do not switch; surface the CTA instead.
      setProductionLocked(true);
      return;
    }
    setProductionLocked(false);
    setEnvironmentRaw(env);
  };

  return (
    <EnvironmentContext.Provider
      value={{
        environment,
        apiEnvironment: toApiEnvironment(environment),
        setEnvironment,
        productionApproved,
        productionStatus,
        productionLocked,
        refreshProductionStatus,
      }}
    >
      {children}
    </EnvironmentContext.Provider>
  );
}

export function useEnvironment() {
  const context = useContext(EnvironmentContext);
  if (!context) {
    throw new Error('useEnvironment must be used within EnvironmentProvider');
  }
  return context;
}
