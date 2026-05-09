import { createClient } from '@/lib/supabase/client';
import { syncActionAlerts, getEnabledChannels } from './notifications';

export type ActionInput = {
  id?: string;
  text: string;
  status: 'pending' | 'inprogress' | 'done' | 'skipped';
  due_time?: string;
  notify?: boolean; // Whether to create alerts for this action
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

    // Get enabled channels for alerts
    const enabledChannels = await getEnabledChannels();

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

        // Sync alerts if notify is enabled and there's a due_time
        if (action.notify && action.due_time) {
          await syncActionAlerts(action.id, action.due_time, enabledChannels);
        } else if (!action.notify || !action.due_time) {
          // Clear alerts if notify is disabled or no due_time
          await syncActionAlerts(action.id, undefined, []);
        }
      } else {
        // Insert new action
        const { data: newAction } = await supabase
          .from('actions')
          .insert({
            idea_id: ideaId,
            text: action.text,
            status: action.status,
            due_time: action.due_time || null,
          })
          .select('id')
          .single();

        // Create alerts for new action if notify is enabled
        if (newAction && action.notify && action.due_time) {
          await syncActionAlerts(newAction.id, action.due_time, enabledChannels);
        }
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

    if (!data || data.length === 0) return [];

    // Get action IDs to check for alerts
    const actionIds = data.map((a) => a.id);

    // Check which actions have active alerts
    const { data: alerts } = await supabase
      .from('action_alerts')
      .select('action_id')
      .in('action_id', actionIds)
      .eq('status', 'active');

    const actionsWithAlerts = new Set(alerts?.map((a) => a.action_id) || []);

    return data.map((action) => ({
      id: action.id,
      text: action.text,
      status: action.status as 'pending' | 'inprogress' | 'done' | 'skipped',
      due_time: action.due_time || undefined,
      notify: actionsWithAlerts.has(action.id),
    }));
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
