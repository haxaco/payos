import { useState } from 'react';
import { 
  User, 
  Shield, 
  Bell, 
  Key, 
  Webhook, 
  Palette, 
  DollarSign, 
  Users, 
  Save,
  Copy,
  Eye,
  EyeOff,
  Plus,
  Trash2
} from 'lucide-react';

type SettingsTab = 'account' | 'platform' | 'payouts' | 'team';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [showApiKey, setShowApiKey] = useState(false);

  const tabs = [
    { id: 'account' as SettingsTab, label: 'Account', icon: User },
    { id: 'platform' as SettingsTab, label: 'Platform Config', icon: Key },
    { id: 'payouts' as SettingsTab, label: 'Payout Settings', icon: DollarSign },
    { id: 'team' as SettingsTab, label: 'Team & Permissions', icon: Users },
  ];

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-gray-900 dark:text-white mb-2">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your account, platform configuration, and team settings
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-800 mb-8">
          <nav className="flex gap-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 pb-4 px-1 border-b-2 transition-colors
                    ${isActive 
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'account' && <AccountSettings />}
          {activeTab === 'platform' && <PlatformConfig showApiKey={showApiKey} setShowApiKey={setShowApiKey} />}
          {activeTab === 'payouts' && <PayoutSettings />}
          {activeTab === 'team' && <TeamSettings />}
        </div>
      </div>
    </div>
  );
}

