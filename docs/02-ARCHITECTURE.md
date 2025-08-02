# System Architecture - Consolidated

**Last Updated:** July 30, 2025  
**Status:** Production Active

## 🏗️ Overall Architecture

### **System Components**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Supabase       │    │   Worker        │
│   (ourvidz-1)   │◄──►│   Backend        │◄──►│   (ourvidz-worker)│
│                 │    │                  │    │                 │
│ • React 18      │    │ • PostgreSQL     │    │ • Python        │
│ • TypeScript    │    │ • Auth           │    │ • FastAPI       │
│ • Vite          │    │ • Storage        │    │ • AI Models     │
│ • Tailwind CSS  │    │ • Edge Functions │    │ • RunPod        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### **Implementation Strategy**
- **Manual Control**: User-controlled AI prompt enhancement across all job types
- **Visual Interface**: Intuitive GUI controls replacing complex syntax
- **Quality Improvement**: Target 3.5/5 → 4.5/5 content quality
- **All Job Types**: Enhancement works across all 10 existing job types
- **Existing Infrastructure**: Leverages current dual worker architecture

### **Dynamic Prompt System Plan**
- **Centralized Management**: Supabase-based prompt templates and rules
- **Model Coverage**: Qwen Base/Instruct, SDXL Lustify, WAN 1.3B
- **Phased Implementation**: 7-phase rollout with fallback logic
- **Admin Control**: Real-time prompt management and testing
- **Cache System**: TTL-based local cache with Supabase fallback

## 🗄️ Database Architecture

### **Core Tables**
```sql
-- User Management
users                    -- Supabase Auth users
profiles                 -- Extended user profiles

-- Content Management  
images                   -- Generated images
videos                   -- Generated videos
projects                 -- User projects
workspaces               -- Generation workspaces

-- Job Management
jobs                     -- Generation job queue
job_status               -- Real-time job status
worker_urls              -- Active worker endpoints

-- Analytics & Testing
prompt_tests             -- Prompt testing results
enhancement_analytics    -- Enhancement quality metrics
```

### **Key Relationships**
- **Users** → **Projects** → **Workspaces** → **Images/Videos**
- **Jobs** → **Job Status** (real-time updates)
- **Worker URLs** → **Jobs** (routing)

## 🔌 Edge Functions

### **Core Functions**
```typescript
// Job Management
queue-job/               -- Creates and routes jobs
job-callback/            -- Handles job completion
get-active-worker-url/   -- Returns active worker endpoints

// Content Generation
enhance-prompt/          -- AI prompt enhancement
generate-admin-image/    -- Admin image generation

// Worker Management
health-check-workers/    -- Monitors worker health
update-worker-url/       -- Updates worker endpoints
register-chat-worker/    -- Registers chat workers

// Playground
playground-chat/         -- Chat functionality

// Utilities
refresh-prompt-cache/    -- Refreshes prompt cache
validate-enhancement-fix/ -- Validates enhancements
test-edge-functions/     -- Testing utilities
```

### **Function Flow**
```
Frontend Request
    ↓
Edge Function (e.g., queue-job)
    ↓
Database Operation
    ↓
Worker Communication
    ↓
Response to Frontend
```

## 🔐 Authentication & Security

### **Supabase Auth**
- **Provider**: Supabase Auth
- **Methods**: Email/Password, OAuth (Google, GitHub)
- **Session Management**: Automatic token refresh
- **Row Level Security**: Enabled on all tables

### **Security Policies**
```sql
-- Example RLS policy
CREATE POLICY "Users can view own content" ON images
FOR SELECT USING (auth.uid() = user_id);
```

## 📁 Storage Architecture

### **Storage Buckets**
```
ourvidz-images/          -- Generated images
ourvidz-videos/          -- Generated videos  
ourvidz-thumbnails/      -- Video thumbnails
ourvidz-uploads/         -- User uploads
```

### **File Organization**
```
bucket/
├── user_id/
│   ├── images/
│   │   ├── job_id_1.jpg
│   │   └── job_id_2.jpg
│   ├── videos/
│   │   ├── job_id_3.mp4
│   │   └── job_id_4.mp4
│   └── thumbnails/
│       └── job_id_3.jpg
```

## 🔄 Real-time System

### **WebSocket Connections**
- **Job Status**: Real-time job progress updates
- **Worker Health**: Live worker status monitoring
- **Chat**: Real-time chat functionality

### **Database Triggers**
```sql
-- Automatic job status updates
CREATE TRIGGER job_status_update
AFTER UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION notify_job_status_change();
```

## 🚀 Deployment Architecture

### **Frontend (Vercel/Netlify)**
- **Framework**: React 18 + Vite
- **Build**: Static site generation
- **CDN**: Global content delivery
- **Environment**: Production optimized

### **Backend (Supabase)**
- **Database**: PostgreSQL (managed)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Functions**: Edge Functions (Deno)
- **Region**: Multi-region deployment

### **Workers (RunPod)**
- **Platform**: RunPod.io
- **Hardware**: RTX 6000 ADA (48GB VRAM)
- **Container**: Custom Docker image
- **Scaling**: Auto-scaling based on queue

## 📊 Performance & Monitoring

### **Performance Metrics**
- **Frontend**: < 2s initial load
- **API Response**: < 500ms average
- **Image Generation**: 5-30s depending on model
- **Video Generation**: 30-120s depending on length
- **Database**: < 100ms query response

### **Monitoring Tools**
- **Supabase Dashboard**: Database and function monitoring
- **RunPod Dashboard**: Worker performance and health
- **Custom Analytics**: Job success rates and user metrics

## 🔧 Development Environment

### **Local Development**
```bash
# Frontend
npm run dev              # Start development server

# Database (Online only)
# Use Supabase dashboard for migrations

# Workers (Separate repo)
# Use RunPod for development/testing
```

### **Environment Variables**
```bash
# Frontend (.env)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# Backend (Supabase)
# Configured in Supabase dashboard

# Workers (Separate repo)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
```

## 🔄 Data Flow

### **Image Generation Flow**
```
1. User submits prompt
2. Frontend → queue-job edge function
3. Edge function creates job in database
4. Worker polls for new jobs
5. Worker processes generation
6. Worker uploads result to storage
7. Worker updates job status
8. Frontend receives real-time updates
9. User sees generated image
```

### **Video Generation Flow**
```
1. User submits video prompt
2. Similar to image flow but longer processing
3. Additional thumbnail generation
4. Progress updates during generation
5. Final video + thumbnail delivery
```

## 🔍 Error Handling

### **Error Categories**
- **Network Errors**: Retry with exponential backoff
- **Worker Errors**: Automatic job requeuing
- **Database Errors**: Transaction rollback
- **Storage Errors**: Fallback to alternative storage

### **Monitoring & Alerts**
- **Job Failures**: Automatic notification system
- **Worker Health**: Health check monitoring
- **Database Performance**: Query performance tracking
- **Storage Usage**: Capacity monitoring

---

**For API details, see [03-API.md](./03-API.md)**  
**For deployment info, see [04-DEPLOYMENT.md](./04-DEPLOYMENT.md)** 