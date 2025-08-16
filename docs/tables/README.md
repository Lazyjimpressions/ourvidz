# Database Tables – Reference & Integration Map

This folder documents the key tables powering prompting, chat, and the library-first workspace. Each table doc includes: schema overview, integration map (pages/components/edge functions), behavior rules, and example queries.

## Index
- prompt_templates: docs/tables/prompt_templates.md
- system_config (cache JSON): docs/tables/system_config_cache.md
- conversations & messages: docs/tables/conversations_messages.md
- jobs: docs/tables/jobs.md
- images & videos (library): docs/tables/images_videos.md
- characters (roleplay): docs/tables/characters.md
- character_scenes (roleplay): docs/tables/character_scenes.md

## Naming convention

- 00-...: System-wide inventory and meta docs
- 10-19: Prompting and cache tables
- 20-49: Conversation/Jobs/Library tables
- 50-59: Roleplay tables

## Quick links

- System inventory (current snapshot): `docs/tables/00-INVENTORY.md`
- Regenerate inventory (single SQL command): `docs/tables/01-INVENTORY_SQL.md`

## Specific table docs (ordered)

- `docs/tables/10-prompt_templates.md`
- `docs/tables/11-system_config_cache.md`
- `docs/tables/20-conversations_messages.md`
- `docs/tables/30-jobs.md`
- `docs/tables/40-images_videos.md`
- `docs/tables/50-characters.md`
- `docs/tables/51-character_scenes.md`
 
For the full, up-to-date inventory snapshot, see `docs/tables/00-INVENTORY.md`.

### character_scenes

- Primary key: `id`
- Foreign keys:
  - `job_id` → `jobs(id)` (`character_scenes_job_id_fkey`)
  - `character_id` → `characters(id)` (`character_scenes_character_id_fkey`)
  - `conversation_id` → `conversations(id)` (`character_scenes_conversation_id_fkey`)
- Unique constraints: (none)
- Check constraints: (none)
- Indexes:
  - `character_scenes_pkey` – `CREATE UNIQUE INDEX character_scenes_pkey ON public.character_scenes USING btree (id)`
  - `idx_character_scenes_character_id` – `CREATE INDEX idx_character_scenes_character_id ON public.character_scenes USING btree (character_id)`
  - `idx_character_scenes_conversation_id` – `CREATE INDEX idx_character_scenes_conversation_id ON public.character_scenes USING btree (conversation_id)`
  - `idx_character_scenes_created_at` – `CREATE INDEX idx_character_scenes_created_at ON public.character_scenes USING btree (created_at DESC)`

Columns

| Ord | Name | Type | Nullable | Default |
| --- | ---- | ---- | -------- | ------- |
| 1 | id | uuid (uuid) | NO | gen_random_uuid() |
| 2 | character_id | uuid (uuid) | YES |  |
| 3 | conversation_id | uuid (uuid) | YES |  |
| 4 | image_url | text (text) | YES |  |
| 5 | scene_prompt | text (text) | NO |  |
| 6 | generation_metadata | jsonb (jsonb) | YES | '{}'::jsonb |
| 7 | job_id | uuid (uuid) | YES |  |
| 8 | created_at | timestamp with time zone (timestamptz) | YES | now() |
| 9 | updated_at | timestamp with time zone (timestamptz) | YES | now() |

### characters

- Primary key: `id`
- Foreign keys:
  - `creator_id` → `profiles(id)` (`characters_creator_id_fkey`)
  - `user_id` → `profiles(id)` (`characters_user_id_fkey`)
- Unique constraints: (none)
- Check constraints:
  - `characters_content_rating_check`: `CHECK (content_rating::text = ANY (ARRAY['sfw'::character varying, 'nsfw'::character varying]::text[]))`
  - `characters_gender_check`: `CHECK (gender = ANY (ARRAY['male'::text, 'female'::text, 'non-binary'::text, 'unspecified'::text]))`
  - `characters_role_check`: `CHECK (role = ANY (ARRAY['ai'::text, 'user'::text, 'narrator'::text]))`
- Indexes:
  - `characters_pkey` – `CREATE UNIQUE INDEX characters_pkey ON public.characters USING btree (id)`
  - `idx_characters_role` – `CREATE INDEX idx_characters_role ON public.characters USING btree (role)`
  - `idx_characters_user_id` – `CREATE INDEX idx_characters_user_id ON public.characters USING btree (user_id)`
  - `idx_characters_user_id_role` – `CREATE INDEX idx_characters_user_id_role ON public.characters USING btree (user_id, role)`

Columns

| Ord | Name | Type | Nullable | Default |
| --- | ---- | ---- | -------- | ------- |
| 1 | id | uuid (uuid) | NO | gen_random_uuid() |
| 2 | user_id | uuid (uuid) | YES |  |
| 3 | name | text (text) | NO |  |
| 4 | description | text (text) | NO |  |
| 5 | traits | text (text) | YES |  |
| 6 | appearance_tags | ARRAY (_text) | YES |  |
| 7 | image_url | text (text) | YES |  |
| 8 | created_at | timestamp with time zone (timestamptz) | YES | now() |
| 9 | updated_at | timestamp with time zone (timestamptz) | YES | now() |
| 10 | persona | text (text) | YES |  |
| 11 | system_prompt | text (text) | YES |  |
| 12 | voice_tone | character varying (varchar) | YES |  |
| 13 | mood | character varying (varchar) | YES |  |
| 14 | creator_id | uuid (uuid) | YES |  |
| 15 | likes_count | integer (int4) | YES | 0 |
| 16 | interaction_count | integer (int4) | YES | 0 |
| 17 | reference_image_url | text (text) | YES |  |
| 18 | is_public | boolean (bool) | YES | true |
| 19 | gender | text (text) | YES | 'unspecified'::text |
| 20 | content_rating | character varying (varchar) | NO | 'sfw'::character varying |
| 21 | role | text (text) | YES | 'ai'::text |

### compel_configs

- Primary key: `id`
- Foreign keys: (none)
- Unique constraints:
  - `compel_configs_config_hash_key` on columns (`config_hash`)
- Check constraints: (none)
- Indexes:
  - `compel_configs_config_hash_key` – `CREATE UNIQUE INDEX compel_configs_config_hash_key ON public.compel_configs USING btree (config_hash)`
  - `compel_configs_pkey` – `CREATE UNIQUE INDEX compel_configs_pkey ON public.compel_configs USING btree (id)`

Columns

| Ord | Name | Type | Nullable | Default |
| --- | ---- | ---- | -------- | ------- |
| 1 | id | uuid (uuid) | NO | gen_random_uuid() |
| 2 | config_name | character varying (varchar) | NO |  |
| 3 | weights | jsonb (jsonb) | NO |  |
| 4 | config_hash | character varying (varchar) | NO |  |
| 5 | total_tests | integer (int4) | YES | 0 |
| 6 | avg_quality | numeric (numeric) | YES |  |
| 7 | avg_consistency | numeric (numeric) | YES |  |
| 8 | is_active | boolean (bool) | YES | false |
| 9 | created_at | timestamp with time zone (timestamptz) | YES | now() |
| 10 | created_by | uuid (uuid) | YES |  |

