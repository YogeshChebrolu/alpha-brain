'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Edit, Trash2 } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '@alpha-brain/convex';

interface ArticleActionsProps {
  articleId: string;
  slug: string;
}

/**
 * Edit/Delete controls for the article view header.
 */
export default function ArticleActions({ articleId, slug }: ArticleActionsProps) {
  const router = useRouter();
  const removeArticle = useMutation(api.articles.remove);
  const [deleting, setDeleting] = useState(false);

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

  return (
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
  );
}
