create extension if not exists "pgjwt" with schema "extensions";

drop extension if exists "pg_net";

create type "public"."app_role" as enum ('admin', 'moderator', 'premium_user', 'basic_user', 'guest');


  create table "public"."admin_development_progress" (
    "id" uuid not null default gen_random_uuid(),
    "feature_name" character varying(100) not null,
    "feature_category" character varying(50) not null,
    "status" character varying(20) not null,
    "priority" character varying(10) not null,
    "assigned_to" character varying(100),
    "estimated_hours" integer,
    "actual_hours" integer,
    "start_date" date,
    "completion_date" date,
    "notes" text,
    "blockers" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."admin_development_progress" enable row level security;


  create table "public"."api_models" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "created_by" uuid,
    "provider_id" uuid not null,
    "model_key" text not null,
    "version" text,
    "display_name" text not null,
    "modality" text not null,
    "task" text not null,
    "model_family" text,
    "endpoint_path" text,
    "input_defaults" jsonb not null default '{}'::jsonb,
    "capabilities" jsonb not null default '{}'::jsonb,
    "pricing" jsonb not null default '{}'::jsonb,
    "output_format" text,
    "is_active" boolean not null default true,
    "is_default" boolean not null default false,
    "priority" integer not null default 0
      );


alter table "public"."api_models" enable row level security;


  create table "public"."api_providers" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "name" text not null,
    "display_name" text not null,
    "base_url" text,
    "docs_url" text,
    "auth_scheme" text not null default 'bearer'::text,
    "auth_header_name" text default 'Authorization'::text,
    "secret_name" text,
    "rate_limits" jsonb not null default '{}'::jsonb,
    "is_active" boolean not null default true
      );


alter table "public"."api_providers" enable row level security;


  create table "public"."character_scenes" (
    "id" uuid not null default gen_random_uuid(),
    "character_id" uuid,
    "conversation_id" uuid,
    "image_url" text,
    "scene_prompt" text not null,
    "generation_metadata" jsonb default '{}'::jsonb,
    "job_id" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."character_scenes" enable row level security;


  create table "public"."characters" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "name" text not null,
    "description" text not null,
    "traits" text,
    "appearance_tags" text[],
    "image_url" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "persona" text,
    "system_prompt" text,
    "voice_tone" character varying(50),
    "mood" character varying(50),
    "creator_id" uuid,
    "likes_count" integer default 0,
    "interaction_count" integer default 0,
    "reference_image_url" text,
    "is_public" boolean default true,
    "gender" text default 'unspecified'::text,
    "content_rating" character varying(10) not null default 'sfw'::character varying,
    "role" text default 'ai'::text
      );


alter table "public"."characters" enable row level security;


  create table "public"."compel_configs" (
    "id" uuid not null default gen_random_uuid(),
    "config_name" character varying(100) not null,
    "weights" jsonb not null,
    "config_hash" character varying(64) not null,
    "total_tests" integer default 0,
    "avg_quality" numeric(3,2),
    "avg_consistency" numeric(3,2),
    "is_active" boolean default false,
    "created_at" timestamp with time zone default now(),
    "created_by" uuid
      );


alter table "public"."compel_configs" enable row level security;


  create table "public"."conversations" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "project_id" uuid,
    "title" text not null default 'New Conversation'::text,
    "conversation_type" text not null default 'general'::text,
    "status" text not null default 'active'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "character_id" uuid,
    "user_character_id" uuid
      );


alter table "public"."conversations" enable row level security;


  create table "public"."enhancement_presets" (
    "id" uuid not null default gen_random_uuid(),
    "preset_name" character varying(100) not null,
    "preset_description" text,
    "enable_qwen" boolean not null,
    "enable_compel" boolean not null,
    "auto_enhancement" boolean not null,
    "compel_weights" jsonb,
    "qwen_settings" jsonb,
    "usage_count" integer default 0,
    "avg_quality_with_preset" numeric(3,2),
    "is_recommended" boolean default false,
    "created_at" timestamp with time zone default now(),
    "created_by" uuid
      );


alter table "public"."enhancement_presets" enable row level security;


  create table "public"."jobs" (
    "id" uuid not null default gen_random_uuid(),
    "video_id" uuid,
    "user_id" uuid not null,
    "job_type" text not null,
    "status" text default 'queued'::text,
    "error_message" text,
    "attempts" integer default 0,
    "max_attempts" integer default 3,
    "metadata" jsonb,
    "created_at" timestamp with time zone default now(),
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "project_id" uuid,
    "image_id" uuid,
    "format" text,
    "quality" text,
    "model_type" text,
    "prompt_test_id" uuid,
    "test_metadata" jsonb,
    "moderation_status" text default 'pending'::text,
    "reviewed_at" timestamp with time zone,
    "reviewed_by" uuid,
    "review_notes" text,
    "enhancement_strategy" character varying(50),
    "original_prompt" text,
    "enhanced_prompt" text,
    "enhancement_time_ms" integer,
    "quality_rating" numeric(7,2),
    "quality_improvement" numeric(7,2),
    "compel_weights" jsonb,
    "qwen_expansion_percentage" numeric(7,2),
    "destination" text default 'library'::text,
    "workspace_session_id" uuid,
    "template_name" text,
    "api_model_id" uuid
      );


alter table "public"."jobs" enable row level security;


  create table "public"."messages" (
    "id" uuid not null default gen_random_uuid(),
    "conversation_id" uuid not null,
    "sender" text not null,
    "content" text not null,
    "message_type" text not null default 'text'::text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."messages" enable row level security;


  create table "public"."model_config_history" (
    "id" uuid not null default gen_random_uuid(),
    "model_type" character varying(20) not null,
    "config_name" character varying(100) not null,
    "config_data" jsonb not null,
    "is_active" boolean default false,
    "created_by" uuid,
    "created_at" timestamp with time zone default now(),
    "notes" text
      );


alter table "public"."model_config_history" enable row level security;


  create table "public"."model_performance_logs" (
    "id" uuid not null default gen_random_uuid(),
    "model_type" character varying(20) not null,
    "date" date not null,
    "total_generations" integer default 0,
    "successful_generations" integer default 0,
    "failed_generations" integer default 0,
    "avg_generation_time_ms" integer,
    "avg_quality_rating" numeric(3,2),
    "total_processing_time_ms" integer,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."model_performance_logs" enable row level security;


  create table "public"."model_test_results" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "model_type" character varying(20) not null,
    "model_version" character varying(50),
    "prompt_text" text not null,
    "success" boolean not null default true,
    "overall_quality" integer,
    "technical_quality" integer,
    "content_quality" integer,
    "consistency" integer,
    "test_series" character varying(100) not null,
    "test_tier" character varying(50) not null,
    "test_category" character varying(100),
    "test_metadata" jsonb not null default '{}'::jsonb,
    "job_id" uuid,
    "image_id" uuid,
    "video_id" uuid,
    "generation_time_ms" integer,
    "file_size_bytes" integer,
    "notes" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "enhancement_strategy" character varying(50),
    "original_prompt" text,
    "enhanced_prompt" text,
    "enhancement_time_ms" integer,
    "quality_improvement" numeric(3,2),
    "compel_weights" jsonb,
    "qwen_expansion_percentage" numeric(5,2),
    "baseline_quality" numeric(3,2)
      );


alter table "public"."model_test_results" enable row level security;


  create table "public"."negative_prompts" (
    "id" uuid not null default gen_random_uuid(),
    "model_type" character varying not null default 'sdxl'::character varying,
    "content_mode" character varying not null default 'nsfw'::character varying,
    "negative_prompt" text not null,
    "is_active" boolean default true,
    "priority" integer default 1,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "created_by" uuid,
    "description" text
      );


alter table "public"."negative_prompts" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "username" text,
    "subscription_status" text default 'inactive'::text,
    "token_balance" integer default 100,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "age_verified" boolean default false
      );