### conversations

- Primary key: `id`
- Foreign keys:
  - `project_id` → `projects(id)` (`conversations_project_id_fkey`)
  - `user_character_id` → `characters(id)` (`conversations_user_character_id_fkey`)
  - `character_id` → `characters(id)` (`conversations_character_id_fkey`)
- Unique constraints: (none)
- Check constraints: (none)
- Indexes:
  - `conversations_pkey` – `CREATE UNIQUE INDEX conversations_pkey ON public.conversations USING btree (id)`
  - `idx_conversations_user_character_id` – `CREATE INDEX idx_conversations_user_character_id ON public.conversations USING btree (user_character_id)`

Columns

| Ord | Name | Type | Nullable | Default |
| --- | ---- | ---- | -------- | ------- |
| 1 | id | uuid (uuid) | NO | gen_random_uuid() |
| 2 | user_id | uuid (uuid) | NO |  |
| 3 | project_id | uuid (uuid) | YES |  |
| 4 | title | text (text) | NO | 'New Conversation'::text |
| 5 | conversation_type | text (text) | NO | 'general'::text |
| 6 | status | text (text) | NO | 'active'::text |
| 7 | created_at | timestamp with time zone (timestamptz) | NO | now() |
| 8 | updated_at | timestamp with time zone (timestamptz) | NO | now() |
| 9 | character_id | uuid (uuid) | YES |  |
| 10 | user_character_id | uuid (uuid) | YES |  |

### enhancement_presets

- Primary key: `id`
- Foreign keys: (none)
- Unique constraints: (none)
- Check constraints: (none)
- Indexes:
  - `enhancement_presets_pkey` – `CREATE UNIQUE INDEX enhancement_presets_pkey ON public.enhancement_presets USING btree (id)`

Columns

| Ord | Name | Type | Nullable | Default |
| --- | ---- | ---- | -------- | ------- |
| 1 | id | uuid (uuid) | NO | gen_random_uuid() |
| 2 | preset_name | character varying (varchar) | NO |  |
| 3 | preset_description | text (text) | YES |  |
| 4 | enable_qwen | boolean (bool) | NO |  |
| 5 | enable_compel | boolean (bool) | NO |  |
| 6 | auto_enhancement | boolean (bool) | NO |  |
| 7 | compel_weights | jsonb (jsonb) | YES |  |
| 8 | qwen_settings | jsonb (jsonb) | YES |  |
| 9 | usage_count | integer (int4) | YES | 0 |
| 10 | avg_quality_with_preset | numeric (numeric) | YES |  |
| 11 | is_recommended | boolean (bool) | YES | false |
| 12 | created_at | timestamp with time zone (timestamptz) | YES | now() |
| 13 | created_by | uuid (uuid) | YES |  |

### images

- Primary key: `id`
- Foreign keys:
  - `project_id` → `projects(id)` (`images_project_id_fkey`)
  - `job_id` → `jobs(id)` (`images_job_id_fkey`)
  - `reviewed_by` → `profiles(id)` (`images_reviewed_by_fkey`)
- Unique constraints: (none)
- Check constraints: (none)
- Indexes:
  - `idx_images_created_at` – `CREATE INDEX idx_images_created_at ON public.images USING btree (created_at)`
  - `idx_images_enhancement_strategy` – `CREATE INDEX idx_images_enhancement_strategy ON public.images USING btree (enhancement_strategy)`
  - `idx_images_job_id` – `CREATE INDEX idx_images_job_id ON public.images USING btree (job_id)`
  - `idx_images_project_id` – `CREATE INDEX idx_images_project_id ON public.images USING btree (project_id)`
  - `idx_images_prompt_test_id` – `CREATE INDEX idx_images_prompt_test_id ON public.images USING btree (prompt_test_id)`
  - `idx_images_quality_rating` – `CREATE INDEX idx_images_quality_rating ON public.images USING btree (quality_rating)`
  - `idx_images_reference` – `CREATE INDEX idx_images_reference ON public.images USING btree (reference_image_url) WHERE (reference_image_url IS NOT NULL)`
  - `idx_images_reviewed_by` – `CREATE INDEX idx_images_reviewed_by ON public.images USING btree (reviewed_by)`
  - `idx_images_seed` – `CREATE INDEX idx_images_seed ON public.images USING btree (seed) WHERE (seed IS NOT NULL)`
  - `idx_images_status` – `CREATE INDEX idx_images_status ON public.images USING btree (status)`
  - `idx_images_user_created` – `CREATE INDEX idx_images_user_created ON public.images USING btree (user_id, created_at DESC)`
  - `idx_images_user_id` – `CREATE INDEX idx_images_user_id ON public.images USING btree (user_id)`
  - `idx_images_user_quality_created` – `CREATE INDEX idx_images_user_quality_created ON public.images USING btree (user_id, quality, created_at DESC)`
  - `idx_images_user_status_created` – `CREATE INDEX idx_images_user_status_created ON public.images USING btree (user_id, status, created_at DESC)`
  - `images_pkey` – `CREATE UNIQUE INDEX images_pkey ON public.images USING btree (id)`

Columns

| Ord | Name | Type | Nullable | Default |
| --- | ---- | ---- | -------- | ------- |
| 1 | id | uuid (uuid) | NO | gen_random_uuid() |
| 2 | user_id | uuid (uuid) | NO |  |
| 3 | project_id | uuid (uuid) | YES |  |
| 4 | title | text (text) | YES |  |
| 5 | prompt | text (text) | NO |  |
| 6 | enhanced_prompt | text (text) | YES |  |
| 7 | image_url | text (text) | YES |  |
| 8 | thumbnail_url | text (text) | YES |  |
| 9 | generation_mode | text (text) | NO | 'standalone'::text |
| 10 | status | text (text) | NO | 'pending'::text |
| 11 | metadata | jsonb (jsonb) | YES |  |
| 12 | created_at | timestamp with time zone (timestamptz) | NO | now() |
| 13 | updated_at | timestamp with time zone (timestamptz) | NO | now() |
| 14 | format | text (text) | YES | 'png'::text |
| 15 | quality | text (text) | YES | 'fast'::text |
| 16 | image_urls | jsonb (jsonb) | YES |  |
| 17 | signed_url | text (text) | YES |  |
| 18 | signed_url_expires_at | timestamp with time zone (timestamptz) | YES |  |
| 19 | prompt_test_id | uuid (uuid) | YES |  |
| 20 | test_metadata | jsonb (jsonb) | YES |  |
| 21 | file_size | bigint (int8) | YES |  |
| 22 | nsfw_score | numeric (numeric) | YES |  |
| 23 | moderation_status | text (text) | YES | 'pending'::text |
| 24 | reviewed_at | timestamp with time zone (timestamptz) | YES |  |
| 25 | reviewed_by | uuid (uuid) | YES |  |
| 26 | review_notes | text (text) | YES |  |
| 27 | job_id | uuid (uuid) | YES |  |
| 28 | image_index | integer (int4) | YES |  |
| 29 | reference_image_url | text (text) | YES |  |
| 30 | reference_strength | numeric (numeric) | YES | 0.85 |
| 31 | reference_type | text (text) | YES | 'character'::text |
| 32 | seed | bigint (int8) | YES |  |
| 33 | enhancement_strategy | character varying (varchar) | YES |  |
| 34 | original_prompt | text (text) | YES |  |
| 35 | enhancement_time_ms | integer (int4) | YES |  |
| 36 | quality_rating | numeric (numeric) | YES |  |
| 37 | quality_improvement | numeric (numeric) | YES |  |
| 38 | compel_weights | jsonb (jsonb) | YES |  |
| 39 | qwen_expansion_percentage | numeric (numeric) | YES |  |

