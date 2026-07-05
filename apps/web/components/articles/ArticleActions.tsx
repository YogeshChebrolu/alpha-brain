'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Edit, Trash2, Share2, Check, Copy } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '@alpha-brain/convex';

interface ArticleActionsProps {
  articleId: string;
  slug: string;
  isPublic?: boolean;
  shareToken?: string;
}

/**
 * Edit/Delete/Share controls for the article view header. Sharing never
 * touches slug/status — it only flips `isPublic` and hands out a separate
 * share token, so existing article URLs and drafts are unaffected.
 */
export default function ArticleActions({ articleId, slug, isPublic, shareToken }: ArticleActionsProps) {
  const router = useRouter();
  const removeArticle = useMutation(api.articles.remove);
  const setPublic = useMutation(api.articles.setPublic);
  const [deleting, setDeleting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl =
    shareToken && typeof window !== 'undefined'
      ? `${window.location.origin}/share/${shareToken}`
      : '';

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this article?')) return;

    setDeleting(true);
    try {
      await removeArticle({ id: articleId as any });
      router.push('/articles');
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete article');
      setDeleting(false);
    }
  };

  const handleToggleShare = async (nextPublic: boolean) => {
    setSharing(true);
    try {
      await setPublic({ id: articleId as any, isPublic: nextPublic });
    } catch (err) {
      console.error('Share toggle error:', err);
      alert('Failed to update sharing');
    } finally {
      setSharing(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative flex items-center gap-2">
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-3 py-1.5 border border-neutral-200 rounded-lg text-sm font-medium hover:bg-neutral-50 transition-colors"
      >
        <Share2 className="w-4 h-4" />
        Share
      </button>
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

      {menuOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-neutral-200 rounded-xl shadow-lg p-4 z-20">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-neutral-900">Public link</p>
              <p className="text-xs text-neutral-500">
                Anyone with the link can view this article, read-only.
              </p>
            </div>
            <button
              role="switch"
              aria-checked={!!isPublic}
              onClick={() => handleToggleShare(!isPublic)}
              disabled={sharing}
              className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
                isPublic ? 'bg-neutral-900' : 'bg-neutral-200'
              } disabled:opacity-50`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  isPublic ? 'translate-x-4' : ''
                }`}
              />
            </button>
          </div>

          {isPublic && shareUrl && (
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.target.select()}
                className="flex-1 min-w-0 text-xs px-2 py-1.5 border border-neutral-200 rounded-lg bg-neutral-50 text-neutral-600"
              />
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-medium hover:bg-neutral-800 transition-colors shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
