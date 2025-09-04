# Database Tables Inventory

**Last Updated:** December 19, 2024  
**Status:** ✅ Updated - Schema reflects current Supabase state

## **Overview**

This inventory provides a comprehensive overview of all database tables in the OurVidz platform. Each table is documented individually with its purpose, schema, RLS policies, and integration points.

### **Table Categories**
- **User Management**: User profiles, roles, activity tracking
- **Content Generation**: Jobs, user library, workspace assets
- **Character System**: Characters, scenes, character relationships, projects
- **Chat System**: Conversations and messages
- **System Configuration**: API providers, models, templates, presets
- **Analytics & Monitoring**: Usage logs, performance metrics, testing

---

## **User Management Tables**

### **01-profiles.md** - User Profiles
- **Purpose**: Core user profile information and authentication data
- **Columns**: 9 (id, username, subscription_status, token_balance, age_verified, birth_date, age_verification_date, etc.)
- **Key Features**: Authentication, preferences, age verification, token management, birth date tracking
- **Integration**: All user-related operations

### **02-user_roles.md** - User Role Assignments
- **Purpose**: Role-based access control and permissions
- **Columns**: 4 (id, user_id, role, created_at)
- **Key Features**: Admin, moderator, premium, basic user roles
- **Integration**: Authorization, admin system

### **03-user_activity_log.md** - User Activity Tracking
- **Purpose**: User behavior and activity monitoring
- **Columns**: 9 (id, user_id, action, resource_type, resource_id, metadata, ip_address, user_agent, created_at)
- **Key Features**: Action logging, analytics, security tracking
- **Integration**: Analytics, admin dashboard

---

## **Content Generation Tables**

### **04-jobs.md** - Generation Jobs
- **Purpose**: AI generation job tracking and management
- **Columns**: 35 (id, video_id, user_id, job_type, status, error_message, attempts, max_attempts, metadata, project_id, image_id, format, quality, model_type, prompt_test_id, test_metadata, moderation_status, reviewed_at, reviewed_by, review_notes, enhancement_strategy, original_prompt, enhanced_prompt, enhancement_time_ms, quality_rating, quality_improvement, compel_weights, qwen_expansion_percentage, destination, workspace_session_id, template_name, api_model_id, etc.)
- **Key Features**: Job queuing, status tracking, worker assignment, enhancement tracking, moderation, quality metrics, API model integration
- **Integration**: Worker system, job management, all generation requests, moderation system

### **05-user_library.md** - User Content Storage
- **Purpose**: Permanent user content storage (images, videos)
- **Columns**: 22 (id, user_id, asset_type, storage_path, file_size_bytes, mime_type, duration_seconds, original_prompt, model_used, generation_seed, collection_id, custom_title, tags, is_favorite, visibility, thumbnail_path, width, height, content_category, roleplay_metadata, etc.)
- **Key Features**: Content metadata, storage paths, user ownership, collections, tags, favorites, visibility controls, dimensions, roleplay integration
- **Integration**: Library page, workspace save operations, collections system, roleplay system

### **05a-user_collections.md** - User Content Collections
- **Purpose**: User-defined content organization and grouping
- **Columns**: 6 (id, user_id, name, description, asset_count, created_at)
- **Key Features**: Collection management, asset counting, user organization
- **Integration**: Library system, content organization, user preferences

### **06-workspace_assets.md** - Workspace Temporary Content
- **Purpose**: Temporary workspace content for staging and job grouping
- **Columns**: 18 (id, user_id, asset_type, temp_storage_path, file_size_bytes, mime_type, duration_seconds, job_id, asset_index, generation_seed, original_prompt, model_used, generation_settings, expires_at, thumbnail_path, width, height, etc.)
- **Key Features**: Staging area, job grouping, temporary storage, expiration, file metadata, dimensions, thumbnails
- **Integration**: Workspace system, job system, file management

---

## **Character System Tables**

