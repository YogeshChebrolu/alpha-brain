'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Eye, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import ArticleEditor from '@/components/articles/ArticleEditor';
import ArticleBannerUpload from '@/components/articles/ArticleBannerUpload';
import InspirationManager, { type InspirationData } from '@/components/articles/InspirationManager';
import {
  updateArticle,
  generateUniqueSlug,
  uploadArticleContentImage,
  deleteArticle,
  getInspirationByArticleId,
  createInspiration,
  updateInspiration,
} from '@/lib/helpers/articles';
import type { Article, Inspiration } from '@/types/article.types';
import type { JSONContent } from '@tiptap/core';

export default function EditArticlePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const supabase = createClient();

  const [article, setArticle] = useState<Article | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<JSONContent | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bannerPath, setBannerPath] = useState<string | null>(null);
  const [inspiration, setInspiration] = useState<Inspiration | null>(null);
  const [inspirationData, setInspirationData] = useState<InspirationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUserId(session.user.id);

      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error || !data) {
        router.push('/articles');
        return;
      }

      setArticle(data as Article);
      setTitle(data.title);
      setBannerUrl(data.banner_image_url);
      setBannerPath(data.banner_storage_path);

      // Parse content
      try {
        setContent(JSON.parse(data.content));
      } catch {
        setContent(null);
      }

      // Fetch linked inspiration
      try {
        const inspirationResult = await getInspirationByArticleId(data.id);
        setInspiration(inspirationResult);
      } catch (err) {
        console.error('Error fetching inspiration:', err);
      }

      setLoading(false);
    }

    fetchData();
  }, [slug]);

  const handleBannerChange = (url: string | null, storagePath: string | null) => {
    setBannerUrl(url);
    setBannerPath(storagePath);
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    if (!userId || !article) throw new Error('Not authenticated');
    return uploadArticleContentImage(userId, article.id, file);
  };

  const handleSave = async (status?: 'draft' | 'published') => {
    if (!article || !userId) return;
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Generate new slug if title changed
      let newSlug = article.slug;
      if (title.trim() !== article.title) {
        newSlug = await generateUniqueSlug(title, article.id);
      }

      const contentStr = content ? JSON.stringify(content) : article.content;

      const updateData: any = {
        title: title.trim(),
        slug: newSlug,
        content: contentStr,
        banner_image_url: bannerUrl,
        banner_storage_path: bannerPath,
      };

      if (status) {
        updateData.status = status;
        if (status === 'published' && !article.published_at) {
          updateData.published_at = new Date().toISOString();
        }
      }

      await updateArticle(article.id, updateData);

      // Handle inspiration save
      if (inspirationData) {
        if (inspirationData.isActive) {
          // Create or update inspiration
          const inspirationPayload = {
            title: inspirationData.title,
            description: inspirationData.description,
            icon: inspirationData.icon,
            gradient: inspirationData.gradient,
            display_order: inspirationData.displayOrder,
            is_active: true,
            banner_image_url: status === 'published' ? bannerUrl : null,
          };

          if (inspirationData.id) {
            await updateInspiration(inspirationData.id, inspirationPayload);
          } else {
            await createInspiration({
              user_id: userId,
              article_id: article.id,
              ...inspirationPayload,
            });
          }
        } else if (inspirationData.id) {
          // User disabled - soft delete
          await updateInspiration(inspirationData.id, { is_active: false });
        }
      }

      // Redirect to new slug if changed
      if (newSlug !== article.slug) {
        router.push(`/articles/${newSlug}`);
      } else {
        router.push(`/articles/${article.slug}`);
      }
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
      await deleteArticle(article.id);
      router.push('/articles');
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete article');
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

  if (!article || !userId) {
    return null;
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
          storagePath={bannerPath}
          onChange={handleBannerChange}
          userId={userId}
          articleId={article.id}
        />

        {/* Inspiration Manager */}
        <InspirationManager
          article={article}
          userId={userId}
          existingInspiration={inspiration}
          onSave={setInspirationData}
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
            onImageUpload={handleImageUpload}
            placeholder="Start writing your article... Use '/' for commands"
          />
        </div>
      </div>
    </div>
  );
}
