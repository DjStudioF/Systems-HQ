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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      goals: {
        Row: {
          created_at: string
          deadline: string | null
          id: string
          lifecycle: Database["public"]["Enums"]["goal_lifecycle"]
          mode: Database["public"]["Enums"]["goal_mode"]
          name: string
          outcome_notes: string
          sort_order: number
          start_date: string
          updated_at: string
          user_id: string
          why: string
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          id?: string
          lifecycle?: Database["public"]["Enums"]["goal_lifecycle"]
          mode?: Database["public"]["Enums"]["goal_mode"]
          name: string
          outcome_notes?: string
          sort_order?: number
          start_date: string
          updated_at?: string
          user_id?: string
          why?: string
        }
        Update: {
          created_at?: string
          deadline?: string | null
          id?: string
          lifecycle?: Database["public"]["Enums"]["goal_lifecycle"]
          mode?: Database["public"]["Enums"]["goal_mode"]
          name?: string
          outcome_notes?: string
          sort_order?: number
          start_date?: string
          updated_at?: string
          user_id?: string
          why?: string
        }
        Relationships: []
      }
      logs: {
        Row: {
          created_at: string
          id: string
          log_date: string
          module_id: string
          revision: number
          status: Database["public"]["Enums"]["log_status"]
          timezone_at_entry: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          log_date: string
          module_id: string
          revision?: number
          status: Database["public"]["Enums"]["log_status"]
          timezone_at_entry: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          log_date?: string
          module_id?: string
          revision?: number
          status?: Database["public"]["Enums"]["log_status"]
          timezone_at_entry?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "logs_module_owner_fk"
            columns: ["module_id", "user_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      modules: {
        Row: {
          action: string
          archived_at: string | null
          created_at: string
          days: number[]
          goal_id: string
          id: string
          minimum: string
          name: string
          sort_order: number
          trigger: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action: string
          archived_at?: string | null
          created_at?: string
          days?: number[]
          goal_id: string
          id?: string
          minimum: string
          name: string
          sort_order?: number
          trigger?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          action?: string
          archived_at?: string | null
          created_at?: string
          days?: number[]
          goal_id?: string
          id?: string
          minimum?: string
          name?: string
          sort_order?: number
          trigger?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_goal_owner_fk"
            columns: ["goal_id", "user_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          consistency_threshold: number
          created_at: string
          display_name: string | null
          id: string
          motto: string
          theme: Database["public"]["Enums"]["theme_pref"]
          timezone: string
          timezone_confirmed: boolean
          updated_at: string
        }
        Insert: {
          consistency_threshold?: number
          created_at?: string
          display_name?: string | null
          id: string
          motto?: string
          theme?: Database["public"]["Enums"]["theme_pref"]
          timezone?: string
          timezone_confirmed?: boolean
          updated_at?: string
        }
        Update: {
          consistency_threshold?: number
          created_at?: string
          display_name?: string | null
          id?: string
          motto?: string
          theme?: Database["public"]["Enums"]["theme_pref"]
          timezone?: string
          timezone_confirmed?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      weekly_reviews: {
        Row: {
          created_at: string
          id: string
          keep_tweak_drop: string
          metrics_snapshot: Json | null
          next_week_focus: string
          skipped_and_why: string
          snapshot_captured_at: string | null
          snapshot_timezone: string | null
          state: Database["public"]["Enums"]["review_state"]
          submitted_at: string | null
          updated_at: string
          user_id: string
          week_start: string
          wins: string
        }
        Insert: {
          created_at?: string
          id?: string
          keep_tweak_drop?: string
          metrics_snapshot?: Json | null
          next_week_focus?: string
          skipped_and_why?: string
          snapshot_captured_at?: string | null
          snapshot_timezone?: string | null
          state?: Database["public"]["Enums"]["review_state"]
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          week_start: string
          wins?: string
        }
        Update: {
          created_at?: string
          id?: string
          keep_tweak_drop?: string
          metrics_snapshot?: Json | null
          next_week_focus?: string
          skipped_and_why?: string
          snapshot_captured_at?: string | null
          snapshot_timezone?: string | null
          state?: Database["public"]["Enums"]["review_state"]
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          week_start?: string
          wins?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_valid_timezone: { Args: { tz: string }; Returns: boolean }
      valid_days: { Args: { d: number[] }; Returns: boolean }
    }
    Enums: {
      goal_lifecycle: "active" | "completed" | "archived"
      goal_mode: "focus" | "maintain"
      log_status: "done" | "minimum" | "skipped"
      review_state: "draft" | "submitted"
      theme_pref: "system" | "light" | "dark"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      goal_lifecycle: ["active", "completed", "archived"],
      goal_mode: ["focus", "maintain"],
      log_status: ["done", "minimum", "skipped"],
      review_state: ["draft", "submitted"],
      theme_pref: ["system", "light", "dark"],
    },
  },
} as const
