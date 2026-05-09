export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      action_alerts: {
        Row: {
          action_id: string
          alert_type: string
          channel: string
          cron_expression: string | null
          error_message: string | null
          id: string
          next_run_at: string | null
          reminder_minutes: number | null
          sent_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          action_id: string
          alert_type: string
          channel: string
          cron_expression?: string | null
          error_message?: string | null
          id?: string
          next_run_at?: string | null
          reminder_minutes?: number | null
          sent_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          action_id?: string
          alert_type?: string
          channel?: string
          cron_expression?: string | null
          error_message?: string | null
          id?: string
          next_run_at?: string | null
          reminder_minutes?: number | null
          sent_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_alerts_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "actions"
            referencedColumns: ["id"]
          },
        ]
      }
      action_attachments: {
        Row: {
          action_id: string
          created_at: string | null
          resource_id: string
        }
        Insert: {
          action_id: string
          created_at?: string | null
          resource_id: string
        }
        Update: {
          action_id?: string
          created_at?: string | null
          resource_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_attachments_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_attachments_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      action_updates: {
        Row: {
          action_id: string
          created_at: string | null
          id: string
          text: string
        }
        Insert: {
          action_id: string
          created_at?: string | null
          id?: string
          text: string
        }
        Update: {
          action_id?: string
          created_at?: string | null
          id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_updates_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "actions"
            referencedColumns: ["id"]
          },
        ]
      }
      actions: {
        Row: {
          created_at: string | null
          due_time: string | null
          id: string
          idea_id: string
          status: string | null
          text: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          due_time?: string | null
          id?: string
          idea_id: string
          status?: string | null
          text: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          due_time?: string | null
          id?: string
          idea_id?: string
          status?: string | null
          text?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actions_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          archived: boolean | null
          archived_at: string | null
          color: string
          created_at: string | null
          gradient: string | null
          icon: string | null
          id: string
          name: string
          template_id: string | null
          user_id: string
        }
        Insert: {
          archived?: boolean | null
          archived_at?: string | null
          color?: string
          created_at?: string | null
          gradient?: string | null
          icon?: string | null
          id?: string
          name: string
          template_id?: string | null
          user_id: string
        }
        Update: {
          archived?: boolean | null
          archived_at?: string | null
          color?: string
          created_at?: string | null
          gradient?: string | null
          icon?: string | null
          id?: string
          name?: string
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_stock_prices: {
        Row: {
          change_pct: number | null
          close_price: number | null
          historical_prices: Json | null
          last_synced_at: string | null
          ticker: string
        }
        Insert: {
          change_pct?: number | null
          close_price?: number | null
          historical_prices?: Json | null
          last_synced_at?: string | null
          ticker: string
        }
        Update: {
          change_pct?: number | null
          close_price?: number | null
          historical_prices?: Json | null
          last_synced_at?: string | null
          ticker?: string
        }
        Relationships: []
      }
      idea_alerts: {
        Row: {
          alert_type: string
          channel: string
          cron_expression: string | null
          error_message: string | null
          id: string
          idea_id: string
          next_run_at: string | null
          reminder_minutes: number | null
          sent_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          alert_type: string
          channel: string
          cron_expression?: string | null
          error_message?: string | null
          id?: string
          idea_id: string
          next_run_at?: string | null
          reminder_minutes?: number | null
          sent_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          alert_type?: string
          channel?: string
          cron_expression?: string | null
          error_message?: string | null
          id?: string
          idea_id?: string
          next_run_at?: string | null
          reminder_minutes?: number | null
          sent_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "idea_alerts_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_attachments: {
        Row: {
          created_at: string | null
          idea_id: string
          resource_id: string
        }
        Insert: {
          created_at?: string | null
          idea_id: string
          resource_id: string
        }
        Update: {
          created_at?: string | null
          idea_id?: string
          resource_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_attachments_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idea_attachments_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      ideas: {
        Row: {
          archived: boolean | null
          archived_at: string | null
          category_id: string | null
          content_json: Json | null
          created_at: string | null
          due_date: string | null
          id: string
          parent_id: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived?: boolean | null
          archived_at?: string | null
          category_id?: string | null
          content_json?: Json | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          parent_id?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archived?: boolean | null
          archived_at?: string | null
          category_id?: string | null
          content_json?: Json | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          parent_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideas_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ideas_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      in_app_notifications: {
        Row: {
          action_id: string | null
          body: string | null
          created_at: string | null
          dismissed: boolean | null
          dismissed_at: string | null
          id: string
          idea_id: string | null
          link: string | null
          read: boolean | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_id?: string | null
          body?: string | null
          created_at?: string | null
          dismissed?: boolean | null
          dismissed_at?: string | null
          id?: string
          idea_id?: string | null
          link?: string | null
          read?: boolean | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_id?: string | null
          body?: string | null
          created_at?: string | null
          dismissed?: boolean | null
          dismissed_at?: string | null
          id?: string
          idea_id?: string | null
          link?: string | null
          read?: boolean | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "in_app_notifications_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "in_app_notifications_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          default_reminder_minutes: number | null
          id: string
          in_app_enabled: boolean | null
          phone_number: string | null
          phone_verified: boolean | null
          push_enabled: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sms_enabled: boolean | null
          timezone: string | null
          updated_at: string | null
          user_id: string
          whatsapp_enabled: boolean | null
        }
        Insert: {
          created_at?: string | null
          default_reminder_minutes?: number | null
          id?: string
          in_app_enabled?: boolean | null
          phone_number?: string | null
          phone_verified?: boolean | null
          push_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
          whatsapp_enabled?: boolean | null
        }
        Update: {
          created_at?: string | null
          default_reminder_minutes?: number | null
          id?: string
          in_app_enabled?: boolean | null
          phone_number?: string | null
          phone_verified?: boolean | null
          push_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
          whatsapp_enabled?: boolean | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string | null
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh_key: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string | null
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh_key: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh_key?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          created_at: string | null
          file_name: string | null
          file_size: number | null
          id: string
          metadata: Json | null
          mime_type: string | null
          storage_path: string | null
          type: string | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          storage_path?: string | null
          type?: string | null
          url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          storage_path?: string | null
          type?: string | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      templates: {
        Row: {
          created_at: string | null
          form_structure: Json
          id: string
          is_system: boolean | null
          name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          form_structure: Json
          id?: string
          is_system?: boolean | null
          name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          form_structure?: Json
          id?: string
          is_system?: boolean | null
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