alter table "public"."profiles" enable row level security;


  create table "public"."projects" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "title" text,
    "original_prompt" text not null,
    "enhanced_prompt" text,
    "media_type" text not null,
    "duration" integer default 0,
    "scene_count" integer default 1,
    "workflow_step" text default 'configuration'::text,
    "character_id" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "preview_url" text,
    "reference_image_url" text
      );


alter table "public"."projects" enable row level security;


  create table "public"."prompt_ab_tests" (
    "id" uuid not null default gen_random_uuid(),
    "test_name" character varying(100) not null,
    "test_series" character varying(100) not null,
    "baseline_config" jsonb not null,
    "enhanced_config" jsonb not null,
    "total_participants" integer default 0,
    "baseline_avg_quality" numeric(3,2),
    "enhanced_avg_quality" numeric(3,2),
    "quality_improvement" numeric(3,2),
    "confidence_level" numeric(3,2),
    "is_complete" boolean default false,
    "created_at" timestamp with time zone default now(),
    "completed_at" timestamp with time zone
      );


alter table "public"."prompt_ab_tests" enable row level security;


  create table "public"."prompt_templates" (
    "id" uuid not null default gen_random_uuid(),
    "enhancer_model" character varying not null,
    "use_case" character varying not null,
    "content_mode" character varying not null default 'nsfw'::character varying,
    "template_name" character varying not null,
    "system_prompt" text not null,
    "token_limit" integer default 512,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "created_by" uuid,
    "version" integer default 1,
    "metadata" jsonb default '{}'::jsonb,
    "job_type" text,
    "target_model" text,
    "description" text,
    "comment" text
      );


alter table "public"."prompt_templates" enable row level security;


  create table "public"."scenes" (
    "id" uuid not null default gen_random_uuid(),
    "project_id" uuid not null,
    "scene_number" integer not null,
    "description" text not null,
    "enhanced_prompt" text,
    "image_url" text,
    "approved" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "final_stitched_url" text
      );


alter table "public"."scenes" enable row level security;


  create table "public"."system_config" (
    "id" bigint not null default 1,
    "config" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."system_config" enable row level security;


  create table "public"."usage_logs" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "action" text not null,
    "credits_consumed" numeric(10,2) default 1.0,
    "metadata" jsonb,
    "created_at" timestamp with time zone default now(),
    "format" text,
    "quality" text
      );


alter table "public"."usage_logs" enable row level security;


  create table "public"."user_activity_log" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "action" text not null,
    "resource_type" text,
    "resource_id" text,
    "metadata" jsonb default '{}'::jsonb,
    "ip_address" inet,
    "user_agent" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."user_activity_log" enable row level security;


  create table "public"."user_collections" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "name" text not null,
    "description" text,
    "asset_count" integer default 0,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."user_collections" enable row level security;


  create table "public"."user_library" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "asset_type" text not null,
    "storage_path" text not null,
    "file_size_bytes" bigint not null,
    "mime_type" text not null,
    "duration_seconds" numeric(10,3),
    "original_prompt" text not null,
    "model_used" text not null,
    "generation_seed" bigint,
    "collection_id" uuid,
    "custom_title" text,
    "tags" text[] default '{}'::text[],
    "is_favorite" boolean default false,
    "visibility" text default 'private'::text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "thumbnail_path" text,
    "width" integer,
    "height" integer
      );


alter table "public"."user_library" enable row level security;


  create table "public"."user_roles" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "role" app_role not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."user_roles" enable row level security;


  create table "public"."workspace_assets" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "asset_type" text not null,
    "temp_storage_path" text not null,
    "file_size_bytes" bigint not null,
    "mime_type" text not null,
    "duration_seconds" numeric(10,3),
    "job_id" uuid not null,
    "asset_index" integer not null default 0,
    "generation_seed" bigint not null,
    "original_prompt" text not null,
    "model_used" text not null,
    "generation_settings" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now(),
    "expires_at" timestamp with time zone default (now() + '7 days'::interval),
    "thumbnail_path" text,
    "width" integer,
    "height" integer
      );


alter table "public"."workspace_assets" enable row level security;

CREATE UNIQUE INDEX admin_development_progress_pkey ON public.admin_development_progress USING btree (id);

CREATE UNIQUE INDEX api_models_one_default_per_task ON public.api_models USING btree (modality, task) WHERE is_default;

CREATE UNIQUE INDEX api_models_pkey ON public.api_models USING btree (id);

CREATE UNIQUE INDEX api_models_provider_key_version_idx ON public.api_models USING btree (provider_id, model_key, COALESCE(version, ''::text));

CREATE UNIQUE INDEX api_providers_name_key ON public.api_providers USING btree (name);

CREATE UNIQUE INDEX api_providers_pkey ON public.api_providers USING btree (id);

CREATE UNIQUE INDEX character_scenes_pkey ON public.character_scenes USING btree (id);

CREATE UNIQUE INDEX characters_pkey ON public.characters USING btree (id);

CREATE UNIQUE INDEX compel_configs_config_hash_key ON public.compel_configs USING btree (config_hash);

CREATE UNIQUE INDEX compel_configs_pkey ON public.compel_configs USING btree (id);

CREATE UNIQUE INDEX conversations_pkey ON public.conversations USING btree (id);

CREATE UNIQUE INDEX enhancement_presets_pkey ON public.enhancement_presets USING btree (id);

