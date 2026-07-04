'use client';

import { useQuery } from 'convex/react';
import { api } from '@alpha-brain/convex';
import InspirationCarousel from '@/components/home/InspirationCarousel';
import ActionSidebar from '@/components/layout/ActionSidebar';
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import GettingStartedChecklist from '@/components/onboarding/GettingStartedChecklist';
import Link from 'next/link';
import { Plus, FolderPlus } from 'lucide-react';

export default function HomePage() {
  const inspirations = useQuery(api.inspirations.listActive);
  const actions = useQuery(api.actions.list);
  const ideasCount = useQuery(api.ideas.count);
  const categories = useQuery(api.categories.list);

  const pendingActions =
    actions?.filter((a) => a.status !== 'completed').length ?? 0;

  return (
    <div className="space-y-8">
      <OnboardingModal />

      {/* Welcome Section — title left, quick actions as small buttons on the right */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-text mb-2">Your Insight Lab</h1>
          <p className="text-gray-500">
            Capture ideas, track investments, and transform thoughts into action.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/ideas/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            New Idea
          </Link>
          <Link
            href="/categories/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-border text-text text-sm font-medium rounded-lg hover:border-accent transition-colors"
          >
            <FolderPlus className="w-4 h-4 text-accent" />
            New Category
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-8">
          {/* Inspiration Carousel */}
          <InspirationCarousel inspirations={inspirations || undefined} />

          {/* Stats — kept just below the carousel */}
          <div>
            <h2 className="text-xl font-bold text-text mb-4">Your Stats</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-white border border-border rounded-lg text-center">
                <p className="text-3xl font-bold text-accent">{ideasCount || 0}</p>
                <p className="text-sm text-gray-500">Total Ideas</p>
              </div>
              <div className="p-4 bg-white border border-border rounded-lg text-center">
                <p className="text-3xl font-bold text-accent">
                  {pendingActions}
                </p>
                <p className="text-sm text-gray-500">Pending Actions</p>
              </div>
              <div className="p-4 bg-white border border-border rounded-lg text-center">
                <p className="text-3xl font-bold text-accent">
                  {categories?.length || 0}
                </p>
                <p className="text-sm text-gray-500">Categories</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <GettingStartedChecklist />
          <ActionSidebar actions={actions || []} />
        </div>
      </div>
    </div>
  );
}
