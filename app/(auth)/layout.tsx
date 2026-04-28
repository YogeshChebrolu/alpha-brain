'use client';

import { motion } from 'framer-motion';
import VideoBackground from '@/components/auth/VideoBackground';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left side - Dark background with centered video */}
      <div className="h-[30vh] lg:h-auto lg:w-1/2 bg-[#0a0a0a] flex flex-col items-center justify-center p-8 gap-6 relative overflow-hidden">
        {/* Half-moon gradient at bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[50%] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 120% 100% at bottom, rgba(82, 82, 91, 0.6) 0%, rgba(63, 63, 70, 0.4) 40%, transparent 80%)'
          }}
        />

        <div className="w-full max-w-sm aspect-square relative z-10">
          <VideoBackground />
        </div>
        <div className="text-center space-y-2 relative z-10">
          <h1 className="text-3xl font-bold text-white font-mono">Alpha Brain</h1>
          <p className="text-neutral-400 text-lg">Your Second Brain for Ideas & Investments</p>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="flex-1 lg:w-1/2 flex items-center justify-center p-8 bg-white"
      >
        <div className="w-full max-w-md">{children}</div>
      </motion.div>
    </div>
  );
}
