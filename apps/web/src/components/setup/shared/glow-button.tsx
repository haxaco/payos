'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@sly/ui';
import { Loader2 } from 'lucide-react';

interface GlowButtonProps
  extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  children: React.ReactNode;
}

export function GlowButton({
  variant = 'primary',
  loading = false,
  className,
  children,
  disabled,
  ...props
}: GlowButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <motion.button
      whileHover={!disabled && !loading ? { scale: 1.02 } : undefined}
      whileTap={!disabled && !loading ? { scale: 0.98 } : undefined}
      disabled={disabled || loading}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 disabled:cursor-not-allowed disabled:opacity-50',
        isPrimary
          ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40'
          : 'border border-white/10 bg-white/5 text-white hover:bg-white/10',
        !disabled && !loading && isPrimary && 'glow-button-primary',
        !disabled && !loading && !isPrimary && 'glow-button-secondary',
        className
      )}
      style={
        !disabled && !loading
          ? {
              boxShadow: isPrimary
                ? '0 0 20px rgba(99, 102, 241, 0.3), 0 0 60px rgba(99, 102, 241, 0.1)'
                : undefined,
            }
          : undefined
      }
      {...props}
    >
      {/* Animated glow border overlay */}
      {!disabled && !loading && isPrimary && (
        <motion.span
          className="pointer-events-none absolute inset-0 rounded-xl"
          animate={{
            boxShadow: [
              '0 0 20px rgba(99, 102, 241, 0.3), 0 0 60px rgba(99, 102, 241, 0.1)',
              '0 0 30px rgba(147, 51, 234, 0.4), 0 0 80px rgba(147, 51, 234, 0.15)',
              '0 0 20px rgba(59, 130, 246, 0.3), 0 0 60px rgba(59, 130, 246, 0.1)',
              '0 0 20px rgba(99, 102, 241, 0.3), 0 0 60px rgba(99, 102, 241, 0.1)',
            ],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {!disabled && !loading && !isPrimary && (
        <motion.span
          className="pointer-events-none absolute inset-0 rounded-xl"
          animate={{
            boxShadow: [
              '0 0 8px rgba(99, 102, 241, 0.1), inset 0 0 8px rgba(99, 102, 241, 0.05)',
              '0 0 16px rgba(147, 51, 234, 0.15), inset 0 0 12px rgba(147, 51, 234, 0.08)',
              '0 0 8px rgba(99, 102, 241, 0.1), inset 0 0 8px rgba(99, 102, 241, 0.05)',
            ],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </motion.button>
  );
}
