# OurVidz.com - Codebase Index

**Last Updated:** August 4, 2025

---

## 📋 Project Overview

OurVidz.com is an AI-powered platform for generating adult content videos and images. The system features:

- **Ultra-Fast Images**: SDXL generation in 3-8 seconds (flexible 1,3,6 image batches)
- **AI Video Generation**: WAN 2.1 with Qwen 7B enhancement
- **LTX-Style Workspace System**: Job-level grouping with thumbnail selector and hover-to-delete functionality
- **Multi-Reference System**: Optional image-to-image with style, composition, and character references
- **Seed Control**: Reproducible generation with user-controlled seeds
- **Enhanced Negative Prompts**: Intelligent generation for SDXL with multi-party scene detection
- **NSFW-Capable**: Apache 2.0 licensed models, no content restrictions
- **Preview-Approve Workflow**: User approval before final generation
- **Mobile-First Design**: Optimized for modern usage patterns
- **Workspace-First Generation**: Temporary staging area before library storage
- **Dynamic Prompting System**: 12+ specialized templates for all models and use cases

---

## 🏗️ System Architecture

### **Technology Stack**
```yaml
Frontend:
  Framework: React 18.x with TypeScript
  Build Tool: Vite
  Styling: Tailwind CSS + shadcn/ui components
  State Management: React Context + React Query
  Routing: React Router DOM
  Deployment: Lovable (https://ourvidz.lovable.app/)

Backend (Supabase Online):
  Database: Supabase PostgreSQL (Online)
  Authentication: Supabase Auth (Online)
  Storage: Supabase Storage (Online - 13 buckets)
  Edge Functions: Deno runtime (Online)
  Queue: Upstash Redis (REST API)

AI Workers (RunPod):
  Platform: RunPod RTX 6000 ADA (48GB VRAM)
  Models: SDXL Lustify (custom) + WAN 2.1 + Qwen 7B enhancement
  Architecture: Triple worker system (dual_orchestrator.py)
  Location: Remote cloud deployment
```

### **Triple Worker System**
- **Orchestrator:** `dual_orchestrator.py` launches SDXL, WAN, and Chat workers, manages health, and sets up environment variables.
- **SDXL Worker:**
  - Model: SDXL Lustify (`/workspace/models/sdxl-lustify/lustifySDXLNSFWSFW_v20.safetensors`)
  - Compel integration is present and correctly implemented.
  - In this deployment, enabling Compel with SDXL Lustify produces nonsense images, while prompt-only generation works fine.
- **WAN Worker:**
  - Model: WAN 2.1
  - Qwen 7B enhancement for prompt improvement
- **Chat Worker:**
  - Model: Qwen 2.5-7B Instruct
  - Flask API on Port 7861
  - Handles chat, roleplay, and prompt enhancement

---

## 📁 Project Structure

### **Root Directory**
```
ourvidz-1/
├── docs/                    # Project documentation (consolidated structure)
├── src/                     # Frontend source code
├── supabase/                # Backend configuration (Supabase Online)
├── public/                  # Static assets
├── package.json             # Dependencies and scripts
├── README.md                # Project overview
├── CODEBASE_INDEX.md        # This file
```

### **Frontend Structure (`src/`)**
```
src/
├── components/             # React components
│   ├── ui/                # shadcn/ui components
│   ├── generation/        # Generation components
│   ├── workspace/         # LTX-style workspace components
│   │   ├── WorkspaceGrid.tsx      # Job-level grouping with thumbnail selector
│   │   ├── ContentCard.tsx        # Individual cards with dismiss/delete actions
│   │   └── SimplePromptInput.tsx  # Generation controls
│   ├── admin/             # Admin components
│   └── library/           # Library components
├── pages/                 # Route components
├── hooks/                 # Custom React hooks
│   ├── useSimplifiedWorkspaceState.ts  # LTX-style state management
│   └── useRealtimeWorkspace.ts         # Real-time updates
├── contexts/              # React context providers
├── lib/                   # Utility functions and services
├── types/                 # TypeScript type definitions
├── integrations/          # External service integrations
├── App.tsx                # Main app component
└── main.tsx               # App entry point
```

### **Backend Structure (`supabase/`)**
```
supabase/
├── functions/             # Edge functions (Supabase Online)
│   ├── queue-job/        # Job creation and routing with workspace support
│   ├── job-callback/     # Job completion handling with workspace routing
│   ├── enhance-prompt/   # Dynamic prompt enhancement service
│   ├── playground-chat/  # Chat functionality
│   ├── delete-workspace-item/ # Workspace item deletion with storage cleanup
│   ├── refresh-prompt-cache/ # Template cache management
│   └── _shared/          # Shared utilities (cache-utils.ts, monitoring.ts)
├── migrations/           # Database migrations (60+ migrations)
└── config.toml           # Supabase configuration
```

---

## 🧠 Dynamic Prompting System

