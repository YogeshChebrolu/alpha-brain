'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '@alpha-brain/convex';
import type { Id } from '@alpha-brain/convex';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Pencil, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import DynamicFormRenderer from '@/components/ideas/DynamicFormRenderer';
import type { FormElementConfig } from '@/types/form-element.types';

export default function IdeaDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center p-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      }
    >
      <IdeaDetail />
    </Suspense>
  );
}

function IdeaDetail() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const idea = useQuery(api.ideas.get, { id: id as Id<'ideas'> });
  const updateIdea = useMutation(api.ideas.update);
  const archiveIdea = useMutation(api.ideas.archive);

  const [isEditing, setIsEditing] = useState(searchParams.get('edit') === '1');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (idea === undefined) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }
  if (idea === null) return <div className="text-center p-12">Idea not found</div>;

  const categoryColor = idea.category?.color || '#0EA5E9';
  const template = (idea.category?.template?.formStructure ?? []) as FormElementConfig[];

  const handleUpdate = async (values: Record<string, any>) => {
    setSaving(true);
    try {
      // Convert the due_date field (if any) from a date value to epoch ms,
      // mirroring how the create flow persists it.
      const dueDateField = template.find((c) => c.type === 'due_date');
      const rawDueDate = dueDateField ? values[dueDateField.id] : undefined;
      const dueDate = rawDueDate ? new Date(rawDueDate).getTime() : undefined;

      await updateIdea({
        id: id as Id<'ideas'>,
        title: values.title || idea.title,
        contentJson: values,
        dueDate,
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update idea:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${idea.title}"? This can't be undone.`)) return;
    setDeleting(true);
    try {
      await archiveIdea({ id: id as Id<'ideas'> });
      router.push('/ideas');
      router.refresh();
    } catch (err) {
      console.error('Failed to delete idea:', err);
      alert('Failed to delete idea');
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header with category badge + edit/delete actions */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex min-w-0 items-center gap-2 md:gap-4">
          <Link href="/" className="shrink-0 p-2 hover:bg-neutral-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div
            className="flex min-w-0 items-center gap-3 px-3 py-2 rounded-xl md:px-4"
            style={{
              background: `linear-gradient(135deg, ${categoryColor}10 0%, ${categoryColor}18 100%)`,
            }}
          >
            <div
              className="w-1.5 h-9 shrink-0 rounded-full md:h-10"
              style={{ backgroundColor: categoryColor }}
            />
            <div className="min-w-0">
              <p className="text-xs text-neutral-500 font-medium">{idea.category?.name}</p>
              <h1 className="truncate text-lg font-bold text-neutral-900 md:text-2xl">{idea.title}</h1>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setIsEditing((v) => !v)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors md:h-auto ${
              isEditing
                ? 'border-neutral-300 bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                : 'border-neutral-200 text-neutral-700 hover:bg-neutral-100'
            }`}
            title={isEditing ? 'Cancel editing' : 'Edit idea'}
          >
            {isEditing ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
            <span className="hidden sm:inline">{isEditing ? 'Cancel' : 'Edit'}</span>
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 md:h-auto"
            title="Delete idea"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>

      {/* Content card with color accent */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden md:p-8"
        style={{
          background: `linear-gradient(180deg, ${categoryColor}06 0%, white 100px)`,
          boxShadow: `0 4px 24px -4px ${categoryColor}15`,
        }}
      >
        {/* Left accent bar */}
        <div
          className="absolute left-0 top-6 bottom-6 w-1 rounded-full"
          style={{ backgroundColor: categoryColor }}
        />

        <div className="relative z-10 pl-3 md:pl-6">
          <DynamicFormRenderer
            key={isEditing ? 'edit' : 'view'}
            template={template as any}
            initialValues={idea.contentJson ?? {}}
            onSubmit={handleUpdate}
            mode={isEditing ? 'edit' : 'view'}
            ideaCreatedAt={new Date(idea._creationTime).toISOString()}
          />
          {isEditing && saving && (
            <p className="mt-3 text-sm text-neutral-500">Saving…</p>
          )}
        </div>
      </div>
    </div>
  );
}
