import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Shield, 
  Wallet,
  Sparkles,
  Settings,
  HelpCircle,
  FileText
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'employers', label: 'Employers', icon: Building2 },
  { id: 'contractors', label: 'Contractors', icon: Users },
  { id: 'compliance', label: 'Compliance', icon: Shield, badge: '3' },
  { id: 'treasury', label: 'Treasury', icon: Wallet },
  { id: 'ai-assistant', label: 'AI Assistant', icon: Sparkles, highlight: true },
];

const secondaryItems = [
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'help', label: 'Help', icon: HelpCircle },
];

export function Sidebar({ currentView, onNavigate }: SidebarProps) {
  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            PayOS
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-200
                ${isActive 
                  ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                }
                ${item.highlight && !isActive ? 'hover:bg-blue-50/50 dark:hover:bg-blue-950/30' : ''}
              `}
            >
              <Icon className={`w-5 h-5 ${item.highlight && !isActive ? 'text-blue-600 dark:text-blue-500' : ''}`} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-800 space-y-1">
          {secondaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-200
                  ${isActive 
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <img 
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces" 
            alt="User"
            className="w-9 h-9 rounded-full ring-2 ring-slate-200 dark:ring-slate-700"
          />
          <div className="flex-1 text-left">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Alex Morgan</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Admin</div>
          </div>
        </button>
      </div>
    </aside>
  );
}
