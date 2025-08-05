# AI Context Guide - OurVidz Documentation

**Last Updated:** August 4, 2025  
**Purpose:** Central navigation and context guide for AI assistants

## 🚀 Quick Start for AI

### Project Overview
OurVidz.com is an AI-powered adult content generation platform with:
- **Frontend**: React 18 + TypeScript + Vite (this repo)
- **Backend**: Supabase Online (PostgreSQL, Auth, Storage, Edge Functions)
- **AI Workers**: RunPod RTX 6000 ADA (48GB VRAM) - **Separate Repository**
- **Architecture**: Triple worker system with job queuing and real-time status
- **Workspace System**: LTX-style workspace-first generation flow with job-level grouping
- **Dynamic Prompting**: 12+ specialized templates for all models and use cases

### 🔗 Repository Structure

**Three Distinct File Locations:**

1. **ourvidz-1** (This Repository - Frontend)
   ```
   ourvidz-1/
   ├── src/                    # React frontend application
   │   ├── pages/             # Page components (Workspace, Library, etc.)
   │   ├── components/        # Reusable UI components
   │   │   ├── workspace/     # LTX-style workspace components
   │   │   │   ├── WorkspaceGrid.tsx      # Job-level grouping with thumbnail selector
   │   │   │   ├── ContentCard.tsx        # Individual cards with dismiss/delete actions
   │   │   │   └── SimplePromptInput.tsx  # Generation controls
   │   │   ├── generation/    # Generation components
   │   │   ├── admin/         # Admin components
   │   │   └── library/       # Asset management components
   │   ├── hooks/             # Custom React hooks
   │   │   ├── useSimplifiedWorkspaceState.ts  # LTX-style state management
   │   │   └── useRealtimeWorkspace.ts         # Real-time updates
   │   └── contexts/          # React contexts
   ├── supabase/              # Database, migrations, edge functions
   │   ├── functions/         # Supabase Edge Functions
   │   │   ├── _shared/       # Shared utilities (cache-utils.ts, monitoring.ts)
   │   │   ├── queue-job/     # Job queuing with workspace support
   │   │   ├── job-callback/  # Job completion handling with workspace routing
   │   │   ├── enhance-prompt/ # Dynamic prompt enhancement with template system
   │   │   ├── playground-chat/ # Chat functionality
   │   │   ├── delete-workspace-item/ # Workspace item deletion
   │   │   └── refresh-prompt-cache/ # Template cache management
   │   └── migrations/        # Database schema changes (60+ migrations)
   ├── docs/                  # Documentation (this directory)
   └── scripts/               # Automation scripts
   ```

2. **ourvidz-worker** (Separate Repository - AI Workers)
   ```
   ourvidz-worker/
   ├── sdxl_worker.py         # SDXL image generation (Redis queue worker)
   ├── wan_worker.py          # WAN video/image generation (Redis queue worker)
   ├── chat_worker.py         # Chat worker with Flask API (Port 7861)
   ├── dual_orchestrator.py   # Triple worker orchestrator
   ├── memory_manager.py      # Memory management system
   ├── startup.sh             # Production startup script
   └── setup.sh               # Environment setup script
   ```

3. **Container Storage** (RunPod Server)
   ```
   /workspace/models/ (Inside Container)
   ├── sdxl-lustify/
   │   └── lustifySDXLNSFWSFW_v20.safetensors
   ├── wan2.1-t2v-1.3b/       # WAN 2.1 T2V 1.3B model
   └── huggingface_cache/
       ├── models--Qwen--Qwen2.5-7B/           # Qwen Base model
       └── models--Qwen--Qwen2.5-7B-Instruct/  # Qwen Instruct model
   ```

**Key Points:**
- **Frontend**: React app in `ourvidz-1` repository
- **Workers**: Python files in separate `ourvidz-worker` repository, orchestrated by `dual_orchestrator.py`
- **Models**: Stored inside container at `/workspace/models/` (not network storage)
- **Worker Types**: SDXL/WAN (Redis queue workers), Chat (Flask API on Port 7861)
- **LTX-Style Workspace System**: Job-level grouping with thumbnail selector and hover-to-delete functionality
- **Dynamic Prompting**: 12+ specialized templates for all models and use cases

## 📚 Documentation Navigation

### **Core Architecture**
- [02-ARCHITECTURE.md](./02-ARCHITECTURE.md) - System architecture overview
- [03-API.md](./03-API.md) - **Edge Functions API & Endpoints** (Comprehensive API documentation)
- [04-DEPLOYMENT.md](./04-DEPLOYMENT.md) - Deployment and environment setup

### **Backend & Edge Functions**
- [03-API.md](./03-API.md) - **Complete Edge Functions API** with workspace support
  - Job management endpoints (queue-job, job-callback)
  - Workspace management RPC functions
  - Content generation APIs
  - Real-time subscription examples
  - Error handling and performance metrics
