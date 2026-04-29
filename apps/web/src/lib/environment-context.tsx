'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Environment = 'sandbox' | 'production';
export type ApiEnvironment = 'test' | 'live';

interface EnvironmentContextType {
  environment: Environment;
  apiEnvironment: ApiEnvironment;
  setEnvironment: (env: Environment) => void;
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

  // Hydrate from localStorage on mount
  useEffect(() => {
    setEnvironmentRaw(loadPersistedEnvironment());
    setHydrated(true);
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, environment);
  }, [environment, hydrated]);

  const setEnvironment = (env: Environment) => {
    setEnvironmentRaw(env);
  };

  return (
    <EnvironmentContext.Provider
      value={{
        environment,
        apiEnvironment: toApiEnvironment(environment),
        setEnvironment,
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
