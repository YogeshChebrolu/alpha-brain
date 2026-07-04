import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Clock, ChevronRight } from 'lucide-react';

type Idea = {
  _id: string;
  title: string;
  categoryId?: string;
  contentJson?: Record<string, any> | null;
  dueDate?: number;
  _creationTime: number;
  category: { _id: string; name: string; color: string; gradient?: string } | null;
};

interface Props {
  idea: Idea;
}

/**
 * Idea Card Component
 * Minimalist card design for swipe feed
 */
export default function IdeaCard({ idea }: Props) {
  const contentJson = idea.contentJson;
  const summary =
    contentJson?.explanation?.slice(0, 150) ||
    contentJson?.thesis?.slice(0, 150) ||
    'No description';

  return (
    <Link href={`/ideas/${idea._id}`} className="block">
      <div className="w-full max-w-2xl mx-auto bg-white rounded-xl border border-border p-6 hover:border-accent hover:shadow-md transition-all group">
        {/* Category badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">💡</span>
            <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">
              {idea.category?.name || 'General'}
            </span>
          </div>
          {idea._creationTime && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(idea._creationTime), { addSuffix: true })}
            </div>
          )}
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-text mb-3 group-hover:text-accent transition-colors">
          {idea.title}
        </h2>

        {/* Summary */}
        <p className="text-gray-600 text-sm line-clamp-3 mb-4">
          {summary}
          {summary.length >= 150 && '...'}
        </p>

        {/* Stock ticker badge if present */}
        {contentJson?.ticker && (
          <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-3 py-1 rounded-lg text-sm font-medium mb-4">
            📈 {contentJson.ticker}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <span className="text-sm text-gray-500">View details</span>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-accent group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </Link>
  );
}
