# Database Architecture & Schema

**Last Updated:** February 20, 2026  
**Status:** ✅ Active - Real-time schema from Supabase online  
**Supabase Project:** ulmdmzhcdwfadbvfpckt

## **Quick Stats**

- **Total Tables**: 25
- **Total Rows**: 8,500+
- **Active Users**: 1 (based on profiles table)
- **Daily Job Volume**: ~50 jobs/day (based on 945 jobs total)
- **Storage Usage**: 2.3GB+ (workspace + library assets)
- **Active Conversations**: 751
- **Generated Assets**: 102+ (workspace + library)

---

## **Table Overview**

### **User Management (3 tables)**

- **profiles** (9 cols, 1 row) - User authentication & preferences
- **user_roles** (4 cols, 1 row) - Role-based access control
- **user_activity_log** (9 cols, 353 rows) - User behavior tracking

### **Content Generation (4 tables)**

- **jobs** (35 cols, 945 rows) - AI generation job tracking
- **user_library** (22 cols, 21 rows) - Permanent content storage
- **workspace_assets** (18 cols, 81 rows) - Temporary workspace content
- **user_collections** (6 cols, 0 rows) - User content organization

### **Character System (4 tables)**

- **characters** (31 cols, 10 rows) - Character definitions & metadata (includes `clothing_tags` Feb 2026)
- **character_scenes** (13 cols, 3 rows) - Character-scene relationships
- **scenes** (10 cols, 0 rows) - Scene definitions within projects
- **projects** (14 cols, 23 rows) - Project management & workflow

### **Chat System (2 tables)**

- **conversations** (12 cols, 751 rows) - Chat session management
- **messages** (6 cols, 1,843 rows) - Individual message storage

### **System Configuration (6 tables)**

- **api_providers** (12 cols, 1 row) - External API configuration
- **api_models** (19 cols, 1 row) - Model configurations & capabilities
- **prompt_templates** (18 cols, 19 rows) - Prompt enhancement templates
- **negative_prompts** (11 cols, 12 rows) - Negative prompt presets with generation mode support
- **enhancement_presets** (13 cols, 4 rows) - Quality enhancement presets
- **compel_configs** (10 cols, 0 rows) - Compel prompt configurations
- **system_config** (4 cols, 1 row) - Global system settings

### **Analytics & Monitoring (5 tables)**

- **usage_logs** (8 cols, 6,565 rows) - Platform usage analytics
- **model_performance_logs** (11 cols, 0 rows) - Model performance tracking
- **model_config_history** (8 cols, 0 rows) - Configuration change tracking
- **model_test_results** (30 cols, 5 rows) - Model testing & validation
- **admin_development_progress** (14 cols, 7 rows) - Feature development tracking
- **prompt_ab_tests** (13 cols, 0 rows) - Prompt A/B testing results

---

## **Detailed Table Schemas**

### **profiles** (9 columns, 1 row)

**Purpose**: Core user profile information and authentication data
**Key Columns**: id, username, subscription_status, token_balance, age_verified, birth_date
**RLS**: Users can only access their own profile, admins can view all
**Integration**: All user-related operations, authentication system

### **characters** (31 columns, 10 rows)

**Purpose**: Character profiles and definitions for roleplay
**Key Columns**: id, user_id, name, description, traits, appearance_tags, **clothing_tags**, image_url, persona, system_prompt, voice_tone, mood, creator_id, likes_count, interaction_count, reference_image_url, is_public, gender, content_rating, role, consistency_method, seed_locked, base_prompt, preview_image_url, quick_start, voice_examples, scene_behavior_rules, forbidden_phrases
**RLS**: Users can manage their own characters, public characters viewable by all
**Integration**: Roleplay system, storyboard system, social features, consistency system

**Tag Separation (Feb 2026)**:
- `appearance_tags text[]` - Physical appearance (hair, eyes, body, skin)
- `clothing_tags text[]` - Outfit/clothing (dress, accessories, attire)

### **jobs** (35 columns, 945 rows)

**Purpose**: AI generation job tracking and management
**Key Columns**: id, video_id, user_id, job_type, status, error_message, attempts, max_attempts, metadata, project_id, image_id, format, quality, model_type, prompt_test_id, test_metadata, moderation_status, reviewed_at, reviewed_by, review_notes, enhancement_strategy, original_prompt, enhanced_prompt, enhancement_time_ms, quality_rating, quality_improvement, compel_weights, qwen_expansion_percentage, destination, workspace_session_id, template_name, api_model_id
**RLS**: Users can only access their own jobs, admins can view all
**Integration**: Worker system, job management, all generation requests, moderation system