CREATE INDEX idx_api_models_active ON public.api_models USING btree (is_active);

CREATE INDEX idx_api_models_modality_task ON public.api_models USING btree (modality, task);

CREATE INDEX idx_api_models_provider ON public.api_models USING btree (provider_id);

CREATE INDEX idx_character_scenes_character_id ON public.character_scenes USING btree (character_id);

CREATE INDEX idx_character_scenes_conversation_id ON public.character_scenes USING btree (conversation_id);

CREATE INDEX idx_character_scenes_created_at ON public.character_scenes USING btree (created_at DESC);

CREATE INDEX idx_characters_role ON public.characters USING btree (role);

CREATE INDEX idx_characters_user_id ON public.characters USING btree (user_id);

CREATE INDEX idx_characters_user_id_role ON public.characters USING btree (user_id, role);

CREATE INDEX idx_collections_user ON public.user_collections USING btree (user_id, created_at DESC);

CREATE INDEX idx_conversations_user_character_id ON public.conversations USING btree (user_character_id);

CREATE INDEX idx_jobs_api_model_id ON public.jobs USING btree (api_model_id);

CREATE INDEX idx_jobs_asset_lookup ON public.jobs USING btree (user_id, image_id, video_id, status, job_type);

CREATE INDEX idx_jobs_cleanup ON public.jobs USING btree (status, created_at) WHERE (status = ANY (ARRAY['processing'::text, 'queued'::text, 'failed'::text]));

CREATE INDEX idx_jobs_created_at ON public.jobs USING btree (created_at);

CREATE INDEX idx_jobs_destination ON public.jobs USING btree (destination);

CREATE INDEX idx_jobs_enhancement_strategy ON public.jobs USING btree (enhancement_strategy);

CREATE INDEX idx_jobs_format_quality ON public.jobs USING btree (format, quality);

CREATE INDEX idx_jobs_image_id ON public.jobs USING btree (image_id);

CREATE INDEX idx_jobs_model_type ON public.jobs USING btree (model_type);

CREATE INDEX idx_jobs_project_id ON public.jobs USING btree (project_id);

CREATE INDEX idx_jobs_quality_rating ON public.jobs USING btree (quality_rating);

CREATE INDEX idx_jobs_reviewed_by ON public.jobs USING btree (reviewed_by);

CREATE INDEX idx_jobs_status_created ON public.jobs USING btree (status, created_at) WHERE (status = ANY (ARRAY['processing'::text, 'queued'::text]));

CREATE INDEX idx_jobs_user_status_created ON public.jobs USING btree (user_id, status, created_at DESC);

CREATE INDEX idx_jobs_video_id ON public.jobs USING btree (video_id) WHERE (video_id IS NOT NULL);

CREATE INDEX idx_jobs_workspace_session ON public.jobs USING btree (workspace_session_id);

CREATE INDEX idx_library_collection ON public.user_library USING btree (collection_id, created_at DESC);

CREATE INDEX idx_library_user_created ON public.user_library USING btree (user_id, created_at DESC);

CREATE INDEX idx_model_config_history_created_by ON public.model_config_history USING btree (created_by);

CREATE INDEX idx_model_test_results_created_at ON public.model_test_results USING btree (created_at);

CREATE INDEX idx_model_test_results_enhancement_strategy ON public.model_test_results USING btree (enhancement_strategy);

CREATE INDEX idx_model_test_results_image_id ON public.model_test_results USING btree (image_id);

CREATE INDEX idx_model_test_results_job_id ON public.model_test_results USING btree (job_id);

CREATE INDEX idx_model_test_results_quality_improvement ON public.model_test_results USING btree (quality_improvement);

CREATE INDEX idx_model_test_results_video_id ON public.model_test_results USING btree (video_id);

CREATE INDEX idx_projects_character_id ON public.projects USING btree (character_id);

CREATE INDEX idx_projects_user_id ON public.projects USING btree (user_id);

CREATE INDEX idx_usage_logs_format_quality ON public.usage_logs USING btree (format, quality);

CREATE INDEX idx_usage_logs_user_id ON public.usage_logs USING btree (user_id);

CREATE INDEX idx_user_activity_log_created_at ON public.user_activity_log USING btree (created_at);

CREATE INDEX idx_user_library_user_created ON public.user_library USING btree (user_id, created_at DESC);

CREATE INDEX idx_workspace_assets_job_id ON public.workspace_assets USING btree (job_id);

CREATE INDEX idx_workspace_expires ON public.workspace_assets USING btree (expires_at);

CREATE INDEX idx_workspace_job ON public.workspace_assets USING btree (job_id, asset_index);

CREATE INDEX idx_workspace_user_created ON public.workspace_assets USING btree (user_id, created_at DESC);

CREATE UNIQUE INDEX jobs_pkey ON public.jobs USING btree (id);

CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id);

CREATE UNIQUE INDEX model_config_history_pkey ON public.model_config_history USING btree (id);

CREATE UNIQUE INDEX model_performance_logs_model_type_date_key ON public.model_performance_logs USING btree (model_type, date);

CREATE UNIQUE INDEX model_performance_logs_pkey ON public.model_performance_logs USING btree (id);

CREATE UNIQUE INDEX model_test_results_pkey ON public.model_test_results USING btree (id);

CREATE UNIQUE INDEX negative_prompts_pkey ON public.negative_prompts USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX profiles_username_key ON public.profiles USING btree (username);

CREATE UNIQUE INDEX projects_pkey ON public.projects USING btree (id);

CREATE UNIQUE INDEX prompt_ab_tests_pkey ON public.prompt_ab_tests USING btree (id);

CREATE UNIQUE INDEX prompt_templates_pkey ON public.prompt_templates USING btree (id);

CREATE UNIQUE INDEX scenes_pkey ON public.scenes USING btree (id);

CREATE UNIQUE INDEX scenes_project_id_scene_number_key ON public.scenes USING btree (project_id, scene_number);

CREATE UNIQUE INDEX system_config_pkey ON public.system_config USING btree (id);

CREATE UNIQUE INDEX unique_negative_prompt_per_model_mode ON public.negative_prompts USING btree (model_type, content_mode, negative_prompt);

CREATE UNIQUE INDEX unique_template_per_model_usecase_mode ON public.prompt_templates USING btree (enhancer_model, use_case, content_mode, template_name);

CREATE UNIQUE INDEX usage_logs_pkey ON public.usage_logs USING btree (id);

CREATE UNIQUE INDEX user_activity_log_pkey ON public.user_activity_log USING btree (id);

CREATE UNIQUE INDEX user_collections_pkey ON public.user_collections USING btree (id);

