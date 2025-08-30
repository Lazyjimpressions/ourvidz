# Supabase Tables & Buckets - Complete Inventory

This document serves as the master table of contents for all Supabase tables and storage buckets in the OurVidz application.

## Tables (Public Schema)

### Core User & Authentication
- **profiles** - User profile information and authentication data
- **user_roles** - User role assignments and permissions
- **user_activity_log** - User activity tracking and analytics

### API & Model Management
- **api_providers** - External API provider configurations
- **api_models** - Available AI models and their configurations
- **model_config_history** - Historical model configuration changes
- **model_performance_logs** - Model performance metrics and logs
- **model_test_results** - A/B testing results for model configurations

### Content Generation & Jobs
- **jobs** - Background job queue for content generation
- **prompt_templates** - Reusable prompt templates for generation
- **negative_prompts** - Negative prompt configurations
- **enhancement_presets** - Prompt enhancement configurations
- **compel_configs** - Compel-specific configuration settings

### Conversations & Messaging
- **conversations** - Chat conversation sessions
- **messages** - Individual messages within conversations

### Character System (Roleplay)
- **characters** - Character definitions and metadata
- **character_scenes** - Character-specific scene generations

### Content Library
- **user_library** - User's personal content library
- **user_collections** - User-created content collections
- **workspace_assets** - Assets associated with workspaces
- **scenes** - Scene definitions and metadata

### Projects & Workspaces
- **projects** - Project definitions and metadata

### Testing & Analytics
- **prompt_ab_tests** - A/B testing for prompt variations
- **usage_logs** - System usage analytics and metrics

### Admin & Development
- **admin_development_progress** - Development task tracking
- **system_config** - System-wide configuration cache

## Storage Buckets

### Content Storage
- **avatars** - Character avatar images (public, no size limit)
- **reference_images** - User reference images (private, 10MB limit)
- **system_assets** - System-wide assets (public, 5MB limit)
- **user-library** - User's permanent content library (private, 50MB limit)
- **videos** - Public video content (public, no size limit)
- **workspace-temp** - Temporary workspace assets (private, 50MB limit)

### Legacy Buckets (Not Utilized)
- **image_high** - Legacy high-quality image storage
- **sdxl_image_fast** - Legacy SDXL fast image storage
- **sdxl_image_high** - Legacy SDXL high-quality image storage
- **video_high** - Legacy high-quality video storage

## Documentation Status

### ✅ Documented Tables
- [x] prompt_templates (10-prompt_templates.md)
- [x] system_config (11-system_config_cache.md)
- [x] conversations & messages (20-conversations_messages.md)
- [x] jobs (30-jobs.md)
- [x] user_library (40-images_videos.md)
- [x] characters (50-characters.md)
- [x] character_scenes (51-character_scenes.md)

### ❌ Missing Documentation (18 tables)
- [x] profiles (7 columns) - ✅ Documented
- [x] user_roles (4 columns) - ✅ Documented
- [ ] user_activity_log (9 columns)
- [x] api_providers (12 columns) - ✅ Documented
- [x] api_models (19 columns) - ✅ Documented
- [ ] model_config_history (8 columns)
- [ ] model_performance_logs (11 columns)
- [ ] model_test_results (30 columns)
- [x] negative_prompts (10 columns) - ✅ Documented
- [x] enhancement_presets (13 columns) - ✅ Documented
- [x] compel_configs (10 columns) - ✅ Documented
- [x] user_collections (6 columns) - ✅ Documented
- [x] workspace_assets (18 columns) - ✅ Documented
- [x] scenes (10 columns) - ✅ Documented
- [x] projects (14 columns) - ✅ Documented
- [ ] prompt_ab_tests (13 columns)
- [ ] usage_logs (8 columns)
- [ ] admin_development_progress (14 columns)

### ❌ Missing Bucket Documentation (3 active buckets)
- [ ] avatars (public, no size limit)
- [ ] system_assets (public, 5MB limit)
- [ ] videos (public, no size limit)

### ✅ Documented Buckets
- [x] user-library (private, 50MB limit) - ✅ Documented
- [x] reference_images (private, 10MB limit) - ✅ Documented
- [x] workspace-temp (private, 50MB limit) - ✅ Documented

## Next Steps

1. **Generate missing table documentation** - Create individual .md files for each undocumented table
2. **Create bucket documentation** - Document storage bucket configurations and usage
3. **Update this inventory** - Keep this file current as new tables/buckets are added
4. **Run inventory SQL** - Use `01-INVENTORY_SQL.md` to get current schema details

## Naming Convention

- **00-09**: System inventory and meta docs
- **10-19**: Core system tables (auth, config, API)
- **20-29**: Content generation and jobs
- **30-39**: Conversations and messaging
- **40-49**: Content library and assets
- **50-59**: Character and roleplay system
- **60-69**: Projects and workspaces
- **70-79**: Analytics and testing
- **80-89**: Admin and development
- **90-99**: Storage buckets and external services