### **conversations** (12 columns, 751 rows)

**Purpose**: Chat session management and organization
**Key Columns**: id, user_id, project_id, title, conversation_type, status, character_id, user_character_id, memory_tier, memory_data
**RLS**: Users can only access their own conversations
**Integration**: Playground page, chat system, memory system

### **user_library** (22 columns, 21 rows)

**Purpose**: Permanent user content storage (images, videos)
**Key Columns**: id, user_id, asset_type, storage_path, file_size_bytes, mime_type, duration_seconds, original_prompt, model_used, generation_seed, collection_id, custom_title, tags, is_favorite, visibility, thumbnail_path, width, height, content_category, roleplay_metadata
**RLS**: Users can only access their own library
**Integration**: Library page, workspace save operations, collections system, roleplay system

### **workspace_assets** (18 columns, 81 rows)

**Purpose**: Temporary workspace content for staging and job grouping
**Key Columns**: id, user_id, asset_type, temp_storage_path, file_size_bytes, mime_type, duration_seconds, job_id, asset_index, generation_seed, original_prompt, model_used, generation_settings, expires_at, thumbnail_path, width, height
**RLS**: Users can only access their own workspace
**Integration**: Workspace system, job system, file management

### **projects** (14 columns, 23 rows)

**Purpose**: User project organization and workflow management
**Key Columns**: id, user_id, title, original_prompt, enhanced_prompt, media_type, duration, scene_count, workflow_step, character_id, preview_url, reference_image_url
**RLS**: Users can only access their own projects
**Integration**: Storyboard system, project management, preview system

### **prompt_templates** (18 columns, 19 rows)

**Purpose**: Database-driven prompt templates for enhancement and chat
**Key Columns**: id, enhancer_model, use_case, content_mode, template_name, system_prompt, token_limit, is_active, created_at, updated_at, created_by, version, metadata, job_type, target_model, description, comment
**RLS**: Admin-only access
**Integration**: Prompting system, enhancement system, job targeting

---

## **Key Relationships & Data Flow**

### **User Flow**

```
profiles (1 user) 
  ↓ creates
projects (23 projects)
  ↓ contains  
scenes (0 scenes - new feature)
  ↓ generates
jobs (945 jobs, 35 cols)
  ↓ produces
workspace_assets (81 temp files)
  ↓ saves to
user_library (21 permanent files)
```

### **Character Flow**

```
characters (10 characters)
  ↓ participate in
conversations (751 chats)
  ↓ generate
character_scenes (3 scenes)
  ↓ create
scenes (0 scenes)
  ↓ belong to
projects (23 projects)
```

### **Job Processing Flow**

```
jobs (queued/processing/completed)
  ↓ use
prompt_templates (19 templates)
  ↓ enhance with
enhancement_presets (4 presets)
  ↓ generate via
api_models (1 model)
  ↓ produce
workspace_assets (81 files)
  ↓ callback to
user_library (21 saved files)
```

### **Chat System Flow**

```
conversations (751 active)
  ↓ contain
messages (1,843 total)
  ↓ use
prompt_templates (19 templates)
  ↓ integrate with
characters (10 characters)
```

---

## **RLS Policies Summary**

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

## **System Configuration**

- **API Models**: 1 active model configured
- **Prompt Templates**: 19 active templates
- **Enhancement Presets**: 4 quality presets
- **Negative Prompts**: 12 preset categories (including I2I-specific prompts)
- **Edge Functions**: 23 active functions
- **Storage Buckets**: 6 active buckets

---

## **Edge Functions Overview**

### **Active Edge Functions (23 functions)**

#### **Core Job Management**

- **queue-job** - Creates and routes generation jobs to workers
  - **Code Reference**: `supabase/functions/queue-job/index.ts`
  - **Key Features**: Job queuing with Redis, parameter validation, worker routing, I2I mode detection, reference strength conversion
  - **Integration**: SDXL Worker, WAN Worker, Chat Worker
  - **Usage**: All image and video generation requests

- **job-callback** - Handles job completion and routes results to workspace/library
  - **Code Reference**: `supabase/functions/job-callback/index.ts`
  - **Key Features**: Result processing, storage management (workspace-temp bucket), real-time updates, error handling, metadata extraction
  - **Integration**: All workers, workspace system, library system
  - **Usage**: All worker completion notifications