CREATE UNIQUE INDEX user_library_pkey ON public.user_library USING btree (id);

CREATE UNIQUE INDEX user_roles_pkey ON public.user_roles USING btree (id);

CREATE UNIQUE INDEX user_roles_user_id_role_key ON public.user_roles USING btree (user_id, role);

CREATE UNIQUE INDEX workspace_assets_job_id_asset_index_unique ON public.workspace_assets USING btree (job_id, asset_index);

CREATE UNIQUE INDEX workspace_assets_pkey ON public.workspace_assets USING btree (id);

CREATE UNIQUE INDEX workspace_assets_user_id_job_id_asset_index_key ON public.workspace_assets USING btree (user_id, job_id, asset_index);

alter table "public"."admin_development_progress" add constraint "admin_development_progress_pkey" PRIMARY KEY using index "admin_development_progress_pkey";

alter table "public"."api_models" add constraint "api_models_pkey" PRIMARY KEY using index "api_models_pkey";

alter table "public"."api_providers" add constraint "api_providers_pkey" PRIMARY KEY using index "api_providers_pkey";

alter table "public"."character_scenes" add constraint "character_scenes_pkey" PRIMARY KEY using index "character_scenes_pkey";

alter table "public"."characters" add constraint "characters_pkey" PRIMARY KEY using index "characters_pkey";

alter table "public"."compel_configs" add constraint "compel_configs_pkey" PRIMARY KEY using index "compel_configs_pkey";

alter table "public"."conversations" add constraint "conversations_pkey" PRIMARY KEY using index "conversations_pkey";

alter table "public"."enhancement_presets" add constraint "enhancement_presets_pkey" PRIMARY KEY using index "enhancement_presets_pkey";

alter table "public"."jobs" add constraint "jobs_pkey" PRIMARY KEY using index "jobs_pkey";

alter table "public"."messages" add constraint "messages_pkey" PRIMARY KEY using index "messages_pkey";

alter table "public"."model_config_history" add constraint "model_config_history_pkey" PRIMARY KEY using index "model_config_history_pkey";

alter table "public"."model_performance_logs" add constraint "model_performance_logs_pkey" PRIMARY KEY using index "model_performance_logs_pkey";

alter table "public"."model_test_results" add constraint "model_test_results_pkey" PRIMARY KEY using index "model_test_results_pkey";

alter table "public"."negative_prompts" add constraint "negative_prompts_pkey" PRIMARY KEY using index "negative_prompts_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."projects" add constraint "projects_pkey" PRIMARY KEY using index "projects_pkey";

alter table "public"."prompt_ab_tests" add constraint "prompt_ab_tests_pkey" PRIMARY KEY using index "prompt_ab_tests_pkey";

alter table "public"."prompt_templates" add constraint "prompt_templates_pkey" PRIMARY KEY using index "prompt_templates_pkey";

alter table "public"."scenes" add constraint "scenes_pkey" PRIMARY KEY using index "scenes_pkey";

alter table "public"."system_config" add constraint "system_config_pkey" PRIMARY KEY using index "system_config_pkey";

alter table "public"."usage_logs" add constraint "usage_logs_pkey" PRIMARY KEY using index "usage_logs_pkey";

alter table "public"."user_activity_log" add constraint "user_activity_log_pkey" PRIMARY KEY using index "user_activity_log_pkey";

alter table "public"."user_collections" add constraint "user_collections_pkey" PRIMARY KEY using index "user_collections_pkey";

alter table "public"."user_library" add constraint "user_library_pkey" PRIMARY KEY using index "user_library_pkey";

alter table "public"."user_roles" add constraint "user_roles_pkey" PRIMARY KEY using index "user_roles_pkey";

alter table "public"."workspace_assets" add constraint "workspace_assets_pkey" PRIMARY KEY using index "workspace_assets_pkey";

alter table "public"."admin_development_progress" add constraint "admin_development_progress_priority_check" CHECK (((priority)::text = ANY ((ARRAY['P0'::character varying, 'P1'::character varying, 'P2'::character varying])::text[]))) not valid;

alter table "public"."admin_development_progress" validate constraint "admin_development_progress_priority_check";

alter table "public"."admin_development_progress" add constraint "admin_development_progress_status_check" CHECK (((status)::text = ANY ((ARRAY['not_started'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'blocked'::character varying])::text[]))) not valid;

alter table "public"."admin_development_progress" validate constraint "admin_development_progress_status_check";

alter table "public"."api_models" add constraint "api_models_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL not valid;

alter table "public"."api_models" validate constraint "api_models_created_by_fkey";

alter table "public"."api_models" add constraint "api_models_modality_check" CHECK ((modality = ANY (ARRAY['image'::text, 'video'::text, 'chat'::text, 'prompt'::text, 'audio'::text, 'embedding'::text, 'roleplay'::text]))) not valid;

alter table "public"."api_models" validate constraint "api_models_modality_check";

alter table "public"."api_models" add constraint "api_models_provider_id_fkey" FOREIGN KEY (provider_id) REFERENCES api_providers(id) ON DELETE CASCADE not valid;

alter table "public"."api_models" validate constraint "api_models_provider_id_fkey";

alter table "public"."api_models" add constraint "api_models_task_check" CHECK ((task = ANY (ARRAY['generation'::text, 'enhancement'::text, 'moderation'::text, 'style_transfer'::text, 'upscale'::text, 'roleplay'::text, 'tts'::text, 'stt'::text, 'chat'::text, 'embedding'::text]))) not valid;

alter table "public"."api_models" validate constraint "api_models_task_check";

alter table "public"."api_providers" add constraint "api_providers_name_key" UNIQUE using index "api_providers_name_key";

alter table "public"."character_scenes" add constraint "character_scenes_character_id_fkey" FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE not valid;

alter table "public"."character_scenes" validate constraint "character_scenes_character_id_fkey";

alter table "public"."character_scenes" add constraint "character_scenes_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE not valid;

alter table "public"."character_scenes" validate constraint "character_scenes_conversation_id_fkey";

alter table "public"."character_scenes" add constraint "character_scenes_job_id_fkey" FOREIGN KEY (job_id) REFERENCES jobs(id) not valid;

alter table "public"."character_scenes" validate constraint "character_scenes_job_id_fkey";

alter table "public"."characters" add constraint "characters_content_rating_check" CHECK (((content_rating)::text = ANY ((ARRAY['sfw'::character varying, 'nsfw'::character varying])::text[]))) not valid;

alter table "public"."characters" validate constraint "characters_content_rating_check";

alter table "public"."characters" add constraint "characters_creator_id_fkey" FOREIGN KEY (creator_id) REFERENCES profiles(id) not valid;

