'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api-client';
import { cn } from '@payos/ui';
import {
  Home,
  Users,
  Bot,
  ArrowLeftRight,
  Activity,
  FileText,
  Settings,
  Key,
  Webhook,
  Shield,
  Wallet,
  CreditCard,
  FileCode,
  ShieldCheck,
  ChevronLeft,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  AlertTriangle,
  ScrollText,
  Layers,
  UserCheck,
  Calendar,
  RotateCcw,
  DollarSign,
  Zap,
  BarChart3,
  Code,
} from 'lucide-react';
import { useSidebar } from './sidebar-context';
import { useState } from 'react';

const x402Nav = [
  { href: '/dashboard/x402', label: 'x402 Overview', icon: Zap },
  { href: '/dashboard/x402/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/x402/endpoints', label: 'Endpoints', icon: DollarSign },
  { href: '/dashboard/x402/integration', label: 'Integration', icon: Code },
];

const configurationNav = [
  { href: '/dashboard/templates', label: 'Templates', icon: FileCode },
  { href: '/dashboard/verification-tiers', label: 'Verification Tiers', icon: ShieldCheck },
  { href: '/dashboard/agent-tiers', label: 'Agent Tiers (KYA)', icon: UserCheck },
  // Developer section items (collapsible)
  { href: '/dashboard/api-keys', label: 'API Keys', icon: Key },
  { href: '/dashboard/webhooks', label: 'Webhooks', icon: Webhook },
  { href: '/dashboard/logs', label: 'Logs', icon: ScrollText },
];

const settingsNav = [
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

interface NavItemProps {
  href: string;
  label: string;
  icon: any;
  badge?: number;
}

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, setCollapsed } = useSidebar();
  const api = useApiClient();
  const [configExpanded, setConfigExpanded] = useState(false);

  // Fetch real compliance count
  const { data: complianceCount } = useQuery({
    queryKey: ['compliance', 'open-count'],
    queryFn: async () => {
      if (!api) return 0;
      return api.compliance.getOpenFlagsCount();
    },
    enabled: !!api,
    staleTime: 30 * 1000, // Cache for 30 seconds
    refetchOnWindowFocus: true, // Refetch when user comes back to window
  });

  // Build main nav with dynamic compliance count
  const mainNav = [
    { href: '/dashboard', label: 'Home', icon: Home },
    { href: '/dashboard/accounts', label: 'Accounts', icon: Users },
    { href: '/dashboard/transfers', label: 'Transactions', icon: ArrowLeftRight },
    { href: '/dashboard/schedules', label: 'Schedules', icon: Calendar },
    { href: '/dashboard/refunds', label: 'Refunds', icon: RotateCcw },
    { href: '/dashboard/cards', label: 'Cards', icon: CreditCard },
    { href: '/dashboard/compliance', label: 'Compliance', icon: Shield, badge: complianceCount || undefined },
    { href: '/dashboard/treasury', label: 'Treasury', icon: Wallet },
    { href: '/dashboard/agents', label: 'Agents', icon: Bot },
    { href: '/dashboard/reports', label: 'Reports', icon: FileText },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const NavItem = ({ item }: { item: NavItemProps }) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    
    return (
      <Link
        href={item.href}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          active
            ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400' 
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
          collapsed && 'justify-center'
        )}
        title={collapsed ? item.label : undefined}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && (
              <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-full">
                {item.badge}
              </span>
            )}
          </>
        )}
        {collapsed && item.badge && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </Link>
    );
  };

  return (
    <aside className={cn(
      'hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col',
      'bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800',
      'transition-all duration-300',
      collapsed ? 'lg:w-20' : 'lg:w-64'
    )}>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">PayOS</span>
          </Link>
        )}
        
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
        >
          <ChevronLeft className={cn(
            'w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform',
            collapsed && 'rotate-180'
          )} />
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {mainNav.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}

        {/* x402 Section - Moved above Configuration for better visibility */}
        <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-800 space-y-1">
          {!collapsed && (
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              x402 Payments
            </div>
          )}
          {x402Nav.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
        </div>

        {/* Configuration Section - Collapsible */}
        <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-800 space-y-1">
          {!collapsed ? (
            <>
              <button
                onClick={() => setConfigExpanded(!configExpanded)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <span>Configuration</span>
                <ChevronDown className={cn(
                  'w-4 h-4 transition-transform',
                  configExpanded && 'rotate-180'
                )} />
              </button>
              {configExpanded && configurationNav.map((item) => (
                <NavItem key={item.href} item={item} />
              ))}
            </>
          ) : (
            // When sidebar is collapsed, still show config items
            configurationNav.map((item) => (
              <NavItem key={item.href} item={item} />
            ))
          )}
        </div>

        {/* Settings Section */}
        <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-800 space-y-1">
          {settingsNav.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
        </div>
      </nav>

      {/* Version */}
      {!collapsed && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            PayOS v0.1.0
          </div>
        </div>
      )}
    </aside>
  );
}
