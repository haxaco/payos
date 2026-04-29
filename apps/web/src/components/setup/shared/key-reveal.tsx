'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@sly/ui';

const HEX_CHARS = '0123456789abcdef';

function randomHexChar(): string {
  return HEX_CHARS[Math.floor(Math.random() * HEX_CHARS.length)];
}

/**
 * Hook that produces a decrypt/typewriter reveal of the given text.
 * Each character position starts as a random hex char and cycles
 * through random characters before settling on the real value,
 * cascading from left to right.
 */
export function useDecryptReveal(
  text: string,
  startDelay = 0,
  speed = 30
): string {
  const [display, setDisplay] = useState(() =>
    text
      .split('')
      .map(() => randomHexChar())
      .join('')
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settledRef = useRef(0);
  const tickRef = useRef(0);

  useEffect(() => {
    // Reset on text change
    settledRef.current = 0;
    tickRef.current = 0;
    setDisplay(
      text
        .split('')
        .map(() => randomHexChar())
        .join('')
    );

    const timeout = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        tickRef.current += 1;
        const settled = settledRef.current;
        const chars = text.split('');

        // Every ~3 ticks, settle the next character
        if (tickRef.current % 3 === 0 && settled < text.length) {
          settledRef.current = settled + 1;
        }

        const currentSettled = settledRef.current;

        const result = chars
          .map((char, i) => {
            if (i < currentSettled) return char;
            // Preserve spaces and special chars while cycling
            if (char === ' ') return ' ';
            return randomHexChar();
          })
          .join('');

        setDisplay(result);

        if (currentSettled >= text.length) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setDisplay(text);
        }
      }, speed);
    }, startDelay);

    return () => {
      clearTimeout(timeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [text, startDelay, speed]);

  return display;
}

interface KeyRevealProps {
  text: string;
  delay?: number;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

export function KeyReveal({
  text,
  delay = 0,
  speed = 30,
  className,
  onComplete,
}: KeyRevealProps) {
  const display = useDecryptReveal(text, delay, speed);
  const completeFired = useRef(false);

  useEffect(() => {
    if (display === text && !completeFired.current) {
      completeFired.current = true;
      onComplete?.();
    }
  }, [display, text, onComplete]);

  // Reset the fired flag if the text changes
  useEffect(() => {
    completeFired.current = false;
  }, [text]);

  return (
    <span
      className={cn(
        'font-mono text-emerald-400 break-all select-all',
        className
      )}
    >
      {display}
    </span>
  );
}
