# Supabase Environment Output

**Generated:** August 2, 2025  
**Project:** OurVidz.com  
**Environment:** Production  
**PRD Version:** v3.0

---

## 📊 **Current Infrastructure Status**

| Category | Item | Value |
|----------|------|-------|
| Database Info | PostgreSQL Version | PostgreSQL 15.8 on aarch64-unknown-linux-gnu, compiled by gcc (GCC) 13.2.0, 64-bit |
| Database Info | Current Database | postgres |
| Database Info | Current Schema | public |
| Database Info | Current User | postgres |
| **Storage Buckets** | | |
| Storage | Bucket: image7b_fast_enhanced | Public: false, Size Limit: 20MB, MIME: image/png,image/jpeg,image/webp |
| Storage | Bucket: image7b_high_enhanced | Public: false, Size Limit: 20MB, MIME: image/png,image/jpeg,image/webp |
| Storage | Bucket: image_fast | Public: false, Size Limit: 5MB, MIME: image/png,image/jpeg,image/webp |
| Storage | Bucket: image_high | Public: false, Size Limit: 10MB, MIME: image/png,image/jpeg,image/webp |
| Storage | Bucket: reference_images | Public: false, Size Limit: 10MB, MIME: image/jpeg,image/png,image/webp,image/gif |
| Storage | Bucket: sdxl_image_fast | Public: false, Size Limit: 5MB, MIME: image/png,image/jpeg,image/webp |
| Storage | Bucket: sdxl_image_high | Public: false, Size Limit: 10MB, MIME: image/png,image/jpeg,image/webp |
| Storage | Bucket: system_assets | Public: true, Size Limit: 5MB, MIME: image/png,image/jpeg,image/webp,image/svg+xml |
| Storage | Bucket: video7b_fast_enhanced | Public: false, Size Limit: 100MB, MIME: video/mp4,video/webm |
| Storage | Bucket: video7b_high_enhanced | Public: false, Size Limit: 100MB, MIME: video/mp4,video/webm |
| Storage | Bucket: video_fast | Public: false, Size Limit: 50MB, MIME: video/mp4,video/mpeg,video/webm/video/quicktime |
| Storage | Bucket: video_high | Public: false, Size Limit: 200MB, MIME: video/mp4,video/mpeg,video/webm/video/quicktime |
| Storage | Bucket: videos | Public: true, Size Limit: No limit, MIME: All |
| **Database Schema** | | |
| Tables | Total Tables | 22 |
| Functions | Total Functions | 20 |
| Migrations | Total Migrations | 60 |
| Performance | Indexes Count | 80 |
| **Data Statistics** | | |
| Data Stats | Characters Count | 0 |
| Data Stats | Conversations Count | 20 |
| Data Stats | Images Count | 3,393 |
| Data Stats | Jobs Count | 2,257 |
| Data Stats | Messages Count | 191 |
| Data Stats | Model Test Results Count | 5 |
| Data Stats | Profiles Count | 1 |
| Data Stats | Projects Count | 23 |
| Data Stats | Scenes Count | 0 |
| Data Stats | Usage Logs Count | 4,169 |
| Data Stats | User Activity Logs Count | 0 |
| Data Stats | Users Count | 1 |
| Data Stats | Videos Count | 272 |
| Data Stats | Workspace Sessions Count | 0 |
| Data Stats | Workspace Items Count | 0 |
| **Job System** | | |
| Job System | Active Job Types | sdxl_image_fast, sdxl_image_high, image_fast, image_high, video_fast, video_high, image7b_fast_enhanced, image7b_high_enhanced, video7b_fast_enhanced, video7b_high_enhanced |
| Job System | Workspace Support | ✅ Enabled (destination field, workspace_session_id) |
| **Security** | | |
| Security | Tables with RLS | 22 |
| Security | Total RLS Policies | 37 |
| **Extensions** | | |
| Extensions | pg_graphql | 1.5.11 |
| Extensions | pg_stat_statements | 1.10 |
| Extensions | pgcrypto | 1.3 |
| Extensions | pgjwt | 0.2.0 |
| Extensions | plpgsql | 1.0 |
| Extensions | supabase_vault | 0.3.1 |
| Extensions | uuid-ossp | 1.1 |