### **07-characters.md** - Character Definitions
- **Purpose**: Character profiles and definitions for roleplay
- **Columns**: 26 (id, user_id, name, description, traits, appearance_tags, image_url, persona, system_prompt, voice_tone, mood, creator_id, likes_count, interaction_count, reference_image_url, is_public, gender, content_rating, role, consistency_method, seed_locked, base_prompt, preview_image_url, quick_start, etc.)
- **Key Features**: Character attributes, personality, appearance, content rating, social features, consistency methods, seed locking, quick start options
- **Integration**: Roleplay system, storyboard system, social features, consistency system

### **08-character_scenes.md** - Character Scene Relationships
- **Purpose**: Character-scene associations and scene generation
- **Columns**: 10 (id, character_id, conversation_id, image_url, scene_prompt, generation_metadata, job_id, system_prompt, etc.)
- **Key Features**: Character placement, scene context, generation tracking, system prompt integration
- **Integration**: Storyboard system, character consistency, prompt system

### **09-scenes.md** - Scene Definitions
- **Purpose**: Scene management and organization within projects
- **Columns**: 10 (id, project_id, scene_number, description, enhanced_prompt, image_url, approved, final_stitched_url, etc.)
- **Key Features**: Scene metadata, composition, approval workflow, final video stitching
- **Integration**: Storyboard system, video generation, stitching system

### **10-projects.md** - Project Management
- **Purpose**: User project organization and workflow management
- **Columns**: 14 (id, user_id, title, original_prompt, enhanced_prompt, media_type, duration, scene_count, workflow_step, character_id, preview_url, reference_image_url, etc.)
- **Key Features**: Project structure, workflow steps, character integration, preview URLs, reference images
- **Integration**: Storyboard system, project management, preview system

---

## **Chat System Tables**

### **11-conversations.md** - Chat Conversations
- **Purpose**: Chat session management and organization
- **Columns**: 12 (id, user_id, project_id, title, conversation_type, status, character_id, user_character_id, memory_tier, memory_data, etc.)
- **Key Features**: Conversation management, character integration, project linking, memory system, tiered memory
- **Integration**: Playground page, chat system, memory system

### **12-messages.md** - Chat Messages
- **Purpose**: Individual message storage within conversations
- **Columns**: 6 (id, conversation_id, sender, content, message_type, created_at)
- **Key Features**: Message history, sender types, message types, simplified structure
- **Integration**: Chat interface, conversation management

---

## **System Configuration Tables**

### **13-api_providers.md** - API Provider Configuration
- **Purpose**: 3rd party API provider management
- **Columns**: 12 (id, created_at, updated_at, name, display_name, base_url, docs_url, auth_scheme, auth_header_name, secret_name, rate_limits, is_active, etc.)
- **Key Features**: Provider settings, authentication, rate limiting, header configuration, secret management
- **Integration**: Replicate, OpenRouter, other APIs, secret management system

### **14-api_models.md** - API Model Configuration
- **Purpose**: Available models per provider
- **Columns**: 19 (id, created_at, updated_at, created_by, provider_id, model_key, version, display_name, modality, task, model_family, endpoint_path, input_defaults, capabilities, pricing, output_format, is_active, is_default, priority, etc.)
- **Key Features**: Model settings, costs, capabilities, priority, endpoint configuration, input defaults, output formats
- **Integration**: API providers, model selection, endpoint management

### **15-prompt_templates.md** - Prompt Templates
- **Purpose**: Database-driven prompt templates for enhancement and chat
- **Columns**: 18 (id, enhancer_model, use_case, content_mode, template_name, system_prompt, token_limit, is_active, created_at, updated_at, created_by, version, metadata, job_type, target_model, description, comment, etc.)
- **Key Features**: 12+ specialized templates, SFW/NSFW variants, version control, job type targeting, model targeting, metadata
- **Integration**: Prompting system, enhancement system, job targeting