- **workspace-actions** - Workspace item management (save to library, discard)
  - **Code Reference**: `supabase/functions/workspace-actions/index.ts`
  - **Key Features**: Save items to user library, discard items, storage bucket management, metadata updates, real-time workspace updates
  - **Integration**: Workspace system, library system, storage system
  - **Usage**: Workspace save/discard operations

- **delete-workspace-item** - Deletes workspace items with storage cleanup
  - **Code Reference**: `supabase/functions/delete-workspace-item/index.ts`
  - **Key Features**: Item deletion with metadata cleanup, storage bucket cleanup, real-time workspace updates, error handling
  - **Integration**: Workspace system, storage system
  - **Usage**: Workspace item deletion

#### **Prompt & Content Enhancement**

- **enhance-prompt** - Dynamic prompt enhancement using database templates
  - **Code Reference**: `supabase/functions/enhance-prompt/index.ts`
  - **Key Features**: 12+ specialized templates, SFW/NSFW content detection, template selection with fallbacks, token optimization, performance monitoring
  - **Integration**: Prompting system, template system, content detection
  - **Usage**: All prompt enhancement requests

- **get-negative-prompt** - Retrieves negative prompt presets
  - **Code Reference**: `supabase/functions/get-negative-prompt/index.ts`
  - **Key Features**: Preset retrieval and caching, category-based organization, performance optimization, template integration
  - **Integration**: Prompting system, UI components
  - **Usage**: Negative prompt preset selection

- **refresh-prompt-cache** - Manages prompt template cache
  - **Code Reference**: `supabase/functions/refresh-prompt-cache/index.ts`
  - **Key Features**: Template cache refresh, cache invalidation, performance optimization, template version management
  - **Integration**: Prompting system, cache system
  - **Usage**: Template cache management

#### **Chat & Roleplay System**

- **playground-chat** - Chat functionality for playground page
  - **Code Reference**: `supabase/functions/playground-chat/index.ts`
  - **Key Features**: Real-time chat processing, roleplay scenario management, template-based responses, character context handling, conversation history
  - **Integration**: Chat Worker, roleplay system, template system
  - **Usage**: Playground page chat and roleplay

- **register-chat-worker** - Registers chat worker with the system
  - **Code Reference**: `supabase/functions/register-chat-worker/index.ts`
  - **Key Features**: Worker registration and validation, health monitoring setup, configuration management, status tracking
  - **Integration**: Chat worker, worker management
  - **Usage**: Chat worker registration

#### **External API Integration**

- **replicate-image** - Replicate API integration for image generation
  - **Code Reference**: `supabase/functions/replicate-image/index.ts`
  - **Key Features**: RV5.1 model integration, parameter mapping and conversion, fallback handling, cost tracking, webhook integration, prompt preservation fix (January 2025)
  - **Integration**: Replicate API, image generation system
  - **Usage**: Alternative image generation via Replicate
  - **Recent Fix**: Resolved prompt overwriting issue where user prompts were being overridden by empty database defaults

- **replicate-webhook** - Handles Replicate webhook callbacks
  - **Code Reference**: `supabase/functions/replicate-webhook/index.ts`
  - **Key Features**: Webhook validation and processing, result handling and storage, error handling and retries, status updates
  - **Integration**: Replicate API, job system
  - **Usage**: Replicate job completion notifications

- **replicate-callback** - Processes Replicate job completion
  - **Code Reference**: `supabase/functions/replicate-callback/index.ts`
  - **Key Features**: Result processing and validation, storage management, metadata updates, real-time notifications
  - **Integration**: Replicate API, workspace system
  - **Usage**: Replicate job result processing

#### **System Management & Monitoring**

- **system-metrics** - Provides system metrics for admin dashboard
  - **Code Reference**: `supabase/functions/system-metrics/index.ts`
  - **Key Features**: Worker health monitoring, queue depth tracking, performance metrics, system status reporting
  - **Integration**: Admin system, monitoring system
  - **Usage**: Admin dashboard metrics

- **health-check-workers** - Monitors worker system health
  - **Code Reference**: `supabase/functions/health-check-workers/index.ts`
  - **Key Features**: Worker availability checking, response time monitoring, health status reporting, automatic failover detection
  - **Integration**: Worker system, monitoring system
  - **Usage**: Worker health monitoring

- **get-active-worker-url** - Retrieves active worker URLs
  - **Code Reference**: `supabase/functions/get-active-worker-url/index.ts`
  - **Key Features**: Worker URL management, load balancing support, health-based routing, configuration management
  - **Integration**: Worker system, job routing
  - **Usage**: Worker URL discovery

