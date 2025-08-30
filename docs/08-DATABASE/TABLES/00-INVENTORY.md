# Database Tables Inventory

**Last Updated:** August 30, 2025  
**Status:** ✅ Active - All 25 tables operational

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
- **Columns**: 9 (id, username, subscription_status, token_balance, age_verified, etc.)
- **Key Features**: Authentication, preferences, age verification, token management
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
- **Columns**: 35 (id, user_id, job_type, status, metadata, image_id, video_id, etc.)
- **Key Features**: Job queuing, status tracking, worker assignment, enhancement tracking
- **Integration**: Worker system, job management, all generation requests

### **05-user_library.md** - User Content Storage
- **Purpose**: Permanent user content storage (images, videos)
- **Columns**: 20 (id, user_id, asset_type, storage_path, file_size_bytes, original_prompt, model_used, etc.)
- **Key Features**: Content metadata, storage paths, user ownership, collections
- **Integration**: Library page, workspace save operations

### **06-workspace_assets.md** - Workspace Temporary Content
- **Purpose**: Temporary workspace content for staging and job grouping
- **Columns**: 18 (id, user_id, asset_type, temp_storage_path, job_id, generation_seed, etc.)
- **Key Features**: Staging area, job grouping, temporary storage, expiration
- **Integration**: Workspace system, job system

---

## **Character System Tables**

### **07-characters.md** - Character Definitions
- **Purpose**: Character profiles and definitions for roleplay
- **Columns**: 21 (id, user_id, name, description, traits, appearance_tags, persona, system_prompt, etc.)
- **Key Features**: Character attributes, personality, appearance, content rating
- **Integration**: Roleplay system, storyboard system

### **08-character_scenes.md** - Character Scene Relationships
- **Purpose**: Character-scene associations and scene generation
- **Columns**: 9 (id, character_id, conversation_id, image_url, scene_prompt, generation_metadata, job_id, etc.)
- **Key Features**: Character placement, scene context, generation tracking
- **Integration**: Storyboard system, character consistency

### **09-scenes.md** - Scene Definitions
- **Purpose**: Scene management and organization within projects
- **Columns**: 10 (id, project_id, scene_number, description, enhanced_prompt, image_url, approved, etc.)
- **Key Features**: Scene metadata, composition, approval workflow
- **Integration**: Storyboard system, video generation

### **10-projects.md** - Project Management
- **Purpose**: User project organization and workflow management
- **Columns**: 14 (id, user_id, title, original_prompt, enhanced_prompt, media_type, duration, scene_count, etc.)
- **Key Features**: Project structure, workflow steps, character integration
- **Integration**: Storyboard system, project management

---

## **Chat System Tables**

### **11-conversations.md** - Chat Conversations
- **Purpose**: Chat session management and organization
- **Columns**: 10 (id, user_id, project_id, title, conversation_type, status, character_id, user_character_id, etc.)
- **Key Features**: Conversation management, character integration, project linking
- **Integration**: Playground page, chat system

### **12-messages.md** - Chat Messages
- **Purpose**: Individual message storage within conversations
- **Columns**: 14 (id, conversation_id, sender, content, message_type, created_at, etc.)
- **Key Features**: Message history, sender types, message types
- **Integration**: Chat interface, conversation management

---

## **System Configuration Tables**

### **13-api_providers.md** - API Provider Configuration
- **Purpose**: 3rd party API provider management
- **Columns**: 12 (id, name, display_name, base_url, docs_url, auth_scheme, rate_limits, etc.)
- **Key Features**: Provider settings, authentication, rate limiting
- **Integration**: Replicate, OpenRouter, other APIs

### **14-api_models.md** - API Model Configuration
- **Purpose**: Available models per provider
- **Columns**: 19 (id, provider_id, model_key, version, display_name, modality, task, capabilities, pricing, etc.)
- **Key Features**: Model settings, costs, capabilities, priority
- **Integration**: API providers, model selection

