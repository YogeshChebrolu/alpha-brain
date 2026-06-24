import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Clock, ChevronRight } from 'lucide-react';
import { Tables } from '@/types/database.types';

type Idea = Tables<'ideas'> & {
  categories?: { name: string; color: string; gradient: string } | null;
};

interface Props {
  ideas: Idea[];
}

/**
 * Ideas Grid Component
 * Displays ideas in a responsive grid with category color theming
 */
export default function IdeasGrid({ ideas }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {ideas.map((idea) => {
        const color = idea.categories?.color || '#0EA5E9';
        const contentJson = idea.content_json as Record<string, any> | null;
        const summary =
          contentJson?.explanation?.slice(0, 100) ||
          contentJson?.thesis?.slice(0, 100) ||
          '';

        return (
          <Link
            key={idea.id}
            href={`/ideas/${idea.id}`}
            className="group relative rounded-2xl transition-all duration-300 hover:-translate-y-1"
            style={{
              background: `linear-gradient(135deg, ${color}06 0%, ${color}12 100%)`,
              boxShadow: `0 2px 16px -4px ${color}15`,
            }}
          >
            {/* Left accent bar */}
            <div
              className="absolute left-0 top-4 bottom-4 w-1 rounded-full"
              style={{ backgroundColor: color }}
            />

            {/* Content */}
            <div className="p-5 pl-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <span
                  className="text-xs font-medium uppercase tracking-wider px-2 py-1 rounded-md"
                  style={{
                    backgroundColor: `${color}15`,
                    color: color,
                  }}
                >
                  {idea.categories?.name || 'General'}
                </span>
                {idea.created_at && (
                  <div className="flex items-center gap-1 text-xs text-neutral-400 flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(idea.created_at), { addSuffix: true })}
                  </div>
                )}
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-neutral-900 mb-2 line-clamp-2 group-hover:text-neutral-700 transition-colors">
                {idea.title}
              </h3>

              {/* Summary */}
              {summary && (
                <p className="text-sm text-neutral-500 line-clamp-2 mb-4">
                  {summary}
                  {summary.length >= 100 && '...'}
                </p>
              )}

              {/* Stock ticker if present */}
              {contentJson?.ticker && (
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium mb-3"
                  style={{
                    backgroundColor: `${color}15`,
                    color: color,
                  }}
                >
                  <span>$</span>
                  {contentJson.ticker}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                <span className="text-xs text-neutral-400 group-hover:text-neutral-600 transition-colors">
                  View details
                </span>
                <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500 group-hover:translate-x-1 transition-all" />
              </div>
            </div>

            {/* Hover glow */}
            <div
              className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ boxShadow: `0 8px 32px -8px ${color}30` }}
            />
          </Link>
        );
      })}
    </div>
  );
}