### jobs

- Primary key: `id`
- Foreign keys:
  - `user_id` → `profiles(id)` (`jobs_user_id_fkey`)
  - `image_id` → `images(id)` (`jobs_image_id_fkey`)
  - `project_id` → `projects(id)` (`jobs_project_id_fkey`)
  - `reviewed_by` → `profiles(id)` (`jobs_reviewed_by_fkey`)
  - `video_id` → `videos(id)` (`jobs_video_id_fkey`)
  - `workspace_session_id` → `workspace_sessions(id)` (`jobs_workspace_session_id_fkey`)
- Unique constraints: (none)
- Check constraints:
  - `jobs_destination_check`: `CHECK (destination = ANY (ARRAY['library'::text, 'workspace'::text]))`
  - `jobs_format_check`: `CHECK (format = ANY (ARRAY['image'::text, 'video'::text]))`
  - `jobs_job_type_check`: `CHECK (job_type = ANY (ARRAY['image_fast'::text, 'image_high'::text, 'video_fast'::text, 'video_high'::text, 'sdxl_image_fast'::text, 'sdxl_image_high'::text, 'image7b_fast_enhanced'::text, 'image7b_high_enhanced'::text, 'video7b_fast_enhanced'::text, 'video7b_high_enhanced'::text]))`
  - `jobs_quality_check`: `CHECK (quality = ANY (ARRAY['fast'::text, 'high'::text]))`
  - `jobs_status_check`: `CHECK (status = ANY (ARRAY['queued'::text, 'processing'::text, 'completed'::text, 'failed'::text]))`
- Indexes:
  - `idx_jobs_asset_lookup` – `CREATE INDEX idx_jobs_asset_lookup ON public.jobs USING btree (user_id, image_id, video_id, status, job_type)`
  - `idx_jobs_cleanup` – `CREATE INDEX idx_jobs_cleanup ON public.jobs USING btree (status, created_at) WHERE (status = ANY (ARRAY['processing'::text, 'queued'::text, 'failed'::text]))`
  - `idx_jobs_created_at` – `CREATE INDEX idx_jobs_created_at ON public.jobs USING btree (created_at)`
  - `idx_jobs_destination` – `CREATE INDEX idx_jobs_destination ON public.jobs USING btree (destination)`
  - `idx_jobs_enhancement_strategy` – `CREATE INDEX idx_jobs_enhancement_strategy ON public.jobs USING btree (enhancement_strategy)`
  - `idx_jobs_format_quality` – `CREATE INDEX idx_jobs_format_quality ON public.jobs USING btree (format, quality)`
  - `idx_jobs_image_id` – `CREATE INDEX idx_jobs_image_id ON public.jobs USING btree (image_id)`
  - `idx_jobs_model_type` – `CREATE INDEX idx_jobs_model_type ON public.jobs USING btree (model_type)`
  - `idx_jobs_project_id` – `CREATE INDEX idx_jobs_project_id ON public.jobs USING btree (project_id)`
  - `idx_jobs_quality_rating` – `CREATE INDEX idx_jobs_quality_rating ON public.jobs USING btree (quality_rating)`
  - `idx_jobs_reviewed_by` – `CREATE INDEX idx_jobs_reviewed_by ON public.jobs USING btree (reviewed_by)`
  - `idx_jobs_status_created` – `CREATE INDEX idx_jobs_status_created ON public.jobs USING btree (status, created_at) WHERE (status = ANY (ARRAY['processing'::text, 'queued'::text]))`
  - `idx_jobs_user_status_created` – `CREATE INDEX idx_jobs_user_status_created ON public.jobs USING btree (user_id, status, created_at DESC)`
  - `idx_jobs_video_id` – `CREATE INDEX idx_jobs_video_id ON public.jobs USING btree (video_id) WHERE (video_id IS NOT NULL)`
  - `idx_jobs_workspace_session` – `CREATE INDEX idx_jobs_workspace_session ON public.jobs USING btree (workspace_session_id)`
  - `jobs_pkey` – `CREATE UNIQUE INDEX jobs_pkey ON public.jobs USING btree (id)`

Columns

| Ord | Name | Type | Nullable | Default |
| --- | ---- | ---- | -------- | ------- |
| 1 | id | uuid (uuid) | NO | gen_random_uuid() |
| 2 | video_id | uuid (uuid) | YES |  |
| 3 | user_id | uuid (uuid) | NO |  |
| 4 | job_type | text (text) | NO |  |
| 5 | status | text (text) | YES | 'queued'::text |
| 6 | error_message | text (text) | YES |  |
| 7 | attempts | integer (int4) | YES | 0 |
| 8 | max_attempts | integer (int4) | YES | 3 |
| 9 | metadata | jsonb (jsonb) | YES |  |
| 10 | created_at | timestamp with time zone (timestamptz) | YES | now() |
| 11 | started_at | timestamp with time zone (timestamptz) | YES |  |
| 12 | completed_at | timestamp with time zone (timestamptz) | YES |  |
| 13 | project_id | uuid (uuid) | YES |  |
| 14 | image_id | uuid (uuid) | YES |  |
| 15 | format | text (text) | YES |  |
| 16 | quality | text (text) | YES |  |
| 17 | model_type | text (text) | YES |  |
| 18 | prompt_test_id | uuid (uuid) | YES |  |
| 19 | test_metadata | jsonb (jsonb) | YES |  |
| 20 | moderation_status | text (text) | YES | 'pending'::text |
| 21 | reviewed_at | timestamp with time zone (timestamptz) | YES |  |
| 22 | reviewed_by | uuid (uuid) | YES |  |
| 23 | review_notes | text (text) | YES |  |
| 24 | enhancement_strategy | character varying (varchar) | YES |  |
| 25 | original_prompt | text (text) | YES |  |
| 26 | enhanced_prompt | text (text) | YES |  |
| 27 | enhancement_time_ms | integer (int4) | YES |  |
| 28 | quality_rating | numeric (numeric) | YES |  |
| 29 | quality_improvement | numeric (numeric) | YES |  |
| 30 | compel_weights | jsonb (jsonb) | YES |  |
| 31 | qwen_expansion_percentage | numeric (numeric) | YES |  |
| 32 | destination | text (text) | YES | 'library'::text |
| 33 | workspace_session_id | uuid (uuid) | YES |  |
| 34 | template_name | text (text) | YES |  |

