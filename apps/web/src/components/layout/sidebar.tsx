'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  Layers,
  ShieldCheck,
  ChevronLeft,
} from 'lucide-react';
import { useState } from 'react';

const mainNav = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/dashboard/accounts', label: 'Accounts', icon: Users },
  { href: '/dashboard/transfers', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/dashboard/streams', label: 'Streams', icon: Activity },
  { href: '/dashboard/agents', label: 'Agents', icon: Bot },
  { href: '/dashboard/reports', label: 'Reports', icon: FileText },
];

const developerNav = [
  { href: '/dashboard/api-keys', label: 'API Keys', icon: Key },
  { href: '/dashboard/webhooks', label: 'Webhooks', icon: Webhook },
];

const configNav = [
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
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
        {mainNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <Link
              key={item.href}
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
                <span className="flex-1 text-left">{item.label}</span>
              )}
            </Link>
          );
        })}

        {/* Developer Section */}
        <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-800 space-y-1">
          {!collapsed && (
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Developer
            </div>
          )}
          {developerNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.href}
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
                {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Config Section */}
        <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-800 space-y-1">
          {configNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.href}
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
                {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
              </Link>
            );
          })}
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
