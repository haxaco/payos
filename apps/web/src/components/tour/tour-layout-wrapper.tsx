'use client';

import type { ReactNode } from 'react';
import { TourProvider } from './use-tour';
import { TourEngine } from './tour-engine';
import { TourFirstRun } from './tour-first-run';

/**
 * Client-side wrapper that hangs the tour context off the dashboard layout.
 *
 * Mirrors {@link DemoLayoutWrapper}'s shape so the server layout can stay async
 * without needing to mark itself `'use client'`. The engine + first-run banner
 * are rendered as siblings of `children` so they sit above page content.
 */
export function TourLayoutWrapper({ children }: { children: ReactNode }) {
  return (
    <TourProvider>
      {children}
      <TourEngine />
      <TourFirstRun />
    </TourProvider>
  );
}
