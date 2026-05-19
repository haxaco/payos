'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sparkles, X } from 'lucide-react';
import { useTour } from './use-tour';

const DISMISS_WINDOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * First-run nudge for the product tour.
 *
 * Mounted in the dashboard layout. Shows a small banner on the dashboard root
 * (`/dashboard`) if the user has never completed the tour and hasn't dismissed
 * it within the last {@link DISMISS_WINDOW_DAYS} days. Avoids competing with
 * the existing demo / onboarding surfaces by appearing as a discrete card,
 * not a modal.
 */
export function TourFirstRun() {
  const tour = useTour();
  const pathname = usePathname();
  const takeButtonRef = useRef<HTMLButtonElement>(null);
  // Local "hide for this session" so dismissing doesn't snap back if persisted
  // state hasn't been re-read yet.
  const [hiddenThisSession, setHiddenThisSession] = useState(false);

  // Only on the dashboard root — sub-pages don't need the prompt.
  const onDashboardRoot = pathname === '/dashboard';

  // Don't render until we've hydrated persisted state to avoid flashing.
  const persisted = tour.persisted;

  // Compute eligibility from persisted state.
  const isEligible = (() => {
    if (!persisted) return false;
    if (persisted.completedAt) return false;
    if (persisted.dismissedAt) {
      const dismissedTime = Date.parse(persisted.dismissedAt);
      if (!Number.isNaN(dismissedTime)) {
        if (Date.now() - dismissedTime < DISMISS_WINDOW_DAYS * DAY_MS) return false;
      }
    }
    return true;
  })();

  // Clear session-hide if eligibility resets (e.g. user reset their localStorage).
  useEffect(() => {
    if (!isEligible) setHiddenThisSession(false);
  }, [isEligible]);

  if (!onDashboardRoot || !isEligible || hiddenThisSession || tour.isOpen) {
    return null;
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-40 max-w-sm bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl p-4 motion-safe:animate-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-300"
      role="region"
      aria-label="Product tour suggestion"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
          <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            New to Sly?
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Take the 1-minute tour to see how agentic payments, wallets and the protocol surfaces fit together.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              ref={takeButtonRef}
              type="button"
              onClick={() => {
                tour.triggerRef.current = takeButtonRef.current;
                tour.open(0);
              }}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Take the tour
            </button>
            <button
              type="button"
              onClick={() => {
                setHiddenThisSession(true);
                tour.skip();
              }}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setHiddenThisSession(true);
            tour.skip();
          }}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          aria-label="Dismiss tour suggestion"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