### messages

- Primary key: `id`
- Foreign keys:
  - `conversation_id` → `conversations(id)` (`messages_conversation_id_fkey`)
- Unique constraints: (none)
- Check constraints:
  - `messages_sender_check`: `CHECK (sender = ANY (ARRAY['user'::text, 'assistant'::text]))`
- Indexes:
  - `messages_pkey` – `CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id)`

Columns

| Ord | Name | Type | Nullable | Default |
| --- | ---- | ---- | -------- | ------- |
| 1 | id | uuid (uuid) | NO | gen_random_uuid() |
| 2 | conversation_id | uuid (uuid) | NO |  |
| 3 | sender | text (text) | NO |  |
| 4 | content | text (text) | NO |  |
| 5 | message_type | text (text) | NO | 'text'::text |
| 6 | created_at | timestamp with time zone (timestamptz) | NO | now() |

### model_config_history

- Primary key: `id`
- Foreign keys:
  - `created_by` → `profiles(id)` (`model_config_history_created_by_fkey`)
- Unique constraints: (none)
- Check constraints:
  - `model_config_history_model_type_check`: `CHECK (model_type::text = ANY (ARRAY['SDXL'::character varying, 'WAN'::character varying]::text[]))`
- Indexes:
  - `idx_model_config_history_created_by` – `CREATE INDEX idx_model_config_history_created_by ON public.model_config_history USING btree (created_by)`
  - `model_config_history_pkey` – `CREATE UNIQUE INDEX model_config_history_pkey ON public.model_config_history USING btree (id)`

Columns

| Ord | Name | Type | Nullable | Default |
| --- | ---- | ---- | -------- | ------- |
| 1 | id | uuid (uuid) | NO | gen_random_uuid() |
| 2 | model_type | character varying (varchar) | NO |  |
| 3 | config_name | character varying (varchar) | NO |  |
| 4 | config_data | jsonb (jsonb) | NO |  |
| 5 | is_active | boolean (bool) | YES | false |
| 6 | created_by | uuid (uuid) | YES |  |
| 7 | created_at | timestamp with time zone (timestamptz) | YES | now() |
| 8 | notes | text (text) | YES |  |

### model_performance_logs

- Primary key: `id`
- Foreign keys: (none)
- Unique constraints:
  - `model_performance_logs_model_type_date_key` on columns (`model_type`, `date`)
- Check constraints:
  - `model_performance_logs_model_type_check`: `CHECK (model_type::text = ANY (ARRAY['SDXL'::character varying, 'WAN'::character varying]::text[]))`
- Indexes:
  - `model_performance_logs_model_type_date_key` – `CREATE UNIQUE INDEX model_performance_logs_model_type_date_key ON public.model_performance_logs USING btree (model_type, date)`
  - `model_performance_logs_pkey` – `CREATE UNIQUE INDEX model_performance_logs_pkey ON public.model_performance_logs USING btree (id)`

Columns

| Ord | Name | Type | Nullable | Default |
| --- | ---- | ---- | -------- | ------- |
| 1 | id | uuid (uuid) | NO | gen_random_uuid() |
| 2 | model_type | character varying (varchar) | NO |  |
| 3 | date | date (date) | NO |  |
| 4 | total_generations | integer (int4) | YES | 0 |
| 5 | successful_generations | integer (int4) | YES | 0 |
| 6 | failed_generations | integer (int4) | YES | 0 |
| 7 | avg_generation_time_ms | integer (int4) | YES |  |
| 8 | avg_quality_rating | numeric (numeric) | YES |  |
| 9 | total_processing_time_ms | integer (int4) | YES |  |
| 10 | created_at | timestamp with time zone (timestamptz) | YES | now() |
| 11 | updated_at | timestamp with time zone (timestamptz) | YES | now() |

### model_test_results

- Primary key: `id`
- Foreign keys:
  - `job_id` → `jobs(id)` (`model_test_results_job_id_fkey`)
  - `image_id` → `images(id)` (`model_test_results_image_id_fkey`)
  - `video_id` → `videos(id)` (`model_test_results_video_id_fkey`)
- Unique constraints: (none)
- Check constraints:
  - `model_test_results_consistency_check`: `CHECK (consistency >= 0 AND consistency <= 10)`
  - `model_test_results_content_quality_check`: `CHECK (content_quality >= 0 AND content_quality <= 10)`
  - `model_test_results_model_type_check`: `CHECK (model_type::text = ANY (ARRAY['SDXL'::character varying, 'WAN'::character varying, 'LORA'::character varying]::text[]))`
  - `model_test_results_overall_quality_check`: `CHECK (overall_quality >= 0 AND overall_quality <= 10)`
  - `model_test_results_technical_quality_check`: `CHECK (technical_quality >= 0 AND technical_quality <= 10)`
  - `model_test_results_test_tier_check`: `CHECK (test_tier::text = ANY (ARRAY['artistic'::character varying, 'explicit'::character varying, 'unrestricted'::character varying]::text[]))`
- Indexes:
  - `idx_model_test_results_created_at` – `CREATE INDEX idx_model_test_results_created_at ON public.model_test_results USING btree (created_at)`
  - `idx_model_test_results_enhancement_strategy` – `CREATE INDEX idx_model_test_results_enhancement_strategy ON public.model_test_results USING btree (enhancement_strategy)`
  - `idx_model_test_results_image_id` – `CREATE INDEX idx_model_test_results_image_id ON public.model_test_results USING btree (image_id)`
  - `idx_model_test_results_job_id` – `CREATE INDEX idx_model_test_results_job_id ON public.model_test_results USING btree (job_id)`
  - `idx_model_test_results_quality_improvement` – `CREATE INDEX idx_model_test_results_quality_improvement ON public.model_test_results USING btree (quality_improvement)`
  - `idx_model_test_results_video_id` – `CREATE INDEX idx_model_test_results_video_id ON public.model_test_results USING btree (video_id)`
  - `model_test_results_pkey` – `CREATE UNIQUE INDEX model_test_results_pkey ON public.model_test_results USING btree (id)`

Columns

