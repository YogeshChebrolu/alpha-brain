'use client';

import { format } from 'date-fns';
import { Clock, Calendar } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@alpha-brain/convex';
import ArticleRenderer from '@/components/articles/ArticleRenderer';

// Read-only, unauthenticated view of an article the owner has toggled
// public. No edit/delete affordances, no reference to draft-only fields.
export default function SharedArticlePage() {
  const params = useParams();
  const token = params.token as string;
  const article = useQuery(api.articles.getByShareToken, { shareToken: token });

  if (article === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (article === null) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-neutral-900 mb-4">
          This link is no longer available
        </h1>
        <p className="text-neutral-500">
          The article may have been unpublished or the link is incorrect.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <article className="max-w-3xl mx-auto px-4 py-8">
        {article.bannerImageUrl && (
          <div className="w-full h-64 md:h-80 overflow-hidden rounded-xl mb-8">
            <img
              src={article.bannerImageUrl}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-1 text-sm text-neutral-500">
            <Calendar className="w-4 h-4" />
            <span>{format(new Date(article._creationTime), 'MMMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-neutral-500">
            <Clock className="w-4 h-4" />
            <span>{article.readingTimeMinutes ?? 0} min read</span>
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-8 leading-tight">
          {article.title}
        </h1>

        {article.excerpt && (
          <p className="text-xl text-neutral-600 mb-8 leading-relaxed">
            {article.excerpt}
          </p>
        )}

        <ArticleRenderer content={article.content} className="prose-lg" />
      </article>
    </div>
  );
}