alter table "public"."characters" validate constraint "characters_creator_id_fkey";

alter table "public"."characters" add constraint "characters_gender_check" CHECK ((gender = ANY (ARRAY['male'::text, 'female'::text, 'non-binary'::text, 'unspecified'::text]))) not valid;

alter table "public"."characters" validate constraint "characters_gender_check";

alter table "public"."characters" add constraint "characters_role_check" CHECK ((role = ANY (ARRAY['ai'::text, 'user'::text, 'narrator'::text]))) not valid;

alter table "public"."characters" validate constraint "characters_role_check";

alter table "public"."characters" add constraint "characters_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."characters" validate constraint "characters_user_id_fkey";

alter table "public"."compel_configs" add constraint "compel_configs_config_hash_key" UNIQUE using index "compel_configs_config_hash_key";

alter table "public"."compel_configs" add constraint "compel_configs_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."compel_configs" validate constraint "compel_configs_created_by_fkey";

alter table "public"."conversations" add constraint "conversations_character_id_fkey" FOREIGN KEY (character_id) REFERENCES characters(id) not valid;

alter table "public"."conversations" validate constraint "conversations_character_id_fkey";

alter table "public"."conversations" add constraint "conversations_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL not valid;

alter table "public"."conversations" validate constraint "conversations_project_id_fkey";

alter table "public"."conversations" add constraint "conversations_user_character_id_fkey" FOREIGN KEY (user_character_id) REFERENCES characters(id) not valid;

alter table "public"."conversations" validate constraint "conversations_user_character_id_fkey";

alter table "public"."enhancement_presets" add constraint "enhancement_presets_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."enhancement_presets" validate constraint "enhancement_presets_created_by_fkey";

alter table "public"."jobs" add constraint "jobs_api_model_id_fkey" FOREIGN KEY (api_model_id) REFERENCES api_models(id) not valid;

alter table "public"."jobs" validate constraint "jobs_api_model_id_fkey";

alter table "public"."jobs" add constraint "jobs_destination_check" CHECK ((destination = ANY (ARRAY['library'::text, 'workspace'::text]))) not valid;

alter table "public"."jobs" validate constraint "jobs_destination_check";

alter table "public"."jobs" add constraint "jobs_format_check" CHECK ((format = ANY (ARRAY['image'::text, 'video'::text]))) not valid;

alter table "public"."jobs" validate constraint "jobs_format_check";

alter table "public"."jobs" add constraint "jobs_job_type_check" CHECK ((job_type = ANY (ARRAY['image_fast'::text, 'image_high'::text, 'video_fast'::text, 'video_high'::text, 'sdxl_image_fast'::text, 'sdxl_image_high'::text, 'image7b_fast_enhanced'::text, 'image7b_high_enhanced'::text, 'video7b_fast_enhanced'::text, 'video7b_high_enhanced'::text, 'wan_video_fast'::text, 'wan_video_high'::text]))) not valid;

alter table "public"."jobs" validate constraint "jobs_job_type_check";

alter table "public"."jobs" add constraint "jobs_model_type_check" CHECK ((model_type = ANY (ARRAY['sdxl'::text, 'wan'::text, 'flux'::text, 'rv51'::text, 'default'::text]))) not valid;

alter table "public"."jobs" validate constraint "jobs_model_type_check";

alter table "public"."jobs" add constraint "jobs_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) not valid;

alter table "public"."jobs" validate constraint "jobs_project_id_fkey";

alter table "public"."jobs" add constraint "jobs_quality_check" CHECK ((quality = ANY (ARRAY['fast'::text, 'high'::text]))) not valid;

alter table "public"."jobs" validate constraint "jobs_quality_check";

alter table "public"."jobs" add constraint "jobs_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES profiles(id) not valid;

alter table "public"."jobs" validate constraint "jobs_reviewed_by_fkey";

alter table "public"."jobs" add constraint "jobs_status_check" CHECK ((status = ANY (ARRAY['queued'::text, 'processing'::text, 'completed'::text, 'failed'::text]))) not valid;

alter table "public"."jobs" validate constraint "jobs_status_check";

alter table "public"."jobs" add constraint "jobs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."jobs" validate constraint "jobs_user_id_fkey";

alter table "public"."messages" add constraint "messages_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_conversation_id_fkey";

alter table "public"."messages" add constraint "messages_sender_check" CHECK ((sender = ANY (ARRAY['user'::text, 'assistant'::text]))) not valid;

alter table "public"."messages" validate constraint "messages_sender_check";

alter table "public"."model_config_history" add constraint "model_config_history_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) not valid;

alter table "public"."model_config_history" validate constraint "model_config_history_created_by_fkey";

alter table "public"."model_config_history" add constraint "model_config_history_model_type_check" CHECK (((model_type)::text = ANY ((ARRAY['SDXL'::character varying, 'WAN'::character varying])::text[]))) not valid;

alter table "public"."model_config_history" validate constraint "model_config_history_model_type_check";

alter table "public"."model_performance_logs" add constraint "model_performance_logs_model_type_check" CHECK (((model_type)::text = ANY ((ARRAY['SDXL'::character varying, 'WAN'::character varying])::text[]))) not valid;

alter table "public"."model_performance_logs" validate constraint "model_performance_logs_model_type_check";

alter table "public"."model_performance_logs" add constraint "model_performance_logs_model_type_date_key" UNIQUE using index "model_performance_logs_model_type_date_key";

alter table "public"."model_test_results" add constraint "model_test_results_consistency_check" CHECK (((consistency >= 0) AND (consistency <= 10))) not valid;

alter table "public"."model_test_results" validate constraint "model_test_results_consistency_check";

alter table "public"."model_test_results" add constraint "model_test_results_content_quality_check" CHECK (((content_quality >= 0) AND (content_quality <= 10))) not valid;

alter table "public"."model_test_results" validate constraint "model_test_results_content_quality_check";

alter table "public"."model_test_results" add constraint "model_test_results_job_id_fkey" FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL not valid;

alter table "public"."model_test_results" validate constraint "model_test_results_job_id_fkey";

alter table "public"."model_test_results" add constraint "model_test_results_model_type_check" CHECK (((model_type)::text = ANY ((ARRAY['SDXL'::character varying, 'WAN'::character varying, 'LORA'::character varying])::text[]))) not valid;

alter table "public"."model_test_results" validate constraint "model_test_results_model_type_check";

alter table "public"."model_test_results" add constraint "model_test_results_overall_quality_check" CHECK (((overall_quality >= 0) AND (overall_quality <= 10))) not valid;

alter table "public"."model_test_results" validate constraint "model_test_results_overall_quality_check";

