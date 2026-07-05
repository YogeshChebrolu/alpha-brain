'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft, Clock, Calendar } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@alpha-brain/convex';
import ArticleRenderer from '@/components/articles/ArticleRenderer';
import ArticleActions from '@/components/articles/ArticleActions';

export default function ArticleViewPage() {
  const params = useParams();
  const slug = params.slug as string;
  const article = useQuery(api.articles.getBySlug, { slug });

  // undefined = still loading
  if (article === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  // null = not found
  if (article === null) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-neutral-900 mb-4">Article not found</h1>
        <Link
          href="/articles"
          className="text-neutral-600 hover:text-neutral-900 underline"
        >
          Back to Articles
        </Link>
      </div>
    );
  }

  const statusColors = {
    draft: 'bg-amber-100 text-amber-700',
    published: 'bg-green-100 text-green-700',
    archived: 'bg-neutral-100 text-neutral-500',
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-neutral-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/articles"
            className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">All Articles</span>
          </Link>

          <ArticleActions
            articleId={article._id}
            slug={slug}
            isPublic={article.isPublic}
            shareToken={article.shareToken}
          />
        </div>
      </div>

      {/* Content */}
      <article className="max-w-3xl mx-auto px-4 py-8">
        {/* Banner */}
        {article.bannerImageUrl && (
          <div className="w-full h-64 md:h-80 overflow-hidden rounded-xl mb-8">
            <img
              src={article.bannerImageUrl}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[article.status || 'draft']}`}>
            {(article.status || 'draft').charAt(0).toUpperCase() + (article.status || 'draft').slice(1)}
          </span>
          <div className="flex items-center gap-1 text-sm text-neutral-500">
            <Calendar className="w-4 h-4" />
            <span>{format(new Date(article._creationTime), 'MMMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-neutral-500">
            <Clock className="w-4 h-4" />
            <span>{article.readingTimeMinutes ?? 0} min read</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-8 leading-tight">
          {article.title}
        </h1>

        {/* Excerpt */}
        {article.excerpt && (
          <p className="text-xl text-neutral-600 mb-8 leading-relaxed">
            {article.excerpt}
          </p>
        )}

        {/* Article Content */}
        <ArticleRenderer
          content={article.content}
          className="prose-lg"
        />
      </article>
    </div>
  );
}
