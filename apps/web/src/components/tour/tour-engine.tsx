'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@sly/ui';
import { useTour } from './use-tour';
import { TOUR_STEPS, type TourPlacement, type TourStep } from './tour-steps';

// Spotlight padding around the target rect.
const SPOTLIGHT_PAD = 8;
// Tooltip card sizing budgets — used for placement decisions when we can't measure yet.
const TOOLTIP_WIDTH = 360;
const TOOLTIP_OFFSET = 12;
// How long to wait for a navigated step's anchor to appear in the DOM.
const ANCHOR_WAIT_MS = 1500;
const ANCHOR_POLL_MS = 50;

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Wait for a selector to appear in the DOM, polling until timeout. */
function waitForElement(selector: string, timeoutMs: number): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (el) return resolve(el);
      if (Date.now() - start >= timeoutMs) return resolve(null);
      window.setTimeout(tick, ANCHOR_POLL_MS);
    };
    tick();
  });
}

/** Pick a placement that keeps the tooltip on screen given the target rect. */
function resolvePlacement(rect: TargetRect, preferred: TourPlacement = 'bottom'): TourPlacement {
  if (preferred === 'center') return 'center';
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const fits = {
    top: rect.top - TOOLTIP_OFFSET >= 220,
    bottom: vh - (rect.top + rect.height + TOOLTIP_OFFSET) >= 220,
    left: rect.left - TOOLTIP_OFFSET >= TOOLTIP_WIDTH + 24,
    right: vw - (rect.left + rect.width + TOOLTIP_OFFSET) >= TOOLTIP_WIDTH + 24,
  };
  if (fits[preferred]) return preferred;
  // Fall back to the first placement that fits, then bottom.
  if (fits.bottom) return 'bottom';
  if (fits.top) return 'top';
  if (fits.right) return 'right';
  if (fits.left) return 'left';
  return 'bottom';
}

/** Compute pixel position for the tooltip given target + resolved placement. */
function computeTooltipPosition(
  rect: TargetRect | null,
  placement: TourPlacement,
): { top: number; left: number; transform?: string } {
  if (!rect || placement === 'center') {
    return {
      top: window.innerHeight / 2,
      left: window.innerWidth / 2,
      transform: 'translate(-50%, -50%)',
    };
  }
  const vw = window.innerWidth;
  switch (placement) {
    case 'bottom':
      return {
        top: rect.top + rect.height + TOOLTIP_OFFSET,
        left: clamp(rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2, 12, vw - TOOLTIP_WIDTH - 12),
      };
    case 'top':
      return {
        top: rect.top - TOOLTIP_OFFSET,
        left: clamp(rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2, 12, vw - TOOLTIP_WIDTH - 12),
        transform: 'translateY(-100%)',
      };
    case 'right':
      return {
        top: rect.top + rect.height / 2,
        left: rect.left + rect.width + TOOLTIP_OFFSET,
        transform: 'translateY(-50%)',
      };
    case 'left':
      return {
        top: rect.top + rect.height / 2,
        left: rect.left - TOOLTIP_OFFSET,
        transform: 'translate(-100%, -50%)',
      };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Debounce that fires on trailing edge. */
function debounce<T extends (...args: never[]) => void>(fn: T, wait: number): T & { cancel: () => void } {
  let timer: number | undefined;
  const wrapped = ((...args: Parameters<T>) => {
    if (timer !== undefined) window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), wait);
  }) as T & { cancel: () => void };
  wrapped.cancel = () => {
    if (timer !== undefined) window.clearTimeout(timer);
  };
  return wrapped;
}

