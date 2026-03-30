'use client';

import { motion } from 'framer-motion';
import { cn } from '@sly/ui';

interface AnimatedCheckProps {
  size?: number;
  delay?: number;
  className?: string;
}

export function AnimatedCheck({
  size = 24,
  delay = 0,
  className,
}: AnimatedCheckProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('inline-block', className)}
    >
      {/* Circle */}
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        className="text-emerald-500"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          pathLength: { duration: 0.4, delay, ease: 'easeInOut' },
          opacity: { duration: 0.01, delay },
        }}
        style={{
          fill: 'none',
          strokeLinecap: 'round',
        }}
      />

      {/* Checkmark */}
      <motion.path
        d="M8 12.5l2.5 3 5.5-6.5"
        stroke="currentColor"
        strokeWidth="2"
        className="text-emerald-500"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          pathLength: { duration: 0.3, delay: delay + 0.4, ease: 'easeOut' },
          opacity: { duration: 0.01, delay: delay + 0.4 },
        }}
        style={{
          fill: 'none',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }}
      />
    </svg>
  );
}