- **Shared Utilities**: `supabase/functions/_shared/`
  - `cache-utils.ts` - Intelligent caching system for templates and prompts
  - `monitoring.ts` - Performance tracking and error monitoring

### **Worker System (Separate Repo)**
- [05-WORKER_SYSTEM.md](./05-WORKER_SYSTEM.md) - Consolidated worker documentation
- [06-WORKER_API.md](./06-WORKER_API.md) - **Worker API Specifications** (RunPod worker endpoints)
- [07-RUNPOD_SETUP.md](./07-RUNPOD_SETUP.md) - RunPod infrastructure

### **Development & Operations**
- [08-ADMIN.md](./08-ADMIN.md) - Admin portal and management
- [09-TESTING.md](./09-TESTING.md) - Testing strategies and procedures
- [10-CHANGELOG.md](./10-CHANGELOG.md) - Version history and updates
- [11-PROMPTING_SYSTEM.md](./11-PROMPTING_SYSTEM.md) - Dynamic prompting system documentation

### **Page-Specific Documentation**
- [pages/01-WORKSPACE_PURPOSE.md](./pages/01-WORKSPACE_PURPOSE.md) - **LTX-style workspace implementation**
- [pages/02-STORYBOARD_PURPOSE.md](./pages/02-STORYBOARD_PURPOSE.md) - Storyboard functionality
- [pages/03-PLAYGROUND_PURPOSE.md](./pages/03-PLAYGROUND_PURPOSE.md) - Playground features
- [pages/04-LIBRARY_PURPOSE.md](./pages/04-LIBRARY_PURPOSE.md) - Library management
- [pages/05-ADMIN_PURPOSE.md](./pages/05-ADMIN_PURPOSE.md) - Admin portal
- [pages/06-DASHBOARD_PURPOSE.md](./pages/06-DASHBOARD_PURPOSE.md) - Dashboard overview

### **Component Documentation**
- [components/00-COMPONENT_INVENTORY.md](./components/00-COMPONENT_INVENTORY.md) - Component inventory and refactoring
- [components/01-COMPONENT_REFACTORING_PLAN.md](./components/01-COMPONENT_REFACTORING_PLAN.md) - Refactoring strategy
- [components/PHASE_6_SUMMARY.md](./components/PHASE_6_SUMMARY.md) - Latest component phase summary

## 🔧 Backend Architecture (Edge Functions)

### **Edge Functions Overview**
The backend consists of **Supabase Edge Functions** that handle all server-side operations:

#### **Core Functions:**
- **`queue-job`** - Creates and routes generation jobs with workspace support
- **`job-callback`** - Handles job completion and routes to workspace/library
- **`enhance-prompt`** - Dynamic prompt enhancement service with template system
- **`playground-chat`** - Chat functionality for playground
- **`delete-workspace-item`** - Workspace item deletion with storage cleanup
- **`refresh-prompt-cache`** - Template cache management

#### **Shared Utilities (`_shared/`):**
- **`cache-utils.ts`** - Intelligent caching system
  - Template caching (prompt templates, negative prompts)
  - Content detection (SFW/NSFW classification)
  - Performance optimization (80% reduction in database calls)
  - Fallback mechanisms for reliability
- **`monitoring.ts`** - Performance and error tracking
  - Execution time monitoring
  - Cache hit/miss tracking
  - Error logging and reporting
  - System health validation

### **API Integration Points**
- **Frontend → Edge Functions**: HTTP requests to Supabase Edge Functions
- **Edge Functions → Workers**: Redis queue communication
- **Workers → Edge Functions**: Callback notifications
- **Real-time Updates**: WebSocket subscriptions for live status

## 🤖 AI Assistant Guidelines

### **When Working on This Project:**
1. **Frontend Changes**: Work in `src/` directory (this repo)
2. **Database Changes**: Work in `supabase/` directory (this repo)
3. **Edge Functions**: Work in `supabase/functions/` directory (this repo)
4. **Worker Changes**: Note that workers are in separate `ourvidz-worker` repo
5. **Model Storage**: Models are stored inside the RunPod container (persistent across restarts)
6. **Documentation**: Update relevant docs in `docs/` directory (this repo)
7. **LTX-Style Workspace System**: Understand job-level grouping and thumbnail navigation
8. **Dynamic Prompting**: Understand template system and content modes

### **Key Technologies:**
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Edge Functions**: Deno runtime, TypeScript, shared utilities
- **Workers**: Python, FastAPI, RunPod, RTX 6000 ADA
- **AI Models**: SDXL, WAN, Qwen 2.5-7B Base/Instruct
- **Prompting System**: 12+ specialized templates for all models and use cases
- **LTX-Style Workspace**: Job-level grouping with thumbnail selector and hover-to-delete

