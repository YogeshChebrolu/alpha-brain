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

// Pre-fill a few empty paragraphs so the editor box doesn't look like an
// empty white/black sliver before the user starts typing.
const EMPTY_STARTER_BLOCKS = Array.from({ length: 8 }, () => ({
  type: 'paragraph' as const,
}));

// Drop trailing empty paragraphs the starter content left behind so drafts
// don't get saved full of blank lines.
function stripTrailingEmptyBlocks(blocks: any[]): any[] {
  const isEmptyParagraph = (block: any) =>
    block.type === 'paragraph' &&
    (!block.content || block.content.length === 0);

  let end = blocks.length;
  while (end > 0 && isEmptyParagraph(blocks[end - 1])) {
    end--;
  }
  return blocks.slice(0, end);
}

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
      const trimmedContent = content ? stripTrailingEmptyBlocks(content) : content;
      const contentStr = trimmedContent ? JSON.stringify(trimmedContent) : '{}';

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
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 py-3">
          <Link
            href="/articles"
            className="inline-flex shrink-0 items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden text-sm font-medium sm:inline">Back to Articles</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="inline-flex h-8 items-center gap-2 px-3 py-2 border border-neutral-200 rounded-lg text-sm font-medium hover:bg-neutral-50 transition-colors disabled:opacity-50 sm:px-4 md:h-auto"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Save Draft</span>
            </button>
            <button
              onClick={() => handleSave('published')}
              disabled={saving}
              className="inline-flex h-8 items-center gap-2 px-3 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50 sm:px-4 md:h-auto"
            >
              <Eye className="w-4 h-4" />
              Publish
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="max-w-4xl mx-auto pt-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="max-w-4xl mx-auto py-8 space-y-6">
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
          className="w-full text-2xl md:text-4xl font-bold text-neutral-900 placeholder:text-neutral-300 bg-transparent border-none outline-none"
        />

        {/* Content Editor */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <ArticleEditor
            initialContent={EMPTY_STARTER_BLOCKS}
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