function AccountSettings() {
  return (
    <>
      {/* Profile Settings */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-gray-900 dark:text-white">Profile Information</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Full Name
            </label>
            <input
              type="text"
              defaultValue="John Smith"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              defaultValue="john@acmefintech.com"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Company Name
            </label>
            <input
              type="text"
              defaultValue="Acme Fintech"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Role
            </label>
            <input
              type="text"
              defaultValue="Partner Admin"
              disabled
              className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400"
            />
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-gray-900 dark:text-white">Security</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-800">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Add an extra layer of security to your account</div>
            </div>
            <button className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors">
              Enable
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-800">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Password</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Last changed 3 months ago</div>
            </div>
            <button className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors">
              Change
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Active Sessions</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Manage devices where you're signed in</div>
            </div>
            <button className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors">
              Manage
            </button>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-gray-900 dark:text-white">Notifications</h2>
        </div>

        <div className="space-y-4">
          {[
            { label: 'Email Notifications', description: 'Receive email updates about your account activity' },
            { label: 'Compliance Alerts', description: 'Get notified about new compliance flags' },
            { label: 'Transaction Alerts', description: 'Notifications for high-value transactions' },
            { label: 'Weekly Reports', description: 'Receive weekly summary reports' },
          ].map((item, index) => (
            <label key={index} className="flex items-center justify-between py-3 cursor-pointer">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">{item.label}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{item.description}</div>
              </div>
              <input
                type="checkbox"
                defaultChecked={index < 2}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>
          ))}
        </div>
      </div>
    </>
  );
}

function PlatformConfig({ showApiKey, setShowApiKey }: { showApiKey: boolean; setShowApiKey: (show: boolean) => void }) {
  return (
    <>
      {/* API Keys */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-gray-900 dark:text-white">API Keys</h2>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            Generate New Key
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-medium text-gray-900 dark:text-white mb-1">Production API Key</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Created on Dec 1, 2024</div>
              </div>
              <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 rounded">
                Active
              </span>
            </div>
            
            <div className="flex items-center gap-2 mb-3">
              <input
                type={showApiKey ? "text" : "password"}
                value="pk_live_51JX7Y8KLM9N0P1Q2R3S4T5U6V7W8X9Y0Z"
                readOnly
                className="flex-1 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white font-mono text-sm"
              />
              <button 
                onClick={() => setShowApiKey(!showApiKey)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {showApiKey ? <EyeOff className="w-5 h-5 text-gray-600 dark:text-gray-400" /> : <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
              </button>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">Last used: 2 hours ago</span>
              <button className="text-red-600 dark:text-red-400 hover:underline">Revoke</button>
            </div>
          </div>
        </div>
      </div>

      {/* Webhooks */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Webhook className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-gray-900 dark:text-white">Webhooks</h2>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            Add Endpoint
          </button>
        </div>

        <div className="space-y-3">
          {[
            { url: 'https://api.acmefintech.com/webhooks/payos', events: 5, status: 'Active' },
            { url: 'https://staging.acmefintech.com/webhooks/payos', events: 3, status: 'Active' },
          ].map((webhook, index) => (
            <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-mono text-sm text-gray-900 dark:text-white mb-2">{webhook.url}</div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>{webhook.events} events subscribed</span>
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 rounded">
                      {webhook.status}
                    </span>
                  </div>
                </div>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* White Label Branding */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Palette className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-gray-900 dark:text-white">White Label Branding</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Brand Name
            </label>
            <input
              type="text"
              defaultValue="Acme Fintech"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Primary Color
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                defaultValue="#3B82F6"
                className="h-11 w-16 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                defaultValue="#3B82F6"
                className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Logo URL
            </label>
            <input
              type="text"
              placeholder="https://example.com/logo.png"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Support Email
            </label>
            <input
              type="email"
              defaultValue="support@acmefintech.com"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            <Save className="w-4 h-4" />
            Save Branding
          </button>
        </div>
      </div>
    </>
  );
}

function PayoutSettings() {
  return (
    <>
      {/* Default Settings */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center gap-3 mb-6">
          <DollarSign className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-gray-900 dark:text-white">Default Payout Settings</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Currency
            </label>
            <select className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>USD</option>
              <option>USDC (Stablecoin)</option>
              <option>MXN</option>
              <option>BRL</option>
              <option>ARS</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Payout Frequency
            </label>
            <select className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Weekly</option>
              <option>Bi-weekly</option>
              <option>Monthly</option>
              <option>On-demand</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Minimum Payout Amount
            </label>
            <input
              type="number"
              defaultValue="100"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Transaction Fee
            </label>
            <input
              type="text"
              defaultValue="1.5%"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            <Save className="w-4 h-4" />
            Save Settings
          </button>
        </div>
      </div>

      {/* Compliance Rules */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-gray-900 dark:text-white">Compliance Rules</h2>
        </div>

        <div className="space-y-4">
          {[
            { label: 'Require KYC Verification', description: 'All contractors must complete identity verification', enabled: true },
            { label: 'Auto-flag High-risk Countries', description: 'Automatically flag transactions to sanctioned regions', enabled: true },
            { label: 'Transaction Monitoring', description: 'Enable AI-powered transaction pattern analysis', enabled: true },
            { label: 'Velocity Checks', description: 'Flag rapid transaction patterns', enabled: false },
          ].map((rule, index) => (
            <label key={index} className="flex items-center justify-between py-3 cursor-pointer border-b border-gray-200 dark:border-gray-800 last:border-0">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">{rule.label}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{rule.description}</div>
              </div>
              <input
                type="checkbox"
                defaultChecked={rule.enabled}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>
          ))}
        </div>
      </div>
    </>
  );
}

function TeamSettings() {
  const teamMembers = [
    { name: 'John Smith', email: 'john@acmefintech.com', role: 'Partner Admin', status: 'Active' },
    { name: 'Sarah Johnson', email: 'sarah@acmefintech.com', role: 'Finance Manager', status: 'Active' },
    { name: 'Mike Chen', email: 'mike@acmefintech.com', role: 'Compliance Officer', status: 'Active' },
    { name: 'Emily Davis', email: 'emily@acmefintech.com', role: 'Operations', status: 'Invited' },
  ];

  return (
    <>
      {/* Team Members */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-gray-900 dark:text-white">Team Members</h2>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            Invite Member
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Email</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Role</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Status</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member, index) => (
                <tr key={index} className="border-b border-gray-200 dark:border-gray-800 last:border-0">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">{member.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-gray-600 dark:text-gray-400">{member.email}</td>
                  <td className="py-4 px-4">
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded">
                      {member.role}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      member.status === 'Active' 
                        ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400'
                        : 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400'
                    }`}>
                      {member.status}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                        <span className="text-sm text-blue-600 dark:text-blue-400">Edit</span>
                      </button>
                      {member.role !== 'Partner Admin' && (
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Roles & Permissions */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-gray-900 dark:text-white">Roles & Permissions</h2>
        </div>

        <div className="space-y-4">
          {[
            { 
              role: 'Partner Admin', 
              description: 'Full access to all platform features and settings',
              permissions: ['Manage team', 'Configure platform', 'View all data', 'API access']
            },
            { 
              role: 'Finance Manager', 
              description: 'Manage payouts, transactions, and financial reporting',
              permissions: ['View transactions', 'Process payouts', 'Generate reports']
            },
            { 
              role: 'Compliance Officer', 
              description: 'Review compliance flags and manage risk settings',
              permissions: ['View compliance', 'Review flags', 'Update rules']
            },
            { 
              role: 'Operations', 
              description: 'View-only access to dashboards and reports',
              permissions: ['View dashboards', 'Generate reports']
            },
          ].map((role, index) => (
            <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white mb-1">{role.role}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">{role.description}</div>
                </div>
                {index > 0 && (
                  <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    Edit
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {role.permissions.map((permission, pIndex) => (
                  <span key={pIndex} className="px-2 py-1 text-xs font-medium bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded">
                    {permission}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
