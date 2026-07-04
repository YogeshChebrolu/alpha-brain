'use client';

import { useQuery } from 'convex/react';
import { api } from '@alpha-brain/convex';
import type { Id } from '@alpha-brain/convex';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import DynamicFormRenderer from '@/components/ideas/DynamicFormRenderer';

export default function IdeaDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const idea = useQuery(api.ideas.get, { id: id as Id<'ideas'> });

  if (idea === undefined) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }
  if (idea === null) return <div className="text-center p-12">Idea not found</div>;

  const categoryColor = idea.category?.color || '#0EA5E9';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header with category badge */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div
            className="flex items-center gap-3 px-4 py-2 rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${categoryColor}10 0%, ${categoryColor}18 100%)`,
            }}
          >
            <div
              className="w-1.5 h-10 rounded-full"
              style={{ backgroundColor: categoryColor }}
            />
            <div>
              <p className="text-xs text-neutral-500 font-medium">{idea.category?.name}</p>
              <h1 className="text-2xl font-bold text-neutral-900">{idea.title}</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content card with color accent */}
      <div
        className="rounded-2xl p-8 relative overflow-hidden"
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

        <div className="relative z-10 pl-6">
          <DynamicFormRenderer
            template={(idea.category?.template?.formStructure ?? []) as any}
            initialValues={idea.contentJson ?? {}}
            onSubmit={async () => {}}
            mode="view"
          />
        </div>
      </div>
    </div>
  );
}