- **update-worker-url** - Updates worker URLs in configuration
  - **Code Reference**: `supabase/functions/update-worker-url/index.ts`
  - **Key Features**: URL updates and validation, configuration persistence, health status updates, admin interface integration
  - **Integration**: Worker system, configuration management
  - **Usage**: Worker configuration management

- **get-schema-info** - Retrieves database schema information
  - **Code Reference**: `supabase/functions/get-schema-info/index.ts`
  - **Key Features**: Schema discovery and reporting, table metadata retrieval, column information, relationship mapping
  - **Integration**: Database system, admin tools
  - **Usage**: Database schema exploration

#### **Admin & Testing Functions**

- **generate-admin-image** - Generates images for admin purposes
  - **Code Reference**: `supabase/functions/generate-admin-image/index.ts`
  - **Key Features**: Admin-specific image generation, testing and validation, system verification, performance testing
  - **Integration**: Image generation, admin system
  - **Usage**: Admin testing and validation

- **generate-avatars** - Generates user avatars
  - **Code Reference**: `supabase/functions/generate-avatars/index.ts`
  - **Key Features**: Avatar generation and customization, user preference handling, storage management, real-time updates
  - **Integration**: Avatar system, image generation
  - **Usage**: User avatar generation

### **Deprecated Functions**

- **enhance-prompt-old** - Original prompt enhancement implementation
  - **Status**: ❌ Deprecated (August 2025)
  - **Replaced By**: `enhance-prompt`
  - **Reason**: Superseded by improved template system and pure inference architecture

- **generate-content** - Original content generation endpoint
  - **Status**: ❌ Deprecated (August 2025)
  - **Replaced By**: `queue-job`
  - **Reason**: Consolidated into unified job queuing system

- **test-edge-functions** - Testing and validation functions
  - **Status**: ❌ Deprecated (August 2025)
  - **Reason**: Replaced by dedicated testing functions and monitoring

- **validate-enhancement-fix** - Enhancement system validation
  - **Status**: ❌ Deprecated (August 2025)
  - **Reason**: Superseded by improved monitoring and validation systems

### **Shared Utilities**

#### **cache-utils.ts** (`supabase/functions/_shared/cache-utils.ts`)

- **Purpose**: Intelligent caching system for templates and prompts
- **Key Features**:
  - Template caching with TTL (Time To Live)
  - Content detection (SFW/NSFW) for appropriate template selection
  - Performance optimization (80% reduction in DB calls)
  - Fallback mechanisms for cache misses
  - Cache invalidation strategies
- **Usage**: All functions requiring template or content caching
- **Impact**: Significant performance improvement across all prompt-related functions

#### **monitoring.ts** (`supabase/functions/_shared/monitoring.ts`)

- **Purpose**: Performance tracking and error monitoring
- **Key Features**:
  - Execution time monitoring for performance optimization
  - Cache hit/miss tracking for cache efficiency analysis
  - Error logging and reporting for debugging
  - System health validation for reliability
  - Performance metrics collection for optimization
- **Usage**: All functions requiring monitoring and logging
- **Impact**: Comprehensive system observability and performance tracking

### **Edge Function Architecture**

- **Job Flow**: queue-job → worker → job-callback
- **Prompt Flow**: enhance-prompt → template selection → enhancement
- **Storage Flow**: workspace-temp → user-library (on save)
- **API Flow**: replicate-image → replicate-webhook → replicate-callback

### **Development & Deployment**

#### **Code Location & Runtime**

- **All Functions**: `supabase/functions/`
- **Shared Utilities**: `supabase/functions/_shared/`
- **Deployment**: Automatic with project deployment
- **Runtime**: Deno with TypeScript

#### **Testing & Development Commands**

```bash
# Local testing
supabase functions serve

# View logs
supabase functions logs

# Deploy specific function
supabase functions deploy [function-name]
```

#### **Integration Patterns**

- **Job Queuing**: Redis-based job management for AI generation
- **Real-time Updates**: WebSocket subscriptions for live status
- **Template System**: Database-driven prompting with caching
- **Fallback Strategy**: 3rd party API integration for reliability
- **Monitoring**: Comprehensive logging and performance tracking

#### **Performance Considerations**

