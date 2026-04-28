// Notification types (stub for build compatibility)

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferencesInput {
  email_enabled?: boolean;
  sms_enabled?: boolean;
  push_enabled?: boolean;
  whatsapp_enabled?: boolean;
  in_app_enabled?: boolean;
  phone_number?: string | null;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  default_reminder_minutes?: number;
}