### **16-negative_prompts.md** - Negative Prompt Presets
- **Purpose**: Negative prompt template management
- **Columns**: 10 (id, model_type, content_mode, negative_prompt, is_active, priority, created_at, updated_at, created_by, description, etc.)
- **Key Features**: Preset categories, organization, model-specific prompts, creation tracking
- **Integration**: Prompting system, UI components, admin tracking

### **17-enhancement_presets.md** - Enhancement Presets
- **Purpose**: Enhancement parameter presets and configurations
- **Columns**: 13 (id, preset_name, preset_description, enable_qwen, enable_compel, auto_enhancement, compel_weights, qwen_settings, usage_count, avg_quality_with_preset, is_recommended, created_at, created_by, etc.)
- **Key Features**: Quality presets, parameter optimization, usage tracking, quality metrics, recommendations
- **Integration**: Enhancement system, UI controls, quality tracking

### **18-compel_configs.md** - Compel Configurations
- **Purpose**: Compel prompt configuration and optimization
- **Columns**: 10 (id, config_name, weights, config_hash, total_tests, avg_quality, avg_consistency, is_active, created_at, created_by, etc.)
- **Key Features**: Compel settings, performance tracking, optimization, active status management
- **Integration**: Prompting system, enhancement, configuration management

### **19-system_config.md** - System Configuration
- **Purpose**: Global system configuration and settings
- **Columns**: 4 (id, config, created_at, updated_at)
- **Key Features**: System-wide settings, configuration management, JSON configuration
- **Integration**: All systems requiring configuration

---

## **Analytics & Monitoring Tables**

### **20-usage_logs.md** - Usage Analytics
- **Purpose**: Platform usage tracking and analytics
- **Columns**: 8 (id, user_id, action, credits_consumed, metadata, format, quality, created_at)
- **Key Features**: User behavior, feature usage, credit tracking, format and quality tracking
- **Integration**: Analytics dashboard, business intelligence, usage monitoring

### **21-model_performance_logs.md** - Model Performance Tracking
- **Purpose**: Model performance monitoring and metrics
- **Columns**: 11 (id, model_type, date, total_generations, successful_generations, failed_generations, avg_generation_time_ms, avg_quality_rating, total_processing_time_ms, created_at, updated_at, etc.)
- **Key Features**: Performance metrics, success rates, quality tracking, processing time tracking
- **Integration**: Performance monitoring, optimization, quality assessment

### **22-model_config_history.md** - Model Configuration History
- **Purpose**: Model configuration change tracking and versioning
- **Columns**: 8 (id, model_type, config_name, config_data, is_active, created_by, notes, created_at)
- **Key Features**: Version history, change tracking, rollback capability, configuration data storage
- **Integration**: Model management, admin system, configuration versioning

### **23-model_test_results.md** - Model Testing Results
- **Purpose**: Model testing and validation results
- **Columns**: 30 (id, user_id, model_type, model_version, prompt_text, success, overall_quality, technical_quality, content_quality, consistency, test_series, test_tier, test_category, test_metadata, job_id, image_id, video_id, generation_time_ms, file_size_bytes, notes, enhancement_strategy, original_prompt, enhanced_prompt, enhancement_time_ms, quality_improvement, compel_weights, qwen_expansion_percentage, baseline_quality, etc.)
- **Key Features**: Test results, quality assessment, comparison metrics, enhancement tracking, file metadata, quality improvement metrics
- **Integration**: Model evaluation, quality assurance, enhancement system, file management

### **24-prompt_ab_tests.md** - Prompt A/B Testing
- **Purpose**: Prompt testing and optimization
- **Columns**: 13 (id, test_name, test_series, baseline_config, enhanced_config, total_participants, baseline_avg_quality, enhanced_avg_quality, quality_improvement, confidence_level, is_complete, created_at, completed_at, etc.)
- **Key Features**: A/B test results, performance comparison, statistical analysis, confidence levels, completion tracking
- **Integration**: Prompt optimization, quality improvement, statistical analysis

