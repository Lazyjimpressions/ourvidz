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
      api_models: {
        Row: {
          avg_generation_time: number | null
          capabilities: Json
          cost_per_use: number | null
          created_at: string
          created_by: string | null
          default_for_tasks: string[]
          display_name: string
          endpoint_path: string | null
          id: string
          input_defaults: Json
          is_active: boolean
          is_default: boolean
          modality: string
          model_family: string | null
          model_key: string
          output_format: string | null
          pricing: Json
          priority: number
          provider_id: string
          tasks: string[]
          updated_at: string
          version: string | null
        }
        Insert: {
          avg_generation_time?: number | null
          capabilities?: Json
          cost_per_use?: number | null
          created_at?: string
          created_by?: string | null
          default_for_tasks?: string[]
          display_name: string
          endpoint_path?: string | null
          id?: string
          input_defaults?: Json
          is_active?: boolean
          is_default?: boolean
          modality: string
          model_family?: string | null
          model_key: string
          output_format?: string | null
          pricing?: Json
          priority?: number
          provider_id: string
          tasks?: string[]
          updated_at?: string
          version?: string | null
        }
        Update: {
          avg_generation_time?: number | null
          capabilities?: Json
          cost_per_use?: number | null
          created_at?: string
          created_by?: string | null
          default_for_tasks?: string[]
          display_name?: string
          endpoint_path?: string | null
          id?: string
          input_defaults?: Json
          is_active?: boolean
          is_default?: boolean
          modality?: string
          model_family?: string | null
          model_key?: string
          output_format?: string | null
          pricing?: Json
          priority?: number
          provider_id?: string
          tasks?: string[]
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_models_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_models_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "api_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      api_provider_balances: {
        Row: {
          balance_credits: number | null
          balance_metadata: Json | null
          balance_usd: number | null
          currency: string | null
          id: string
          last_synced_at: string | null
          provider_id: string
          sync_error: string | null
          sync_method: string | null
          sync_status: string | null
          updated_at: string
        }
        Insert: {
          balance_credits?: number | null
          balance_metadata?: Json | null
          balance_usd?: number | null
          currency?: string | null
          id?: string
          last_synced_at?: string | null
          provider_id: string
          sync_error?: string | null
          sync_method?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Update: {
          balance_credits?: number | null
          balance_metadata?: Json | null
          balance_usd?: number | null
          currency?: string | null
          id?: string
          last_synced_at?: string | null
          provider_id?: string
          sync_error?: string | null
          sync_method?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_provider_balances_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "api_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      api_providers: {
        Row: {
          auth_header_name: string | null
          auth_scheme: string
          base_url: string | null
          created_at: string
          display_name: string
          docs_url: string | null
          id: string
          is_active: boolean
          name: string
          rate_limits: Json
          secret_name: string | null
          updated_at: string
        }
        Insert: {
          auth_header_name?: string | null
          auth_scheme?: string
          base_url?: string | null
          created_at?: string
          display_name: string
          docs_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          rate_limits?: Json
          secret_name?: string | null
          updated_at?: string
        }
        Update: {
          auth_header_name?: string | null
          auth_scheme?: string
          base_url?: string | null
          created_at?: string
          display_name?: string
          docs_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          rate_limits?: Json
          secret_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      api_usage_aggregates: {
        Row: {
          avg_response_time_ms: number | null
          cost_credits_total: number | null
          cost_usd_total: number | null
          date_bucket: string
          error_count: number
          hour_bucket: number | null
          id: string
          model_id: string | null
          p95_response_time_ms: number | null
          p99_response_time_ms: number | null
          provider_id: string
          request_count: number
          success_count: number
          tokens_cached_total: number | null
          tokens_input_total: number | null
          tokens_output_total: number | null
        }
        Insert: {
          avg_response_time_ms?: number | null
          cost_credits_total?: number | null
          cost_usd_total?: number | null
          date_bucket: string
          error_count?: number
          hour_bucket?: number | null
          id?: string
          model_id?: string | null
          p95_response_time_ms?: number | null
          p99_response_time_ms?: number | null
          provider_id: string
          request_count?: number
          success_count?: number
          tokens_cached_total?: number | null
          tokens_input_total?: number | null
          tokens_output_total?: number | null
        }
        Update: {
          avg_response_time_ms?: number | null
          cost_credits_total?: number | null
          cost_usd_total?: number | null
          date_bucket?: string
          error_count?: number
          hour_bucket?: number | null
          id?: string
          model_id?: string | null
          p95_response_time_ms?: number | null
          p99_response_time_ms?: number | null
          provider_id?: string
          request_count?: number
          success_count?: number
          tokens_cached_total?: number | null
          tokens_input_total?: number | null
          tokens_output_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_aggregates_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "api_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_usage_aggregates_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "api_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage_logs: {
        Row: {
          cost_credits: number | null
          cost_usd: number | null
          created_at: string
          endpoint_path: string | null
          error_message: string | null
          id: string
          model_id: string | null
          provider_id: string
          provider_metadata: Json | null
          request_payload: Json | null
          request_type: string
          response_payload: Json | null
          response_status: number | null
          response_time_ms: number
          tokens_cached: number | null
          tokens_input: number | null
          tokens_output: number | null
          tokens_total: number | null
          user_id: string | null
        }
        Insert: {
          cost_credits?: number | null
          cost_usd?: number | null
          created_at?: string
          endpoint_path?: string | null
          error_message?: string | null
          id?: string
          model_id?: string | null
          provider_id: string
          provider_metadata?: Json | null
          request_payload?: Json | null
          request_type: string
          response_payload?: Json | null
          response_status?: number | null
          response_time_ms: number
          tokens_cached?: number | null
          tokens_input?: number | null
          tokens_output?: number | null
          tokens_total?: number | null
          user_id?: string | null
        }
        Update: {
          cost_credits?: number | null
          cost_usd?: number | null
          created_at?: string
          endpoint_path?: string | null
          error_message?: string | null
          id?: string
          model_id?: string | null
          provider_id?: string
          provider_metadata?: Json | null
          request_payload?: Json | null
          request_type?: string
          response_payload?: Json | null
          response_status?: number | null
          response_time_ms?: number
          tokens_cached?: number | null
          tokens_input?: number | null
          tokens_output?: number | null
          tokens_total?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_logs_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "api_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_usage_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "api_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      character_anchors: {
        Row: {
          anchor_type: string | null
          character_id: string
          created_at: string
          id: string
          image_url: string
          is_primary: boolean
          updated_at: string
        }
        Insert: {
          anchor_type?: string | null
          character_id: string
          created_at?: string
          id?: string
          image_url: string
          is_primary?: boolean
          updated_at?: string
        }
        Update: {
          anchor_type?: string | null
          character_id?: string
          created_at?: string
          id?: string
          image_url?: string
          is_primary?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_anchors_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      character_canon: {
        Row: {
          character_id: string
          created_at: string
          id: string
          is_pinned: boolean
          is_primary: boolean | null
          label: string | null
          metadata: Json | null
          output_type: string
          output_url: string
          tags: string[] | null
        }
        Insert: {
          character_id: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          is_primary?: boolean | null
          label?: string | null
          metadata?: Json | null
          output_type: string
          output_url: string
          tags?: string[] | null
        }
        Update: {
          character_id?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          is_primary?: boolean | null
          label?: string | null
          metadata?: Json | null
          output_type?: string
          output_url?: string
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "character_canon_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      character_portraits: {
        Row: {
          character_id: string
          created_at: string | null
          enhanced_prompt: string | null
          generation_metadata: Json | null
          id: string
          image_url: string
          is_primary: boolean | null
          prompt: string | null
          sort_order: number | null
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          character_id: string
          created_at?: string | null
          enhanced_prompt?: string | null
          generation_metadata?: Json | null
          id?: string
          image_url: string
          is_primary?: boolean | null
          prompt?: string | null
          sort_order?: number | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          character_id?: string
          created_at?: string | null
          enhanced_prompt?: string | null
          generation_metadata?: Json | null
          id?: string
          image_url?: string
          is_primary?: boolean | null
          prompt?: string | null
          sort_order?: number | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "character_portraits_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      character_role_audit: {
        Row: {
          character_id: string
          created_at: string | null
          id: string
          new_role: string | null
          old_role: string | null
          reason: string | null
        }
        Insert: {
          character_id: string
          created_at?: string | null
          id?: string
          new_role?: string | null
          old_role?: string | null
          reason?: string | null
        }
        Update: {
          character_id?: string
          created_at?: string | null
          id?: string
          new_role?: string | null
          old_role?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "character_role_audit_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      character_scenes: {
        Row: {
          character_id: string | null
          conversation_id: string | null
          created_at: string | null
          generation_metadata: Json | null
          generation_mode: string | null
          id: string
          image_url: string | null
          job_id: string | null
          previous_scene_id: string | null
          previous_scene_image_url: string | null
          priority: number | null
          scene_description: string | null
          scene_name: string | null
          scene_prompt: string
          scene_rules: string | null
          scene_starters: string[] | null
          scene_type: string | null
          system_prompt: string | null
          updated_at: string | null
        }
        Insert: {
          character_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          generation_metadata?: Json | null
          generation_mode?: string | null
          id?: string
          image_url?: string | null
          job_id?: string | null
          previous_scene_id?: string | null
          previous_scene_image_url?: string | null
          priority?: number | null
          scene_description?: string | null
          scene_name?: string | null
          scene_prompt: string
          scene_rules?: string | null
          scene_starters?: string[] | null
          scene_type?: string | null
          system_prompt?: string | null
          updated_at?: string | null
        }
        Update: {
          character_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          generation_metadata?: Json | null
          generation_mode?: string | null
          id?: string
          image_url?: string | null
          job_id?: string | null
          previous_scene_id?: string | null
          previous_scene_image_url?: string | null
          priority?: number | null
          scene_description?: string | null
          scene_name?: string | null
          scene_prompt?: string
          scene_rules?: string | null
          scene_starters?: string[] | null
          scene_type?: string | null
          system_prompt?: string | null
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
          {
            foreignKeyName: "character_scenes_previous_scene_id_fkey"
            columns: ["previous_scene_id"]
            isOneToOne: false
            referencedRelation: "character_scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      character_templates: {
        Row: {
          category: string | null
          created_at: string | null
          default_data: Json
          description: string | null
          icon_emoji: string | null
          id: string
          is_active: boolean | null
          name: string
          priority: number | null
          template_key: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          default_data: Json
          description?: string | null
          icon_emoji?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: number | null
          template_key: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          default_data?: Json
          description?: string | null
          icon_emoji?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: number | null
          template_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      characters: {
        Row: {
          alternate_greetings: Json | null
          appearance_tags: string[] | null
          avoid_traits: string[] | null
          backstory: string | null
          base_prompt: string | null
          bio: string | null
          canon_spec: string | null
          clothing_tags: string[] | null
          consistency_method: string | null
          content_rating: string
          created_at: string | null
          creator_id: string | null
          default_presets: Json | null
          description: string
          first_message: string | null
          forbidden_phrases: string[] | null
          gender: string | null
          id: string
          image_url: string | null
          interaction_count: number | null
          is_public: boolean | null
          lighting: string | null
          likes_count: number | null
          locked_traits: string[] | null
          media_defaults: Json | null
          mood: string | null
          name: string
          outfit_defaults: string | null
          persona: string | null
          personality_traits: Json | null
          physical_traits: Json | null
          portrait_count: number | null
          preview_image_url: string | null
          quick_start: boolean | null
          reference_image_url: string | null
          rendering_rules: Json | null
          role: string | null
          scene_behavior_rules: Json | null
          scene_count: number | null
          seed_locked: number | null
          signature_items: string | null
          style_preset: string | null
          system_prompt: string | null
          tagline: string | null
          traits: string | null
          updated_at: string | null
          user_id: string | null
          voice_examples: string[] | null
          voice_tone: string | null
        }
        Insert: {
          alternate_greetings?: Json | null
          appearance_tags?: string[] | null
          avoid_traits?: string[] | null
          backstory?: string | null
          base_prompt?: string | null
          bio?: string | null
          canon_spec?: string | null
          clothing_tags?: string[] | null
          consistency_method?: string | null
          content_rating?: string
          created_at?: string | null
          creator_id?: string | null
          default_presets?: Json | null
          description: string
          first_message?: string | null
          forbidden_phrases?: string[] | null
          gender?: string | null
          id?: string
          image_url?: string | null
          interaction_count?: number | null
          is_public?: boolean | null
          lighting?: string | null
          likes_count?: number | null
          locked_traits?: string[] | null
          media_defaults?: Json | null
          mood?: string | null
          name: string
          outfit_defaults?: string | null
          persona?: string | null
          personality_traits?: Json | null
          physical_traits?: Json | null
          portrait_count?: number | null
          preview_image_url?: string | null
          quick_start?: boolean | null
          reference_image_url?: string | null
          rendering_rules?: Json | null
          role?: string | null
          scene_behavior_rules?: Json | null
          scene_count?: number | null
          seed_locked?: number | null
          signature_items?: string | null
          style_preset?: string | null
          system_prompt?: string | null
          tagline?: string | null
          traits?: string | null
          updated_at?: string | null
          user_id?: string | null
          voice_examples?: string[] | null
          voice_tone?: string | null
        }
        Update: {
          alternate_greetings?: Json | null
          appearance_tags?: string[] | null
          avoid_traits?: string[] | null
          backstory?: string | null
          base_prompt?: string | null
          bio?: string | null
          canon_spec?: string | null
          clothing_tags?: string[] | null
          consistency_method?: string | null
          content_rating?: string
          created_at?: string | null
          creator_id?: string | null
          default_presets?: Json | null
          description?: string
          first_message?: string | null
          forbidden_phrases?: string[] | null
          gender?: string | null
          id?: string
          image_url?: string | null
          interaction_count?: number | null
          is_public?: boolean | null
          lighting?: string | null
          likes_count?: number | null
          locked_traits?: string[] | null
          media_defaults?: Json | null
          mood?: string | null
          name?: string
          outfit_defaults?: string | null
          persona?: string | null
          personality_traits?: Json | null
          physical_traits?: Json | null
          portrait_count?: number | null
          preview_image_url?: string | null
          quick_start?: boolean | null
          reference_image_url?: string | null
          rendering_rules?: Json | null
          role?: string | null
          scene_behavior_rules?: Json | null
          scene_count?: number | null
          seed_locked?: number | null
          signature_items?: string | null
          style_preset?: string | null
          system_prompt?: string | null
          tagline?: string | null
          traits?: string | null
          updated_at?: string | null
          user_id?: string | null
          voice_examples?: string[] | null
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
          current_location: string | null
          id: string
          last_scene_image: string | null
          memory_data: Json | null
          memory_tier: string | null
          project_id: string | null
          status: string
          title: string
          updated_at: string
          user_character_id: string | null
          user_id: string
        }
        Insert: {
          character_id?: string | null
          conversation_type?: string
          created_at?: string
          current_location?: string | null
          id?: string
          last_scene_image?: string | null
          memory_data?: Json | null
          memory_tier?: string | null
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_character_id?: string | null
          user_id: string
        }
        Update: {
          character_id?: string | null
          conversation_type?: string
          created_at?: string
          current_location?: string | null
          id?: string
          last_scene_image?: string | null
          memory_data?: Json | null
          memory_tier?: string | null
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_character_id?: string | null
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
          {
            foreignKeyName: "conversations_user_character_id_fkey"
            columns: ["user_character_id"]
            isOneToOne: false
            referencedRelation: "characters"
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
      jobs: {
        Row: {
          api_model_id: string | null
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
          api_model_id?: string | null
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
          api_model_id?: string | null
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
            foreignKeyName: "jobs_api_model_id_fkey"
            columns: ["api_model_id"]
            isOneToOne: false
            referencedRelation: "api_models"
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
            foreignKeyName: "model_test_results_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
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
          generation_mode: string | null
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
          generation_mode?: string | null
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
          generation_mode?: string | null
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
          age_verification_date: string | null
          age_verified: boolean | null
          birth_date: string | null
          created_at: string | null
          default_user_character_id: string | null
          id: string
          subscription_status: string | null
          token_balance: number | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          age_verification_date?: string | null
          age_verified?: boolean | null
          birth_date?: string | null
          created_at?: string | null
          default_user_character_id?: string | null
          id: string
          subscription_status?: string | null
          token_balance?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          age_verification_date?: string | null
          age_verified?: boolean | null
          birth_date?: string | null
          created_at?: string | null
          default_user_character_id?: string | null
          id?: string
          subscription_status?: string | null
          token_balance?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_user_character_id_fkey"
            columns: ["default_user_character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
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
          provider: string | null
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
          provider?: string | null
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
          provider?: string | null
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
          atmosphere: Json | null
          character_clothing_overrides: Json | null
          content_rating: string | null
          created_at: string | null
          creator_id: string | null
          default_clothing: string | null
          description: string
          id: string
          is_public: boolean | null
          max_characters: number | null
          max_words: number | null
          min_characters: number | null
          name: string
          narrative_style: string | null
          perspective_hint: string | null
          preview_image_url: string | null
          scenario_type: string | null
          scene_focus: string | null
          scene_prompt: string | null
          scene_starters: string[] | null
          setting: string | null
          suggested_user_role: string | null
          tags: string[] | null
          time_of_day: string | null
          updated_at: string | null
          usage_count: number | null
          visual_priority: string[] | null
        }
        Insert: {
          atmosphere?: Json | null
          character_clothing_overrides?: Json | null
          content_rating?: string | null
          created_at?: string | null
          creator_id?: string | null
          default_clothing?: string | null
          description: string
          id?: string
          is_public?: boolean | null
          max_characters?: number | null
          max_words?: number | null
          min_characters?: number | null
          name: string
          narrative_style?: string | null
          perspective_hint?: string | null
          preview_image_url?: string | null
          scenario_type?: string | null
          scene_focus?: string | null
          scene_prompt?: string | null
          scene_starters?: string[] | null
          setting?: string | null
          suggested_user_role?: string | null
          tags?: string[] | null
          time_of_day?: string | null
          updated_at?: string | null
          usage_count?: number | null
          visual_priority?: string[] | null
        }
        Update: {
          atmosphere?: Json | null
          character_clothing_overrides?: Json | null
          content_rating?: string | null
          created_at?: string | null
          creator_id?: string | null
          default_clothing?: string | null
          description?: string
          id?: string
          is_public?: boolean | null
          max_characters?: number | null
          max_words?: number | null
          min_characters?: number | null
          name?: string
          narrative_style?: string | null
          perspective_hint?: string | null
          preview_image_url?: string | null
          scenario_type?: string | null
          scene_focus?: string | null
          scene_prompt?: string | null
          scene_starters?: string[] | null
          setting?: string | null
          suggested_user_role?: string | null
          tags?: string[] | null
          time_of_day?: string | null
          updated_at?: string | null
          usage_count?: number | null
          visual_priority?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "scenes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      storyboard_clips: {
        Row: {
          api_model_id: string | null
          clip_order: number
          created_at: string | null
          duration_seconds: number | null
          extracted_frame_url: string | null
          extraction_percentage: number | null
          extraction_timestamp_ms: number | null
          generation_metadata: Json | null
          id: string
          job_id: string | null
          model_used: string | null
          prompt: string
          reference_image_source: string | null
          reference_image_url: string | null
          scene_id: string
          status: string | null
          thumbnail_url: string | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          api_model_id?: string | null
          clip_order?: number
          created_at?: string | null
          duration_seconds?: number | null
          extracted_frame_url?: string | null
          extraction_percentage?: number | null
          extraction_timestamp_ms?: number | null
          generation_metadata?: Json | null
          id?: string
          job_id?: string | null
          model_used?: string | null
          prompt: string
          reference_image_source?: string | null
          reference_image_url?: string | null
          scene_id: string
          status?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          api_model_id?: string | null
          clip_order?: number
          created_at?: string | null
          duration_seconds?: number | null
          extracted_frame_url?: string | null
          extraction_percentage?: number | null
          extraction_timestamp_ms?: number | null
          generation_metadata?: Json | null
          id?: string
          job_id?: string | null
          model_used?: string | null
          prompt?: string
          reference_image_source?: string | null
          reference_image_url?: string | null
          scene_id?: string
          status?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storyboard_clips_api_model_id_fkey"
            columns: ["api_model_id"]
            isOneToOne: false
            referencedRelation: "api_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storyboard_clips_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storyboard_clips_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "storyboard_scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      storyboard_frames: {
        Row: {
          clip_id: string
          created_at: string | null
          extraction_method: string | null
          frame_url: string
          id: string
          is_chain_frame: boolean | null
          metadata: Json | null
          quality_score: number | null
          thumbnail_url: string | null
          timestamp_ms: number
          used_in_clip_id: string | null
        }
        Insert: {
          clip_id: string
          created_at?: string | null
          extraction_method?: string | null
          frame_url: string
          id?: string
          is_chain_frame?: boolean | null
          metadata?: Json | null
          quality_score?: number | null
          thumbnail_url?: string | null
          timestamp_ms: number
          used_in_clip_id?: string | null
        }
        Update: {
          clip_id?: string
          created_at?: string | null
          extraction_method?: string | null
          frame_url?: string
          id?: string
          is_chain_frame?: boolean | null
          metadata?: Json | null
          quality_score?: number | null
          thumbnail_url?: string | null
          timestamp_ms?: number
          used_in_clip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storyboard_frames_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: false
            referencedRelation: "storyboard_clips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storyboard_frames_used_in_clip_id_fkey"
            columns: ["used_in_clip_id"]
            isOneToOne: false
            referencedRelation: "storyboard_clips"
            referencedColumns: ["id"]
          },
        ]
      }
      storyboard_projects: {
        Row: {
          ai_assistance_level: string | null
          aspect_ratio: string | null
          content_tier: string | null
          created_at: string | null
          description: string | null
          final_video_duration_seconds: number | null
          final_video_url: string | null
          id: string
          metadata: Json | null
          primary_character_id: string | null
          quality_preset: string | null
          secondary_characters: Json | null
          source_conversation_id: string | null
          status: string | null
          story_beats: Json | null
          story_summary: string | null
          target_duration_seconds: number | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_assistance_level?: string | null
          aspect_ratio?: string | null
          content_tier?: string | null
          created_at?: string | null
          description?: string | null
          final_video_duration_seconds?: number | null
          final_video_url?: string | null
          id?: string
          metadata?: Json | null
          primary_character_id?: string | null
          quality_preset?: string | null
          secondary_characters?: Json | null
          source_conversation_id?: string | null
          status?: string | null
          story_beats?: Json | null
          story_summary?: string | null
          target_duration_seconds?: number | null
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_assistance_level?: string | null
          aspect_ratio?: string | null
          content_tier?: string | null
          created_at?: string | null
          description?: string | null
          final_video_duration_seconds?: number | null
          final_video_url?: string | null
          id?: string
          metadata?: Json | null
          primary_character_id?: string | null
          quality_preset?: string | null
          secondary_characters?: Json | null
          source_conversation_id?: string | null
          status?: string | null
          story_beats?: Json | null
          story_summary?: string | null
          target_duration_seconds?: number | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storyboard_projects_primary_character_id_fkey"
            columns: ["primary_character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storyboard_projects_source_conversation_id_fkey"
            columns: ["source_conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storyboard_projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      storyboard_renders: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          file_size_bytes: number | null
          id: string
          include_transitions: boolean | null
          output_duration_seconds: number | null
          output_url: string | null
          progress_percentage: number | null
          project_id: string
          render_quality: string | null
          started_at: string | null
          status: string | null
          transition_style: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          file_size_bytes?: number | null
          id?: string
          include_transitions?: boolean | null
          output_duration_seconds?: number | null
          output_url?: string | null
          progress_percentage?: number | null
          project_id: string
          render_quality?: string | null
          started_at?: string | null
          status?: string | null
          transition_style?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          file_size_bytes?: number | null
          id?: string
          include_transitions?: boolean | null
          output_duration_seconds?: number | null
          output_url?: string | null
          progress_percentage?: number | null
          project_id?: string
          render_quality?: string | null
          started_at?: string | null
          status?: string | null
          transition_style?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storyboard_renders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "storyboard_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      storyboard_scenes: {
        Row: {
          actual_duration_seconds: number | null
          characters: Json | null
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          mood: string | null
          narrative_context: string | null
          project_id: string
          scene_order: number
          setting: string | null
          status: string | null
          suggested_prompts: Json | null
          target_duration_seconds: number | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          actual_duration_seconds?: number | null
          characters?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          mood?: string | null
          narrative_context?: string | null
          project_id: string
          scene_order: number
          setting?: string | null
          status?: string | null
          suggested_prompts?: Json | null
          target_duration_seconds?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_duration_seconds?: number | null
          characters?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          mood?: string | null
          narrative_context?: string | null
          project_id?: string
          scene_order?: number
          setting?: string | null
          status?: string | null
          suggested_prompts?: Json | null
          target_duration_seconds?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storyboard_scenes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "storyboard_projects"
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
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
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
      user_collections: {
        Row: {
          asset_count: number | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          asset_count?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          asset_count?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_library: {
        Row: {
          asset_type: string
          collection_id: string | null
          content_category: string | null
          created_at: string | null
          custom_title: string | null
          duration_seconds: number | null
          file_size_bytes: number
          generation_seed: number | null
          height: number | null
          id: string
          is_favorite: boolean | null
          mime_type: string
          model_used: string
          original_prompt: string
          roleplay_metadata: Json | null
          storage_path: string
          tags: string[] | null
          thumbnail_path: string | null
          updated_at: string | null
          user_id: string
          visibility: string | null
          width: number | null
        }
        Insert: {
          asset_type: string
          collection_id?: string | null
          content_category?: string | null
          created_at?: string | null
          custom_title?: string | null
          duration_seconds?: number | null
          file_size_bytes: number
          generation_seed?: number | null
          height?: number | null
          id?: string
          is_favorite?: boolean | null
          mime_type: string
          model_used: string
          original_prompt: string
          roleplay_metadata?: Json | null
          storage_path: string
          tags?: string[] | null
          thumbnail_path?: string | null
          updated_at?: string | null
          user_id: string
          visibility?: string | null
          width?: number | null
        }
        Update: {
          asset_type?: string
          collection_id?: string | null
          content_category?: string | null
          created_at?: string | null
          custom_title?: string | null
          duration_seconds?: number | null
          file_size_bytes?: number
          generation_seed?: number | null
          height?: number | null
          id?: string
          is_favorite?: boolean | null
          mime_type?: string
          model_used?: string
          original_prompt?: string
          roleplay_metadata?: Json | null
          storage_path?: string
          tags?: string[] | null
          thumbnail_path?: string | null
          updated_at?: string | null
          user_id?: string
          visibility?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_library_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "user_collections"
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
      workspace_assets: {
        Row: {
          asset_index: number
          asset_type: string
          created_at: string | null
          duration_seconds: number | null
          expires_at: string | null
          file_size_bytes: number
          generation_seed: number
          generation_settings: Json | null
          height: number | null
          id: string
          job_id: string
          mime_type: string
          model_used: string
          original_prompt: string
          temp_storage_path: string
          thumbnail_path: string | null
          user_id: string
          width: number | null
        }
        Insert: {
          asset_index?: number
          asset_type: string
          created_at?: string | null
          duration_seconds?: number | null
          expires_at?: string | null
          file_size_bytes: number
          generation_seed: number
          generation_settings?: Json | null
          height?: number | null
          id?: string
          job_id: string
          mime_type: string
          model_used: string
          original_prompt: string
          temp_storage_path: string
          thumbnail_path?: string | null
          user_id: string
          width?: number | null
        }
        Update: {
          asset_index?: number
          asset_type?: string
          created_at?: string | null
          duration_seconds?: number | null
          expires_at?: string | null
          file_size_bytes?: number
          generation_seed?: number
          generation_settings?: Json | null
          height?: number | null
          id?: string
          job_id?: string
          mime_type?: string
          model_used?: string
          original_prompt?: string
          temp_storage_path?: string
          thumbnail_path?: string | null
          user_id?: string
          width?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      backfill_usage_aggregates: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: number
      }
      check_valid_tasks: { Args: { arr: string[] }; Returns: boolean }
      clean_orphaned_jobs: { Args: never; Returns: number }
      cleanup_expired_workspace_assets: { Args: never; Returns: number }
      cleanup_old_profile_audit_logs: { Args: never; Returns: number }
      create_workspace_session: {
        Args: { p_session_name?: string; p_user_id: string }
        Returns: string
      }
      get_safe_profile_view: { Args: { profile_id: string }; Returns: Json }
      get_system_stats: { Args: { p_days?: number }; Returns: Json }
      get_user_role_priority: { Args: { _user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_url_expired: { Args: { expires_at: string }; Returns: boolean }
      log_user_activity: {
        Args: {
          p_action: string
          p_ip_address?: unknown
          p_metadata?: Json
          p_resource_id?: string
          p_resource_type?: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      upsert_usage_aggregate: {
        Args: {
          p_cost_credits: number
          p_cost_usd: number
          p_date_bucket: string
          p_error_count: number
          p_hour_bucket: number
          p_model_id: string
          p_provider_id: string
          p_request_count: number
          p_response_time_ms: number
          p_success_count: number
          p_tokens_cached: number
          p_tokens_input: number
          p_tokens_output: number
        }
        Returns: undefined
      }
      verify_user_age: { Args: { user_birth_date: string }; Returns: boolean }
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
