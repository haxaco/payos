'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const PLATFORM_DOMAIN = '@getsly.ai';

/**
 * Resolves whether the current signed-in user is platform staff (their email
 * ends with @getsly.ai). Used to gate UI surfaces that expose platform-wide
 * resources — currently the Circle master wallet card on /dashboard/wallets
 * and the matching strip on the per-agent Wallet tab.
 *
 * Server-side gate also exists on /v1/agents/circle/master-balance, so this
 * hook is just for clean rendering — a partner who somehow bypassed the
 * check would still get a 403 from the API.
 *
 * Returns `null` while resolving so callers can avoid a render flash.
 */
export function usePlatformStaff(): boolean | null {
  const [isStaff, setIsStaff] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const email = data?.user?.email ?? '';
      setIsStaff(email.endsWith(PLATFORM_DOMAIN));
    }).catch(() => {
      if (!cancelled) setIsStaff(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return isStaff;
}