| Ord | Name | Type | Nullable | Default |
| --- | ---- | ---- | -------- | ------- |
| 1 | id | uuid (uuid) | NO | gen_random_uuid() |
| 2 | user_id | uuid (uuid) | YES |  |
| 3 | model_type | character varying (varchar) | NO |  |
| 4 | model_version | character varying (varchar) | YES |  |
| 5 | prompt_text | text (text) | NO |  |
| 6 | success | boolean (bool) | NO | true |
| 7 | overall_quality | integer (int4) | YES |  |
| 8 | technical_quality | integer (int4) | YES |  |
| 9 | content_quality | integer (int4) | YES |  |
| 10 | consistency | integer (int4) | YES |  |
| 11 | test_series | character varying (varchar) | NO |  |
| 12 | test_tier | character varying (varchar) | NO |  |
| 13 | test_category | character varying (varchar) | YES |  |
| 14 | test_metadata | jsonb (jsonb) | NO | '{}'::jsonb |
| 15 | job_id | uuid (uuid) | YES |  |
| 16 | image_id | uuid (uuid) | YES |  |
| 17 | video_id | uuid (uuid) | YES |  |
| 18 | generation_time_ms | integer (int4) | YES |  |
| 19 | file_size_bytes | integer (int4) | YES |  |
| 20 | notes | text (text) | YES |  |
| 21 | created_at | timestamp with time zone (timestamptz) | YES | now() |
| 22 | updated_at | timestamp with time zone (timestamptz) | YES | now() |
| 23 | enhancement_strategy | character varying (varchar) | YES |  |
| 24 | original_prompt | text (text) | YES |  |
| 25 | enhanced_prompt | text (text) | YES |  |
| 26 | enhancement_time_ms | integer (int4) | YES |  |
| 27 | quality_improvement | numeric (numeric) | YES |  |
| 28 | compel_weights | jsonb (jsonb) | YES |  |
| 29 | qwen_expansion_percentage | numeric (numeric) | YES |  |
| 30 | baseline_quality | numeric (numeric) | YES |  |

### negative_prompts

- Primary key: `id`
- Foreign keys: (none)
- Unique constraints:
  - `unique_negative_prompt_per_model_mode` on columns (`model_type`, `content_mode`, `negative_prompt`)
- Check constraints: (none)
- Indexes:
  - `negative_prompts_pkey` – `CREATE UNIQUE INDEX negative_prompts_pkey ON public.negative_prompts USING btree (id)`
  - `unique_negative_prompt_per_model_mode` – `CREATE UNIQUE INDEX unique_negative_prompt_per_model_mode ON public.negative_prompts USING btree (model_type, content_mode, negative_prompt)`

Columns

| Ord | Name | Type | Nullable | Default |
| --- | ---- | ---- | -------- | ------- |
| 1 | id | uuid (uuid) | NO | gen_random_uuid() |
| 2 | model_type | character varying (varchar) | NO | 'sdxl'::character varying |
| 3 | content_mode | character varying (varchar) | NO | 'nsfw'::character varying |
| 4 | negative_prompt | text (text) | NO |  |
| 5 | is_active | boolean (bool) | YES | true |
| 6 | priority | integer (int4) | YES | 1 |
| 7 | created_at | timestamp with time zone (timestamptz) | YES | now() |
| 8 | updated_at | timestamp with time zone (timestamptz) | YES | now() |
| 9 | created_by | uuid (uuid) | YES |  |
| 10 | description | text (text) | YES |  |

### profiles

- Primary key: `id`
- Foreign keys: (none)
- Unique constraints:
  - `profiles_username_key` on columns (`username`)
- Check constraints:
  - `profiles_subscription_status_check`: `CHECK (subscription_status = ANY (ARRAY['inactive'::text, 'starter'::text, 'pro'::text, 'creator'::text]))`
- Indexes:
  - `profiles_pkey` – `CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id)`
  - `profiles_username_key` – `CREATE UNIQUE INDEX profiles_username_key ON public.profiles USING btree (username)`

Columns

| Ord | Name | Type | Nullable | Default |
| --- | ---- | ---- | -------- | ------- |
| 1 | id | uuid (uuid) | NO |  |
| 2 | username | text (text) | YES |  |
| 3 | subscription_status | text (text) | YES | 'inactive'::text |
| 4 | token_balance | integer (int4) | YES | 100 |
| 5 | created_at | timestamp with time zone (timestamptz) | YES | now() |
| 6 | updated_at | timestamp with time zone (timestamptz) | YES | now() |
| 7 | age_verified | boolean (bool) | YES | false |

### projects

- Primary key: `id`
- Foreign keys:
  - `user_id` → `profiles(id)` (`projects_user_id_fkey`)
  - `character_id` → `characters(id)` (`projects_character_id_fkey`)
- Unique constraints: (none)
- Check constraints:
  - `projects_media_type_check`: `CHECK (media_type = ANY (ARRAY['image'::text, 'video'::text]))`
  - `projects_workflow_step_check`: `CHECK (workflow_step = ANY (ARRAY['configuration'::text, 'character_selection'::text, 'story_breakdown'::text, 'storyboard_generation'::text, 'video_generation'::text, 'completed'::text]))`
- Indexes:
  - `idx_projects_character_id` – `CREATE INDEX idx_projects_character_id ON public.projects USING btree (character_id)`
  - `idx_projects_user_id` – `CREATE INDEX idx_projects_user_id ON public.projects USING btree (user_id)`
  - `projects_pkey` – `CREATE UNIQUE INDEX projects_pkey ON public.projects USING btree (id)`

Columns

| Ord | Name | Type | Nullable | Default |
| --- | ---- | ---- | -------- | ------- |
| 1 | id | uuid (uuid) | NO | gen_random_uuid() |
| 2 | user_id | uuid (uuid) | NO |  |
| 3 | title | text (text) | YES |  |
| 4 | original_prompt | text (text) | NO |  |
| 5 | enhanced_prompt | text (text) | YES |  |
| 6 | media_type | text (text) | NO |  |
| 7 | duration | integer (int4) | YES | 0 |
| 8 | scene_count | integer (int4) | YES | 1 |
| 9 | workflow_step | text (text) | YES | 'configuration'::text |
| 10 | character_id | uuid (uuid) | YES |  |
| 11 | created_at | timestamp with time zone (timestamptz) | YES | now() |
| 12 | updated_at | timestamp with time zone (timestamptz) | YES | now() |
| 13 | preview_url | text (text) | YES |  |
| 14 | reference_image_url | text (text) | YES |  |

### prompt_ab_tests

- Primary key: `id`
- Foreign keys: (none)
- Unique constraints: (none)
- Check constraints: (none)
- Indexes:
  - `prompt_ab_tests_pkey` – `CREATE UNIQUE INDEX prompt_ab_tests_pkey ON public.prompt_ab_tests USING btree (id)`

Columns

| Ord | Name | Type | Nullable | Default |
| --- | ---- | ---- | -------- | ------- |
| 1 | id | uuid (uuid) | NO | gen_random_uuid() |
| 2 | test_name | character varying (varchar) | NO |  |
| 3 | test_series | character varying (varchar) | NO |  |
| 4 | baseline_config | jsonb (jsonb) | NO |  |
| 5 | enhanced_config | jsonb (jsonb) | NO |  |
| 6 | total_participants | integer (int4) | YES | 0 |
| 7 | baseline_avg_quality | numeric (numeric) | YES |  |
| 8 | enhanced_avg_quality | numeric (numeric) | YES |  |
| 9 | quality_improvement | numeric (numeric) | YES |  |
| 10 | confidence_level | numeric (numeric) | YES |  |
| 11 | is_complete | boolean (bool) | YES | false |
| 12 | created_at | timestamp with time zone (timestamptz) | YES | now() |
| 13 | completed_at | timestamp with time zone (timestamptz) | YES |  |

### prompt_templates

