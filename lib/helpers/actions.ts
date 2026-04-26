import { createClient } from '@/lib/supabase/client';

export type ActionInput = {
  id?: string;
  text: string;
  status: 'pending' | 'inprogress' | 'done' | 'skipped';
  due_time?: string;
};

/**
 * Sync actions from form data to the actions table
 * Handles create, update, and delete operations
 */
export async function syncActionsToIdea(ideaId: string, actions: ActionInput[]) {
  const supabase = createClient();

  if (!actions || actions.length === 0) {
    // Delete all existing actions for this idea
    await supabase.from('actions').delete().eq('idea_id', ideaId);
    return;
  }

  try {
    // Get existing actions for this idea
    const { data: existingActions } = await supabase
      .from('actions')
      .select('id')
      .eq('idea_id', ideaId);

    const existingIds = existingActions?.map((a) => a.id) || [];
    const incomingIds = actions.filter((a) => a.id).map((a) => a.id);

    // Delete actions that are no longer in the list
    const idsToDelete = existingIds.filter((id) => !incomingIds.includes(id));
    if (idsToDelete.length > 0) {
      await supabase.from('actions').delete().in('id', idsToDelete);
    }

    // Insert or update actions
    for (const action of actions) {
      if (action.id) {
        // Update existing action
        await supabase
          .from('actions')
          .update({
            text: action.text,
            status: action.status,
            due_time: action.due_time || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', action.id);
      } else {
        // Insert new action
        await supabase.from('actions').insert({
          idea_id: ideaId,
          text: action.text,
          status: action.status,
          due_time: action.due_time || null,
        });
      }
    }
  } catch (err) {
    console.error('Error syncing actions:', err);
    throw err;
  }
}

/**
 * Get all actions for an idea
 */
export async function getIdeaActions(ideaId: string): Promise<ActionInput[]> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('actions')
      .select('id, text, status, due_time')
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (
      data?.map((action) => ({
        id: action.id,
        text: action.text,
        status: action.status as 'pending' | 'inprogress' | 'done' | 'skipped',
        due_time: action.due_time || undefined,
      })) || []
    );
  } catch (err) {
    console.error('Error fetching idea actions:', err);
    return [];
  }
}

/**
 * Delete a single action
 */
export async function deleteAction(actionId: string) {
  const supabase = createClient();

  try {
    const { error } = await supabase.from('actions').delete().eq('id', actionId);

    if (error) throw error;
  } catch (err) {
    console.error('Error deleting action:', err);
    throw err;
  }
}

/**
 * Update action status
 */
export async function updateActionStatus(
  actionId: string,
  status: 'pending' | 'inprogress' | 'done' | 'skipped'
) {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('actions')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', actionId);

    if (error) throw error;
  } catch (err) {
    console.error('Error updating action status:', err);
    throw err;
  }
}
