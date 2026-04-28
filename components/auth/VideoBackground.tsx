'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain } from 'lucide-react';

export default function VideoBackground() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0a0a0a]">
      {/* Video Background */}
      {!prefersReducedMotion ? (
        <motion.div
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="absolute inset-0"
        >
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="w-full h-full object-contain"
            aria-hidden="true"
          >
            <source src="/videos/brain-ascii-animation.mp4" type="video/mp4" />
          </video>

          {/* Bottom gradient overlay */}
          <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-neutral-900/60" />
        </motion.div>
      ) : (
        // Static fallback for reduced motion preference
        <div className="absolute inset-0 bg-[#0a0a0a] flex items-center justify-center">
          <Brain className="w-32 h-32 text-neutral-700" />
        </div>
      )}

    </div>
  );
}