- Primary key: `id`
- Foreign keys: (none)
- Unique constraints:
  - `unique_template_per_model_usecase_mode` on columns (`enhancer_model`, `use_case`, `content_mode`, `template_name`)
- Check constraints:
  - `prompt_templates_job_type_check`: `CHECK (job_type = ANY (ARRAY['chat'::text, 'image'::text, 'video'::text]))`
  - `prompt_templates_target_model_check`: `CHECK (target_model = ANY (ARRAY['sdxl'::text, 'wan'::text]))`
- Indexes:
  - `prompt_templates_pkey` – `CREATE UNIQUE INDEX prompt_templates_pkey ON public.prompt_templates USING btree (id)`
  - `unique_template_per_model_usecase_mode` – `CREATE UNIQUE INDEX unique_template_per_model_usecase_mode ON public.prompt_templates USING btree (enhancer_model, use_case, content_mode, template_name)`

Columns

| Ord | Name | Type | Nullable | Default |
| --- | ---- | ---- | -------- | ------- |
| 1 | id | uuid (uuid) | NO | gen_random_uuid() |
| 2 | enhancer_model | character varying (varchar) | NO |  |
| 3 | use_case | character varying (varchar) | NO |  |
| 4 | content_mode | character varying (varchar) | NO | 'nsfw'::character varying |
| 5 | template_name | character varying (varchar) | NO |  |
| 6 | system_prompt | text (text) | NO |  |
| 7 | token_limit | integer (int4) | YES | 512 |
| 8 | is_active | boolean (bool) | YES | true |
| 9 | created_at | timestamp with time zone (timestamptz) | YES | now() |
| 10 | updated_at | timestamp with time zone (timestamptz) | YES | now() |
| 11 | created_by | uuid (uuid) | YES |  |
| 12 | version | integer (int4) | YES | 1 |
| 13 | metadata | jsonb (jsonb) | YES | '{}'::jsonb |
| 14 | job_type | text (text) | YES |  |
| 15 | target_model | text (text) | YES |  |
| 17 | description | text (text) | YES |  |
| 18 | comment | text (text) | YES |  |

### scenes

- Primary key: `id`
- Foreign keys:
  - `project_id` → `projects(id)` (`scenes_project_id_fkey`)
- Unique constraints:
  - `scenes_project_id_scene_number_key` on columns (`project_id`, `scene_number`)
- Check constraints: (none)
- Indexes:
  - `scenes_pkey` – `CREATE UNIQUE INDEX scenes_pkey ON public.scenes USING btree (id)`
  - `scenes_project_id_scene_number_key` – `CREATE UNIQUE INDEX scenes_project_id_scene_number_key ON public.scenes USING btree (project_id, scene_number)`

Columns

| Ord | Name | Type | Nullable | Default |
| --- | ---- | ---- | -------- | ------- |
| 1 | id | uuid (uuid) | NO | gen_random_uuid() |
| 2 | project_id | uuid (uuid) | NO |  |
| 3 | scene_number | integer (int4) | NO |  |
| 4 | description | text (text) | NO |  |
| 5 | enhanced_prompt | text (text) | YES |  |
| 6 | image_url | text (text) | YES |  |
| 7 | approved | boolean (bool) | YES | false |
| 8 | created_at | timestamp with time zone (timestamptz) | YES | now() |
| 9 | updated_at | timestamp with time zone (timestamptz) | YES | now() |
| 10 | final_stitched_url | text (text) | YES |  |

### system_config

- Primary key: `id`
- Foreign keys: (none)
- Unique constraints: (none)
- Check constraints: (none)
- Indexes:
  - `system_config_pkey` – `CREATE UNIQUE INDEX system_config_pkey ON public.system_config USING btree (id)`

Columns

| Ord | Name | Type | Nullable | Default |
| --- | ---- | ---- | -------- | ------- |
| 1 | id | bigint (int8) | NO | 1 |
| 2 | config | jsonb (jsonb) | NO | '{}'::jsonb |
| 3 | created_at | timestamp with time zone (timestamptz) | YES | now() |
| 4 | updated_at | timestamp with time zone (timestamptz) | YES | now() |

### usage_logs

- Primary key: `id`
- Foreign keys:
  - `user_id` → `profiles(id)` (`usage_logs_user_id_fkey`)
- Unique constraints: (none)
- Check constraints: (none)
- Indexes:
  - `idx_usage_logs_format_quality` – `CREATE INDEX idx_usage_logs_format_quality ON public.usage_logs USING btree (format, quality)`
  - `idx_usage_logs_user_id` – `CREATE INDEX idx_usage_logs_user_id ON public.usage_logs USING btree (user_id)`
  - `usage_logs_pkey` – `CREATE UNIQUE INDEX usage_logs_pkey ON public.usage_logs USING btree (id)`

Columns

| Ord | Name | Type | Nullable | Default |
| --- | ---- | ---- | -------- | ------- |
| 1 | id | uuid (uuid) | NO | gen_random_uuid() |
| 2 | user_id | uuid (uuid) | NO |  |
| 3 | action | text (text) | NO |  |
| 4 | credits_consumed | numeric (numeric) | YES | 1.0 |
| 5 | metadata | jsonb (jsonb) | YES |  |
| 6 | created_at | timestamp with time zone (timestamptz) | YES | now() |
| 7 | format | text (text) | YES |  |
| 8 | quality | text (text) | YES |  |

### user_activity_log

- Primary key: `id`
- Foreign keys:
  - `user_id` → `profiles(id)` (`user_activity_log_user_id_fkey`)
- Unique constraints: (none)
- Check constraints: (none)
- Indexes:
  - `idx_user_activity_log_created_at` – `CREATE INDEX idx_user_activity_log_created_at ON public.user_activity_log USING btree (created_at)`
  - `user_activity_log_pkey` – `CREATE UNIQUE INDEX user_activity_log_pkey ON public.user_activity_log USING btree (id)`

Columns

| Ord | Name | Type | Nullable | Default |
| --- | ---- | ---- | -------- | ------- |
| 1 | id | uuid (uuid) | NO | gen_random_uuid() |
| 2 | user_id | uuid (uuid) | YES |  |
| 3 | action | text (text) | NO |  |
| 4 | resource_type | text (text) | YES |  |
| 5 | resource_id | text (text) | YES |  |
| 6 | metadata | jsonb (jsonb) | YES | '{}'::jsonb |
| 7 | ip_address | inet (inet) | YES |  |
| 8 | user_agent | text (text) | YES |  |
| 9 | created_at | timestamp with time zone (timestamptz) | YES | now() |

### user_collections

- Primary key: `id`
- Foreign keys: (none)
- Unique constraints: (none)
- Check constraints: (none)
- Indexes:
  - `idx_collections_user` – `CREATE INDEX idx_collections_user ON public.user_collections USING btree (user_id, created_at DESC)`
  - `user_collections_pkey` – `CREATE UNIQUE INDEX user_collections_pkey ON public.user_collections USING btree (id)`

Columns

