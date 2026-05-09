import { createClient } from '@/lib/supabase/client';
import { inngest } from '@/lib/inngest/client';
import {
  NotificationPreferences,
  NotificationPreferencesInput,
  InAppNotification,
  NotificationWithContext,
  IdeaAlert,
  ActionAlert,
  CreateAlertInput,
  NotificationChannel,
} from '@/types/notification.types';

/**
 * Get user's notification preferences
 * Creates default preferences if none exist
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences | null> {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Try to get existing preferences
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found
      console.error('Error fetching notification preferences:', error);
      return null;
    }

    if (data) {
      return data as NotificationPreferences;
    }

    // Create default preferences
    const { data: newPrefs, error: insertError } = await supabase
      .from('notification_preferences')
      .insert({ user_id: user.id })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating notification preferences:', insertError);
      return null;
    }

    return newPrefs as NotificationPreferences;
  } catch (err) {
    console.error('Error in getNotificationPreferences:', err);
    return null;
  }
}

/**
 * Update user's notification preferences
 */
export async function updateNotificationPreferences(
  input: NotificationPreferencesInput
): Promise<NotificationPreferences | null> {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('notification_preferences')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating notification preferences:', error);
      return null;
    }

    return data as NotificationPreferences;
  } catch (err) {
    console.error('Error in updateNotificationPreferences:', err);
    return null;
  }
}

/**
 * Get user's in-app notifications
 */
export async function getInAppNotifications(
  limit = 20,
  includeRead = false
): Promise<InAppNotification[]> {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
      .from('in_app_notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('dismissed', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!includeRead) {
      query = query.eq('read', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return data as InAppNotification[];
  } catch (err) {
    console.error('Error in getInAppNotifications:', err);
    return [];
  }
}

/**
 * Get notifications with related idea/action context
 */
export async function getNotificationsWithContext(
  limit = 20
): Promise<NotificationWithContext[]> {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('in_app_notifications')
      .select(`
        *,
        ideas:idea_id(title),
        actions:action_id(text)
      `)
      .eq('user_id', user.id)
      .eq('dismissed', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notifications with context:', error);
      return [];
    }

    return data.map((n: any) => ({
      ...n,
      idea_title: n.ideas?.title,
      action_text: n.actions?.text,
      ideas: undefined,
      actions: undefined,
    })) as NotificationWithContext[];
  } catch (err) {
    console.error('Error in getNotificationsWithContext:', err);
    return [];
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('in_app_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)
      .eq('dismissed', false);

    if (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error('Error in getUnreadNotificationCount:', err);
    return 0;
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('in_app_notifications')
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in markNotificationAsRead:', err);
    return false;
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<boolean> {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('in_app_notifications')
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in markAllNotificationsAsRead:', err);
    return false;
  }
}

/**
 * Dismiss a notification
 */
export async function dismissNotification(notificationId: string): Promise<boolean> {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('in_app_notifications')
      .update({
        dismissed: true,
        dismissed_at: new Date().toISOString(),
      })
      .eq('id', notificationId);

    if (error) {
      console.error('Error dismissing notification:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in dismissNotification:', err);
    return false;
  }
}

/**
 * Create an alert for an action
 */
export async function createActionAlert(
  actionId: string,
  input: CreateAlertInput
): Promise<ActionAlert | null> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('action_alerts')
      .insert({
        action_id: actionId,
        alert_type: input.alert_type,
        channel: input.channel,
        reminder_minutes: input.reminder_minutes || 15,
        next_run_at: input.next_run_at,
        cron_expression: input.cron_expression,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating action alert:', error);
      return null;
    }

    return data as ActionAlert;
  } catch (err) {
    console.error('Error in createActionAlert:', err);
    return null;
  }
}

/**
 * Create an alert for an idea
 */
export async function createIdeaAlert(
  ideaId: string,
  input: CreateAlertInput
): Promise<IdeaAlert | null> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('idea_alerts')
      .insert({
        idea_id: ideaId,
        alert_type: input.alert_type,
        channel: input.channel,
        reminder_minutes: input.reminder_minutes || 15,
        next_run_at: input.next_run_at,
        cron_expression: input.cron_expression,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating idea alert:', error);
      return null;
    }

    return data as IdeaAlert;
  } catch (err) {
    console.error('Error in createIdeaAlert:', err);
    return null;
  }
}

/**
 * Delete alerts for an action
 */
export async function deleteActionAlerts(actionId: string): Promise<boolean> {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('action_alerts')
      .delete()
      .eq('action_id', actionId);

    if (error) {
      console.error('Error deleting action alerts:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in deleteActionAlerts:', err);
    return false;
  }
}

/**
 * Delete alerts for an idea
 */
export async function deleteIdeaAlerts(ideaId: string): Promise<boolean> {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('idea_alerts')
      .delete()
      .eq('idea_id', ideaId);

    if (error) {
      console.error('Error deleting idea alerts:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in deleteIdeaAlerts:', err);
    return false;
  }
}

/**
 * Get alerts for an action
 */
export async function getActionAlerts(actionId: string): Promise<ActionAlert[]> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('action_alerts')
      .select('*')
      .eq('action_id', actionId)
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching action alerts:', error);
      return [];
    }

    return data as ActionAlert[];
  } catch (err) {
    console.error('Error in getActionAlerts:', err);
    return [];
  }
}

