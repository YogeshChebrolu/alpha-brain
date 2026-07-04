import Link from 'next/link';
import { format } from 'date-fns';
import { Clock, FileText, ChevronRight } from 'lucide-react';

interface ArticleCardProps {
  article: {
    slug: string;
    title: string;
    excerpt?: string;
    status?: 'draft' | 'published' | 'archived';
    bannerImageUrl?: string;
    readingTimeMinutes?: number;
    _creationTime: number;
  };
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const statusColors = {
    draft: 'bg-amber-100 text-amber-700',
    published: 'bg-green-100 text-green-700',
    archived: 'bg-neutral-100 text-neutral-500',
  };

  return (
    <Link
      href={`/articles/${article.slug}`}
      className="group block bg-white border border-neutral-200 rounded-xl overflow-hidden hover:border-neutral-300 hover:shadow-lg transition-all"
    >
      {/* Banner Image */}
      {article.bannerImageUrl ? (
        <div className="aspect-[2/1] overflow-hidden bg-neutral-100">
          <img
            src={article.bannerImageUrl}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="aspect-[2/1] bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center">
          <FileText className="w-12 h-12 text-neutral-300" />
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Status & Date */}
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[article.status || 'draft']}`}>
            {(article.status || 'draft').charAt(0).toUpperCase() + (article.status || 'draft').slice(1)}
          </span>
          <span className="text-xs text-neutral-500">
            {format(new Date(article._creationTime), 'MMM d, yyyy')}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-neutral-900 line-clamp-2 group-hover:text-neutral-700 transition-colors">
          {article.title}
        </h3>

        {/* Excerpt */}
        {article.excerpt && (
          <p className="text-sm text-neutral-600 line-clamp-2">
            {article.excerpt}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
          <div className="flex items-center gap-1 text-xs text-neutral-500">
            <Clock className="w-3.5 h-3.5" />
            <span>{article.readingTimeMinutes ?? 0} min read</span>
          </div>
          <div className="flex items-center gap-1 text-sm font-medium text-neutral-700 group-hover:text-neutral-900">
            <span>Read</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
}
