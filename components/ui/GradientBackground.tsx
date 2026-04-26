'use client';

import { motion } from 'framer-motion';

/**
 * Gradient Background Component
 * Minimal background with subtle animations
 * Used on the right side of the idea creation form
 */
export default function GradientBackground() {
  return (
    <motion.div
      className="sticky top-8 h-[500px] rounded-2xl overflow-hidden bg-neutral-50"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-50 via-white to-neutral-100" />

      {/* Floating orb 1 */}
      <motion.div
        className="absolute top-16 left-8 w-32 h-32 bg-neutral-200/30 rounded-full blur-3xl"
        animate={{
          y: [0, 30, 0],
          x: [0, 20, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Floating orb 2 */}
      <motion.div
        className="absolute bottom-16 right-8 w-40 h-40 bg-neutral-200/20 rounded-full blur-3xl"
        animate={{
          y: [0, -40, 0],
          x: [0, -20, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Floating orb 3 */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-neutral-300/20 rounded-full blur-2xl"
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Decorative text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <motion.p
            className="text-6xl mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            💡
          </motion.p>
          <motion.p
            className="text-sm text-neutral-400 font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            Capture your insight
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}
