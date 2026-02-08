'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DemoModeContextType {
  active: boolean;
  setActive: (v: boolean) => void;
  scenarioId: number | null;
  setScenarioId: (id: number | null) => void;
}

const STORAGE_KEY = 'sly_demo_mode';

function loadPersistedState(): { active: boolean; scenarioId: number | null } {
  if (typeof window === 'undefined') return { active: false, scenarioId: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { active: false, scenarioId: null };
    const parsed = JSON.parse(raw);
    return {
      active: !!parsed.active,
      scenarioId: typeof parsed.scenarioId === 'number' ? parsed.scenarioId : null,
    };
  } catch {
    return { active: false, scenarioId: null };
  }
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [active, setActiveRaw] = useState(false);
  const [scenarioId, setScenarioIdRaw] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const persisted = loadPersistedState();
    setActiveRaw(persisted.active);
    setScenarioIdRaw(persisted.scenarioId);
    setHydrated(true);
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ active, scenarioId }));
  }, [active, scenarioId, hydrated]);

  const setActive = (v: boolean) => {
    setActiveRaw(v);
    if (!v) setScenarioIdRaw(null);
  };

  const setScenarioId = (id: number | null) => {
    setScenarioIdRaw(id);
  };

  return (
    <DemoModeContext.Provider value={{ active, setActive, scenarioId, setScenarioId }}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  const context = useContext(DemoModeContext);
  if (!context) {
    throw new Error('useDemoMode must be used within DemoModeProvider');
  }
  return context;
}
