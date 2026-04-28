import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Plus, Lightbulb } from 'lucide-react';
import IdeasGrid from '@/components/ideas/IdeasGrid';

/**
 * Ideas Feed Page
 * Shows all ideas in a clean grid layout
 */
export default async function IdeasPage() {
  const supabase = await createClient();

  const { data: ideas } = await supabase
    .from('ideas')
    .select('*, categories(name, color, gradient)')
    .eq('archived', false)
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Your Ideas</h1>
          <p className="text-neutral-500 mt-1">
            {ideas?.length || 0} ideas captured
          </p>
        </div>
        <Link
          href="/ideas/new"
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          New Idea
        </Link>
      </div>

      {/* Ideas Grid */}
      {ideas && ideas.length > 0 ? (
        <IdeasGrid ideas={ideas as any} />
      ) : (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-100 rounded-2xl mb-4">
            <Lightbulb className="w-8 h-8 text-neutral-500" />
          </div>
          <h3 className="text-lg font-medium text-neutral-900 mb-2">No ideas yet</h3>
          <p className="text-neutral-500 mb-6">Create your first idea to get started</p>
          <Link
            href="/ideas/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Idea
          </Link>
        </div>
      )}
    </div>
  );
}
