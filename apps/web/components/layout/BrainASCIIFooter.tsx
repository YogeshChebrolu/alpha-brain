'use client';

import { motion } from 'framer-motion';

const brainASCII = `
    .-""-.
   /      \\
  |  o  o  |
  |   /\\   |
   \\ \\_/ /
    '---'
`;

/**
 * Brain ASCII Footer
 * Fixed position at bottom of viewport
 * Signature aesthetic element with staggered character animation
 */
export default function BrainASCIIFooter() {
  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 py-4 bg-background/80 backdrop-blur-sm border-t border-border z-10"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.5 }}
    >
      <motion.pre
        className="text-center text-accent font-mono text-xs select-none"
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: { staggerChildren: 0.015, delayChildren: 0.8 },
          },
        }}
      >
        {brainASCII.split('').map((char, i) => (
          <motion.span
            key={i}
            variants={{
              hidden: { opacity: 0, y: 5 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            {char}
          </motion.span>
        ))}
      </motion.pre>
      <motion.p
        className="text-center text-xs text-gray-500 mt-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
      >
        Your Second Brain
      </motion.p>
    </motion.div>
  );
}
