import { Link, useLocation } from 'react-router-dom';
import { 
  Home,
  Users,
  ArrowLeftRight,
  CreditCard,
  Shield,
  Wallet,
  Layers,
  ShieldCheck,
  Settings,
  ChevronLeft,
  Bot,
  Key,
  Webhook,
  Activity,
  FileText,
  Scale
} from 'lucide-react';
import { useComplianceStats, useDisputeStats } from '../../hooks/api';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const getMainNav = (complianceCount?: number, disputesCount?: number) => [
  { href: '/', label: 'Home', icon: Home },
  { href: '/accounts', label: 'Accounts', icon: Users },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/cards', label: 'Cards', icon: CreditCard },
  { href: '/compliance', label: 'Compliance', icon: Shield, badge: complianceCount !== undefined ? complianceCount.toString() : undefined },
  { href: '/disputes', label: 'Disputes', icon: Scale, badge: disputesCount !== undefined ? disputesCount.toString() : undefined },
  { href: '/treasury', label: 'Treasury', icon: Wallet },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/reports', label: 'Reports', icon: FileText },
];

const developerNav = [
  { href: '/api-keys', label: 'API Keys', icon: Key },
  { href: '/webhooks', label: 'Webhooks', icon: Webhook },
  { href: '/request-logs', label: 'Logs', icon: Activity },
];

const configNavItems = [
  { icon: Layers, label: 'Templates', href: '/templates' },
  { icon: ShieldCheck, label: 'Verification Tiers', href: '/verification-tiers' },
  { icon: Bot, label: 'Agent Tiers (KYA)', href: '/agent-verification-tiers' },
];

const secondaryNav = [
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const location = useLocation();
  
  // Fetch real-time counts for sidebar badges
  const { data: complianceStats } = useComplianceStats();
  const { data: disputeStats } = useDisputeStats();
  
  // Calculate active compliance flags (not resolved/dismissed)
  const complianceCount = complianceStats?.data ? 
    complianceStats.data.by_status.open + 
    complianceStats.data.by_status.pending_review + 
    complianceStats.data.by_status.under_investigation + 
    complianceStats.data.by_status.escalated 
    : undefined;
  
  // Calculate active disputes (not resolved)
  const disputesCount = disputeStats?.data ? 
    disputeStats.data.byStatus.open + 
    disputeStats.data.byStatus.underReview + 
    disputeStats.data.byStatus.escalated 
    : undefined;
  
  const mainNav = getMainNav(complianceCount, disputesCount);

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <aside className={`
      ${collapsed ? 'w-20' : 'w-64'} 
      bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 
      flex flex-col transition-all duration-300 relative
    `}>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800">
        {!collapsed && (
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">PayOS</span>
          </Link>
        )}
        
        <button
          onClick={onToggleCollapse}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
        >
          <ChevronLeft className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
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
              to={item.href}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${active
                  ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}

        {/* Divider */}
        <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-800 space-y-1">
          {developerNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${active
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                  ${collapsed ? 'justify-center' : ''}
                `}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-800 space-y-1">
          {configNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${active
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                  ${collapsed ? 'justify-center' : ''}
                `}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-800 space-y-1">
          {secondaryNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${active
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                  ${collapsed ? 'justify-center' : ''}
                `}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Profile */}
      {!collapsed && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
              JS
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">John Smith</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">john@acmefintech.com</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
