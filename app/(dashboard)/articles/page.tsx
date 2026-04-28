'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ArticleCard from '@/components/articles/ArticleCard';
import type { Article } from '@/types/article.types';

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchArticles() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setArticles(data as Article[]);
      }
      setLoading(false);
    }

    fetchArticles();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Articles</h1>
          <p className="text-neutral-600 mt-1">
            Write and manage your articles and inspirations
          </p>
        </div>
        <Link
          href="/articles/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          New Article
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-neutral-200 rounded-2xl">
          <div className="p-4 bg-neutral-100 rounded-full w-fit mx-auto mb-4">
            <FileText className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">
            No articles yet
          </h3>
          <p className="text-neutral-600 mb-6 max-w-md mx-auto">
            Start writing your first article. Articles can be linked to inspirations on your homescreen.
          </p>
          <Link
            href="/articles/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Write Your First Article
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
