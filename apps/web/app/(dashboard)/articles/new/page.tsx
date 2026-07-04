'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import Link from 'next/link';
import { useMutation } from 'convex/react';
import { api } from '@alpha-brain/convex';
import ArticleEditor from '@/components/articles/ArticleEditor';
import ArticleBannerUpload from '@/components/articles/ArticleBannerUpload';
import InspirationManager, { type InspirationData } from '@/components/articles/InspirationManager';
import { generateSlug, calculateReadingTime } from '@/lib/helpers/articles';

export default function NewArticlePage() {
  const router = useRouter();
  const createArticle = useMutation(api.articles.create);
  const upsertInspiration = useMutation(api.inspirations.upsertForArticle);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState<any>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [inspiration, setInspiration] = useState<InspirationData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBannerChange = (url: string | null) => {
    setBannerUrl(url);
  };

  const handleSave = async (status: 'draft' | 'published' = 'draft') => {
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Unique-ish slug: backend has no uniqueness check, so append a short suffix.
      const slug = `${generateSlug(title)}-${Math.random().toString(36).slice(2, 8)}`;
      const contentStr = content ? JSON.stringify(content) : '{}';

      const articleId = await createArticle({
        title: title.trim(),
        slug,
        content: contentStr,
        bannerImageUrl: bannerUrl ?? undefined,
        status,
        readingTimeMinutes: calculateReadingTime(contentStr),
      });

      // Persist the "Show as inspiration" card, if enabled.
      if (inspiration && inspiration.isActive) {
        await upsertInspiration({
          articleId,
          title: inspiration.title,
          description: inspiration.description,
          icon: inspiration.icon,
          gradient: inspiration.gradient,
          bannerImageUrl: bannerUrl ?? undefined,
          isActive: true,
        });
      }

      router.push(`/articles/${slug}`);
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save article');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <Link
            href="/articles"
            className="inline-flex shrink-0 items-center gap-1.5 text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">Back to Articles</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 rounded-lg text-sm font-medium hover:bg-neutral-50 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Draft
            </button>
            <button
              onClick={() => handleSave('published')}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              <Eye className="w-4 h-4" />
              Publish
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

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Article title..."
          className="w-full text-2xl sm:text-4xl font-bold text-neutral-900 placeholder:text-neutral-300 bg-transparent border-none outline-none"
        />

        {/* Content Editor */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <ArticleEditor
            onChange={setContent}
            placeholder="Start writing your article... Use '/' for commands"
          />
        </div>

        {/* Feature as an inspiration card on the home screen */}
        <InspirationManager articleTitle={title} onSave={setInspiration} />
      </div>
    </div>
  );
}
