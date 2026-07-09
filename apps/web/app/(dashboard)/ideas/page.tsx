'use client';

import { useQuery } from 'convex/react';
import { api } from '@alpha-brain/convex';
import type { Id } from '@alpha-brain/convex';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, Lightbulb, X } from 'lucide-react';
import IdeasGrid from '@/components/ideas/IdeasGrid';

/**
 * Ideas Feed Page
 * Shows all ideas in a clean grid layout. Optionally filtered to a single
 * category via `?category=<id>` (linked from the Categories page).
 */
export default function IdeasPage() {
  const searchParams = useSearchParams();
  const categoryId = searchParams.get('category') ?? undefined;

  const ideas = useQuery(
    api.ideas.list,
    categoryId ? { categoryId: categoryId as Id<'categories'> } : {},
  );

  // Name of the active filter, for the heading + chip.
  const activeCategoryName = categoryId
    ? ideas?.[0]?.category?.name ?? null
    : null;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 md:text-3xl">
            {activeCategoryName ? activeCategoryName : 'Your Ideas'}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-neutral-500">
              {ideas?.length || 0} ideas{activeCategoryName ? ' in this category' : ' captured'}
            </p>
            {categoryId && (
              <Link
                href="/ideas"
                className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-full px-2.5 py-0.5 transition-colors"
              >
                Clear filter
                <X className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
        <Link
          href="/ideas/new"
          className="flex h-8 items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors font-medium md:h-auto"
        >
          <Plus className="w-5 h-5" />
          New Idea
        </Link>
      </div>

      {/* Ideas Grid */}
      {ideas && ideas.length > 0 ? (
        <IdeasGrid ideas={ideas} />
      ) : (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-100 rounded-2xl mb-4">
            <Lightbulb className="w-8 h-8 text-neutral-500" />
          </div>
          <h3 className="text-lg font-medium text-neutral-900 mb-2">No ideas yet</h3>
          <p className="text-neutral-500 mb-6">Create your first idea to get started</p>
          <Link
            href="/ideas/new"
            className="inline-flex h-8 items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors md:h-auto md:rounded-xl"
          >
            <Plus className="w-4 h-4" />
            Create Idea
          </Link>
        </div>
      )}
    </div>
  );
}