### **Important Notes:**
- **Supabase is ONLINE** - Not local development
- **Edge Functions**: Deployed to Supabase, use Deno runtime
- **Shared Utilities**: Provide caching, monitoring, and content detection
- **Workers are separate repo** - Python files in `ourvidz-worker` repository, called at startup by RunPod server
- **Models in container storage** - AI models stored inside RunPod container (persistent, no external dependencies)
- **Real-time system** - Uses WebSocket connections for job status
- **Production focus** - All systems are production-ready
- **LTX-Style Workspace**: Job-level grouping with thumbnail navigation and hover-to-delete functionality
- **Triple worker system** - SDXL, WAN, and Chat workers orchestrated together
- **Dynamic prompting** - Template-based system with SFW/NSFW content modes

## 🔧 Common Tasks for AI

### **Frontend Development**
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Lint with JSDoc validation
npm run lint:jsdoc
```

### **Edge Functions Development**
```bash
# Deploy edge functions (using Lovable)
# Edge functions are automatically deployed with the project

# Test edge functions locally
supabase functions serve

# View edge function logs
supabase functions logs
```

### **Database Operations**
```bash
# Run migrations (in Supabase dashboard)
# SQL commands must be run manually in online terminal
# Use workspace_migration.sql for workspace system setup
```

### **Documentation Updates**
```bash
# Generate JSDoc for functions
npm run jsdoc:generate

# Update documentation
# Edit files in docs/ directory
```

## 📋 Current Status

### **Production Systems:**
- ✅ Frontend deployed and running
- ✅ Supabase backend operational
- ✅ Edge Functions deployed and active
- ✅ Triple worker system active on RunPod
- ✅ Real-time job queuing working
- ✅ Admin portal functional
- ✅ **LTX-style workspace system implemented**
- ✅ **Dynamic prompting system with 12+ templates implemented**

### **Recent Updates (August 4, 2025):**
- **Chat Worker Pure Inference Engine Overhaul**: Complete architectural transformation eliminating template override risks
  - ❌ **Removed**: All hardcoded prompts from worker code (38-127 lines deleted)
  - ❌ **Removed**: `EnhancementSystemPrompts` class and `create_enhanced_messages` function
  - ✅ **Implemented**: Pure inference architecture with `/chat`, `/enhance`, and `/generate` endpoints
  - ✅ **Result**: Worker respects ALL system prompts from edge functions without modification
  - ✅ **Security**: Complete separation of concerns - edge functions control all prompts
  - ✅ **Performance**: Model in `eval()` mode with PyTorch 2.0 compilation and OOM handling
- **LTX-Style Workspace Refactoring**: Complete workspace system overhaul with job-level grouping
- **Job-Level Management**: Items grouped by `job_id` with thumbnail navigation
- **Two-Level Deletion**: Dismiss (hide) vs Delete (permanent removal) functionality
- **Thumbnail Selector**: Right-side navigation with job thumbnails and hover-to-delete
- **Storage Path Normalization**: Fixed signed URL generation across all components
- **Legacy Component Cleanup**: Removed old workspace system (6 files deleted)
- **Code Reduction**: 718 lines of code removed (net reduction)
- **Dynamic Prompting System**: 12+ specialized templates for all models and use cases
- **Triple Worker System**: SDXL, WAN, and Chat workers orchestrated together
- **Workspace-First Implementation**: Complete workspace generation flow
- **Database Schema**: New workspace_sessions and workspace_items tables
- **Edge Functions**: Updated queue-job and job-callback for workspace support
- **Shared Utilities**: Intelligent caching and monitoring systems implemented
- **Component Refactoring**: Simplified workspace components and state management
- **Frontend Integration**: New workspace pages and hooks
- JSDoc automation system implemented
- Documentation consolidation in progress
- Worker system optimized for performance

### **Current Architecture:**
- **Triple Worker System**: SDXL, WAN, and Chat workers with orchestration
- **Pure Inference Engine**: Chat worker respects all system prompts from edge functions - no overrides
- **LTX-Style Workspace System**: Job-level grouping with thumbnail selector and hover-to-delete
- **Session Management**: User workspace sessions with automatic cleanup
- **Library Integration**: Save selected items from workspace to permanent library
- **Real-time Updates**: Live generation status and workspace updates
- **Mobile Support**: Responsive workspace interface for all devices
- **Edge Functions**: Comprehensive backend API with caching and monitoring
- **Dynamic Prompting**: Template-based system with content mode awareness
- **Template Override Risk**: Eliminated through pure inference architecture

---

**For detailed information about specific systems, refer to the numbered documentation files above.**  
**For API details, see [03-API.md](./03-API.md) - Complete Edge Functions API**  
**For worker details, see [06-WORKER_API.md](./06-WORKER_API.md) - Worker API Specifications**  
**For prompting system details, see [11-PROMPTING_SYSTEM.md](./11-PROMPTING_SYSTEM.md) - Dynamic Prompting System**  
**For workspace system details, see [pages/01-WORKSPACE_PURPOSE.md](./pages/01-WORKSPACE_PURPOSE.md) - LTX-Style Workspace Implementation** 