alter table "public"."model_test_results" add constraint "model_test_results_technical_quality_check" CHECK (((technical_quality >= 0) AND (technical_quality <= 10))) not valid;

alter table "public"."model_test_results" validate constraint "model_test_results_technical_quality_check";

alter table "public"."model_test_results" add constraint "model_test_results_test_tier_check" CHECK (((test_tier)::text = ANY ((ARRAY['artistic'::character varying, 'explicit'::character varying, 'unrestricted'::character varying])::text[]))) not valid;

alter table "public"."model_test_results" validate constraint "model_test_results_test_tier_check";

alter table "public"."model_test_results" add constraint "model_test_results_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."model_test_results" validate constraint "model_test_results_user_id_fkey";

alter table "public"."negative_prompts" add constraint "unique_negative_prompt_per_model_mode" UNIQUE using index "unique_negative_prompt_per_model_mode";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."profiles" add constraint "profiles_subscription_status_check" CHECK ((subscription_status = ANY (ARRAY['inactive'::text, 'starter'::text, 'pro'::text, 'creator'::text]))) not valid;

alter table "public"."profiles" validate constraint "profiles_subscription_status_check";

alter table "public"."profiles" add constraint "profiles_username_key" UNIQUE using index "profiles_username_key";

alter table "public"."projects" add constraint "projects_character_id_fkey" FOREIGN KEY (character_id) REFERENCES characters(id) not valid;

alter table "public"."projects" validate constraint "projects_character_id_fkey";

alter table "public"."projects" add constraint "projects_media_type_check" CHECK ((media_type = ANY (ARRAY['image'::text, 'video'::text]))) not valid;

alter table "public"."projects" validate constraint "projects_media_type_check";

alter table "public"."projects" add constraint "projects_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."projects" validate constraint "projects_user_id_fkey";

alter table "public"."projects" add constraint "projects_workflow_step_check" CHECK ((workflow_step = ANY (ARRAY['configuration'::text, 'character_selection'::text, 'story_breakdown'::text, 'storyboard_generation'::text, 'video_generation'::text, 'completed'::text]))) not valid;

alter table "public"."projects" validate constraint "projects_workflow_step_check";

alter table "public"."prompt_templates" add constraint "prompt_templates_job_type_check" CHECK ((job_type = ANY (ARRAY['chat'::text, 'image'::text, 'video'::text]))) not valid;

alter table "public"."prompt_templates" validate constraint "prompt_templates_job_type_check";

alter table "public"."prompt_templates" add constraint "prompt_templates_target_model_check" CHECK ((target_model = ANY (ARRAY['sdxl'::text, 'wan'::text]))) not valid;

alter table "public"."prompt_templates" validate constraint "prompt_templates_target_model_check";

alter table "public"."prompt_templates" add constraint "unique_template_per_model_usecase_mode" UNIQUE using index "unique_template_per_model_usecase_mode";

alter table "public"."scenes" add constraint "scenes_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE not valid;

alter table "public"."scenes" validate constraint "scenes_project_id_fkey";

alter table "public"."scenes" add constraint "scenes_project_id_scene_number_key" UNIQUE using index "scenes_project_id_scene_number_key";

alter table "public"."usage_logs" add constraint "usage_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."usage_logs" validate constraint "usage_logs_user_id_fkey";

alter table "public"."user_activity_log" add constraint "user_activity_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."user_activity_log" validate constraint "user_activity_log_user_id_fkey";

alter table "public"."user_collections" add constraint "user_collections_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_collections" validate constraint "user_collections_user_id_fkey";

alter table "public"."user_library" add constraint "user_library_asset_type_check" CHECK ((asset_type = ANY (ARRAY['image'::text, 'video'::text]))) not valid;

alter table "public"."user_library" validate constraint "user_library_asset_type_check";

alter table "public"."user_library" add constraint "user_library_collection_id_fkey" FOREIGN KEY (collection_id) REFERENCES user_collections(id) ON DELETE SET NULL not valid;

alter table "public"."user_library" validate constraint "user_library_collection_id_fkey";

alter table "public"."user_library" add constraint "user_library_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_library" validate constraint "user_library_user_id_fkey";

alter table "public"."user_library" add constraint "user_library_visibility_check" CHECK ((visibility = ANY (ARRAY['private'::text, 'unlisted'::text, 'public'::text]))) not valid;

alter table "public"."user_library" validate constraint "user_library_visibility_check";

alter table "public"."user_roles" add constraint "user_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_roles" validate constraint "user_roles_user_id_fkey";

alter table "public"."user_roles" add constraint "user_roles_user_id_role_key" UNIQUE using index "user_roles_user_id_role_key";

alter table "public"."workspace_assets" add constraint "workspace_assets_asset_type_check" CHECK ((asset_type = ANY (ARRAY['image'::text, 'video'::text]))) not valid;

alter table "public"."workspace_assets" validate constraint "workspace_assets_asset_type_check";

alter table "public"."workspace_assets" add constraint "workspace_assets_job_id_asset_index_unique" UNIQUE using index "workspace_assets_job_id_asset_index_unique";

alter table "public"."workspace_assets" add constraint "workspace_assets_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."workspace_assets" validate constraint "workspace_assets_user_id_fkey";