### **Template Categories (12+ Active Templates)**
- **Enhancement Templates (6)**: SDXL/WAN × Qwen Base/Instruct × SFW/NSFW
- **Chat Templates (3)**: General chat, roleplay, admin assistance
- **Roleplay Templates (2)**: Fantasy and adult roleplay scenarios
- **Creative Writing Templates (1)**: Adult content narrative development

### **Template Features**
- **Model-Specific Optimization**: Tailored for Qwen Base vs Instruct behaviors
- **Content Mode Awareness**: Appropriate language for SFW/NSFW contexts
- **Token Limit Enforcement**: Prevents CLIP truncation and ensures quality
- **Professional Comments**: Design decisions documented for each template
- **Version Control**: Template versioning and update tracking

---

## 🎯 LTX-Style Workspace System

### **Core Features**
- **Job-Level Grouping**: Items grouped by `job_id` for logical organization
- **Thumbnail Selector**: Right-side navigation with job thumbnails
- **Hover-to-Delete**: Delete entire jobs by hovering over thumbnails
- **Two-Level Deletion**: Dismiss (hide) vs Delete (permanent removal)
- **Storage Path Normalization**: Fixed signed URL generation across all components
- **Database-First Storage**: Workspace items stored in `workspace_items` table
- **Session Management**: `workspace_sessions` table with active session tracking
- **Job Routing**: `destination: 'workspace'` field in jobs table
- **Real-time Updates**: WebSocket subscriptions for workspace items
- **Selective Save**: User chooses which content to save to permanent library
- **Auto-cleanup**: Automatic cleanup of old workspace items

### **Workflow**
1. **Generation**: Content goes to workspace first (temporary storage)
2. **Job Grouping**: Items automatically grouped by `job_id`
3. **Thumbnail Navigation**: Right-side selector for job navigation
4. **Selection**: User reviews and selects content to save
5. **Persistence**: Selected content moved to permanent library

---

## 📚 Documentation Status

- **`RUNPOD_WORKSPACE_STRUCTURE.md`** documents all model, dependency, and code paths for the worker environment.
- **`worker_api.md`** and **`API.md`** document all job payloads, edge function APIs, and callback formats.
- **`11-PROMPTING_SYSTEM.md`** documents the dynamic prompting system with 12+ templates.
- **`pages/01-WORKSPACE_PURPOSE.md`** documents the LTX-style workspace implementation.
- **All troubleshooting steps, environment checks, and known issues are documented.**

---

## 🔧 Key Components and Status

- **DynamicEnhancementOrchestrator:**
  - Handles AI-powered prompt enhancement with template selection
  - Supports multiple models (Qwen Base/Instruct) and content modes (SFW/NSFW)
  - Includes fallback mechanisms and token optimization
- **LTX-Style Workspace System:**
  - Job-level grouping with thumbnail selector and hover-to-delete functionality
  - Two-level deletion: dismiss (hide) vs delete (permanent removal)
  - Storage path normalization for consistent signed URL generation
  - Database-first implementation with real-time updates
  - Session management and automatic cleanup
  - Selective save to library functionality
- **Edge Functions:**
  - `enhance-prompt`: Dynamic prompt enhancement with template system
  - `queue-job`: Job creation with workspace support
  - `job-callback`: Job completion with workspace routing
  - `delete-workspace-item`: Workspace item deletion with storage cleanup
  - `refresh-prompt-cache`: Template cache management
- **Shared Utilities:**
  - `cache-utils.ts`: Intelligent caching system for templates and prompts
  - `monitoring.ts`: Performance tracking and error monitoring
- **All dependencies and model paths are correct and documented**
- **Triple orchestrator and worker environment are stable**

---

## 🚨 Known Issues

- **In this deployment, enabling Compel with SDXL Lustify produces nonsense images, while prompt-only generation works fine.**
  - This may be a model compatibility issue specific to this SDXL Lustify version.
  - The official SDXL 1.0 model is known to work with Compel, but has not been tested in this environment.
- **All troubleshooting steps and environment checks have been completed and documented.**

---

## ✅ Current Status

- **Frontend, backend, and worker code are up to date and stable.**
- **All dependencies and model files are present and correct.**
- **Dynamic prompting system with 12+ templates is fully implemented.**
- **LTX-style workspace system is fully implemented with job-level grouping and thumbnail navigation.**
- **All edge functions and job flows are working as intended.**
- **All troubleshooting and environment validation steps have been completed.**
- **Triple worker system (SDXL, WAN, Chat) is operational.**
- **Recent improvements (August 4, 2025):**
  - **LTX-Style Workspace Refactoring**: Complete workspace system overhaul
  - **Job-Level Grouping**: Items grouped by `job_id` with thumbnail navigation
  - **Two-Level Deletion**: Dismiss vs Delete functionality
  - **Storage Path Normalization**: Fixed signed URL generation
  - **Legacy Component Cleanup**: Removed old workspace system (6 files deleted)
  - **Code Reduction**: 718 lines of code removed (net reduction) 