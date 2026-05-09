'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import ArticleEditor from '@/components/articles/ArticleEditor';
import ArticleBannerUpload from '@/components/articles/ArticleBannerUpload';
import { createArticle, generateUniqueSlug, uploadArticleContentImage } from '@/lib/helpers/articles';
import type { JSONContent } from '@tiptap/core';

export default function NewArticlePage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<JSONContent | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bannerPath, setBannerPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempArticleId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    async function getUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
      } else {
        router.push('/login');
      }
    }
    getUser();
  }, []);

  const handleBannerChange = (url: string | null, storagePath: string | null) => {
    setBannerUrl(url);
    setBannerPath(storagePath);
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    if (!userId) throw new Error('Not authenticated');
    return uploadArticleContentImage(userId, tempArticleId, file);
  };

  const handleSave = async (status: 'draft' | 'published' = 'draft') => {
    if (!userId) return;
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const slug = await generateUniqueSlug(title);
      const contentStr = content ? JSON.stringify(content) : '{}';

      const article = await createArticle({
        user_id: userId,
        title: title.trim(),
        slug,
        content: contentStr,
        banner_image_url: bannerUrl,
        banner_storage_path: bannerPath,
        status,
        published_at: status === 'published' ? new Date().toISOString() : null,
      });

      // Move temp images to article folder if needed
      // (In a production app, you'd move files from temp to the actual article ID)

      router.push(`/articles/${article.slug}`);
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save article');
      setSaving(false);
    }
  };

  if (!userId) {
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
            href="/articles"
            className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Articles</span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-200 rounded-lg text-sm font-medium hover:bg-neutral-50 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Save Draft
            </button>
            <button
              onClick={() => handleSave('published')}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50"
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
          storagePath={bannerPath}
          onChange={handleBannerChange}
          userId={userId}
          articleId={tempArticleId}
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
            onChange={setContent}
            onImageUpload={handleImageUpload}
            placeholder="Start writing your article... Use '/' for commands"
          />
        </div>
      </div>
    </div>
  );
}
