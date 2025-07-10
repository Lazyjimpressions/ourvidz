export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_development_progress: {
        Row: {
          actual_hours: number | null
          assigned_to: string | null
          blockers: string | null
          completion_date: string | null
          created_at: string | null
          estimated_hours: number | null
          feature_category: string
          feature_name: string
          id: string
          notes: string | null
          priority: string
          start_date: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          actual_hours?: number | null
          assigned_to?: string | null
          blockers?: string | null
          completion_date?: string | null
          created_at?: string | null
          estimated_hours?: number | null
          feature_category: string
          feature_name: string
          id?: string
          notes?: string | null
          priority: string
          start_date?: string | null
          status: string
          updated_at?: string | null
        }
        Update: {
          actual_hours?: number | null
          assigned_to?: string | null
          blockers?: string | null
          completion_date?: string | null
          created_at?: string | null
          estimated_hours?: number | null
          feature_category?: string
          feature_name?: string
          id?: string
          notes?: string | null
          priority?: string
          start_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      characters: {
        Row: {
          appearance_tags: string[] | null
          created_at: string | null
          description: string
          id: string
          image_url: string | null
          name: string
          traits: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          appearance_tags?: string[] | null
          created_at?: string | null
          description: string
          id?: string
          image_url?: string | null
          name: string
          traits?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          appearance_tags?: string[] | null
          created_at?: string | null
          description?: string
          id?: string
          image_url?: string | null
          name?: string
          traits?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "characters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      images: {
        Row: {
          created_at: string
          enhanced_prompt: string | null
          format: string | null
          generation_mode: string
          id: string
          image_url: string | null
          image_urls: Json | null
          metadata: Json | null
          project_id: string | null
          prompt: string
          quality: string | null
          signed_url: string | null
          signed_url_expires_at: string | null
          status: string
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enhanced_prompt?: string | null
          format?: string | null
          generation_mode?: string
          id?: string
          image_url?: string | null
          image_urls?: Json | null
          metadata?: Json | null
          project_id?: string | null
          prompt: string
          quality?: string | null
          signed_url?: string | null
          signed_url_expires_at?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enhanced_prompt?: string | null
          format?: string | null
          generation_mode?: string
          id?: string
          image_url?: string | null
          image_urls?: Json | null
          metadata?: Json | null
          project_id?: string | null
          prompt?: string
          quality?: string | null
          signed_url?: string | null
          signed_url_expires_at?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "images_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          attempts: number | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          format: string | null
          id: string
          image_id: string | null
          job_type: string
          max_attempts: number | null
          metadata: Json | null
          model_type: string | null
          project_id: string | null
          quality: string | null
          started_at: string | null
          status: string | null
          user_id: string
          video_id: string | null
        }
        Insert: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          format?: string | null
          id?: string
          image_id?: string | null
          job_type: string
          max_attempts?: number | null
          metadata?: Json | null
          model_type?: string | null
          project_id?: string | null
          quality?: string | null
          started_at?: string | null
          status?: string | null
          user_id: string
          video_id?: string | null
        }
        Update: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          format?: string | null
          id?: string
          image_id?: string | null
          job_type?: string
          max_attempts?: number | null
          metadata?: Json | null
          model_type?: string | null
          project_id?: string | null
          quality?: string | null
          started_at?: string | null
          status?: string | null
          user_id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      model_config_history: {
        Row: {
          config_data: Json
          config_name: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          model_type: string
          notes: string | null
        }
        Insert: {
          config_data: Json
          config_name: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          model_type: string
          notes?: string | null
        }
        Update: {
          config_data?: Json
          config_name?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          model_type?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "model_config_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      model_performance_logs: {
        Row: {
          avg_generation_time_ms: number | null
          avg_quality_rating: number | null
          created_at: string | null
          date: string
          failed_generations: number | null
          id: string
          model_type: string
          successful_generations: number | null
          total_generations: number | null
          total_processing_time_ms: number | null
          updated_at: string | null
        }
        Insert: {
          avg_generation_time_ms?: number | null
          avg_quality_rating?: number | null
          created_at?: string | null
          date: string
          failed_generations?: number | null
          id?: string
          model_type: string
          successful_generations?: number | null
          total_generations?: number | null
          total_processing_time_ms?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_generation_time_ms?: number | null
          avg_quality_rating?: number | null
          created_at?: string | null
          date?: string
          failed_generations?: number | null
          id?: string
          model_type?: string
          successful_generations?: number | null
          total_generations?: number | null
          total_processing_time_ms?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age_verified: boolean | null
          created_at: string | null
          id: string
          subscription_status: string | null
          token_balance: number | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          age_verified?: boolean | null
          created_at?: string | null
          id: string
          subscription_status?: string | null
          token_balance?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          age_verified?: boolean | null
          created_at?: string | null
          id?: string
          subscription_status?: string | null
          token_balance?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          character_id: string | null
          created_at: string | null
          duration: number | null
          enhanced_prompt: string | null
          id: string
          media_type: string
          original_prompt: string
          preview_url: string | null
          reference_image_url: string | null
          scene_count: number | null
          title: string | null
          updated_at: string | null
          user_id: string
          workflow_step: string | null
        }
        Insert: {
          character_id?: string | null
          created_at?: string | null
          duration?: number | null
          enhanced_prompt?: string | null
          id?: string
          media_type: string
          original_prompt: string
          preview_url?: string | null
          reference_image_url?: string | null
          scene_count?: number | null
          title?: string | null
          updated_at?: string | null
          user_id: string
          workflow_step?: string | null
        }
        Update: {
          character_id?: string | null
          created_at?: string | null
          duration?: number | null
          enhanced_prompt?: string | null
          id?: string
          media_type?: string
          original_prompt?: string
          preview_url?: string | null
          reference_image_url?: string | null
          scene_count?: number | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
          workflow_step?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_test_results: {
        Row: {
          created_at: string | null
          error_message: string | null
          generation_time_ms: number | null
          id: string
          model_type: string
          notes: string | null
          prompt_category: string | null
          prompt_text: string
          quality_rating: number | null
          success: boolean
          tested_by: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          generation_time_ms?: number | null
          id?: string
          model_type: string
          notes?: string | null
          prompt_category?: string | null
          prompt_text: string
          quality_rating?: number | null
          success: boolean
          tested_by?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          generation_time_ms?: number | null
          id?: string
          model_type?: string
          notes?: string | null
          prompt_category?: string | null
          prompt_text?: string
          quality_rating?: number | null
          success?: boolean
          tested_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_test_results_tested_by_fkey"
            columns: ["tested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scenes: {
        Row: {
          approved: boolean | null
          created_at: string | null
          description: string
          enhanced_prompt: string | null
          final_stitched_url: string | null
          id: string
          image_url: string | null
          project_id: string
          scene_number: number
          updated_at: string | null
        }
        Insert: {
          approved?: boolean | null
          created_at?: string | null
          description: string
          enhanced_prompt?: string | null
          final_stitched_url?: string | null
          id?: string
          image_url?: string | null
          project_id: string
          scene_number: number
          updated_at?: string | null
        }
        Update: {
          approved?: boolean | null
          created_at?: string | null
          description?: string
          enhanced_prompt?: string | null
          final_stitched_url?: string | null
          id?: string
          image_url?: string | null
          project_id?: string
          scene_number?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scenes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_logs: {
        Row: {
          action: string
          created_at: string | null
          credits_consumed: number | null
          format: string | null
          id: string
          metadata: Json | null
          quality: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          credits_consumed?: number | null
          format?: string | null
          id?: string
          metadata?: Json | null
          quality?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          credits_consumed?: number | null
          format?: string | null
          id?: string
          metadata?: Json | null
          quality?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          completed_at: string | null
          created_at: string | null
          duration: number | null
          error_message: string | null
          expires_at: string | null
          format: string | null
          id: string
          metadata: Json | null
          preview_url: string | null
          project_id: string | null
          reference_image_url: string | null
          resolution: string | null
          signed_url: string | null
          signed_url_expires_at: string | null
          status: string | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string | null
          user_id: string
          video_url: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          duration?: number | null
          error_message?: string | null
          expires_at?: string | null
          format?: string | null
          id?: string
          metadata?: Json | null
          preview_url?: string | null
          project_id?: string | null
          reference_image_url?: string | null
          resolution?: string | null
          signed_url?: string | null
          signed_url_expires_at?: string | null
          status?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
          video_url?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          duration?: number | null
          error_message?: string | null
          expires_at?: string | null
          format?: string | null
          id?: string
          metadata?: Json | null
          preview_url?: string | null
          project_id?: string | null
          reference_image_url?: string | null
          resolution?: string | null
          signed_url?: string | null
          signed_url_expires_at?: string | null
          status?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role_priority: {
        Args: { _user_id: string }
        Returns: number
      }
      get_video_path_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_videos: number
          videos_with_user_prefix: number
          videos_without_prefix: number
          system_asset_thumbnails: number
        }[]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      is_url_expired: {
        Args: { expires_at: string }
        Returns: boolean
      }
      validate_video_path_consistency: {
        Args: Record<PropertyKey, never>
        Returns: {
          video_id: string
          current_path: string
          expected_path: string
          path_matches: boolean
          requires_fix: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "premium_user" | "basic_user" | "guest"
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
    Enums: {
      app_role: ["admin", "moderator", "premium_user", "basic_user", "guest"],
    },
  },
} as const
