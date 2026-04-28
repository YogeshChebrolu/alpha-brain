import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['lightweight-charts'],
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
