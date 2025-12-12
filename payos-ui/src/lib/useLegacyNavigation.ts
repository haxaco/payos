'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { LegacyPage, legacyPageToRoute } from './navigation';

/**
 * Hook to provide legacy onNavigate support for pages being migrated
 * This allows gradual migration from old Page-based routing to Next.js App Router
 */
export function useLegacyNavigation() {
  const router = useRouter();

  const onNavigate = useCallback((page: LegacyPage, id?: string) => {
    const route = legacyPageToRoute(page, id);
    router.push(route);
  }, [router]);

  return { onNavigate };
}
