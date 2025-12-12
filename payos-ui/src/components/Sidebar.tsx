import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  ShieldCheck, 
  Wallet, 
  Sparkles,
  Settings,
  HelpCircle,
  FileText,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const mainMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'employers', label: 'Employers', icon: Building2 },
    { id: 'contractors', label: 'Contractors', icon: Users },
    { id: 'compliance', label: 'Compliance', icon: ShieldCheck, badge: '3' },
    { id: 'treasury', label: 'Treasury', icon: Wallet },
    { id: 'ai-tools', label: 'AI Tools', icon: Sparkles },
  ];

  const otherMenuItems = [
    { id: 'help', label: 'Help & Support', icon: HelpCircle },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="w-64 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
            </svg>
          </div>
          <span className="text-xl font-semibold text-gray-900 dark:text-white">PayOS</span>
        </div>
      </div>

      {/* Main Menu */}
      <div className="flex-1 px-3 py-2">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 mb-2">
          Menu
        </div>
        <nav className="space-y-1">
          {mainMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Other Menu */}
        <div className="mt-8">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 mb-2">
            Other Menu
          </div>
          <nav className="space-y-1">
            {otherMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Logout */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
          <LogOut className="w-5 h-5" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
}
