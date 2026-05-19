'use client';

import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { LogOut, Settings, User, Search, ChevronDown, Check, Play, Square, AlertTriangle } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { useState, useRef } from 'react';
import { ThemeToggleSimple } from '@/components/theme-toggle';
import { GlobalSearch, useGlobalSearch } from '@/components/search/global-search';
import { NotificationsCenter } from '@/components/notifications/notifications-center';
import { useDemoMode } from '@/components/demo/demo-mode-context';
import { ScenarioSelector } from '@/components/demo/scenario-selector';
import { useTour } from '@/components/tour';
import { useEnvironment, type Environment } from '@/lib/environment-context';
import { useApiConfig, useApiFetch } from '@/lib/api-client';
import { toast } from 'sonner';
import { Sparkles, Compass, Database } from 'lucide-react';

interface HeaderProps {
  user: SupabaseUser | null;
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showEnvMenu, setShowEnvMenu] = useState(false);
  const [showProdConfirm, setShowProdConfirm] = useState(false);
  const [showProdGate, setShowProdGate] = useState(false);
  const [showScenarioSelector, setShowScenarioSelector] = useState(false);
  // Sandbox-only "Demo" entry now opens a dropdown with two choices:
  //   1. Take the tour     → opens the product-tour overlay (works on empty tenants)
  //   2. Sales scenarios   → enters the existing demo-mode flow
  // The two affordances live on the same trigger to keep the header lean.
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [seedingSample, setSeedingSample] = useState(false);
  const demoButtonRef = useRef<HTMLButtonElement>(null);
  const apiFetch = useApiFetch();
  const { apiUrl } = useApiConfig();

  const handlePopulateSample = async () => {
    setShowDemoMenu(false);
    if (seedingSample) return;
    setSeedingSample(true);
    const toastId = toast.loading('Seeding sample data…');
    try {
      const res = await apiFetch(`${apiUrl}/v1/onboarding/sample-seed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const body = await res.json();
      const r = body?.data ?? body;
      if (!r?.ok) {
        toast.error(r?.error || 'Could not populate sample data', { id: toastId });
        return;
      }
      const counts = r.created || {};
      const totalNew =
        (counts.accounts || 0) +
        (counts.agents || 0) +
        (counts.x402_endpoints || 0) +
        (counts.acp_checkouts || 0);
      if (r.alreadySeeded || totalNew === 0) {
        toast.success('Sample data already in place', {
          id: toastId,
          description: 'Your sandbox already has the demo agent, endpoint and checkout.',
        });
      } else {
        toast.success(`Seeded ${totalNew} sample ${totalNew === 1 ? 'item' : 'items'}`, {
          id: toastId,
          description: 'Explore Agents, x402 Endpoints and ACP Checkouts to see them.',
        });
      }
    } catch (e: any) {
      toast.error(e?.message || 'Sample seed failed', { id: toastId });
    } finally {
      setSeedingSample(false);
    }
  };
  const { environment, setEnvironment, productionApproved, productionStatus } = useEnvironment();
  const globalSearch = useGlobalSearch();
  const demoMode = useDemoMode();
  const tour = useTour();
  const queryClient = useQueryClient();

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    queryClient.clear();
    router.push('/auth/login');
    router.refresh();
  };

  const handleEnvironmentChange = (env: Environment) => {
    if (env === 'production' && environment !== 'production') {
      setShowEnvMenu(false);
      // Open beta: production is gated until the tenant is approved. Show a
      // clear modal that explains the approval process (and, depending on
      // status, routes to the declaration form or asks them to wait).
      if (!productionApproved) {
        setShowProdGate(true);
        return;
      }
      setShowProdConfirm(true);
      return;
    }
    applyEnvironmentChange(env);
  };

  const applyEnvironmentChange = (env: Environment) => {
    setEnvironment(env);
    setShowEnvMenu(false);
    setShowProdConfirm(false);
    queryClient.invalidateQueries();
    toast.success(`Switched to ${env === 'production' ? 'Production' : 'Sandbox'}`, {
      description: env === 'production'
        ? 'Showing live data. Transactions are real.'
        : 'Showing test data. Safe to experiment.',
    });
  };

  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'U';

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <>
      <header className="sticky top-0 z-40 h-16 flex items-center justify-between px-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        {/* Search - Now triggers global search modal */}
        <div className="flex-1 max-w-xl">
          <button
            onClick={globalSearch.open}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <Search className="w-4 h-4 text-gray-400" />
            <span className="flex-1 text-gray-500 dark:text-gray-400">Search or ask anything...</span>
            <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs text-gray-500 dark:text-gray-400 font-medium">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Environment Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowEnvMenu(!showEnvMenu)}
              data-tour="header-env-switch"
              aria-label={`Switch environment, currently ${environment}`}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${environment === 'sandbox'
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800'
                }`}
            >
              <span className={`w-2 h-2 rounded-full ${environment === 'sandbox' ? 'bg-emerald-500' : 'bg-orange-500'
                }`} />
              {environment === 'sandbox' ? 'SANDBOX' : 'PRODUCTION'}
              <ChevronDown className="w-4 h-4" />
            </button>

            {showEnvMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowEnvMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg z-20 overflow-hidden">
                  <div className="p-1">
                    <button
                      onClick={() => handleEnvironmentChange('sandbox')}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Sandbox
                      </div>
                      {environment === 'sandbox' && <Check className="w-4 h-4 text-emerald-500" />}
                    </button>
                    <button
                      onClick={() => handleEnvironmentChange('production')}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        Production
                      </div>
                      {environment === 'production' && <Check className="w-4 h-4 text-orange-500" />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Demo button — sandbox only.
              Click opens a small menu with two affordances:
                • Take the tour (always available) — opens the product tour overlay
                • Sales scenarios (active state when running) — enters demo mode
              We keep `demo-mode` semantics intact for the existing scenario flow. */}
          {environment === 'sandbox' && (
            <div className="relative">
              <button
                ref={demoButtonRef}
                onClick={() => setShowDemoMenu((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={showDemoMenu}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  demoMode.active
                    ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {demoMode.active ? (
                  <Square className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                Demo
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {showDemoMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowDemoMenu(false)}
                  />
                  <div
                    role="menu"
                    aria-label="Demo options"
                    className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg z-20 overflow-hidden"
                  >
                    <div className="p-1">
                      <button
                        role="menuitem"
                        onClick={() => {
                          setShowDemoMenu(false);
                          tour.triggerRef.current = demoButtonRef.current;
                          tour.open(0);
                        }}
                        className="w-full flex items-start gap-3 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <div className="flex-shrink-0 mt-0.5 p-1.5 bg-blue-100 dark:bg-blue-950 rounded-md">
                          <Compass className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">Take the tour</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            1-minute walkthrough of every Sly primitive.
                          </div>
                        </div>
                      </button>
                      <button
                        role="menuitem"
                        onClick={handlePopulateSample}
                        disabled={seedingSample}
                        className="w-full flex items-start gap-3 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-progress"
                      >
                        <div className="flex-shrink-0 mt-0.5 p-1.5 bg-emerald-100 dark:bg-emerald-950 rounded-md">
                          <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {seedingSample ? 'Populating…' : 'Populate sample data'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Seed your sandbox with a demo agent, x402 endpoint and ACP checkout.
                          </div>
                        </div>
                      </button>
                      <button
                        role="menuitem"
                        onClick={() => {
                          setShowDemoMenu(false);
                          if (!demoMode.active) demoMode.setActive(true);
                          setShowScenarioSelector(true);
                        }}
                        className="w-full flex items-start gap-3 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <div className="flex-shrink-0 mt-0.5 p-1.5 bg-purple-100 dark:bg-purple-950 rounded-md">
                          <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">Sales scenarios</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Run a scripted demo against seeded data.
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              )}
              {showScenarioSelector && (
                <ScenarioSelector onClose={() => setShowScenarioSelector(false)} />
              )}
            </div>
          )}

          {/* Theme Toggle */}
          <ThemeToggleSimple />

          {/* Notifications - Now uses NotificationsCenter */}
          <NotificationsCenter />

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <div className="hidden md:block text-right">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {userName}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Admin
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-sm font-semibold">
                {initials}
              </div>
            </button>

            {/* Dropdown */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg z-20 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {userName}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user?.email || 'No email'}
                    </div>
                  </div>
                  <div className="py-1">
                    <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      <User className="w-4 h-4" />
                      Profile
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        router.push('/dashboard/settings');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-800 py-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      <GlobalSearch isOpen={globalSearch.isOpen} onClose={globalSearch.close} />

      {/* Production Confirmation Modal */}
      {showProdConfirm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowProdConfirm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-100 dark:bg-orange-950 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Switch to Production?</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                You are about to switch to the <strong>production environment</strong>. In this mode:
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 mb-6 space-y-1 list-disc list-inside">
                <li>All transactions use <strong>real funds</strong></li>
                <li>Wallet operations settle on <strong>Base mainnet</strong></li>
                <li>Actions <strong>cannot be reversed</strong></li>
              </ul>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowProdConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => applyEnvironmentChange('production')}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
                >
                  Switch to Production
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Production Access Gate (open beta — approval required) */}
      {showProdGate && (() => {
        const underReview =
          productionStatus === 'declaration_pending' ||
          productionStatus === 'production_suspended';
        const denied = productionStatus === 'production_denied';
        return (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowProdGate(false)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-orange-100 dark:bg-orange-950 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {underReview ? 'Production access — under review' : 'Production access requires approval'}
                  </h3>
                </div>

                {underReview ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Your request to move real funds is <strong>being reviewed</strong>. We approve
                    accounts manually during this open beta — please hang tight and we&apos;ll email
                    you as soon as you&apos;re approved. You can keep building in Sandbox meanwhile.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Sly is in <strong>open beta</strong>. Production (real funds on Base mainnet)
                      is gated behind a quick approval so we can keep the rollout safe.
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                      {denied
                        ? 'Your previous request was declined — you can review the notes and re-submit with more detail.'
                        : 'Tell us a little about your use case (a few fields). We review each request manually and email you with a decision — then you can switch to Production.'}
                    </p>
                  </>
                )}

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowProdGate(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    {underReview ? 'Got it' : 'Not now'}
                  </button>
                  {!underReview && (
                    <button
                      onClick={() => {
                        setShowProdGate(false);
                        router.push('/dashboard/settings/production-access');
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
                    >
                      {denied ? 'Review & re-apply' : 'Request production access'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </>
  );
}
