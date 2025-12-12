'use client';

import { useState, useEffect, useRef } from 'react';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  formatFn?: (n: number) => string;
  className?: string;
}

export function AnimatedNumber({ 
  value, 
  duration = 500,
  formatFn = (n) => n.toFixed(2),
  className,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);

  useEffect(() => {
    const start = previousValue.current;
    const end = value;
    const startTime = Date.now();

    if (start === end) return;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        previousValue.current = end;
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span className={className}>{formatFn(displayValue)}</span>;
}

// Streaming balance that updates in real-time
interface StreamingBalanceProps {
  initialBalance: number;
  flowRatePerSecond: number;
  currency?: string;
  className?: string;
}

export function StreamingBalance({ 
  initialBalance, 
  flowRatePerSecond,
  currency = 'USDC',
  className,
}: StreamingBalanceProps) {
  const [balance, setBalance] = useState(initialBalance);
  const startTime = useRef(Date.now());
  const startBalance = useRef(initialBalance);

  useEffect(() => {
    startTime.current = Date.now();
    startBalance.current = initialBalance;
    setBalance(initialBalance);
  }, [initialBalance]);

  useEffect(() => {
    if (flowRatePerSecond === 0) return;

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime.current) / 1000;
      const newBalance = startBalance.current + (elapsed * flowRatePerSecond);
      setBalance(newBalance);
    }, 100); // Update every 100ms for smooth animation

    return () => clearInterval(interval);
  }, [flowRatePerSecond]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-2xl font-bold tabular-nums">
        ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
      <span className="text-gray-500 dark:text-gray-400">{currency}</span>
      {flowRatePerSecond !== 0 && (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Live
        </span>
      )}
    </div>
  );
}

// Counter that counts up from 0 to a target value on mount
interface CountUpProps {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export function CountUp({
  end,
  duration = 1500,
  prefix = '',
  suffix = '',
  decimals = 0,
  className,
}: CountUpProps) {
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = end * eased;
      
      setCount(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [end, duration]);

  const formattedValue = decimals > 0 
    ? count.toFixed(decimals)
    : Math.round(count).toLocaleString();

  return (
    <span className={className}>
      {prefix}{formattedValue}{suffix}
    </span>
  );
}