export function TourEngine() {
  const tour = useTour();
  const router = useRouter();
  const pathname = usePathname();
  const titleId = useId();

  const step: TourStep | undefined = tour.isOpen ? TOUR_STEPS[tour.stepIndex] : undefined;

  const [rect, setRect] = useState<TargetRect | null>(null);
  const [placement, setPlacement] = useState<TourPlacement>('bottom');
  const [resolving, setResolving] = useState(false);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  // Per-step pending nav. Track the step id whose anchor we are still waiting for so
  // that an async resolution doesn't write into state for a later/different step.
  const pendingStepIdRef = useRef<string | null>(null);

  // Locate the target for the current step. Navigates first if `href` is set and we're
  // not already there; then polls for the selector to appear before snapping the rect.
  const locateTarget = useCallback(
    async (s: TourStep) => {
      pendingStepIdRef.current = s.id;

      if (!s.selector) {
        setRect(null);
        setPlacement('center');
        return;
      }

      setResolving(true);

      if (s.href && s.href !== pathname) {
        router.push(s.href);
      }

      const el = await waitForElement(s.selector, ANCHOR_WAIT_MS);

      // If the user advanced/changed steps while we were waiting, drop this result.
      if (pendingStepIdRef.current !== s.id) return;

      if (!el) {
        // Anchor never appeared — fall back to centered tooltip rather than breaking.
        setRect(null);
        setPlacement('center');
        setResolving(false);
        return;
      }

      // Scroll into view if off-screen.
      const box = el.getBoundingClientRect();
      const offscreen =
        box.top < 0 ||
        box.left < 0 ||
        box.bottom > window.innerHeight ||
        box.right > window.innerWidth;
      if (offscreen) {
        el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
      }
      const finalBox = el.getBoundingClientRect();
      const nextRect: TargetRect = {
        top: finalBox.top,
        left: finalBox.left,
        width: finalBox.width,
        height: finalBox.height,
      };
      setRect(nextRect);
      setPlacement(resolvePlacement(nextRect, s.placement ?? 'bottom'));
      setResolving(false);
    },
    [pathname, router],
  );

  // Re-locate whenever the step changes (or the tour opens).
  useEffect(() => {
    if (!step) {
      pendingStepIdRef.current = null;
      return;
    }
    void locateTarget(step);
  }, [step, locateTarget]);

  // Reposition on resize / scroll. Same selector — re-measure the same element.
  useEffect(() => {
    if (!step || !step.selector) return;
    const remeasure = () => {
      if (!step.selector) return;
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (!el) return;
      const box = el.getBoundingClientRect();
      const nextRect: TargetRect = {
        top: box.top,
        left: box.left,
        width: box.width,
        height: box.height,
      };
      setRect(nextRect);
      setPlacement(resolvePlacement(nextRect, step.placement ?? 'bottom'));
    };
    const debounced = debounce(remeasure, 60);
    window.addEventListener('resize', debounced);
    window.addEventListener('scroll', debounced, true);
    return () => {
      debounced.cancel();
      window.removeEventListener('resize', debounced);
      window.removeEventListener('scroll', debounced, true);
    };
  }, [step]);

  // ESC closes (counts as skip). Focus trap inside the tooltip.
  useEffect(() => {
    if (!tour.isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        tour.skip();
        return;
      }
      if (e.key === 'Tab' && tooltipRef.current) {
        const focusables = tooltipRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
          if (active === first || !tooltipRef.current.contains(active)) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (active === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [tour]);

  // Initial focus into the tooltip + focus restore on close.
  useLayoutEffect(() => {
    if (!tour.isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const id = window.requestAnimationFrame(() => {
      const firstButton = tooltipRef.current?.querySelector<HTMLElement>('button');
      firstButton?.focus();
    });
    return () => {
      window.cancelAnimationFrame(id);
      // Restore focus: prefer the tour trigger ref (header button); fall back to the previously focused element.
      const target = tour.triggerRef.current ?? previouslyFocused;
      if (target && typeof target.focus === 'function') {
        // Defer to next frame so it lands after React paints the close.
        window.requestAnimationFrame(() => target.focus());
      }
    };
    // `tour.triggerRef` is stable (a ref object); only the open flag matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour.isOpen]);

  if (!step) return null;

  const effectivePlacement: TourPlacement = step.selector ? placement : 'center';
  const tooltipPos = computeTooltipPosition(rect, effectivePlacement);
  const showSpotlight = rect !== null && effectivePlacement !== 'center';
  const counterLabel = `${tour.stepIndex + 1} / ${tour.totalSteps}`;
  const isLast = tour.stepIndex === tour.totalSteps - 1;
  const isFirst = tour.stepIndex === 0;

  return (
    <div
      // Above sidebar (z-50) and prod-confirm modal background (z-50). The modal sits at z-50,
      // but the tour overlay shouldn't interrupt those, so we hold at z-[60].
      className="fixed inset-0 z-[60] motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150"
      aria-hidden={false}
    >
      {/* Backdrop dim panels. When we have a target rect, build a "spotlight" by drawing four
          panels around it. Otherwise, full-screen dim. Backdrop is non-interactive (no click). */}
      {showSpotlight && rect ? (
        <>
          {/* Top */}
          <div
            className="absolute bg-black/55 pointer-events-none"
            style={{
              top: 0,
              left: 0,
              right: 0,
              height: Math.max(0, rect.top - SPOTLIGHT_PAD),
            }}
          />
          {/* Bottom */}
          <div
            className="absolute bg-black/55 pointer-events-none"
            style={{
              top: rect.top + rect.height + SPOTLIGHT_PAD,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          {/* Left */}
          <div
            className="absolute bg-black/55 pointer-events-none"
            style={{
              top: Math.max(0, rect.top - SPOTLIGHT_PAD),
              left: 0,
              width: Math.max(0, rect.left - SPOTLIGHT_PAD),
              height: rect.height + SPOTLIGHT_PAD * 2,
            }}
          />
          {/* Right */}
          <div
            className="absolute bg-black/55 pointer-events-none"
            style={{
              top: Math.max(0, rect.top - SPOTLIGHT_PAD),
              left: rect.left + rect.width + SPOTLIGHT_PAD,
              right: 0,
              height: rect.height + SPOTLIGHT_PAD * 2,
            }}
          />
          {/* Highlight ring around the target */}
          <div
            className="absolute pointer-events-none rounded-lg ring-2 ring-blue-400 ring-offset-2 ring-offset-transparent motion-safe:transition-all motion-safe:duration-200"
            style={{
              top: rect.top - SPOTLIGHT_PAD,
              left: rect.left - SPOTLIGHT_PAD,
              width: rect.width + SPOTLIGHT_PAD * 2,
              height: rect.height + SPOTLIGHT_PAD * 2,
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/55 pointer-events-none" />
      )}

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'absolute pointer-events-auto',
          'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xl',
          'p-5',
        )}
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
          width: TOOLTIP_WIDTH,
          maxWidth: 'calc(100vw - 24px)',
          transform: tooltipPos.transform,
        }}
      >
        {resolving && step.selector && (
          <div className="text-xs text-gray-400 mb-2">Locating…</div>
        )}
        <h2
          id={titleId}
          className="text-base font-semibold text-gray-900 dark:text-white"
        >
          {step.title}
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {step.body}
        </p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={tour.skip}
            className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            aria-label="Skip the product tour"
          >
            Skip
          </button>

          <span
            className="text-xs font-medium text-gray-500 dark:text-gray-400 tabular-nums"
            aria-label={`Step ${tour.stepIndex + 1} of ${tour.totalSteps}`}
          >
            {counterLabel}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={tour.prev}
              disabled={isFirst}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
                isFirst && 'opacity-40 cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800',
              )}
              aria-label="Previous step"
            >
              Back
            </button>
            <button
              type="button"
              onClick={isLast ? tour.finish : tour.next}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              aria-label={isLast ? 'Finish tour' : 'Next step'}
            >
              {isLast ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
