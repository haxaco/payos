'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { User, Bell, Shield, Palette, Moon, Sun, Monitor, Check, Globe, Zap, Clock, ChevronRight, CreditCard, Plus, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useLocale, type Locale } from '@/lib/locale';
import { useConnectedAccounts } from '@/hooks/api/useConnectedAccounts';
import { ConnectedAccountRow } from '@/components/settings/ConnectedAccountRow';
import { ConnectHandlerDialog } from '@/components/settings/ConnectHandlerDialog';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, formatCurrency, formatDate } = useLocale();
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    streams: true,
    transfers: true,
  });
  const [showConnectDialog, setShowConnectDialog] = useState(false);

  // Connected accounts hook
  const {
    accounts: connectedAccounts,
    isLoading: accountsLoading,
    error: accountsError,
    connect,
    verify,
    disconnect,
  } = useConnectedAccounts();

  // Prevent hydration mismatch by only showing theme-dependent content after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const localeOptions: Array<{ value: Locale; label: string; description: string; example: string }> = [
    {
      value: 'en-US',
      label: 'United States',
      description: 'USD, MM/DD/YYYY',
      example: `${formatCurrency(1234.56, 'USD')} • ${formatDate(new Date())}`
    },
    {
      value: 'en-EU',
      label: 'Europe',
      description: 'EUR, DD/MM/YYYY',
      example: `${formatCurrency(1234.56, 'EUR')} • ${formatDate(new Date())}`
    },
    {
      value: 'es-LATAM',
      label: 'Latin America',
      description: 'USD, DD/MM/YYYY',
      example: `${formatCurrency(1234.56, 'USD')} • ${formatDate(new Date())}`
    },
  ];

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun, description: 'Light background with dark text' },
    { value: 'dark', label: 'Dark', icon: Moon, description: 'Dark background with light text' },
    { value: 'system', label: 'System', icon: Monitor, description: 'Follow system preference' },
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your account and preferences</p>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <section className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950 rounded-xl flex items-center justify-center">
              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Your personal information</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Display Name
              </label>
              <input
                type="text"
                defaultValue="Admin User"
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                defaultValue="admin@payos.io"
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled
              />
              <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
            </div>
          </div>
        </section>

        {/* Localization Section */}
        <section className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-950 rounded-xl flex items-center justify-center">
              <Globe className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Localization</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Date and currency formatting</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Region
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {localeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setLocale(option.value)}
                  className={`relative p-4 rounded-xl border-2 transition-all text-left ${locale === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                    }`}
                >
                  {locale === option.value && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    {option.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {option.description}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                    {option.example}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Appearance Section */}
        <section className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-950 rounded-xl flex items-center justify-center">
              <Palette className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Customize how PayOS looks</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Theme
            </label>
            <div className="grid grid-cols-3 gap-3">
              {themeOptions.map((option) => {
                const isSelected = mounted && theme === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={`relative p-4 rounded-xl border-2 transition-all ${isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                      }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                    <option.icon className={`h-6 w-6 mb-2 ${isSelected ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {option.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {option.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Notifications Section */}
        <section className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-950 rounded-xl flex items-center justify-center">
              <Bell className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Configure your notification preferences</p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { key: 'email', label: 'Email Notifications', description: 'Receive updates via email' },
              { key: 'push', label: 'Push Notifications', description: 'Browser push notifications' },
              { key: 'streams', label: 'Stream Alerts', description: 'Alerts for stream health changes' },
              { key: 'transfers', label: 'Transfer Updates', description: 'Notifications for transfer status' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{item.description}</div>
                </div>
                <button
                  onClick={() => setNotifications(prev => ({
                    ...prev,
                    [item.key]: !prev[item.key as keyof typeof prev]
                  }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${notifications[item.key as keyof typeof notifications]
                      ? 'bg-blue-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifications[item.key as keyof typeof notifications]
                        ? 'translate-x-5'
                        : 'translate-x-0'
                      }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Security Section */}
        <section className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-950 rounded-xl flex items-center justify-center">
              <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Security</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage your security settings</p>
            </div>
          </div>

          <div className="space-y-4">
            <button className="w-full px-4 py-3 text-left bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
              <div className="text-sm font-medium text-gray-900 dark:text-white">Change Password</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Update your password</div>
            </button>
            <button className="w-full px-4 py-3 text-left bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
              <div className="text-sm font-medium text-gray-900 dark:text-white">Two-Factor Authentication</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Add an extra layer of security</div>
            </button>
            <button className="w-full px-4 py-3 text-left bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
              <div className="text-sm font-medium text-gray-900 dark:text-white">Active Sessions</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">View and manage logged in devices</div>
            </button>
          </div>
        </section>

        {/* Settlement Rules Section */}
        <Link
          href="/dashboard/settings/settlement-rules"
          className="block bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:border-gray-300 dark:hover:border-gray-700 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950 rounded-xl flex items-center justify-center">
                <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Settlement Rules</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Configure automated settlement triggers and schedules</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
          </div>
        </Link>

        {/* Agentic Payments Visibility Section */}
        <section className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-950 rounded-xl flex items-center justify-center">
              <Zap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Agentic Payments</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Configure protocol visibility in dashboard</p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { key: 'x402', label: 'x402 (Micropayments)', description: 'HTTP 402, API Monetization' },
              { key: 'ap2', label: 'AP2 (Google Agents)', description: 'Agent Mandates and Authorization' },
              { key: 'acp', label: 'ACP (Agent Commerce)', description: 'Commerce Checkouts' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{item.description}</div>
                </div>
                <button
                  className="relative w-11 h-6 rounded-full transition-colors bg-blue-600"
                  onClick={() => alert("Visibility toggle not yet persistent (Demo)")}
                >
                  <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform translate-x-5" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Payment Handlers Section (Epic 48) */}
        <section className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950 rounded-xl flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Handlers</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Connect your payment processors</p>
              </div>
            </div>
            <button
              onClick={() => setShowConnectDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              Connect Account
            </button>
          </div>

          {/* Error state */}
          {accountsError && (
            <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm rounded-lg mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {accountsError}
            </div>
          )}

          {/* Loading state */}
          {accountsLoading && !connectedAccounts.length && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Empty state */}
          {!accountsLoading && connectedAccounts.length === 0 && (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                No payment handlers connected
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">
                Connect Stripe, PayPal, Circle, or PayOS Native to process payments
              </p>
            </div>
          )}

          {/* Connected accounts list */}
          {connectedAccounts.length > 0 && (
            <div className="space-y-3">
              {connectedAccounts.map((account) => (
                <ConnectedAccountRow
                  key={account.id}
                  account={account}
                  onVerify={async (id) => {
                    await verify(id);
                  }}
                  onDisconnect={async (id) => {
                    await disconnect(id);
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Connect Handler Dialog */}
      <ConnectHandlerDialog
        isOpen={showConnectDialog}
        onClose={() => setShowConnectDialog(false)}
        onConnect={connect}
      />
    </div>
  );
}
