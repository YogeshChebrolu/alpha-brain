'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Edit, Archive, Trash2, Loader2, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import DynamicFormRenderer from '@/components/ideas/DynamicFormRenderer';
import { FormElementConfig } from '@/types/form-element.types';
import { Tables } from '@/types/database.types';
import { getIdeaActions, syncActionsToIdea } from '@/lib/helpers/actions';
import { linkResourcesToIdea, moveTemporaryFiles } from '@/lib/helpers/resources';

type Idea = Tables<'ideas'> & {
  categories?: Tables<'categories'> & {
    templates?: Tables<'templates'> | null;
  } | null;
};

export default function IdeaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [idea, setIdea] = useState<Idea | null>(null);
  const [template, setTemplate] = useState<FormElementConfig[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadIdea();
  }, [params.id]);

  const loadIdea = async () => {
    try {
      const { data, error } = await supabase
        .from('ideas')
        .select('*, categories (*, templates (*))')
        .eq('id', params.id as string)
        .single();
      if (error) throw error;

      // Fetch actions from the actions table
      const actions = await getIdeaActions(params.id as string);

      // Merge actions into content_json for the form
      const ideaWithActions = {
        ...data,
        content_json: {
          ...(data.content_json as Record<string, any> || {}),
          actions,
        },
      };

      setIdea(ideaWithActions as Idea);
      if (data.categories?.templates?.form_structure) {
        setTemplate(data.categories.templates.form_structure as unknown as FormElementConfig[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (values: Record<string, any>) => {
    if (!idea) return;
    try {
      // Extract actions and resources from form values
      const actions = values.actions || [];
      const resourceIds = values.resources || [];

      // Update the idea
      await supabase.from('ideas').update({
        title: values.title || idea.title,
        content_json: values
      }).eq('id', idea.id);

      // Sync actions to the actions table
      await syncActionsToIdea(idea.id, actions);

      // Handle resources if any were added
      if (resourceIds.length > 0) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          await linkResourcesToIdea(idea.id, resourceIds);
          await moveTemporaryFiles(session.user.id, idea.id, resourceIds);
        }
      }

      setIsEditing(false);
      loadIdea();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!idea || !template) return <div className="text-center p-12">Idea not found</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-neutral-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="text-3xl font-bold">{idea.title}</h1>
            <p className="text-sm text-neutral-500 mt-1">{idea.categories?.name}</p>
          </div>
        </div>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-neutral-50">
            <Edit className="w-4 h-4" />Edit
          </button>
        )}
      </div>
      <div className="bg-white border rounded-2xl p-8">
        <DynamicFormRenderer
          template={template}
          initialValues={idea.content_json as Record<string, any> || {}}
          onSubmit={handleUpdate}
          mode={isEditing ? 'edit' : 'view'}
          ideaCreatedAt={idea.created_at || undefined}
        />
        {isEditing && (
          <button onClick={() => setIsEditing(false)} className="mt-4 px-6 py-2 border rounded-lg">Cancel</button>
        )}
      </div>
    </div>
  );
}