/**
 * Sync action alerts when due_time changes
 * Creates/updates/deletes alerts based on enabled channels
 * Schedules Inngest jobs for each alert
 */
export async function syncActionAlerts(
  actionId: string,
  dueTime: string | undefined,
  channels: NotificationChannel[],
  reminderMinutes: number = 15
): Promise<void> {
  const supabase = createClient();

  try {
    // Get action details for notification payload
    const { data: action } = await supabase
      .from('actions')
      .select('*, ideas:idea_id(id, title)')
      .eq('id', actionId)
      .single();

    if (!action) {
      console.error('Action not found:', actionId);
      return;
    }

    // Get user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    // Delete existing alerts for this action
    await deleteActionAlerts(actionId);

    // If no due time or no channels, nothing to create
    if (!dueTime || channels.length === 0) return;

    // Calculate alert time
    const dueDate = new Date(dueTime);
    const alertTime = new Date(dueDate.getTime() - reminderMinutes * 60 * 1000);

    // Don't create alerts for past times
    if (alertTime <= new Date()) return;

    // Create alerts for each enabled channel
    for (const channel of channels) {
      // Create alert record in database (for tracking)
      const alert = await createActionAlert(actionId, {
        alert_type: 'one-time',
        channel,
        reminder_minutes: reminderMinutes,
        next_run_at: alertTime.toISOString(),
      });

      if (!alert) {
        console.error('Failed to create alert for channel:', channel);
        continue;
      }

      // Schedule Inngest job for exact alert time
      await inngest.send({
        name: 'notification/send',
        data: {
          alertId: alert.id,
          alertType: 'action' as const,
          channel,
          userId: user.id,
          title: `Action Reminder: ${(action.ideas as any)?.title || 'Task'}`,
          body: action.text,
          link: `/ideas/${action.idea_id}`,
          ideaId: action.idea_id,
          actionId: actionId,
        },
        // Schedule for exact time (timestamp in milliseconds)
        ts: alertTime.getTime(),
      });
    }
  } catch (err) {
    console.error('Error in syncActionAlerts:', err);
  }
}

/**
 * Get user's enabled notification channels
 */
export async function getEnabledChannels(): Promise<NotificationChannel[]> {
  const prefs = await getNotificationPreferences();
  if (!prefs) return ['in_app']; // Default to in-app only

  const channels: NotificationChannel[] = [];
  if (prefs.in_app_enabled) channels.push('in_app');
  if (prefs.whatsapp_enabled && prefs.phone_number) channels.push('whatsapp');
  if (prefs.sms_enabled && prefs.phone_number) channels.push('sms');
  if (prefs.push_enabled) channels.push('push');

  return channels.length > 0 ? channels : ['in_app'];
}