| Ord | Name | Type | Nullable | Default |
| --- | ---- | ---- | -------- | ------- |
| 1 | id | uuid (uuid) | NO | gen_random_uuid() |
| 2 | user_id | uuid (uuid) | NO |  |
| 3 | name | text (text) | NO |  |
| 4 | description | text (text) | YES |  |
| 5 | asset_count | integer (int4) | YES | 0 |
| 6 | created_at | timestamp with time zone (timestamptz) | YES | now() |

### user_library

- Primary key: `id`
- Foreign keys:
  - `collection_id` → `user_collections(id)` (`user_library_collection_id_fkey`)
- Unique constraints: (none)
- Check constraints:
  - `user_library_asset_type_check`: `CHECK (asset_type = ANY (ARRAY['image'::text, 'video'::text]))`
  - `user_library_visibility_check`: `CHECK (visibility = ANY (ARRAY['private'::text, 'unlisted'::text, 'public'::text]))`
- Indexes:
  - `idx_library_collection` – `CREATE INDEX idx_library_collection ON public.user_library USING btree (collection_id, created_at DESC)`
  - `idx_library_user_created` – `CREATE INDEX idx_library_user_created ON public.user_library USING btree (user_id, created_at DESC)`
  - `user_library_pkey` – `CREATE UNIQUE INDEX user_library_pkey ON public.user_library USING btree (id)`

Columns

| Ord | Name | Type | Nullable | Default |
| --- | ---- | ---- | -------- | ------- |
| 1 | id | uuid (uuid) | NO | gen_random_uuid() |
| 2 | user_id | uuid (uuid) | NO |  |
| 3 | asset_type | text (text) | NO |  |
| 4 | storage_path | text (text) | NO |  |
| 5 | file_size_bytes | bigint (int8) | NO |  |
| 6 | mime_type | text (text) | NO |  |
| 7 | duration_seconds | numeric (numeric) | YES |  |
| 8 | original_prompt | text (text) | NO |  |
| 9 | model_used | text (text) | NO |  |
| 10 | generation_seed | bigint (int8) | YES |  |
| 11 | collection_id | uuid (uuid) | YES |  |
| 12 | custom_title | text (text) | YES |  |
| 13 | tags | ARRAY (_text) | YES | '{}'::text[] |
| 14 | is_favorite | boolean (bool) | YES | false |
| 15 | visibility | text (text) | YES | 'private'::text |
| 16 | created_at | timestamp with time zone (timestamptz) | YES | now() |
| 17 | updated_at | timestamp with time zone (timestamptz) | YES | now() |

### user_roles

- Primary key: `id`
- Foreign keys: (none)
- Unique constraints:
  - `user_roles_user_id_role_key` on columns (`user_id`, `role`)
- Check constraints: (none)
- Indexes:
  - `user_roles_pkey` – `CREATE UNIQUE INDEX user_roles_pkey ON public.user_roles USING btree (id)`
  - `user_roles_user_id_role_key` – `CREATE UNIQUE INDEX user_roles_user_id_role_key ON public.user_roles USING btree (user_id, role)`

Columns

| Ord | Name | Type | Nullable | Default |
| --- | ---- | ---- | -------- | ------- |
| 1 | id | uuid (uuid) | NO | gen_random_uuid() |
| 2 | user_id | uuid (uuid) | NO |  |
| 3 | role | USER-DEFINED (app_role) | NO |  |
| 4 | created_at | timestamp with time zone (timestamptz) | YES | now() |

### videos

- Primary key: `id`
- Foreign keys:
  - `user_id` → `profiles(id)` (`videos_user_id_fkey`)
  - `project_id` → `projects(id)` (`videos_project_id_fkey`)
- Unique constraints: (none)
- Check constraints:
  - `videos_status_check`: `CHECK (status = ANY (ARRAY['draft'::text, 'queued'::text, 'processing'::text, 'generating'::text, 'completed'::text, 'failed'::text, 'cancelled'::text]))`
- Indexes:
  - `idx_videos_created_at` – `CREATE INDEX idx_videos_created_at ON public.videos USING btree (created_at)`
  - `idx_videos_enhancement_strategy` – `CREATE INDEX idx_videos_enhancement_strategy ON public.videos USING btree (enhancement_strategy)`
  - `idx_videos_project_id` – `CREATE INDEX idx_videos_project_id ON public.videos USING btree (project_id)`
  - `idx_videos_quality_rating` – `CREATE INDEX idx_videos_quality_rating ON public.videos USING btree (quality_rating)`
  - `idx_videos_user_created` – `CREATE INDEX idx_videos_user_created ON public.videos USING btree (user_id, created_at DESC)`
  - `idx_videos_user_id` – `CREATE INDEX idx_videos_user_id ON public.videos USING btree (user_id)`
  - `idx_videos_user_status_created` – `CREATE INDEX idx_videos_user_status_created ON public.videos USING btree (user_id, status, created_at DESC)`
  - `videos_pkey` – `CREATE UNIQUE INDEX videos_pkey ON public.videos USING btree (id)`

Columns

| Ord | Name | Type | Nullable | Default |
| --- | ---- | ---- | -------- | ------- |
| 1 | id | uuid (uuid) | NO | gen_random_uuid() |
| 2 | project_id | uuid (uuid) | YES |  |
| 3 | user_id | uuid (uuid) | NO |  |
| 4 | thumbnail_url | text (text) | YES |  |
| 5 | video_url | text (text) | YES |  |
| 6 | status | text (text) | YES | 'draft'::text |
| 7 | duration | integer (int4) | YES | 5 |
| 8 | resolution | text (text) | YES | '720p'::text |
| 9 | format | text (text) | YES | 'mp4'::text |
| 10 | created_at | timestamp with time zone (timestamptz) | YES | now() |
| 11 | completed_at | timestamp with time zone (timestamptz) | YES |  |
| 12 | expires_at | timestamp with time zone (timestamptz) | YES | (now() + '30 days'::interval) |
| 13 | preview_url | text (text) | YES |  |
| 14 | reference_image_url | text (text) | YES |  |
| 15 | updated_at | timestamp with time zone (timestamptz) | YES | now() |
| 16 | error_message | text (text) | YES |  |
| 17 | signed_url | text (text) | YES |  |
| 18 | signed_url_expires_at | timestamp with time zone (timestamptz) | YES |  |
| 19 | metadata | jsonb (jsonb) | YES |  |
| 20 | title | text (text) | YES |  |
| 21 | enhancement_strategy | character varying (varchar) | YES |  |
| 22 | original_prompt | text (text) | YES |  |
| 23 | enhanced_prompt | text (text) | YES |  |
| 24 | enhancement_time_ms | integer (int4) | YES |  |
| 25 | quality_rating | numeric (numeric) | YES |  |
| 26 | quality_improvement | numeric (numeric) | YES |  |
| 27 | compel_weights | jsonb (jsonb) | YES |  |
| 28 | qwen_expansion_percentage | numeric (numeric) | YES |  |

### workspace_assets

