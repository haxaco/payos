'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { TOUR_STEPS } from './tour-steps';

// Persisted shape — bump `version` if we ever break the schema.
export interface TourPersistedState {
  completedAt?: string; // ISO timestamp
  dismissedAt?: string; // ISO timestamp
  lastStep?: number;
  version: 1;
}

const STORAGE_KEY = 'sly.tour.v1';
const SCHEMA_VERSION: 1 = 1;

function readPersisted(): TourPersistedState {
  if (typeof window === 'undefined') return { version: SCHEMA_VERSION };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: SCHEMA_VERSION };
    const parsed = JSON.parse(raw) as Partial<TourPersistedState> | null;
    if (!parsed || typeof parsed !== 'object') return { version: SCHEMA_VERSION };
    return {
      version: SCHEMA_VERSION,
      completedAt: typeof parsed.completedAt === 'string' ? parsed.completedAt : undefined,
      dismissedAt: typeof parsed.dismissedAt === 'string' ? parsed.dismissedAt : undefined,
      lastStep: typeof parsed.lastStep === 'number' ? parsed.lastStep : undefined,
    };
  } catch {
    return { version: SCHEMA_VERSION };
  }
}

function writePersisted(state: TourPersistedState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* swallow — non-critical */
  }
}

interface TourContextValue {
  /** Is the tour overlay currently visible? */
  isOpen: boolean;
  /** Current step index. Always in [0, TOUR_STEPS.length). */
  stepIndex: number;
  /** Total number of steps (cached for cheap reads). */
  totalSteps: number;
  /** Hydrated persisted state — `undefined` until first client mount. */
  persisted: TourPersistedState | undefined;
  /** Open the tour at the given step (defaults to 0). Clears `completedAt` so re-opening from header always re-runs. */
  open: (startAt?: number) => void;
  /** Close the tour without marking complete (treated as dismiss). */
  close: () => void;
  /** Skip — same as close but explicit; records dismissedAt. */
  skip: () => void;
  /** Advance one step; on the last step, marks complete and closes. */
  next: () => void;
  /** Step back one (no-op at index 0). */
  prev: () => void;
  /** Jump to an explicit index — used by the engine when navigating. */
  goTo: (index: number) => void;
  /** Mark the tour complete and close. */
  finish: () => void;
  /** Stable ref to the element that opened the tour (for focus restore). */
  triggerRef: React.MutableRefObject<HTMLElement | null>;
}

const TourContext = createContext<TourContextValue | undefined>(undefined);

export function TourProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  // `undefined` until hydrated — first-run banner depends on this to avoid SSR mismatch.
  const [persisted, setPersisted] = useState<TourPersistedState | undefined>(undefined);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Hydrate persisted state on mount.
  useEffect(() => {
    setPersisted(readPersisted());
  }, []);

  const totalSteps = TOUR_STEPS.length;

  const updatePersisted = useCallback((patch: Partial<TourPersistedState>) => {
    setPersisted((prev) => {
      const base = prev ?? { version: SCHEMA_VERSION };
      const next: TourPersistedState = { ...base, ...patch, version: SCHEMA_VERSION };
      writePersisted(next);
      return next;
    });
  }, []);

  const open = useCallback(
    (startAt: number = 0) => {
      const clamped = Math.max(0, Math.min(totalSteps - 1, startAt));
      setStepIndex(clamped);
      setIsOpen(true);
      // Reopening from the menu resets completedAt so it doesn't pretend the tour was already finished.
      updatePersisted({ lastStep: clamped, completedAt: undefined });
    },
    [totalSteps, updatePersisted],
  );

  const close = useCallback(() => {
    setIsOpen(false);
    updatePersisted({ lastStep: stepIndex, dismissedAt: new Date().toISOString() });
  }, [stepIndex, updatePersisted]);

  const skip = useCallback(() => {
    close();
  }, [close]);

  const finish = useCallback(() => {
    setIsOpen(false);
    updatePersisted({ completedAt: new Date().toISOString(), lastStep: totalSteps - 1 });
  }, [totalSteps, updatePersisted]);

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(totalSteps - 1, index));
      setStepIndex(clamped);
      updatePersisted({ lastStep: clamped });
    },
    [totalSteps, updatePersisted],
  );

  const next = useCallback(() => {
    setStepIndex((current) => {
      if (current >= totalSteps - 1) {
        finish();
        return current;
      }
      const nextIdx = current + 1;
      updatePersisted({ lastStep: nextIdx });
      return nextIdx;
    });
  }, [totalSteps, finish, updatePersisted]);

  const prev = useCallback(() => {
    setStepIndex((current) => {
      const prevIdx = Math.max(0, current - 1);
      updatePersisted({ lastStep: prevIdx });
      return prevIdx;
    });
  }, [updatePersisted]);

  const value = useMemo<TourContextValue>(
    () => ({
      isOpen,
      stepIndex,
      totalSteps,
      persisted,
      open,
      close,
      skip,
      next,
      prev,
      goTo,
      finish,
      triggerRef,
    }),
    [isOpen, stepIndex, totalSteps, persisted, open, close, skip, next, prev, goTo, finish],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error('useTour must be used within a <TourProvider>');
  }
  return ctx;
}

/** Imperative read of persisted state — for first-run gating without a hook. */
export function readTourPersistedState(): TourPersistedState {
  return readPersisted();
}
