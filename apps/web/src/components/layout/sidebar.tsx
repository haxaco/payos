'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@payos/ui';
import {
  LayoutDashboard,
  Users,
  Bot,
  ArrowLeftRight,
  Activity,
  FileText,
  Settings,
  Key,
  Zap,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Accounts', href: '/dashboard/accounts', icon: Users },
  { name: 'Agents', href: '/dashboard/agents', icon: Bot },
  { name: 'Streams', href: '/dashboard/streams', icon: Activity },
  { name: 'Transfers', href: '/dashboard/transfers', icon: ArrowLeftRight },
  { name: 'Reports', href: '/dashboard/reports', icon: FileText },
];

const secondaryNavigation = [
  { name: 'API Keys', href: '/dashboard/api-keys', icon: Key },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r bg-card px-6 pb-4">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-2">
          <div className="rounded-lg bg-primary p-2">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">PayOS</span>
        </div>

        {/* Primary Navigation */}
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                          'group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6'
                        )}
                      >
                        <item.icon
                          className={cn(
                            isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                            'h-5 w-5 shrink-0'
                          )}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>

            {/* Secondary Navigation */}
            <li>
              <div className="text-xs font-semibold leading-6 text-muted-foreground">
                Settings
              </div>
              <ul role="list" className="-mx-2 mt-2 space-y-1">
                {secondaryNavigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                          'group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6'
                        )}
                      >
                        <item.icon
                          className={cn(
                            isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                            'h-5 w-5 shrink-0'
                          )}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>

            {/* Version */}
            <li className="mt-auto">
              <div className="text-xs text-muted-foreground">
                PayOS v0.1.0
              </div>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}

