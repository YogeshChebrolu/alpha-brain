'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Eye, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@alpha-brain/convex';
import ArticleEditor from '@/components/articles/ArticleEditor';
import ArticleBannerUpload from '@/components/articles/ArticleBannerUpload';
import InspirationManager, { type InspirationData } from '@/components/articles/InspirationManager';
import { calculateReadingTime } from '@/lib/helpers/articles';

export default function EditArticlePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const article = useQuery(api.articles.getBySlug, { slug });
  const updateArticle = useMutation(api.articles.update);
  const removeArticle = useMutation(api.articles.remove);
  const upsertInspiration = useMutation(api.inspirations.upsertForArticle);
  const removeInspiration = useMutation(api.inspirations.removeForArticle);
  const existingInspiration = useQuery(
    api.inspirations.getForArticle,
    article ? { articleId: article._id } : 'skip',
  );

  const [title, setTitle] = useState('');
  const [content, setContent] = useState<any>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [inspirationData, setInspirationData] = useState<InspirationData | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate local form state once the article loads.
  useEffect(() => {
    if (!article || initialized) return;
    setTitle(article.title);
    setBannerUrl(article.bannerImageUrl ?? null);
    try {
      const parsed = JSON.parse(article.content);
      setContent(Array.isArray(parsed) ? parsed : null);
    } catch {
      setContent(null);
    }
    setInitialized(true);
  }, [article, initialized]);

  // Not found
  useEffect(() => {
    if (article === null) router.push('/articles');
  }, [article, router]);

  const handleBannerChange = (url: string | null) => {
    setBannerUrl(url);
  };

  const handleSave = async (status?: 'draft' | 'published') => {
    if (!article) return;
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const contentStr = content ? JSON.stringify(content) : article.content;

      // NOTE: slug is intentionally left unchanged — api.articles.update does not
      // accept a slug field, so renaming the title does not re-slug the article.
      await updateArticle({
        id: article._id,
        title: title.trim(),
        content: contentStr,
        bannerImageUrl: bannerUrl ?? undefined,
        readingTimeMinutes: calculateReadingTime(contentStr),
        ...(status ? { status } : {}),
      });

      // Persist the "Show as inspiration" toggle for this article.
      if (inspirationData && inspirationData.isActive) {
        await upsertInspiration({
          articleId: article._id,
          title: inspirationData.title,
          description: inspirationData.description,
          icon: inspirationData.icon,
          gradient: inspirationData.gradient,
          bannerImageUrl: bannerUrl ?? undefined,
          isActive: true,
        });
      } else {
        await removeInspiration({ articleId: article._id });
      }

      router.push(`/articles/${article.slug}`);
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save article');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!article) return;
    if (!confirm('Are you sure you want to delete this article? This cannot be undone.')) return;

    setDeleting(true);
    try {
      await removeArticle({ id: article._id });
      router.push('/articles');
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete article');
      setDeleting(false);
    }
  };

  // undefined = loading, null handled by redirect effect above
  if (article === undefined || article === null || !initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href={`/articles/${article.slug}`}
            className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Article</span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDelete}
              disabled={deleting || saving}
              className="inline-flex items-center gap-2 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleSave('draft')}
              disabled={saving || deleting}
              className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-200 rounded-lg text-sm font-medium hover:bg-neutral-50 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Save Draft
            </button>
            <button
              onClick={() => handleSave('published')}
              disabled={saving || deleting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              <Eye className="w-4 h-4" />
              {article.status === 'published' ? 'Update' : 'Publish'}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Banner Upload */}
        <ArticleBannerUpload
          value={bannerUrl}
          onChange={handleBannerChange}
        />

        {/* Inspiration Manager */}
        <InspirationManager
          articleTitle={article.title}
          onSave={setInspirationData}
          initial={existingInspiration}
        />

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Article title..."
          className="w-full text-4xl font-bold text-neutral-900 placeholder:text-neutral-300 bg-transparent border-none outline-none"
        />

        {/* Content Editor */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <ArticleEditor
            initialContent={content || undefined}
            onChange={setContent}
            placeholder="Start writing your article... Use '/' for commands"
          />
        </div>
      </div>
    </div>
  );
}
