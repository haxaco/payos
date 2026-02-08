'use client';

import { ReactNode } from 'react';
import { DemoModeProvider } from './demo-mode-context';
import { DemoScenarioPanel } from './demo-scenario-panel';

export function DemoLayoutWrapper({ children }: { children: ReactNode }) {
  return (
    <DemoModeProvider>
      {children}
      <DemoScenarioPanel />
    </DemoModeProvider>
  );
}