---

## 🎯 **Workspace-First System**

### **New Database Tables (August 2, 2025)**

#### **workspace_sessions**
```sql
-- Temporary workspace sessions for users
CREATE TABLE public.workspace_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_name TEXT DEFAULT 'Workspace Session',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'
);
```

#### **workspace_items**
```sql
-- Temporary workspace content items
CREATE TABLE public.workspace_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.workspace_sessions(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Content information
  prompt TEXT NOT NULL,
  enhanced_prompt TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('image', 'video')),
  model_type TEXT,
  quality TEXT CHECK (quality IN ('fast', 'high')),
  
  -- Storage information
  storage_path TEXT,
  bucket_name TEXT,
  url TEXT,
  thumbnail_url TEXT,
  
  -- Generation parameters
  generation_params JSONB DEFAULT '{}',
  seed INTEGER,
  reference_image_url TEXT,
  reference_strength DECIMAL(3,2),
  
  -- Status and metadata
  status TEXT DEFAULT 'generated' CHECK (status IN ('generating', 'generated', 'failed', 'saved')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **jobs Table Updates**
```sql
-- Added workspace support to existing jobs table
ALTER TABLE public.jobs ADD COLUMN destination TEXT DEFAULT 'library' CHECK (destination IN ('library', 'workspace'));
ALTER TABLE public.jobs ADD COLUMN workspace_session_id UUID REFERENCES public.workspace_sessions(id) ON DELETE SET NULL;
```

### **Workspace System Functions**

#### **create_workspace_session**
```sql
-- Creates new workspace session, deactivates previous active sessions
CREATE OR REPLACE FUNCTION public.create_workspace_session(
  p_user_id UUID,
  p_session_name TEXT DEFAULT 'Workspace Session'
) RETURNS UUID;
```

#### **save_workspace_item_to_library**
```sql
-- Moves workspace item to permanent library (images/videos table)
CREATE OR REPLACE FUNCTION public.save_workspace_item_to_library(
  p_workspace_item_id UUID,
  p_user_id UUID
) RETURNS UUID;
```

#### **clear_workspace_session**
```sql
-- Deletes all items and session
CREATE OR REPLACE FUNCTION public.clear_workspace_session(
  p_session_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN;
```

### **Workspace System Indexes**
- `idx_workspace_sessions_user_id` - User session lookup
- `idx_workspace_sessions_active` - Active session filtering
- `idx_workspace_items_session_id` - Session items lookup
- `idx_workspace_items_job_id` - Job association lookup
- `idx_workspace_items_user_id` - User items lookup
- `idx_workspace_items_status` - Status filtering
- `idx_jobs_destination` - Workspace/library routing
- `idx_jobs_workspace_session` - Session association

---

## 🧠 **Dynamic Prompting System**

### **Prompt Templates Overview**
- **Total Templates:** 12 active templates
- **Coverage:** All models (SDXL, WAN, Qwen Base/Instruct) × All use cases (enhancement, chat, roleplay, admin)
- **Content Modes:** SFW and NSFW variants for appropriate use cases
- **Token Limits:** Enforced per template (75-1000 tokens)

### **Template Categories**

#### **Enhancement Templates (6)**
```yaml
SDXL Enhancement:
  - SDXL Prompt Enhance – Qwen Base (NSFW): 75 tokens, explicit imagery
  - SDXL Prompt Enhance – Qwen Base (SFW): 75 tokens, wholesome imagery
  - SDXL Prompt Enhance – Qwen Instruct (NSFW): 75 tokens, detailed explicit
  - SDXL Prompt Enhance – Qwen Instruct (SFW): 75 tokens, detailed wholesome

WAN Enhancement:
  - WAN Prompt Enhance – Qwen Base (NSFW): 100 tokens, explicit video
  - WAN Prompt Enhance – Qwen Base (SFW): 100 tokens, wholesome video
  - WAN Prompt Enhance – Qwen Instruct (NSFW): 100 tokens, detailed explicit video
  - WAN Prompt Enhance – Qwen Instruct (SFW): 100 tokens, detailed wholesome video
```

#### **Chat Templates (3)**
```yaml
General Chat:
  - Chat Assistant – Qwen Instruct (NSFW): 600 tokens, flirtatious conversation
  - Chat Assistant – Qwen Instruct (SFW): 400 tokens, helpful assistant

Specialized:
  - Admin Assistant – Qwen Instruct: 400 tokens, technical prompt analysis
```

#### **Roleplay Template (1)**
```yaml
Immersive Roleplay:
  - Qwen Instruct Roleplay Fantasy: 1000 tokens, erotic roleplay scenes
```

### **Template Features**
- **Model-Specific Optimization:** Tailored for Qwen Base vs Instruct behaviors
- **Content Mode Awareness:** Appropriate language for SFW/NSFW contexts
- **Token Limit Enforcement:** Prevents CLIP truncation and ensures quality
- **Professional Comments:** Design decisions documented for each template
- **Version Control:** Template versioning and update tracking

---

## 🔧 **Edge Functions Reference**

### **Active Functions**
- **queue-job:** ✅ Active (JWT verification enabled) - Job submission and routing with workspace support
- **job-callback:** ✅ Active (JWT verification disabled) - Worker callback processing with workspace routing
- **enhance-prompt:** ✅ Active - AI prompt enhancement service
- **generate-admin-image:** ✅ Active (Admin bypass) - Admin image generation
- **get-active-worker-url:** ✅ Active - Worker URL management
- **register-chat-worker:** ✅ Active - Chat worker registration
- **update-worker-url:** ✅ Active - Worker URL updates
- **playground-chat:** ✅ Active - Chat playground functionality
- **validate-enhancement-fix:** ✅ Active - Enhancement validation

### **Workspace System Integration**
- **queue-job:** Creates workspace sessions, routes jobs to workspace or library
- **job-callback:** Routes completed jobs to workspace_items or images/videos tables
- **Real-time Updates:** Workspace items update in real-time via WebSocket

---

## 🗄️ **Database Tables Reference**

### **Core Tables (22 Total)**
```yaml
User Management:
  - profiles: User profiles and subscription data
  - user_roles: Role-based access control
  - user_activity_log: Activity tracking

Content Generation:
  - jobs: Job tracking and status management (with workspace support)
  - images: Generated image metadata (3,393 records)
  - videos: Generated video metadata (272 records)
  - conversations: Chat conversations (20 records)
  - messages: Chat messages (191 records)

Workspace System (NEW):
  - workspace_sessions: Temporary user workspace sessions
  - workspace_items: Temporary workspace content items

Project Management:
  - projects: Project organization (23 records)
  - scenes: Scene management for storyboards
  - characters: Character definitions

Analytics & Testing:
  - usage_logs: Usage tracking (4,169 records)
  - model_test_results: AI model testing (5 records)
  - admin_development_progress: Development tracking

Configuration:
  - system_config: Application settings
  - model_config_history: Model configuration tracking
  - model_performance_logs: Performance metrics
  - enhancement_presets: Enhancement configurations
  - compel_configs: Compel weight configurations
  - prompt_ab_tests: A/B testing framework

Prompting System:
  - prompt_templates: 12 active templates for dynamic prompting
  - negative_prompts: SDXL negative prompt configurations
```

---

## 📈 **Current Usage Statistics**

### **Content Generation**
- **Total Images Generated:** 3,393
- **Total Videos Generated:** 272
- **Active Jobs Processed:** 2,257
- **Total Conversations:** 20 (with 191 messages)
- **Registered Users:** 1
- **Active Projects:** 23
- **Usage Log Entries:** 4,169
- **Workspace Sessions:** 0 (new system)
- **Workspace Items:** 0 (new system)

### **Job Types Supported (10 Total)**
```yaml
SDXL Image Generation:
  sdxl_image_fast: 3-8 seconds, 5MB limit
  sdxl_image_high: 8-15 seconds, 10MB limit

WAN Image Generation:
  image_fast: ~73 seconds, 5MB limit
  image_high: ~90 seconds, 10MB limit

WAN Video Generation:
  video_fast: ~180 seconds, 50MB limit
  video_high: ~280 seconds, 200MB limit

Enhanced Generation (Qwen + WAN):
  image7b_fast_enhanced: ~87 seconds, 20MB limit
  image7b_high_enhanced: ~104 seconds, 20MB limit
  video7b_fast_enhanced: ~194 seconds, 100MB limit
  video7b_high_enhanced: ~294 seconds, 100MB limit
```

### **Recent Job Activity**
- Job: 233a90d1-819c-41ea-af0a-2dca3848d8a5 (sdxl_image_fast) - Status: queued
- Job: 348fe1be-b9fb-4713-b78e-a2b9d502643b (sdxl_image_high) - Status: completed
- Job: 73a96333-05de-4355-a294-5f77d76d7ec1 (video_high) - Status: completed
- Job: be5d3fa7-1f7a-4ecf-b00d-856ec0a5e097 (video_high) - Status: completed

---

## 🔒 **Security Configuration**

### **Row Level Security (RLS)**
- **Tables with RLS Enabled:** 22/22 (100% coverage)
- **Total RLS Policies:** 37 active policies
- **Storage Policies:** 52 policies across 13 buckets
- **Authentication:** JWT-based with role hierarchy
- **Workspace Security:** User-specific workspace session and item access

### **User Role System**
```sql
app_role: 'admin' | 'moderator' | 'premium_user' | 'basic_user' | 'guest'
```

### **Key Security Functions**
- `has_role(_user_id, _role)` - Role verification
- `get_user_role_priority(_user_id)` - Role priority calculation
- `validate_job_completion()` - Job completion validation
- `clean_orphaned_jobs()` - Database maintenance
- `create_workspace_session()` - Secure workspace session creation
- `save_workspace_item_to_library()` - Secure item migration

---

## 🚀 **Infrastructure Status**

### **Environment Variables**
```bash
# Supabase Configuration
SUPABASE_URL=[production_url]
SUPABASE_ANON_KEY=[production_key]
SUPABASE_SERVICE_ROLE_KEY=[service_key]

# Redis Configuration  
UPSTASH_REDIS_REST_URL=[redis_url]
UPSTASH_REDIS_REST_TOKEN=[redis_token]

# Worker Configuration
CHAT_WORKER_URL=[chat_worker_endpoint]
WAN_WORKER_URL=[wan_worker_endpoint]
SDXL_WORKER_URL=[sdxl_worker_endpoint]

# RunPod Configuration
RUNPOD_API_KEY=[runpod_api_key]
RUNPOD_ENDPOINT_ID=[endpoint_id]
```

### **Migration Status**
- **Latest Migration:** 20250802000000 (Workspace system implementation)
- **Total Migrations Applied:** 60
- **Schema Version:** Current and up-to-date
- **All Migrations:** Successfully applied and validated
- **Workspace System:** ✅ Fully implemented and operational

### **Real-time Configuration**
- **Enabled Tables:** images, videos, jobs, conversations, messages, workspace_items
- **WebSocket Connections:** Active for live updates
- **Replica Identity:** FULL for all real-time tables
- **Workspace Updates:** Real-time workspace item status updates

---

## 📊 **System Health Indicators**

### **Database Performance**
- **80 Optimized Indexes** for query performance
- **RLS Policies Optimized** for performance (consolidated from multiple permissive policies)
- **Foreign Key Indexes** added to resolve Library page performance issues
- **Orphaned Job Cleanup** function implemented
- **Workspace Indexes** optimized for session and item queries

### **Content Moderation**
- **Moderation Status Tracking** for images and jobs
- **NSFW Score Tracking** with configurable thresholds
- **Review Workflow** with admin assignment capabilities
- **Workspace Moderation** - items can be reviewed before library save

### **Analytics & Monitoring**
- **System Statistics Function** for comprehensive metrics
- **User Analytics View** for usage patterns
- **Model Performance Tracking** for optimization
- **Activity Logging** for audit trails
- **Workspace Analytics** - session and item usage tracking

---

*This file provides a quick reference for Supabase infrastructure state as of August 2, 2025. For detailed architecture information, see [02-ARCHITECTURE.md](./02-ARCHITECTURE.md). For worker system details, see [05-WORKER_SYSTEM.md](./05-WORKER_SYSTEM.md). For prompting system details, see [11-PROMPTING_SYSTEM.md](./11-PROMPTING_SYSTEM.md). For workspace system details, see [pages/01-WORKSPACE_PURPOSE.md](./pages/01-WORKSPACE_PURPOSE.md).*