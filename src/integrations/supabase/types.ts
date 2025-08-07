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
      character_scenes: {
        Row: {
          character_id: string | null
          conversation_id: string | null
          created_at: string | null
          generation_metadata: Json | null
          id: string
          image_url: string
          job_id: string | null
          scene_prompt: string
          updated_at: string | null
        }
        Insert: {
          character_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          generation_metadata?: Json | null
          id?: string
          image_url: string
          job_id?: string | null
          scene_prompt: string
          updated_at?: string | null
        }
        Update: {
          character_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          generation_metadata?: Json | null
          id?: string
          image_url?: string
          job_id?: string | null
          scene_prompt?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "character_scenes_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_scenes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_scenes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          appearance_tags: string[] | null
          created_at: string | null
          creator_id: string | null
          description: string
          id: string
          image_url: string | null
          interaction_count: number | null
          is_public: boolean | null
          likes_count: number | null
          mood: string | null
          name: string
          persona: string | null
          reference_image_url: string | null
          system_prompt: string | null
          traits: string | null
          updated_at: string | null
          user_id: string | null
          voice_tone: string | null
        }
        Insert: {
          appearance_tags?: string[] | null
          created_at?: string | null
          creator_id?: string | null
          description: string
          id?: string
          image_url?: string | null
          interaction_count?: number | null
          is_public?: boolean | null
          likes_count?: number | null
          mood?: string | null
          name: string
          persona?: string | null
          reference_image_url?: string | null
          system_prompt?: string | null
          traits?: string | null
          updated_at?: string | null
          user_id?: string | null
          voice_tone?: string | null
        }
        Update: {
          appearance_tags?: string[] | null
          created_at?: string | null
          creator_id?: string | null
          description?: string
          id?: string
          image_url?: string | null
          interaction_count?: number | null
          is_public?: boolean | null
          likes_count?: number | null
          mood?: string | null
          name?: string
          persona?: string | null
          reference_image_url?: string | null
          system_prompt?: string | null
          traits?: string | null
          updated_at?: string | null
          user_id?: string | null
          voice_tone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "characters_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "characters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      compel_configs: {
        Row: {
          avg_consistency: number | null
          avg_quality: number | null
          config_hash: string
          config_name: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          total_tests: number | null
          weights: Json
        }
        Insert: {
          avg_consistency?: number | null
          avg_quality?: number | null
          config_hash: string
          config_name: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          total_tests?: number | null
          weights: Json
        }
        Update: {
          avg_consistency?: number | null
          avg_quality?: number | null
          config_hash?: string
          config_name?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          total_tests?: number | null
          weights?: Json
        }
        Relationships: []
      }
      conversations: {
        Row: {
          character_id: string | null
          conversation_type: string
          created_at: string
          id: string
          project_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          character_id?: string | null
          conversation_type?: string
          created_at?: string
          id?: string
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          character_id?: string | null
          conversation_type?: string
          created_at?: string
          id?: string
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      enhancement_presets: {
        Row: {
          auto_enhancement: boolean
          avg_quality_with_preset: number | null
          compel_weights: Json | null
          created_at: string | null
          created_by: string | null
          enable_compel: boolean
          enable_qwen: boolean
          id: string
          is_recommended: boolean | null
          preset_description: string | null
          preset_name: string
          qwen_settings: Json | null
          usage_count: number | null
        }
        Insert: {
          auto_enhancement: boolean
          avg_quality_with_preset?: number | null
          compel_weights?: Json | null
          created_at?: string | null
          created_by?: string | null
          enable_compel: boolean
          enable_qwen: boolean
          id?: string
          is_recommended?: boolean | null
          preset_description?: string | null
          preset_name: string
          qwen_settings?: Json | null
          usage_count?: number | null
        }
        Update: {
          auto_enhancement?: boolean
          avg_quality_with_preset?: number | null
          compel_weights?: Json | null
          created_at?: string | null
          created_by?: string | null
          enable_compel?: boolean
          enable_qwen?: boolean
          id?: string
          is_recommended?: boolean | null
          preset_description?: string | null
          preset_name?: string
          qwen_settings?: Json | null
          usage_count?: number | null
        }
        Relationships: []
      }
      images: {
        Row: {
          compel_weights: Json | null
          created_at: string
          enhanced_prompt: string | null
          enhancement_strategy: string | null
          enhancement_time_ms: number | null
          file_size: number | null
          format: string | null
          generation_mode: string
          id: string
          image_index: number | null
          image_url: string | null
          image_urls: Json | null
          job_id: string | null
          metadata: Json | null
          moderation_status: string | null
          nsfw_score: number | null
          original_prompt: string | null
          project_id: string | null
          prompt: string
          prompt_test_id: string | null
          quality: string | null
          quality_improvement: number | null
          quality_rating: number | null
          qwen_expansion_percentage: number | null
          reference_image_url: string | null
          reference_strength: number | null
          reference_type: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          seed: number | null
          signed_url: string | null
          signed_url_expires_at: string | null
          status: string
          test_metadata: Json | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          compel_weights?: Json | null
          created_at?: string
          enhanced_prompt?: string | null
          enhancement_strategy?: string | null
          enhancement_time_ms?: number | null
          file_size?: number | null
          format?: string | null
          generation_mode?: string
          id?: string
          image_index?: number | null
          image_url?: string | null
          image_urls?: Json | null
          job_id?: string | null
          metadata?: Json | null
          moderation_status?: string | null
          nsfw_score?: number | null
          original_prompt?: string | null
          project_id?: string | null
          prompt: string
          prompt_test_id?: string | null
          quality?: string | null
          quality_improvement?: number | null
          quality_rating?: number | null
          qwen_expansion_percentage?: number | null
          reference_image_url?: string | null
          reference_strength?: number | null
          reference_type?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          seed?: number | null
          signed_url?: string | null
          signed_url_expires_at?: string | null
          status?: string
          test_metadata?: Json | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          compel_weights?: Json | null
          created_at?: string
          enhanced_prompt?: string | null
          enhancement_strategy?: string | null
          enhancement_time_ms?: number | null
          file_size?: number | null
          format?: string | null
          generation_mode?: string
          id?: string
          image_index?: number | null
          image_url?: string | null
          image_urls?: Json | null
          job_id?: string | null
          metadata?: Json | null
          moderation_status?: string | null
          nsfw_score?: number | null
          original_prompt?: string | null
          project_id?: string | null
          prompt?: string
          prompt_test_id?: string | null
          quality?: string | null
          quality_improvement?: number | null
          quality_rating?: number | null
          qwen_expansion_percentage?: number | null
          reference_image_url?: string | null
          reference_strength?: number | null
          reference_type?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          seed?: number | null
          signed_url?: string | null
          signed_url_expires_at?: string | null
          status?: string
          test_metadata?: Json | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "images_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "images_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "images_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          attempts: number | null
          compel_weights: Json | null
          completed_at: string | null
          created_at: string | null
          destination: string | null
          enhanced_prompt: string | null
          enhancement_strategy: string | null
          enhancement_time_ms: number | null
          error_message: string | null
          format: string | null
          id: string
          image_id: string | null
          job_type: string
          max_attempts: number | null
          metadata: Json | null
          model_type: string | null
          moderation_status: string | null
          original_prompt: string | null
          project_id: string | null
          prompt_test_id: string | null
          quality: string | null
          quality_improvement: number | null
          quality_rating: number | null
          qwen_expansion_percentage: number | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          started_at: string | null
          status: string | null
          template_name: string | null
          test_metadata: Json | null
          user_id: string
          video_id: string | null
          workspace_session_id: string | null
        }
        Insert: {
          attempts?: number | null
          compel_weights?: Json | null
          completed_at?: string | null
          created_at?: string | null
          destination?: string | null
          enhanced_prompt?: string | null
          enhancement_strategy?: string | null
          enhancement_time_ms?: number | null
          error_message?: string | null
          format?: string | null
          id?: string
          image_id?: string | null
          job_type: string
          max_attempts?: number | null
          metadata?: Json | null
          model_type?: string | null
          moderation_status?: string | null
          original_prompt?: string | null
          project_id?: string | null
          prompt_test_id?: string | null
          quality?: string | null
          quality_improvement?: number | null
          quality_rating?: number | null
          qwen_expansion_percentage?: number | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          started_at?: string | null
          status?: string | null
          template_name?: string | null
          test_metadata?: Json | null
          user_id: string
          video_id?: string | null
          workspace_session_id?: string | null
        }
        Update: {
          attempts?: number | null
          compel_weights?: Json | null
          completed_at?: string | null
          created_at?: string | null
          destination?: string | null
          enhanced_prompt?: string | null
          enhancement_strategy?: string | null
          enhancement_time_ms?: number | null
          error_message?: string | null
          format?: string | null
          id?: string
          image_id?: string | null
          job_type?: string
          max_attempts?: number | null
          metadata?: Json | null
          model_type?: string | null
          moderation_status?: string | null
          original_prompt?: string | null
          project_id?: string | null
          prompt_test_id?: string | null
          quality?: string | null
          quality_improvement?: number | null
          quality_rating?: number | null
          qwen_expansion_percentage?: number | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          started_at?: string | null
          status?: string | null
          template_name?: string | null
          test_metadata?: Json | null
          user_id?: string
          video_id?: string | null
          workspace_session_id?: string | null
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
            foreignKeyName: "jobs_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          {
            foreignKeyName: "jobs_workspace_session_id_fkey"
            columns: ["workspace_session_id"]
            isOneToOne: false
            referencedRelation: "workspace_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          message_type: string
          sender: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          message_type?: string
          sender: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          message_type?: string
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
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
      model_test_results: {
        Row: {
          baseline_quality: number | null
          compel_weights: Json | null
          consistency: number | null
          content_quality: number | null
          created_at: string | null
          enhanced_prompt: string | null
          enhancement_strategy: string | null
          enhancement_time_ms: number | null
          file_size_bytes: number | null
          generation_time_ms: number | null
          id: string
          image_id: string | null
          job_id: string | null
          model_type: string
          model_version: string | null
          notes: string | null
          original_prompt: string | null
          overall_quality: number | null
          prompt_text: string
          quality_improvement: number | null
          qwen_expansion_percentage: number | null
          success: boolean
          technical_quality: number | null
          test_category: string | null
          test_metadata: Json
          test_series: string
          test_tier: string
          updated_at: string | null
          user_id: string | null
          video_id: string | null
        }
        Insert: {
          baseline_quality?: number | null
          compel_weights?: Json | null
          consistency?: number | null
          content_quality?: number | null
          created_at?: string | null
          enhanced_prompt?: string | null
          enhancement_strategy?: string | null
          enhancement_time_ms?: number | null
          file_size_bytes?: number | null
          generation_time_ms?: number | null
          id?: string
          image_id?: string | null
          job_id?: string | null
          model_type: string
          model_version?: string | null
          notes?: string | null
          original_prompt?: string | null
          overall_quality?: number | null
          prompt_text: string
          quality_improvement?: number | null
          qwen_expansion_percentage?: number | null
          success?: boolean
          technical_quality?: number | null
          test_category?: string | null
          test_metadata?: Json
          test_series: string
          test_tier: string
          updated_at?: string | null
          user_id?: string | null
          video_id?: string | null
        }
        Update: {
          baseline_quality?: number | null
          compel_weights?: Json | null
          consistency?: number | null
          content_quality?: number | null
          created_at?: string | null
          enhanced_prompt?: string | null
          enhancement_strategy?: string | null
          enhancement_time_ms?: number | null
          file_size_bytes?: number | null
          generation_time_ms?: number | null
          id?: string
          image_id?: string | null
          job_id?: string | null
          model_type?: string
          model_version?: string | null
          notes?: string | null
          original_prompt?: string | null
          overall_quality?: number | null
          prompt_text?: string
          quality_improvement?: number | null
          qwen_expansion_percentage?: number | null
          success?: boolean
          technical_quality?: number | null
          test_category?: string | null
          test_metadata?: Json
          test_series?: string
          test_tier?: string
          updated_at?: string | null
          user_id?: string | null
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "model_test_results_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_test_results_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_test_results_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      negative_prompts: {
        Row: {
          content_mode: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          model_type: string
          negative_prompt: string
          priority: number | null
          updated_at: string | null
        }
        Insert: {
          content_mode?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          model_type?: string
          negative_prompt: string
          priority?: number | null
          updated_at?: string | null
        }
        Update: {
          content_mode?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          model_type?: string
          negative_prompt?: string
          priority?: number | null
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
      prompt_ab_tests: {
        Row: {
          baseline_avg_quality: number | null
          baseline_config: Json
          completed_at: string | null
          confidence_level: number | null
          created_at: string | null
          enhanced_avg_quality: number | null
          enhanced_config: Json
          id: string
          is_complete: boolean | null
          quality_improvement: number | null
          test_name: string
          test_series: string
          total_participants: number | null
        }
        Insert: {
          baseline_avg_quality?: number | null
          baseline_config: Json
          completed_at?: string | null
          confidence_level?: number | null
          created_at?: string | null
          enhanced_avg_quality?: number | null
          enhanced_config: Json
          id?: string
          is_complete?: boolean | null
          quality_improvement?: number | null
          test_name: string
          test_series: string
          total_participants?: number | null
        }
        Update: {
          baseline_avg_quality?: number | null
          baseline_config?: Json
          completed_at?: string | null
          confidence_level?: number | null
          created_at?: string | null
          enhanced_avg_quality?: number | null
          enhanced_config?: Json
          id?: string
          is_complete?: boolean | null
          quality_improvement?: number | null
          test_name?: string
          test_series?: string
          total_participants?: number | null
        }
        Relationships: []
      }
      prompt_templates: {
        Row: {
          comment: string | null
          content_mode: string
          created_at: string | null
          created_by: string | null
          description: string | null
          enhancer_model: string
          id: string
          is_active: boolean | null
          job_type: string | null
          metadata: Json | null
          system_prompt: string
          target_model: string | null
          template_name: string
          token_limit: number | null
          updated_at: string | null
          use_case: string
          version: number | null
        }
        Insert: {
          comment?: string | null
          content_mode?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          enhancer_model: string
          id?: string
          is_active?: boolean | null
          job_type?: string | null
          metadata?: Json | null
          system_prompt: string
          target_model?: string | null
          template_name: string
          token_limit?: number | null
          updated_at?: string | null
          use_case: string
          version?: number | null
        }
        Update: {
          comment?: string | null
          content_mode?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          enhancer_model?: string
          id?: string
          is_active?: boolean | null
          job_type?: string | null
          metadata?: Json | null
          system_prompt?: string
          target_model?: string | null
          template_name?: string
          token_limit?: number | null
          updated_at?: string | null
          use_case?: string
          version?: number | null
        }
        Relationships: []
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
      system_config: {
        Row: {
          config: Json
          created_at: string | null
          id: number
          updated_at: string | null
        }
        Insert: {
          config?: Json
          created_at?: string | null
          id?: number
          updated_at?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          id?: number
          updated_at?: string | null
        }
        Relationships: []
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
      user_activity_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_log_user_id_fkey"
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
          compel_weights: Json | null
          completed_at: string | null
          created_at: string | null
          duration: number | null
          enhanced_prompt: string | null
          enhancement_strategy: string | null
          enhancement_time_ms: number | null
          error_message: string | null
          expires_at: string | null
          format: string | null
          id: string
          metadata: Json | null
          original_prompt: string | null
          preview_url: string | null
          project_id: string | null
          quality_improvement: number | null
          quality_rating: number | null
          qwen_expansion_percentage: number | null
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
          compel_weights?: Json | null
          completed_at?: string | null
          created_at?: string | null
          duration?: number | null
          enhanced_prompt?: string | null
          enhancement_strategy?: string | null
          enhancement_time_ms?: number | null
          error_message?: string | null
          expires_at?: string | null
          format?: string | null
          id?: string
          metadata?: Json | null
          original_prompt?: string | null
          preview_url?: string | null
          project_id?: string | null
          quality_improvement?: number | null
          quality_rating?: number | null
          qwen_expansion_percentage?: number | null
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
          compel_weights?: Json | null
          completed_at?: string | null
          created_at?: string | null
          duration?: number | null
          enhanced_prompt?: string | null
          enhancement_strategy?: string | null
          enhancement_time_ms?: number | null
          error_message?: string | null
          expires_at?: string | null
          format?: string | null
          id?: string
          metadata?: Json | null
          original_prompt?: string | null
          preview_url?: string | null
          project_id?: string | null
          quality_improvement?: number | null
          quality_rating?: number | null
          qwen_expansion_percentage?: number | null
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
      workspace_items: {
        Row: {
          bucket_name: string | null
          content_type: string
          created_at: string | null
          enhanced_prompt: string | null
          generation_params: Json | null
          id: string
          job_id: string | null
          metadata: Json | null
          model_type: string | null
          prompt: string
          quality: string | null
          reference_image_url: string | null
          reference_strength: number | null
          seed: number | null
          session_id: string
          status: string | null
          storage_path: string | null
          thumbnail_url: string | null
          updated_at: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          bucket_name?: string | null
          content_type: string
          created_at?: string | null
          enhanced_prompt?: string | null
          generation_params?: Json | null
          id?: string
          job_id?: string | null
          metadata?: Json | null
          model_type?: string | null
          prompt: string
          quality?: string | null
          reference_image_url?: string | null
          reference_strength?: number | null
          seed?: number | null
          session_id: string
          status?: string | null
          storage_path?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          bucket_name?: string | null
          content_type?: string
          created_at?: string | null
          enhanced_prompt?: string | null
          generation_params?: Json | null
          id?: string
          job_id?: string | null
          metadata?: Json | null
          model_type?: string | null
          prompt?: string
          quality?: string | null
          reference_image_url?: string | null
          reference_strength?: number | null
          seed?: number | null
          session_id?: string
          status?: string | null
          storage_path?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workspace_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_sessions: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          session_name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          session_name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          session_name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_sessions_user_id_fkey"
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
      clean_orphaned_jobs: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      clear_workspace_session: {
        Args: { p_session_id: string; p_user_id: string }
        Returns: boolean
      }
      create_workspace_session: {
        Args: { p_user_id: string; p_session_name?: string }
        Returns: string
      }
      get_system_stats: {
        Args: { p_days?: number }
        Returns: Json
      }
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
      link_workspace_items_to_jobs: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      log_user_activity: {
        Args: {
          p_user_id: string
          p_action: string
          p_resource_type?: string
          p_resource_id?: string
          p_metadata?: Json
          p_ip_address?: unknown
          p_user_agent?: string
        }
        Returns: string
      }
      save_workspace_item_to_library: {
        Args: { p_workspace_item_id: string; p_user_id: string }
        Returns: string
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