### **15-prompt_templates.md** - Prompt Templates
- **Purpose**: Database-driven prompt templates for enhancement and chat
- **Columns**: 17 (id, enhancer_model, use_case, content_mode, template_name, system_prompt, token_limit, etc.)
- **Key Features**: 12+ specialized templates, SFW/NSFW variants, version control
- **Integration**: Prompting system, enhancement system

### **16-negative_prompts.md** - Negative Prompt Presets
- **Purpose**: Negative prompt template management
- **Columns**: 10 (id, model_type, content_mode, negative_prompt, is_active, priority, description, etc.)
- **Key Features**: Preset categories, organization, model-specific prompts
- **Integration**: Prompting system, UI components

### **17-enhancement_presets.md** - Enhancement Presets
- **Purpose**: Enhancement parameter presets and configurations
- **Columns**: 13 (id, preset_name, enable_qwen, enable_compel, auto_enhancement, compel_weights, qwen_settings, etc.)
- **Key Features**: Quality presets, parameter optimization, usage tracking
- **Integration**: Enhancement system, UI controls

### **18-compel_configs.md** - Compel Configurations
- **Purpose**: Compel prompt configuration and optimization
- **Columns**: 10 (id, config_name, weights, config_hash, total_tests, avg_quality, avg_consistency, etc.)
- **Key Features**: Compel settings, performance tracking, optimization
- **Integration**: Prompting system, enhancement

### **19-system_config.md** - System Configuration
- **Purpose**: Global system configuration and settings
- **Columns**: 4 (id, config, created_at, updated_at)
- **Key Features**: System-wide settings, configuration management
- **Integration**: All systems requiring configuration

---

## **Analytics & Monitoring Tables**

### **20-usage_logs.md** - Usage Analytics
- **Purpose**: Platform usage tracking and analytics
- **Columns**: 8 (id, user_id, action, credits_consumed, metadata, format, quality, created_at)
- **Key Features**: User behavior, feature usage, credit tracking
- **Integration**: Analytics dashboard, business intelligence

### **21-model_performance_logs.md** - Model Performance Tracking
- **Purpose**: Model performance monitoring and metrics
- **Columns**: 11 (id, model_type, date, total_generations, successful_generations, failed_generations, avg_generation_time_ms, etc.)
- **Key Features**: Performance metrics, success rates, quality tracking
- **Integration**: Performance monitoring, optimization

### **22-model_config_history.md** - Model Configuration History
- **Purpose**: Model configuration change tracking and versioning
- **Columns**: 8 (id, model_type, config_name, config_data, is_active, created_by, notes, created_at)
- **Key Features**: Version history, change tracking, rollback capability
- **Integration**: Model management, admin system

### **23-model_test_results.md** - Model Testing Results
- **Purpose**: Model testing and validation results
- **Columns**: 30 (id, user_id, model_type, model_version, prompt_text, success, quality metrics, test_series, etc.)
- **Key Features**: Test results, quality assessment, comparison metrics
- **Integration**: Model evaluation, quality assurance

### **24-prompt_ab_tests.md** - Prompt A/B Testing
- **Purpose**: Prompt testing and optimization
- **Columns**: 13 (id, test_name, test_series, baseline_config, enhanced_config, total_participants, quality_improvement, etc.)
- **Key Features**: A/B test results, performance comparison, statistical analysis
- **Integration**: Prompt optimization, quality improvement

### **25-admin_development_progress.md** - Admin Development Tracking
- **Purpose**: Admin feature development tracking and project management
- **Columns**: 14 (id, feature_name, feature_category, status, priority, assigned_to, estimated_hours, actual_hours, etc.)
- **Key Features**: Development status, progress tracking, resource allocation
- **Integration**: Admin system, project management

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

## **Maintenance Notes**

### **Weekly Review Checklist**
- [ ] Check for new tables added to the system
- [ ] Update table documentation with schema changes
- [ ] Review RLS policies for security
- [ ] Update integration maps for new features
- [ ] Check for deprecated or unused tables

### **SQL Command for Table Updates**
```sql
-- Generate table summary for documentation updates
SELECT 
    table_name,
    table_type,
    table_schema,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count,
    (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_name = t.table_name AND constraint_type = 'FOREIGN KEY') as foreign_key_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

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
