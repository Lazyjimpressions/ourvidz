# OurVidz.com - Codebase Index

**Last Updated:** July 21, 2025

---

## 📋 Project Overview

OurVidz.com is an AI-powered platform for generating adult content videos and images. The system features:

- **Ultra-Fast Images**: SDXL generation in 3-8 seconds (flexible 1,3,6 image batches)
- **AI Video Generation**: WAN 2.1 with Qwen 7B enhancement
- **Multi-Reference System**: Optional image-to-image with style, composition, and character references
- **Seed Control**: Reproducible generation with user-controlled seeds
- **Enhanced Negative Prompts**: Intelligent generation for SDXL with multi-party scene detection
- **NSFW-Capable**: Apache 2.0 licensed models, no content restrictions
- **Preview-Approve Workflow**: User approval before final generation
- **Mobile-First Design**: Optimized for modern usage patterns

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
  Storage: Supabase Storage (Online - 12 buckets)
  Edge Functions: Deno runtime (Online)
  Queue: Upstash Redis (REST API)

AI Workers (RunPod):
  Platform: RunPod RTX 6000 ADA (48GB VRAM)
  Models: SDXL Lustify (custom) + WAN 2.1 + Qwen 7B enhancement
  Architecture: Dual worker system (dual_orchestrator.py)
  Location: Remote cloud deployment
```

### **Dual Worker System**
- **Orchestrator:** `dual_orchestrator.py` launches both SDXL and WAN workers, manages health, and sets up environment variables (`PYTHONPATH`, `HF_HOME`, etc.).
- **SDXL Worker:**
  - Model: SDXL Lustify (`/workspace/models/sdxl-lustify/lustifySDXLNSFWSFW_v20.safetensors`)
  - Compel integration is present and correctly implemented.
  - In this deployment, enabling Compel with SDXL Lustify produces nonsense images, while prompt-only generation works fine. This may be a model compatibility issue specific to this SDXL Lustify version.
  - The official SDXL 1.0 model is known to work with Compel, but has not been tested in this environment.
- **WAN Worker:**
  - Model: WAN 2.1
  - Qwen 7B enhancement for prompt improvement

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
│   ├── workspace/         # Workspace components
│   ├── admin/             # Admin components
│   └── library/           # Library components
├── pages/                 # Route components
├── hooks/                 # Custom React hooks
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
│   ├── queue-job/        # Job creation and routing
│   ├── job-callback/     # Job completion handling
│   ├── enhance-prompt/   # Prompt enhancement service
│   └── generate-admin-image/ # Admin image generation
├── migrations/           # Database migrations
└── config.toml           # Supabase configuration
```

---

## 📚 Documentation Status

- **`RUNPOD_WORKSPACE_STRUCTURE.md`** documents all model, dependency, and code paths for the worker environment.
- **`worker_api.md`** and **`API.md`** document all job payloads, edge function APIs, and callback formats.
- **All troubleshooting steps, environment checks, and known issues are documented.**

---

## 🔧 Key Components and Status

- **PromptEnhancementModal.tsx:**
  - Used for AI-powered prompt enhancement (via edge function)
  - **Does NOT generate Compel weights**
- **CompelModal.tsx:**
  - Used for Compel prompt weighting controls (sliders, presets)
  - Generates `compel_weights` string sent to backend
- **queue-job edge function:**
  - Handles job creation, negative prompt generation, and job queuing
  - **No conflict with Compel, but negative prompt is always included for SDXL**
- **job-callback edge function:**
  - Handles job completion and updates Supabase
- **SDXL Worker:**
  - Compel integration is present and correctly implemented.
  - In this deployment, enabling Compel with SDXL Lustify produces nonsense images, while prompt-only generation works fine. This may be a model compatibility issue specific to this SDXL Lustify version.
  - The official SDXL 1.0 model is known to work with Compel, but has not been tested in this environment.
- **WAN Worker:**
  - Qwen 7B enhancement works as expected
- **All dependencies and model paths are correct and documented**
- **Dual orchestrator and worker environment are stable**

---

## 🚨 Known Issues

- **In this deployment, enabling Compel with SDXL Lustify produces nonsense images, while prompt-only generation works fine.**
  - This may be a model compatibility issue specific to this SDXL Lustify version.
  - The official SDXL 1.0 model is known to work with Compel, but has not been tested in this environment.
- **PromptEnhancementModal is for AI prompt enhancement, not Compel weights.**
- **All troubleshooting steps and environment checks have been completed and documented.**

---

## ✅ Current Status

- **Frontend, backend, and worker code are up to date and stable.**
- **All dependencies and model files are present and correct.**
- **Prompt enhancement and prompt weighting are separate features.**
- **Compel prompt weighting is only confirmed to work with official SDXL 1.0.**
- **All edge functions and job flows are working as intended.**
- **All troubleshooting and environment validation steps have been completed.** 