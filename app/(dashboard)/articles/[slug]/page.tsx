'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft, Edit, Clock, Calendar, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ArticleRenderer from '@/components/articles/ArticleRenderer';
import { deleteArticle } from '@/lib/helpers/articles';
import type { Article } from '@/types/article.types';

export default function ArticleViewPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchArticle() {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('slug', slug)
        .single();

      if (!error && data) {
        setArticle(data as Article);
      }
      setLoading(false);
    }

    fetchArticle();
  }, [slug]);

  const handleDelete = async () => {
    if (!article) return;
    if (!confirm('Are you sure you want to delete this article?')) return;

    setDeleting(true);
    try {
      await deleteArticle(article.id);
      router.push('/articles');
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete article');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!article) {
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

          <div className="flex items-center gap-2">
            <Link
              href={`/articles/${slug}/edit`}
              className="inline-flex items-center gap-2 px-3 py-1.5 border border-neutral-200 rounded-lg text-sm font-medium hover:bg-neutral-50 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <article className="max-w-3xl mx-auto px-4 py-8">
        {/* Banner */}
        {article.banner_image_url && (
          <div className="w-full h-64 md:h-80 overflow-hidden rounded-xl mb-8">
            <img
              src={article.banner_image_url}
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
            <span>{article.created_at ? format(new Date(article.created_at), 'MMMM d, yyyy') : 'Unknown'}</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-neutral-500">
            <Clock className="w-4 h-4" />
            <span>{article.reading_time_minutes} min read</span>
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
