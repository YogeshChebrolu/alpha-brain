'use client';

import type { MouseEvent } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api, type Id } from '@alpha-brain/convex';

interface Props {
  ideaId: string;
  ideaTitle: string;
}

/**
 * Hover actions (edit / delete) for an idea card in the grid. The card itself
 * is a <Link>, so each button stops propagation + prevents the default
 * navigation. Edit routes to the detail page in edit mode; delete archives.
 */
export default function IdeaCardActions({ ideaId, ideaTitle }: Props) {
  const router = useRouter();
  const archive = useMutation(api.ideas.archive);
  const [deleting, setDeleting] = useState(false);

  const stop = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleEdit = (event: MouseEvent<HTMLButtonElement>) => {
    stop(event);
    router.push(`/ideas/${ideaId}?edit=1`);
  };

  const handleDelete = async (event: MouseEvent<HTMLButtonElement>) => {
    stop(event);
    if (!confirm(`Delete "${ideaTitle}"? This can't be undone.`)) return;
    setDeleting(true);
    try {
      await archive({ id: ideaId as Id<'ideas'> });
    } catch (error) {
      console.error('Failed to delete idea:', error);
      alert('Failed to delete idea');
      setDeleting(false);
    }
  };

  return (
    <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
      <button
        onClick={handleEdit}
        className="rounded-lg border border-neutral-200 bg-white p-2 shadow-sm transition-colors hover:bg-neutral-100"
        title="Edit idea"
      >
        <Pencil className="h-3.5 w-3.5 text-neutral-600" />
      </button>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="rounded-lg border border-neutral-200 bg-white p-2 shadow-sm transition-colors hover:border-red-300 hover:bg-red-50 disabled:opacity-50"
        title="Delete idea"
      >
        {deleting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-600" />
        ) : (
          <Trash2 className="h-3.5 w-3.5 text-neutral-600 transition-colors hover:text-red-600" />
        )}
      </button>
    </div>
  );
}