alter table "public"."workspace_assets" add constraint "workspace_assets_user_id_job_id_asset_index_key" UNIQUE using index "workspace_assets_user_id_job_id_asset_index_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.clean_orphaned_jobs()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete completed jobs with no associated workspace assets (older than 24 hours)
  DELETE FROM jobs j
  WHERE j.status = 'completed'
    AND j.created_at < NOW() - INTERVAL '24 hours'
    AND NOT EXISTS (
      SELECT 1
      FROM workspace_assets wa
      WHERE wa.job_id = j.id
    );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Log the cleanup
  INSERT INTO user_activity_log (action, metadata, user_id)
  VALUES (
    'system_cleanup_orphaned_jobs',
    jsonb_build_object('deleted_count', deleted_count, 'timestamp', NOW(), 'source', 'workspace_assets'),
    '00000000-0000-0000-0000-000000000000'::uuid
  );

  RETURN deleted_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_expired_workspace_assets()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete expired workspace assets
  DELETE FROM workspace_assets 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_workspace_session(p_user_id uuid, p_session_name text DEFAULT 'Workspace Session'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  session_id UUID;
BEGIN
  -- Deactivate any existing active sessions for this user
  UPDATE public.workspace_sessions 
  SET is_active = false 
  WHERE user_id = p_user_id AND is_active = true;
  
  -- Create new session
  INSERT INTO public.workspace_sessions (user_id, session_name)
  VALUES (p_user_id, p_session_name)
  RETURNING id INTO session_id;
  
  RETURN session_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_system_stats(p_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    start_date TIMESTAMP WITH TIME ZONE;
    result JSONB;
BEGIN
    start_date := NOW() - INTERVAL '1 day' * p_days;

    SELECT jsonb_build_object(
        'total_users', (SELECT COUNT(*) FROM profiles),
        'active_users', (SELECT COUNT(*) FROM profiles WHERE created_at > start_date - INTERVAL '7 days'),
        'new_users_today', (SELECT COUNT(*) FROM profiles WHERE created_at > NOW()::date),
        'new_users_period', (SELECT COUNT(*) FROM profiles WHERE created_at > start_date),

        'total_jobs', (SELECT COUNT(*) FROM jobs WHERE created_at > start_date),
        'completed_jobs', (SELECT COUNT(*) FROM jobs WHERE status = 'completed' AND created_at > start_date),
        'failed_jobs', (SELECT COUNT(*) FROM jobs WHERE status = 'failed' AND created_at > start_date),

        -- Asset rollups from workspace_assets
        'total_assets', (SELECT COUNT(*) FROM workspace_assets WHERE created_at > start_date),
        'total_images', (SELECT COUNT(*) FROM workspace_assets WHERE created_at > start_date AND asset_type ILIKE 'image%'),
        'total_videos', (SELECT COUNT(*) FROM workspace_assets WHERE created_at > start_date AND asset_type ILIKE 'video%'),

        -- Storage usage (bytes) - both staging and library views
        'storage_used_workspace', (SELECT COALESCE(SUM(file_size_bytes), 0) FROM workspace_assets WHERE created_at > start_date),
        'storage_used_library', (SELECT COALESCE(SUM(file_size_bytes), 0) FROM user_library WHERE created_at > start_date),

        'avg_job_time', (
            SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/60)
            FROM jobs
            WHERE completed_at IS NOT NULL AND created_at > start_date
        ),
        'success_rate', (
            SELECT CASE
                WHEN COUNT(*) > 0 THEN
                    (COUNT(CASE WHEN status = 'completed' THEN 1 END)::FLOAT / COUNT(*) * 100)
                ELSE 0
            END
            FROM jobs
            WHERE created_at > start_date
        ),
        'job_type_breakdown', (
            SELECT COALESCE(jsonb_object_agg(job_type, count), '{}'::jsonb)
            FROM (
                SELECT job_type, COUNT(*) as count
                FROM jobs
                WHERE created_at > start_date
                GROUP BY job_type
            ) t
        )
    ) INTO result;

    RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_role_priority(_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  role_priority INTEGER := 0;
BEGIN
  SELECT CASE role
    WHEN 'admin' THEN 100
    WHEN 'moderator' THEN 80
    WHEN 'premium_user' THEN 60
    WHEN 'basic_user' THEN 40
    WHEN 'guest' THEN 20
    ELSE 0
  END INTO role_priority
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'admin' THEN 100
    WHEN 'moderator' THEN 80
    WHEN 'premium_user' THEN 60
    WHEN 'basic_user' THEN 40
    WHEN 'guest' THEN 20
    ELSE 0
  END DESC
  LIMIT 1;
  
  RETURN COALESCE(role_priority, 0);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username, token_balance, subscription_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    100,
    'inactive'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'basic_user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$function$
;

CREATE OR REPLACE FUNCTION public.is_url_expired(expires_at timestamp with time zone)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT expires_at IS NULL OR expires_at <= NOW();
$function$
;

CREATE OR REPLACE FUNCTION public.log_user_activity(p_user_id uuid, p_action text, p_resource_type text DEFAULT NULL::text, p_resource_id text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO user_activity_log (
        user_id, action, resource_type, resource_id, 
        metadata, ip_address, user_agent
    ) VALUES (
        p_user_id, p_action, p_resource_type, p_resource_id,
        p_metadata, p_ip_address, p_user_agent
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_collection_asset_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_collections 
    SET asset_count = asset_count + 1 
    WHERE id = NEW.collection_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_collections 
    SET asset_count = asset_count - 1 
    WHERE id = OLD.collection_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle collection changes
    IF OLD.collection_id IS DISTINCT FROM NEW.collection_id THEN
      IF OLD.collection_id IS NOT NULL THEN
        UPDATE user_collections 
        SET asset_count = asset_count - 1 
        WHERE id = OLD.collection_id;
      END IF;
      IF NEW.collection_id IS NOT NULL THEN
        UPDATE user_collections 
        SET asset_count = asset_count + 1 
        WHERE id = NEW.collection_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_conversation_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE public.conversations 
  SET updated_at = now() 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_job_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Legacy fields no longer required; log if they are missing for awareness.
    IF NEW.job_type LIKE '%image%' AND NEW.image_id IS NULL THEN
      RAISE LOG 'validate_job_completion: Image job % lacks legacy image_id; allowing completion (workspace_assets model)', NEW.id;
    END IF;

    IF NEW.job_type LIKE '%video%' AND NEW.video_id IS NULL THEN
      RAISE LOG 'validate_job_completion: Video job % lacks legacy video_id; allowing completion (workspace_assets model)', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_jobs_moderation_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.moderation_status NOT IN ('pending', 'approved', 'rejected', 'flagged') THEN
        RAISE EXCEPTION 'Invalid moderation_status. Must be pending, approved, rejected, or flagged';
    END IF;
    RETURN NEW;
END;
$function$
;


  create policy "Admin access to development progress"
  on "public"."admin_development_progress"
  as permissive
  for all
  to public
using (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role));



  create policy "Active models readable"
  on "public"."api_models"
  as permissive
  for select
  to authenticated
using ((is_active = true));



  create policy "Admins can manage models"
  on "public"."api_models"
  as permissive
  for all
  to authenticated
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));



  create policy "Active providers readable"
  on "public"."api_providers"
  as permissive
  for select
  to authenticated
using ((is_active = true));



  create policy "Admins can manage providers"
  on "public"."api_providers"
  as permissive
  for all
  to authenticated
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));



  create policy "Users can create character scenes"
  on "public"."character_scenes"
  as permissive
  for insert
  to public
with check ((has_role(auth.uid(), 'admin'::app_role) OR (character_id IN ( SELECT characters.id
   FROM characters
  WHERE (characters.user_id = auth.uid())))));



  create policy "Users can delete character scenes"
  on "public"."character_scenes"
  as permissive
  for delete
  to public
using ((has_role(auth.uid(), 'admin'::app_role) OR (character_id IN ( SELECT characters.id
   FROM characters
  WHERE (characters.user_id = auth.uid())))));



  create policy "Users can update character scenes"
  on "public"."character_scenes"
  as permissive
  for update
  to public