- Primary key: `id`
- Foreign keys: (none)
- Unique constraints:
  - `workspace_assets_job_id_asset_index_unique` on columns (`job_id`, `asset_index`)
  - `workspace_assets_user_id_job_id_asset_index_key` on columns (`user_id`, `job_id`, `asset_index`)
- Check constraints:
  - `workspace_assets_asset_type_check`: `CHECK (asset_type = ANY (ARRAY['image'::text, 'video'::text]))`
- Indexes:
  - `idx_workspace_expires` – `CREATE INDEX idx_workspace_expires ON public.workspace_assets USING btree (expires_at)`
  - `idx_workspace_job` – `CREATE INDEX idx_workspace_job ON public.workspace_assets USING btree (job_id, asset_index)`
  - `idx_workspace_user_created` – `CREATE INDEX idx_workspace_user_created ON public.workspace_assets USING btree (user_id, created_at DESC)`
  - `workspace_assets_job_id_asset_index_unique` – `CREATE UNIQUE INDEX workspace_assets_job_id_asset_index_unique ON public.workspace_assets USING btree (job_id, asset_index)`
  - `workspace_assets_pkey` – `CREATE UNIQUE INDEX workspace_assets_pkey ON public.workspace_assets USING btree (id)`
  - `workspace_assets_user_id_job_id_asset_index_key` – `CREATE UNIQUE INDEX workspace_assets_user_id_job_id_asset_index_key ON public.workspace_assets USING btree (user_id, job_id, asset_index)`

Columns

| Ord | Name | Type | Nullable | Default |
| --- | ---- | ---- | -------- | ------- |
| 1 | id | uuid (uuid) | NO | gen_random_uuid() |
| 2 | user_id | uuid (uuid) | NO |  |
| 3 | asset_type | text (text) | NO |  |
| 4 | temp_storage_path | text (text) | NO |  |
| 5 | file_size_bytes | bigint (int8) | NO |  |
| 6 | mime_type | text (text) | NO |  |
| 7 | duration_seconds | numeric (numeric) | YES |  |
| 8 | job_id | uuid (uuid) | NO |  |
| 9 | asset_index | integer (int4) | NO | 0 |
| 10 | generation_seed | bigint (int8) | NO |  |
| 11 | original_prompt | text (text) | NO |  |
| 12 | model_used | text (text) | NO |  |
| 13 | generation_settings | jsonb (jsonb) | YES | '{}'::jsonb |
| 14 | created_at | timestamp with time zone (timestamptz) | YES | now() |
| 15 | expires_at | timestamp with time zone (timestamptz) | YES | (now() + '7 days'::interval) |

### workspace_items

- Primary key: `id`
- Foreign keys:
  - `user_id` → `profiles(id)` (`workspace_items_user_id_fkey`)
  - `session_id` → `workspace_sessions(id)` (`workspace_items_session_id_fkey`)
  - `job_id` → `jobs(id)` (`workspace_items_job_id_fkey`)
- Unique constraints: (none)
- Check constraints:
  - `workspace_items_content_type_check`: `CHECK (content_type = ANY (ARRAY['image'::text, 'video'::text]))`
  - `workspace_items_quality_check`: `CHECK (quality = ANY (ARRAY['fast'::text, 'high'::text]))`
  - `workspace_items_status_check`: `CHECK (status = ANY (ARRAY['generating'::text, 'generated'::text, 'failed'::text, 'saved'::text]))`
- Indexes:
  - `idx_workspace_items_job_id` – `CREATE INDEX idx_workspace_items_job_id ON public.workspace_items USING btree (job_id)`
  - `idx_workspace_items_job_id_session` – `CREATE INDEX idx_workspace_items_job_id_session ON public.workspace_items USING btree (job_id, session_id)`
  - `idx_workspace_items_session_id` – `CREATE INDEX idx_workspace_items_session_id ON public.workspace_items USING btree (session_id)`
  - `idx_workspace_items_status` – `CREATE INDEX idx_workspace_items_status ON public.workspace_items USING btree (status)`
  - `idx_workspace_items_user_created` – `CREATE INDEX idx_workspace_items_user_created ON public.workspace_items USING btree (user_id, created_at DESC)`
  - `idx_workspace_items_user_id` – `CREATE INDEX idx_workspace_items_user_id ON public.workspace_items USING btree (user_id)`
  - `workspace_items_pkey` – `CREATE UNIQUE INDEX workspace_items_pkey ON public.workspace_items USING btree (id)`

Columns

| Ord | Name | Type | Nullable | Default |
| --- | ---- | ---- | -------- | ------- |
| 1 | id | uuid (uuid) | NO | gen_random_uuid() |
| 2 | session_id | uuid (uuid) | NO |  |
| 3 | job_id | uuid (uuid) | YES |  |
| 4 | user_id | uuid (uuid) | NO |  |
| 5 | prompt | text (text) | NO |  |
| 6 | enhanced_prompt | text (text) | YES |  |
| 7 | content_type | text (text) | NO |  |
| 8 | model_type | text (text) | YES |  |
| 9 | quality | text (text) | YES |  |
| 10 | storage_path | text (text) | YES |  |
| 11 | bucket_name | text (text) | YES |  |
| 12 | url | text (text) | YES |  |
| 13 | thumbnail_url | text (text) | YES |  |
| 14 | generation_params | jsonb (jsonb) | YES | '{}'::jsonb |
| 15 | seed | integer (int4) | YES |  |
| 16 | reference_image_url | text (text) | YES |  |
| 17 | reference_strength | numeric (numeric) | YES |  |
| 18 | status | text (text) | YES | 'generated'::text |
| 19 | metadata | jsonb (jsonb) | YES | '{}'::jsonb |
| 20 | created_at | timestamp with time zone (timestamptz) | YES | now() |
| 21 | updated_at | timestamp with time zone (timestamptz) | YES | now() |

### workspace_sessions

- Primary key: `id`
- Foreign keys:
  - `user_id` → `profiles(id)` (`workspace_sessions_user_id_fkey`)
- Unique constraints: (none)
- Check constraints: (none)
- Indexes:
  - `idx_workspace_sessions_active` – `CREATE INDEX idx_workspace_sessions_active ON public.workspace_sessions USING btree (is_active)`
  - `idx_workspace_sessions_user_id` – `CREATE INDEX idx_workspace_sessions_user_id ON public.workspace_sessions USING btree (user_id)`
  - `workspace_sessions_pkey` – `CREATE UNIQUE INDEX workspace_sessions_pkey ON public.workspace_sessions USING btree (id)`

Columns

| Ord | Name | Type | Nullable | Default |
| --- | ---- | ---- | -------- | ------- |
| 1 | id | uuid (uuid) | NO | gen_random_uuid() |
| 2 | user_id | uuid (uuid) | NO |  |
| 3 | session_name | text (text) | YES | 'Workspace Session'::text |
| 4 | created_at | timestamp with time zone (timestamptz) | YES | now() |
| 5 | updated_at | timestamp with time zone (timestamptz) | YES | now() |
| 6 | is_active | boolean (bool) | YES | true |
| 7 | metadata | jsonb (jsonb) | YES | '{}'::jsonb |