### **25-admin_development_progress.md** - Admin Development Tracking
- **Purpose**: Admin feature development tracking and project management
- **Columns**: 14 (id, feature_name, feature_category, status, priority, assigned_to, estimated_hours, actual_hours, start_date, completion_date, notes, blockers, created_at, updated_at, etc.)
- **Key Features**: Development status, progress tracking, resource allocation, date tracking, blocker management
- **Integration**: Admin system, project management, development workflow

---

## **Table Relationships**

### **User Management Flow**
```
profiles → user_roles → user_activity_log
```

### **Content Generation Flow**
```
jobs → workspace_assets → user_library
```

### **Character System Flow**
```
characters → character_scenes → scenes → projects
```

### **Chat System Flow**
```
conversations → messages
```

### **System Configuration Flow**
```
api_providers → api_models
prompt_templates → enhancement_presets → compel_configs
```

---

## **RLS Policies Overview**

### **User-Specific Tables**
- **profiles**: Users can only access their own profile, admins can view all
- **user_roles**: Users can view their own roles, admins can manage all
- **user_activity_log**: Users can view their own activity, admins can manage all
- **user_library**: Users can only access their own library
- **workspace_assets**: Users can only access their own workspace
- **conversations**: Users can only access their own conversations
- **messages**: Users can only access messages in their conversations
- **characters**: Users can manage their own characters, public characters viewable by all
- **projects**: Users can only access their own projects

### **System Tables**
- **api_providers**: Read-only for authenticated users, admin-only management
- **api_models**: Read-only for authenticated users, admin-only management
- **prompt_templates**: Admin-only access
- **negative_prompts**: Admin-only access
- **enhancement_presets**: Admin-only access
- **compel_configs**: Admin-only access
- **system_config**: Admin-only access

### **Analytics Tables**
- **usage_logs**: Users can view their own logs, admins can view all
- **model_performance_logs**: Admin-only access
- **model_config_history**: Admin-only access
- **model_test_results**: Admin-only access
- **prompt_ab_tests**: Admin-only access
- **admin_development_progress**: Admin-only access

---

## **📊 Schema Update Summary**

### **Recent Changes Applied:**
- ✅ **Column counts updated** to reflect current Supabase schema
- ✅ **New columns documented** across all tables
- ✅ **Data types verified** and updated where needed
- ✅ **Missing tables added** (user_collections)
- ✅ **Integration points updated** to reflect new features

### **Key Schema Improvements:**
- **Enhanced job tracking** with moderation, quality metrics, and API model integration
- **Expanded character system** with social features, consistency methods, and seed locking
- **Improved content management** with collections, tags, favorites, and visibility controls
- **Advanced analytics** with detailed performance tracking and quality metrics
- **Enhanced prompt system** with job targeting, model targeting, and metadata support

---

## **Maintenance Notes**

### **Weekly Review Checklist**
- [ ] Check for new tables added to the system
- [ ] Update table documentation with schema changes
- [ ] Review RLS policies for security
- [ ] Update integration maps for new features
- [ ] Check for deprecated or unused tables

---

## **Integration Map**

### **Pages Using Database Tables**
- **Workspace**: workspace_assets, jobs
- **Library**: user_library, user_collections
- **Playground**: conversations, messages, prompt_templates
- **Admin**: All system tables, usage_logs, model_* tables
- **Storyboard**: characters, character_scenes, scenes, projects

### **Edge Functions Using Database Tables**
- **queue-job**: jobs, api_providers, api_models
- **enhance-prompt**: prompt_templates, system_config
- **playground-chat**: conversations, messages, prompt_templates
- **workspace-actions**: workspace_assets, user_library
- **system-metrics**: All monitoring tables

---

**Note**: Each table has detailed documentation in its individual file. This inventory provides the high-level overview and relationships between tables.
