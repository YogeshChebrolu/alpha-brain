import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['lightweight-charts'],
  experimental: {
    // Only pull in the modules actually used from these many-export packages,
    // instead of bundling the whole library. (lucide-react & date-fns are
    // optimized by Next.js automatically; framer-motion is not.)
    optimizePackageImports: ['framer-motion', 'lucide-react', 'date-fns'],
  },
  // Turbo disabled due to Windows compatibility issues
  // experimental: {
  //   turbo: {
  //     resolveAlias: {
  //       'lightweight-charts': 'lightweight-charts/dist/lightweight-charts.esm.production.js',
  //     },
  //   },
  // },
};

export default nextConfig;
