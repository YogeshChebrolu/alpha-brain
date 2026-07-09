'use client';

import Link from 'next/link';
import { Plus, FileText } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@alpha-brain/convex';
import ArticleCard from '@/components/articles/ArticleCard';

export default function ArticlesPage() {
  const articles = useQuery(api.articles.listMine);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 sm:mb-8 sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">Articles</h1>
          <p className="mt-1 max-w-[13rem] text-sm leading-6 text-neutral-600 sm:max-w-none sm:text-base">
            Write and manage your articles and inspirations
          </p>
        </div>
        <Link
          href="/articles/new"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 sm:h-auto sm:gap-2 sm:px-4 sm:py-2.5 sm:text-base"
        >
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          New Article
        </Link>
      </div>

      {/* Content */}
      {!articles || articles.length === 0 ? (
        <div className="mx-auto max-w-sm rounded-2xl border-2 border-dashed border-neutral-200 px-5 py-12 text-center sm:max-w-none sm:px-6 sm:py-20">
          <div className="mx-auto mb-4 w-fit rounded-full bg-neutral-100 p-3 sm:p-4">
            <FileText className="h-6 w-6 text-neutral-400 sm:h-8 sm:w-8" />
          </div>
          <h3 className="mb-2 text-base font-semibold text-neutral-900 sm:text-lg">
            No articles yet
          </h3>
          <p className="mx-auto mb-5 max-w-xs text-sm leading-6 text-neutral-600 sm:mb-6 sm:max-w-md sm:text-base">
            Start writing your first article. Articles can be linked to inspirations on your homescreen.
          </p>
          <Link
            href="/articles/new"
            className="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 sm:h-auto sm:gap-2 sm:px-4 sm:py-2.5 sm:text-base"
          >
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Write Your First Article
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <ArticleCard key={article._id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
