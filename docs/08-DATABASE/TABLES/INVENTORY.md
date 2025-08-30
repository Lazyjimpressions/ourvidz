# Database Tables Inventory

**Last Updated:** August 30, 2025  
**Status:** ✅ Active - All tables operational

## **Overview**

This inventory provides a comprehensive overview of all database tables in the OurVidz platform. Each table is documented individually with its purpose, schema, RLS policies, and integration points.

### **Table Categories**
- **User Management**: User profiles, roles, activity tracking
- **Content Generation**: Jobs, images, videos, workspace assets
- **System Configuration**: API providers, models, templates, cache
- **Character System**: Characters, scenes, character relationships
- **Analytics & Monitoring**: Usage logs, performance metrics, test results

---

## **User Management Tables**

### **01-profiles.md** - User Profiles
- **Purpose**: Core user profile information
- **Key Features**: Authentication, preferences, settings
- **Integration**: All user-related operations

### **02-user_roles.md** - User Role Assignments
- **Purpose**: Role-based access control
- **Key Features**: Admin, moderator, premium, basic user roles
- **Integration**: Authorization, admin system

### **03-user_activity_log.md** - User Activity Tracking
- **Purpose**: User behavior and activity monitoring
- **Key Features**: Action logging, analytics, security
- **Integration**: Analytics, admin dashboard

---

## **Content Generation Tables**

### **10-jobs.md** - Generation Jobs
- **Purpose**: AI generation job tracking
- **Key Features**: Job queuing, status tracking, worker assignment
- **Integration**: Worker system, job management

### **14-images_videos.md** - Generated Content
- **Purpose**: Storage of generated images and videos
- **Key Features**: Content metadata, storage paths, user ownership
- **Integration**: Workspace, library, storage system

### **16-workspace_assets.md** - Workspace Content
- **Purpose**: Temporary workspace content management
- **Key Features**: Staging area, job grouping, temporary storage
- **Integration**: Workspace system, job system

### **27-user-library.md** - User Library
- **Purpose**: Permanent user content storage
- **Key Features**: Saved content, organization, metadata
- **Integration**: Library page, workspace save operations

### **28-videos.md** - Video Content
- **Purpose**: Video-specific content storage
- **Key Features**: Video metadata, duration, quality settings
- **Integration**: Video generation, playback

### **29-workspace-temp.md** - Workspace Temporary Storage
- **Purpose**: Temporary workspace storage management
- **Key Features**: Staging area, cleanup, temporary files
- **Integration**: Workspace system, storage management

---

## **System Configuration Tables**

### **04-api_providers.md** - API Provider Configuration
- **Purpose**: 3rd party API provider management
- **Key Features**: Provider settings, credentials, status
- **Integration**: Replicate, OpenRouter, other APIs

### **05-api_models.md** - API Model Configuration
- **Purpose**: Available models per provider
- **Key Features**: Model settings, costs, capabilities
- **Integration**: API providers, model selection

### **06-model_config_history.md** - Model Configuration History
- **Purpose**: Model configuration change tracking
- **Key Features**: Version history, change tracking, rollback
- **Integration**: Model management, admin system

### **07-model_performance_logs.md** - Model Performance Tracking
- **Purpose**: Model performance monitoring
- **Key Features**: Response times, success rates, quality metrics
- **Integration**: Performance monitoring, optimization

### **08-model_test_results.md** - Model Testing Results
- **Purpose**: Model testing and validation
- **Key Features**: Test results, quality assessment, comparison
- **Integration**: Model evaluation, quality assurance

### **30-prompt_templates.md** - Prompt Templates
- **Purpose**: Database-driven prompt templates
- **Key Features**: 12+ specialized templates, SFW/NSFW variants
- **Integration**: Prompting system, enhancement system

### **31-system_config_cache.md** - System Configuration Cache
- **Purpose**: Cached system configuration
- **Key Features**: Performance optimization, cache management
- **Integration**: All systems requiring configuration

---

## **Character System Tables**

### **18-characters.md** - Character Definitions
- **Purpose**: Character profiles and definitions
- **Key Features**: Character attributes, personality, appearance
- **Integration**: Roleplay system, storyboard system

### **19-character_scenes.md** - Character Scene Relationships
- **Purpose**: Character-scene associations
- **Key Features**: Character placement, scene context
- **Integration**: Storyboard system, character consistency