using ((has_role(auth.uid(), 'admin'::app_role) OR (character_id IN ( SELECT characters.id
   FROM characters
  WHERE (characters.user_id = auth.uid())))));



  create policy "Users can view their own character scenes only"
  on "public"."character_scenes"
  as permissive
  for select
  to public
using ((has_role(auth.uid(), 'admin'::app_role) OR (character_id IN ( SELECT characters.id
   FROM characters
  WHERE (characters.user_id = auth.uid())))));



  create policy "Admins can manage all characters"
  on "public"."characters"
  as permissive
  for all
  to public
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));



  create policy "Public characters are viewable by everyone"
  on "public"."characters"
  as permissive
  for select
  to public
using ((is_public = true));



  create policy "Users can manage their own characters"
  on "public"."characters"
  as permissive
  for all
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Admin access to compel configs"
  on "public"."compel_configs"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));



  create policy "Users can create their own conversations"
  on "public"."conversations"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can delete their own conversations"
  on "public"."conversations"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can update their own conversations"
  on "public"."conversations"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own conversations"
  on "public"."conversations"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Admin access to enhancement presets"
  on "public"."enhancement_presets"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));



  create policy "Jobs access policy"
  on "public"."jobs"
  as permissive
  for all
  to public
using ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR (( SELECT auth.uid() AS uid) = user_id)));



  create policy "Users can create messages in their conversations"
  on "public"."messages"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM conversations
  WHERE ((conversations.id = messages.conversation_id) AND (conversations.user_id = auth.uid())))));



  create policy "Users can view messages in their conversations"
  on "public"."messages"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM conversations
  WHERE ((conversations.id = messages.conversation_id) AND (conversations.user_id = auth.uid())))));



  create policy "Admin access to model config history"
  on "public"."model_config_history"
  as permissive
  for all
  to public
using (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role));



  create policy "Admin access to model performance logs"
  on "public"."model_performance_logs"
  as permissive
  for all
  to public
using (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role));



  create policy "Admin access to model test results"
  on "public"."model_test_results"
  as permissive
  for all
  to public
using (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role));



  create policy "Admin access to negative prompts"
  on "public"."negative_prompts"
  as permissive
  for all
  to public
using (has_role(auth.uid(), 'admin'::app_role));



  create policy "Profiles insert policy"
  on "public"."profiles"
  as permissive
  for insert
  to public
with check ((( SELECT auth.uid() AS uid) = id));



  create policy "Profiles select policy"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR (( SELECT auth.uid() AS uid) = id)));



  create policy "Profiles update policy"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR (( SELECT auth.uid() AS uid) = id)));



  create policy "Projects access policy"
  on "public"."projects"
  as permissive
  for all
  to public
using ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR (( SELECT auth.uid() AS uid) = user_id)));



  create policy "Admin access to prompt ab tests"
  on "public"."prompt_ab_tests"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));



  create policy "Admin access to prompt templates"
  on "public"."prompt_templates"
  as permissive
  for all
  to public
using (has_role(auth.uid(), 'admin'::app_role));



  create policy "Scenes access policy"
  on "public"."scenes"
  as permissive
  for all
  to public
using ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR (( SELECT auth.uid() AS uid) = ( SELECT projects.user_id
   FROM projects
  WHERE (projects.id = scenes.project_id)))));



  create policy "Admin can manage system config"
  on "public"."system_config"
  as permissive
  for all
  to public
using (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role));



  create policy "Usage logs access policy"
  on "public"."usage_logs"
  as permissive
  for all
  to public
using ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR (( SELECT auth.uid() AS uid) = user_id)));



  create policy "User activity log admin deletes"
  on "public"."user_activity_log"
  as permissive
  for delete
  to public
using (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role));



  create policy "User activity log admin operations"
  on "public"."user_activity_log"
  as permissive
  for insert
  to public
with check (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role));



  create policy "User activity log admin updates"
  on "public"."user_activity_log"
  as permissive
  for update
  to public
using (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role));



  create policy "User activity log select policy"
  on "public"."user_activity_log"
  as permissive
  for select
  to public
using ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR (( SELECT auth.uid() AS uid) = user_id)));



  create policy "collections_policy"
  on "public"."user_collections"
  as permissive
  for all
  to public
using ((auth.uid() = user_id));



  create policy "library_policy"
  on "public"."user_library"
  as permissive
  for all
  to public
using ((auth.uid() = user_id));



  create policy "User roles delete policy"
  on "public"."user_roles"
  as permissive
  for delete
  to authenticated
using (has_role(auth.uid(), 'admin'::app_role));



  create policy "User roles insert policy"
  on "public"."user_roles"
  as permissive
  for insert
  to authenticated
with check (has_role(auth.uid(), 'admin'::app_role));



  create policy "User roles select policy"
  on "public"."user_roles"
  as permissive
  for select
  to authenticated
using ((has_role(auth.uid(), 'admin'::app_role) OR (auth.uid() = user_id)));



  create policy "User roles update policy"
  on "public"."user_roles"
  as permissive
  for update
  to authenticated
using (has_role(auth.uid(), 'admin'::app_role));



  create policy "workspace_policy"
  on "public"."workspace_assets"
  as permissive
  for all
  to public
using ((auth.uid() = user_id));


CREATE TRIGGER admin_development_progress_updated_at BEFORE UPDATE ON public.admin_development_progress FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER api_models_updated_at BEFORE UPDATE ON public.api_models FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER api_providers_updated_at BEFORE UPDATE ON public.api_providers FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_character_scenes_updated_at BEFORE UPDATE ON public.character_scenes FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_characters_updated_at BEFORE UPDATE ON public.characters FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER validate_job_completion_trigger BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION validate_job_completion();

CREATE TRIGGER validate_jobs_moderation_status_trigger BEFORE INSERT OR UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION validate_jobs_moderation_status();

CREATE TRIGGER update_conversation_on_message_insert AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION update_conversation_updated_at();

CREATE TRIGGER model_performance_logs_updated_at BEFORE UPDATE ON public.model_performance_logs FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_model_test_results_updated_at BEFORE UPDATE ON public.model_test_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_negative_prompts_updated_at BEFORE UPDATE ON public.negative_prompts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_prompt_templates_updated_at BEFORE UPDATE ON public.prompt_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER handle_scenes_updated_at BEFORE UPDATE ON public.scenes FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON public.system_config FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_collection_count_trigger AFTER INSERT OR DELETE OR UPDATE ON public.user_library FOR EACH ROW EXECUTE FUNCTION update_collection_asset_count();