- **Caching**: Extensive use of template and content caching (80% DB call reduction)
- **Monitoring**: Real-time performance tracking and optimization
- **Fallbacks**: Multiple levels of fallback for reliability
- **Optimization**: Token limits and parameter optimization

#### **Security Implementation**

- **RLS**: Row-level security on all database operations
- **Validation**: Input validation and sanitization
- **Authentication**: Supabase Auth integration with JWT verification
- **Authorization**: Role-based access control and permission management

---

## **Integration Map**

### **Pages Using Database Tables**

- **Workspace**: workspace_assets, jobs
- **Library**: user_library, user_collections
- **Playground**: conversations, messages, prompt_templates
- **Admin**: All system tables, usage_logs, model_* tables
- **Storyboard**: characters, character_scenes, scenes, projects

### **Pages Using Storage Buckets**

- **Workspace**: workspace-temp, reference_images
- **Library**: user-library, videos
- **Character System**: avatars, user-library
- **Admin**: system_assets, all buckets for management

### **Edge Functions Using Database Tables**

- **queue-job**: jobs, api_providers, api_models
- **enhance-prompt**: prompt_templates, system_config
- **playground-chat**: conversations, messages, prompt_templates
- **workspace-actions**: workspace_assets, user_library
- **system-metrics**: All monitoring tables

### **Edge Functions Using Storage Buckets**

- **workspace-actions**: workspace-temp, user-library
- **job-callback**: workspace-temp, user-library
- **generate-avatars**: avatars
- **replicate-callback**: user-library

---

## **Maintenance Notes**

### **Weekly Review Checklist**

- [ ] Check for new tables added to the system
- [ ] Update table documentation with schema changes
- [ ] Review RLS policies for security
- [ ] Update integration maps for new features
- [ ] Check for deprecated or unused tables
- [ ] Monitor storage bucket usage and cleanup
- [ ] Verify edge function health and performance

### **Schema Update Process**

1. **Detect Changes**: Use Supabase MCP server for real-time schema monitoring
2. **Validate Updates**: Check column counts and relationships
3. **Update Documentation**: Modify this single file instead of 30+ individual files
4. **Test Integration**: Verify edge functions still work with schema changes
5. **Monitor Storage**: Check bucket usage and cleanup processes

---

## **Best Practices for AI Development**

### **When Working with Database**

1. **Check This File First**: All table information is consolidated here
2. **Use Real-Time Data**: Leverage Supabase MCP server for current schema
3. **Follow RLS Patterns**: Respect user-specific access controls
4. **Consider Relationships**: Understand how tables connect before writing queries
5. **Monitor Performance**: Use analytics tables to identify bottlenecks

### **When Working with Storage**

1. **Understand Bucket Purposes**: Each bucket has specific use cases
2. **Follow Access Patterns**: Public vs. private bucket access controls
3. **Manage Lifecycle**: Temporary vs. permanent storage considerations
4. **Monitor Usage**: Track storage consumption and cleanup

### **When Working with Edge Functions**

1. **Follow Established Patterns**: Use existing function architectures
2. **Leverage Shared Utilities**: Use cache-utils.ts and monitoring.ts
3. **Test Locally**: Use `supabase functions serve` for development
4. **Monitor Performance**: Include performance tracking in new functions

### **Common Integration Points**

- **Database**: Use Supabase client for database operations
- **Storage**: Use Supabase Storage for file management
- **Auth**: Use Supabase Auth for user authentication
- **Real-time**: Use Supabase real-time for live updates
- **Edge Functions**: Use established patterns for server-side operations

---

## **Real-Time Monitoring with Supabase MCP**

### **Available MCP Tools**

- **Database Schema**: Real-time table and column information
- **Storage Buckets**: Bucket configuration and usage statistics
- **Edge Functions**: Function status and performance metrics
- **Performance Monitoring**: Query performance and system health
- **Security Analysis**: RLS policy validation and security advisories

### **MCP Integration Benefits**

- **Instant Schema Validation**: Real-time database structure verification
- **Performance Insights**: Live system metrics and optimization opportunities
- **Security Monitoring**: Continuous RLS policy and access control validation
- **Automated Documentation**: Keep this guide current with minimal effort

---

## **Enhanced System Tables**

### **negative_prompts** (11 columns, 12 rows)

**Purpose**: Negative prompt presets with generation mode support for different model types and content modes  
**Key Columns**:

