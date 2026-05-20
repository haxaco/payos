'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@sly/ui';
import { isWebFeatureEnabled, type WebFeature } from '@/lib/feature-flags';

type SettingsTab = { href: string; label: string; exact?: boolean; feature?: WebFeature };

const settingsTabs: SettingsTab[] = (
  [
    { href: '/dashboard/settings', label: 'General', exact: true },
    { href: '/dashboard/settings/team', label: 'Team' },
    { href: '/dashboard/settings/settlement-rules', label: 'Settlement Rules' },
    // Templates is WIP (mock-only, no backend) — gated behind a feature flag.
    { href: '/dashboard/settings/templates', label: 'Templates', feature: 'templates' },
    { href: '/dashboard/settings/verification-tiers', label: 'Verification Tiers' },
    { href: '/dashboard/settings/agent-tiers', label: 'Agent Tiers (KYA)' },
    // Card Networks (Visa VIC + Mastercard Agent Pay) — hidden until we
    // have sandbox credentials. Stripe-backed cards available via
    // /dashboard/payment-handlers in the meantime.
    { href: '/dashboard/settings/webhooks', label: 'Webhooks' },
  ] satisfies SettingsTab[]
).filter((t) => !t.feature || isWebFeatureEnabled(t.feature));

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your account, team, and configuration</p>
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200 dark:border-gray-800 mb-8">
        <nav className="-mb-px flex gap-6 overflow-x-auto" aria-label="Settings tabs">
          {settingsTabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'whitespace-nowrap border-b-2 pb-3 pt-1 text-sm font-medium transition-colors',
                isActive(tab.href, tab.exact)
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      {children}
    </div>
  );
}
