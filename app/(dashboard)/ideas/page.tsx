import { createClient } from '@/lib/supabase/server';
import SwipeFeed from '@/components/ideas/SwipeFeed';
import Link from 'next/link';
import { Plus } from 'lucide-react';

/**
 * Ideas Feed Page
 * Shows all ideas in a swipeable feed format
 */
export default async function IdeasPage() {
  const supabase = await createClient();

  const { data: ideas } = await supabase
    .from('ideas')
    .select('*, categories(name, icon)')
    .order('created_at', { ascending: false });

  return (
    <div className="h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-text">Your Ideas</h1>
          <p className="text-gray-500 mt-1">
            {ideas?.length || 0} ideas captured
          </p>
        </div>
        <Link
          href="/ideas/new"
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
        >
          <Plus className="w-5 h-5" />
          New Idea
        </Link>
      </div>

      {/* Swipe Feed */}
      <SwipeFeed ideas={ideas || []} />
    </div>
  );
}
