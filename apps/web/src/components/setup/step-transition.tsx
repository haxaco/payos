'use client';

import { type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface StepTransitionProps {
  stepKey: string | number;
  children: ReactNode;
}

const variants = {
  enter: {
    x: 40,
    opacity: 0,
  },
  center: {
    x: 0,
    opacity: 1,
  },
  exit: {
    x: -40,
    opacity: 0,
  },
};

const transition = {
  duration: 0.35,
  ease: [0.4, 0, 0.2, 1] as const,
};

export function StepTransition({ stepKey, children }: StepTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepKey}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={transition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
