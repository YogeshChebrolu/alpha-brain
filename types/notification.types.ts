/**
 * Notification System Types
 */

// Notification channels
export type NotificationChannel = 'whatsapp' | 'sms' | 'push' | 'in_app';

// Alert types
export type AlertType = 'one-time' | 'recurrent';

// Alert status
export type AlertStatus = 'active' | 'paused' | 'completed' | 'failed';

// Notification type (what triggered it)
export type NotificationType = 'idea_reminder' | 'action_reminder' | 'system';

/**
 * User's notification preferences
 */
export interface NotificationPreferences {
  id: string;
  user_id: string;
  phone_number: string | null;
  phone_verified: boolean;

  // Channel toggles
  whatsapp_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;

  // Quiet hours
  quiet_hours_enabled: boolean;
  quiet_hours_start: string; // HH:MM format
  quiet_hours_end: string; // HH:MM format
  timezone: string;

  // Default reminder
  default_reminder_minutes: number;

  created_at: string;
  updated_at: string;
}

/**
 * Input type for updating notification preferences
 */
export interface NotificationPreferencesInput {
  phone_number?: string | null;
  whatsapp_enabled?: boolean;
  sms_enabled?: boolean;
  push_enabled?: boolean;
  in_app_enabled?: boolean;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  timezone?: string;
  default_reminder_minutes?: number;
}

/**
 * Web Push subscription data
 */
export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_agent: string | null;
  created_at: string;
  last_used_at: string;
}

/**
 * In-app notification
 */
export interface InAppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  idea_id: string | null;
  action_id: string | null;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  read_at: string | null;
  dismissed: boolean;
  dismissed_at: string | null;
  created_at: string;
}

/**
 * Idea alert record
 */
export interface IdeaAlert {
  id: string;
  idea_id: string;
  user_id: string | null;
  alert_type: AlertType;
  channel: NotificationChannel;
  cron_expression: string | null;
  next_run_at: string | null;
  status: AlertStatus;
  sent_at: string | null;
  error_message: string | null;
  reminder_minutes: number;
}

/**
 * Action alert record
 */
export interface ActionAlert {
  id: string;
  action_id: string;
  user_id: string | null;
  alert_type: AlertType;
  channel: NotificationChannel;
  cron_expression: string | null;
  next_run_at: string | null;
  status: AlertStatus;
  sent_at: string | null;
  error_message: string | null;
  reminder_minutes: number;
}

/**
 * Input for creating an alert
 */
export interface CreateAlertInput {
  alert_type: AlertType;
  channel: NotificationChannel;
  reminder_minutes?: number;
  next_run_at?: string;
  cron_expression?: string;
}

/**
 * Notification with related data for display
 */
export interface NotificationWithContext extends InAppNotification {
  idea_title?: string;
  action_text?: string;
}