### **17-scenes.md** - Scene Definitions
- **Purpose**: Scene management and organization
- **Key Features**: Scene metadata, composition, settings
- **Integration**: Storyboard system, video generation

---

## **Analytics & Monitoring Tables**

### **21-prompt_ab_tests.md** - Prompt A/B Testing
- **Purpose**: Prompt testing and optimization
- **Key Features**: A/B test results, performance comparison
- **Integration**: Prompt optimization, quality improvement

### **22-usage_logs.md** - Usage Analytics
- **Purpose**: Platform usage tracking
- **Key Features**: User behavior, feature usage, analytics
- **Integration**: Analytics dashboard, business intelligence

### **23-admin_development_progress.md** - Admin Development Tracking
- **Purpose**: Admin feature development tracking
- **Key Features**: Development status, progress tracking
- **Integration**: Admin system, project management

---

## **Content Management Tables**

### **09-conversations_messages.md** - Chat Conversations
- **Purpose**: Chat and roleplay message storage
- **Key Features**: Conversation history, message threading
- **Integration**: Chat system, roleplay system

### **11-negative_prompts.md** - Negative Prompt Presets
- **Purpose**: Negative prompt template management
- **Key Features**: Preset categories, organization, caching
- **Integration**: Prompting system, UI components

### **12-enhancement_presets.md** - Enhancement Presets
- **Purpose**: Enhancement parameter presets
- **Key Features**: Quality presets, parameter optimization
- **Integration**: Enhancement system, UI controls

### **13-compel_configs.md** - Compel Configurations
- **Purpose**: Compel prompt configuration
- **Key Features**: Compel settings, optimization
- **Integration**: Prompting system, enhancement

### **15-user_collections.md** - User Collections
- **Purpose**: User content organization
- **Key Features**: Collection management, organization
- **Integration**: Library system, content organization

### **24-avatars.md** - User Avatars
- **Purpose**: User avatar management
- **Key Features**: Avatar storage, customization
- **Integration**: User profiles, avatar generation

### **25-reference_images.md** - Reference Images
- **Purpose**: Reference image storage
- **Key Features**: I2I references, image management
- **Integration**: I2I system, workspace system

### **26-system_assets.md** - System Assets
- **Purpose**: Platform system assets
- **Key Features**: Placeholders, system images
- **Integration**: UI system, asset management

### **20-projects.md** - Project Management
- **Purpose**: User project organization
- **Key Features**: Project structure, organization
- **Integration**: Storyboard system, project management

---

## **Table Relationships**

### **User Management Flow**
```
profiles → user_roles → user_activity_log
```

### **Content Generation Flow**
```
jobs → images_videos → workspace_assets → user-library
```

### **Character System Flow**
```
characters → character_scenes → scenes
```

### **System Configuration Flow**
```
api_providers → api_models → model_config_history
prompt_templates → system_config_cache
```

---

## **RLS Policies Overview**

### **User-Specific Tables**
- **profiles**: Users can only access their own profile
- **user_roles**: Users can view their own roles, admins can manage all
- **user_activity_log**: Users can view their own activity
- **user-library**: Users can only access their own library
- **user_collections**: Users can only access their own collections

### **System Tables**
- **api_providers**: Admin-only access
- **api_models**: Admin-only access
- **prompt_templates**: Read-only for authenticated users
- **system_config_cache**: Read-only for authenticated users

### **Content Tables**
- **jobs**: Users can only access their own jobs
- **images_videos**: Users can only access their own content
- **workspace_assets**: Users can only access their own workspace
- **conversations_messages**: Users can only access their own conversations

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
- **Workspace**: workspace_assets, jobs, images_videos
- **Library**: user-library, user_collections, images_videos
- **Playground**: conversations_messages, prompt_templates
- **Admin**: All system tables, usage_logs, model_*
- **Storyboard**: characters, character_scenes, scenes, projects

### **Edge Functions Using Database Tables**
- **queue-job**: jobs, api_providers, api_models
- **enhance-prompt**: prompt_templates, system_config_cache
- **playground-chat**: conversations_messages, prompt_templates
- **workspace-actions**: workspace_assets, user-library
- **system-metrics**: All monitoring tables

---

**Note**: Each table has detailed documentation in its individual file. This inventory provides the high-level overview and relationships between tables.
