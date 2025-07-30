# Supabase Environment Output

**Generated:** July 30, 2025  
**Project:** OurVidz.com  
**Environment:** Production

---

## 📊 **Query Results**

Current comprehensive database and infrastructure status:

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
| Storage | Bucket: video_fast | Public: false, Size Limit: 50MB, MIME: video/mp4,video/mpeg,video/webm,video/quicktime |
| Storage | Bucket: video_high | Public: false, Size Limit: 200MB, MIME: video/mp4,video/mpeg,video/webm,video/quicktime |
| Storage | Bucket: videos | Public: true, Size Limit: No limit, MIME: All |
| **Database Schema** | | |
| Tables | Total Tables | 20 |
| Functions | Total Functions | 17 |
| Migrations | Total Migrations | 59 |
| Performance | Indexes Count | 72 |
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
| **Job System** | | |
| Job System | Active Job Types | sdxl_image_fast, sdxl_image_high, image_fast, image_high, video_fast, video_high, image7b_fast_enhanced, image7b_high_enhanced, video7b_fast_enhanced, video7b_high_enhanced |
| **Security** | | |
| Security | Tables with RLS | 20 |
| Security | Total RLS Policies | 35 |
| **Extensions** | | |
| Extensions | pg_graphql | 1.5.11 |
| Extensions | pg_stat_statements | 1.10 |
| Extensions | pgcrypto | 1.3 |
| Extensions | pgjwt | 0.2.0 |
| Extensions | plpgsql | 1.0 |
| Extensions | supabase_vault | 0.3.1 |
| Extensions | uuid-ossp | 1.1 |

---

## 🔧 **Edge Functions**

### **Available Functions**
- **queue-job:** ✅ Active (JWT verification enabled) - Job submission and routing
- **job-callback:** ✅ Active (JWT verification disabled) - Worker callback processing  
- **enhance-prompt:** ✅ Active - AI prompt enhancement service
- **generate-admin-image:** ✅ Active (Admin bypass) - Admin image generation
- **get-active-worker-url:** ✅ Active - Worker URL management
- **register-chat-worker:** ✅ Active - Chat worker registration
- **update-worker-url:** ✅ Active - Worker URL updates
- **playground-chat:** ✅ Active - Chat playground functionality
- **validate-enhancement-fix:** ✅ Active - Enhancement validation

---

## 📈 **Performance Metrics**

### **Current Usage Statistics**
- **Total Images Generated:** 3,393
- **Total Videos Generated:** 272
- **Active Jobs Processed:** 2,257
- **Total Conversations:** 20 (with 191 messages)
- **Registered Users:** 1
- **Active Projects:** 23
- **Usage Log Entries:** 4,169

### **Job Types Supported (10 Total)**
- **SDXL Fast Images** (sdxl_image_fast) - 3-8 seconds
- **SDXL High Images** (sdxl_image_high) - 8-15 seconds  
- **WAN Fast Images** (image_fast) - ~73 seconds
- **WAN High Images** (image_high) - ~90 seconds
- **WAN Fast Videos** (video_fast) - ~180 seconds
- **WAN High Videos** (video_high) - ~280 seconds
- **Enhanced Fast Images** (image7b_fast_enhanced) - ~87 seconds
- **Enhanced High Images** (image7b_high_enhanced) - ~104 seconds
- **Enhanced Fast Videos** (video7b_fast_enhanced) - ~194 seconds
- **Enhanced High Videos** (video7b_high_enhanced) - ~294 seconds

### **Recent Job Activity**
- Job: 233a90d1-819c-41ea-af0a-2dca3848d8a5 (sdxl_image_fast) - Status: queued
- Job: 348fe1be-b9fb-4713-b78e-a2b9d502643b (sdxl_image_high) - Status: completed
- Job: 73a96333-05de-4355-a294-5f77d76d7ec1 (video_high) - Status: completed
- Job: be5d3fa7-1f7a-4ecf-b00d-856ec0a5e097 (video_high) - Status: completed

---

## 🔒 **Security Configuration**

### **Row Level Security (RLS)**
- **Tables with RLS Enabled:** 20/20 (100% coverage)
- **Total RLS Policies:** 35 active policies
- **Storage Policies:** 52 policies across 13 buckets
- **Authentication:** JWT-based with role hierarchy

### **User Role System**
```sql
app_role: 'admin' | 'moderator' | 'premium_user' | 'basic_user' | 'guest'
```

### **Key Security Functions**
- `has_role(_user_id, _role)` - Role verification
- `get_user_role_priority(_user_id)` - Role priority calculation
- `validate_job_completion()` - Job completion validation
- `clean_orphaned_jobs()` - Database maintenance

---

## 🗄️ **Database Schema Overview**

### **Core Tables (20 Total)**
```yaml
User Management:
  - profiles: User profiles and subscription data
  - user_roles: Role-based access control
  - user_activity_log: Activity tracking

Content Generation:
  - jobs: Job tracking and status management
  - images: Generated image metadata (3,393 records)
  - videos: Generated video metadata (272 records)
  - conversations: Chat conversations (20 records)
  - messages: Chat messages (191 records)

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
```

### **Storage Architecture**
- **13 Storage Buckets** with granular access controls
- **Reference Image Support** with dedicated bucket
- **Multi-format Support** (PNG, JPEG, WebP, MP4, WebM)
- **Size Limits** from 5MB (fast) to 200MB (high-quality video)

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
```

### **Migration Status**
- **Latest Migration:** 20250728040822 (Numeric field overflow fix)
- **Total Migrations Applied:** 59
- **Schema Version:** Current and up-to-date
- **All Migrations:** Successfully applied and validated

### **Real-time Configuration**
- **Enabled Tables:** images, videos, jobs, conversations, messages
- **WebSocket Connections:** Active for live updates
- **Replica Identity:** FULL for all real-time tables

---

## 📊 **System Health Indicators**

### **Database Performance**
- **72 Optimized Indexes** for query performance
- **RLS Policies Optimized** for performance (consolidated from multiple permissive policies)
- **Foreign Key Indexes** added to resolve Library page performance issues
- **Orphaned Job Cleanup** function implemented

### **Content Moderation**
- **Moderation Status Tracking** for images and jobs
- **NSFW Score Tracking** with configurable thresholds
- **Review Workflow** with admin assignment capabilities

### **Analytics & Monitoring**
- **System Statistics Function** for comprehensive metrics
- **User Analytics View** for usage patterns
- **Model Performance Tracking** for optimization
- **Activity Logging** for audit trails

---

*This file reflects the complete Supabase infrastructure state as of July 30, 2025. Update this document whenever significant changes are made to maintain accuracy for development and AI assistance.*