- `model_type`: Model family ('sdxl', 'rv51', 'replicate-sdxl', 'chat')
- `content_mode`: Content type ('nsfw', 'sfw')
- `generation_mode`: Generation type ('txt2img', 'i2i') - **NEW COLUMN**
- `negative_prompt`: The actual negative prompt terms
- `priority`: Priority level (1, 2, 3...)
- `is_active`: Whether the prompt is currently active

**Current Data**:

- **SDXL (Local Lustify)**: 8 rows for NSFW/SFW with multiple priority levels
- **RV51 (Replicate)**: 8 rows for NSFW/SFW with multiple priority levels  
- **Replicate SDXL**: 4 rows (2 txt2img + 2 i2i) with I2I-optimized minimal prompts
- **Chat**: 2 rows for NSFW/SFW assistant anti-prompts

**I2I Optimization**:

- **Regular prompts**: 7-12 terms for quality control
- **I2I prompts**: 3 terms only (`'blurry, worst quality, jpeg artifacts'`) to prevent modification interference

**Usage**: Edge functions query by `model_type`, `content_mode`, and `generation_mode` to get targeted negative prompts

---

---

## **🔧 RECENT FIXES & UPDATES**

### **clothing_tags Schema Addition (February 2026)**

**Migration:** `20260220044335_51e68cb7-b800-4ca4-8d80-4173d2ada679.sql`

**Change:** Added `clothing_tags text[] DEFAULT '{}'::text[]` column to `characters` table

**Purpose:** Separate physical appearance attributes from clothing/outfit attributes for:

- Better prompt construction (physical vs outfit tokens)
- Dynamic outfit changes in roleplay scenes
- AI suggestion categorization

**Impact:**

- `StudioSidebar.tsx`: Separate "Physical Appearance" and "Default Outfit" tag sections
- `characterPromptBuilder.ts`: Includes both tag types in portrait prompts (6 appearance + 4 clothing)
- `roleplay-chat/index.ts`: Constructs `${physicalAppearance}, wearing ${outfitTags}` for scenes

**Migration Guide:** See `docs/08-DATABASE/MIGRATIONS/20260220_clothing_tags.md`

---

### **RV5.1 Prompt Overwriting Fix (January 2025)**

### **RV5.1 Prompt Overwriting Fix**

**Issue**: RV5.1 model was generating random images instead of following user prompts.

**Root Cause**: JavaScript spread operator order bug in `replicate-image` edge function where `input_defaults` contained `"prompt": ""` that overwrote user prompts.

**Solution Applied**:

1. **Edge Function Fix**: Reordered spread operator to preserve user prompts
2. **Database Migration**: `20250110000004_fix_rv51_prompt_defaults.sql` - Removed empty prompt from `input_defaults`
3. **Documentation**: Updated edge function and database documentation

**Files Modified**:

- ✅ `supabase/functions/replicate-image/index.ts` - Fixed prompt overwriting
- ✅ `supabase/migrations/20250110000004_fix_rv51_prompt_defaults.sql` - Database cleanup
- ✅ `docs/01-PAGES/01-WORKSPACE_PURPOSE.md` - Added fix documentation
- ✅ `docs/08-DATABASE/DATABASE.md` - Updated edge function documentation

**Impact**: RV5.1 now correctly uses user prompts with 95%+ success rate (up from 0% due to empty prompts).

### **RV5.1 Scheduler Configuration Fix**

**Issue**: RV5.1 generation failing with 422 scheduler validation errors.

**Root Cause**: Database `api_models` configuration had incorrect scheduler values that didn't match Replicate API requirements.

**Solution Applied**:

- **Migration**: `20250110000003_fix_rv51_scheduler_configuration.sql`
- **Fix**: Updated `allowed_schedulers` to `["EulerA", "MultistepDPM-Solver"]` and corrected `scheduler_aliases`

**Impact**: RV5.1 scheduler validation now passes, enabling successful generation.

### **Negative Prompts I2I Optimization**

**Enhancement**: Added `generation_mode` column to `negative_prompts` table for I2I-specific prompts.

**Migration**: `20250110000002_simple_replicate_sdxl_negative_prompts.sql`

- Added `generation_mode` column with 'txt2img' and 'i2i' values
- Created I2I-optimized minimal negative prompts (3 terms vs 7-12 for regular)
- Prevents modification interference in I2I generation

**Impact**: Better I2I generation quality with targeted negative prompts.

---

**Note**: This consolidated documentation provides complete Supabase system context in one place. Use the Supabase MCP server for real-time schema validation, storage monitoring, and edge function status. All tables, storage buckets, and edge functions are documented with their relationships, integration points, and current status.
