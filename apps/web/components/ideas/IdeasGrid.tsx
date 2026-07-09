import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Clock, ChevronRight } from 'lucide-react';
import IdeaCardActions from './IdeaCardActions';

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
  ideas: Idea[];
}

/**
 * Extract plain text from an idea field that may be a legacy string OR a
 * BlockNote document (array of block objects). Returns a trimmed snippet.
 */
function toSnippet(value: unknown, max = 100): string {
  if (typeof value === 'string') return value.slice(0, max);
  if (!Array.isArray(value)) return '';

  const walk = (blocks: any[]): string =>
    blocks
      .map((b) => {
        const inline = Array.isArray(b?.content)
          ? b.content.map((c: any) => (typeof c?.text === 'string' ? c.text : '')).join('')
          : '';
        const nested = Array.isArray(b?.children) ? walk(b.children) : '';
        return [inline, nested].filter(Boolean).join(' ');
      })
      .filter(Boolean)
      .join(' ');

  return walk(value).slice(0, max);
}

/**
 * Ideas Grid Component
 * Displays ideas in a responsive grid with category color theming
 */
export default function IdeasGrid({ ideas }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {ideas.map((idea) => {
        const color = idea.category?.color || '#0EA5E9';
        const contentJson = idea.contentJson;
        const summary =
          toSnippet(contentJson?.explanation) || toSnippet(contentJson?.thesis) || '';

        return (
          <Link
            key={idea._id}
            href={`/ideas/${idea._id}`}
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

            {/* Hover actions (edit / delete) */}
            <IdeaCardActions ideaId={idea._id} ideaTitle={idea.title} />

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
                  {idea.category?.name || 'General'}
                </span>
                {idea._creationTime && (
                  <div className="flex items-center gap-1 text-xs text-neutral-400 flex-shrink-0 group-hover:opacity-0 transition-opacity">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(idea._creationTime), { addSuffix: true })}
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
