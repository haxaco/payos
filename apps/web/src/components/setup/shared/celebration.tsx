'use client';

import { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CelebrationProps {
  onComplete?: () => void;
}

type ShapeType = 'circle' | 'square' | 'triangle';

interface Particle {
  id: number;
  shape: ShapeType;
  color: string;
  size: number;
  angle: number;
  distance: number;
  rotation: number;
}

const COLORS = [
  '#3b82f6', // blue-500
  '#6366f1', // indigo-500
  '#8b5cf6', // violet-500
  '#a855f7', // purple-500
  '#10b981', // emerald-500
  '#06b6d4', // cyan-500
];

const SHAPES: ShapeType[] = ['circle', 'square', 'triangle'];

function Shape({
  type,
  color,
  size,
}: {
  type: ShapeType;
  color: string;
  size: number;
}) {
  if (type === 'circle') {
    return (
      <div
        className="rounded-full"
        style={{
          width: size,
          height: size,
          backgroundColor: color,
        }}
      />
    );
  }

  if (type === 'square') {
    return (
      <div
        className="rounded-sm"
        style={{
          width: size,
          height: size,
          backgroundColor: color,
        }}
      />
    );
  }

  // Triangle using CSS borders
  return (
    <div
      style={{
        width: 0,
        height: 0,
        borderLeft: `${size / 2}px solid transparent`,
        borderRight: `${size / 2}px solid transparent`,
        borderBottom: `${size}px solid ${color}`,
      }}
    />
  );
}

export function Celebration({ onComplete }: CelebrationProps) {
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      shape: SHAPES[i % SHAPES.length],
      color: COLORS[i % COLORS.length],
      size: 6 + Math.random() * 10,
      angle: (i / 12) * 360 + Math.random() * 30 - 15,
      distance: 120 + Math.random() * 180,
      rotation: Math.random() * 720 - 360,
    }));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, 2200);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Geometric burst particles */}
        {particles.map((p) => {
          const rad = (p.angle * Math.PI) / 180;
          const x = Math.cos(rad) * p.distance;
          const y = Math.sin(rad) * p.distance;

          return (
            <motion.div
              key={p.id}
              className="absolute"
              initial={{
                x: 0,
                y: 0,
                scale: 0,
                opacity: 1,
                rotate: 0,
              }}
              animate={{
                x,
                y,
                scale: [0, 1.5, 1],
                opacity: [1, 1, 0],
                rotate: p.rotation,
              }}
              transition={{
                duration: 1,
                ease: 'easeOut',
                type: 'spring',
                stiffness: 100,
                damping: 12,
                opacity: {
                  duration: 1,
                  times: [0, 0.5, 1],
                },
              }}
            >
              <Shape type={p.shape} color={p.color} size={p.size} />
            </motion.div>
          );
        })}

        {/* Center text */}
        <motion.div
          className="relative z-10 text-center"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0.5, 1, 1, 0.95],
          }}
          transition={{
            duration: 2,
            times: [0, 0.2, 0.7, 1],
            ease: 'easeInOut',
          }}
        >
          <h2 className="text-4xl font-bold text-white drop-shadow-lg">
            You&apos;re all set!
          </h2>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
