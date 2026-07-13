'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useConvexAuth } from 'convex/react';
import { Brain, Loader2 } from 'lucide-react';
import DemoBanner from '@/components/layout/DemoBanner';
import Header from '@/components/layout/Header';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
      router.refresh();
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex items-center gap-3 text-neutral-700">
          <Brain className="h-5 w-5 text-neutral-900" />
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="sticky top-0 z-30">
        <DemoBanner />
        <Header />
      </div>
      <main className="flex-1 container mx-auto px-4 py-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  );
}
