import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, Clock, Plus } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import DynamicFormRenderer from '@/components/ideas/DynamicFormRenderer';
import { FormElementConfig } from '@/types/form-element.types';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Idea Detail Page
 * Shows the full idea with all form fields in view mode
 */
export default async function IdeaDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch idea with category and template
  const { data: idea } = await supabase
    .from('ideas')
    .select('*, categories(*, templates(*))')
    .eq('id', id)
    .single();

  if (!idea) {
    notFound();
  }

  // Fetch actions for this idea
  const { data: actions } = await supabase
    .from('actions')
    .select('*')
    .eq('idea_id', id)
    .order('created_at', { ascending: false });

  const template = idea.categories?.templates?.form_structure as
    | FormElementConfig[]
    | undefined;
  const contentJson = idea.content_json as Record<string, any> | null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/ideas"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-text" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{idea.categories?.icon || '💡'}</span>
              <span className="text-sm text-gray-500">
                {idea.categories?.name || 'General'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-text">{idea.title}</h1>
          </div>
        </div>

        <Link
          href={`/ideas/${id}/edit`}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:border-accent transition-colors"
        >
          <Edit className="w-4 h-4" />
          Edit
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Idea Details Card */}
          <div className="bg-white border border-border rounded-xl p-6">
            {template ? (
              <DynamicFormRenderer
                template={template}
                initialValues={contentJson || {}}
                onSubmit={async () => {}}
                mode="view"
                ideaCreatedAt={idea.created_at || undefined}
              />
            ) : (
              <div className="space-y-4">
                {contentJson &&
                  Object.entries(contentJson).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-500 mb-1 capitalize">
                        {key.replace('_', ' ')}
                      </label>
                      <p className="text-text">{String(value)}</p>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Timestamps */}
          <div className="flex items-center gap-6 text-sm text-gray-500">
            {idea.created_at && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Created {format(new Date(idea.created_at), 'MMM d, yyyy')}
              </div>
            )}
            {idea.updated_at && idea.updated_at !== idea.created_at && (
              <div>
                Updated{' '}
                {formatDistanceToNow(new Date(idea.updated_at), {
                  addSuffix: true,
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Actions */}
        <div className="space-y-6">
          <div className="bg-white border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-text">Actions</h2>
              <button className="flex items-center gap-1 text-sm text-accent hover:underline">
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {actions && actions.length > 0 ? (
              <div className="space-y-3">
                {actions.map((action) => (
                  <div
                    key={action.id}
                    className={`p-3 rounded-lg border ${
                      action.status === 'completed'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-white border-border'
                    }`}
                  >
                    <p
                      className={`text-sm ${
                        action.status === 'completed'
                          ? 'text-green-700 line-through'
                          : 'text-text'
                      }`}
                    >
                      {action.text}
                    </p>
                    {action.due_time && (
                      <p className="text-xs text-gray-500 mt-1">
                        Due{' '}
                        {formatDistanceToNow(new Date(action.due_time), {
                          addSuffix: true,
                        })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No actions yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
