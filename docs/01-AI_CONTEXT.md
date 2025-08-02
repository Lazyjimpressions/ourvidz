# AI Context Guide - OurVidz Documentation

**Last Updated:** July 30, 2025  
**Purpose:** Central navigation and context guide for AI assistants

## 🚀 Quick Start for AI

### Project Overview
OurVidz.com is an AI-powered adult content generation platform with:
- **Frontend**: React 18 + TypeScript + Vite (this repo)
- **Backend**: Supabase Online (PostgreSQL, Auth, Storage, Edge Functions)
- **AI Workers**: RunPod RTX 6000 ADA (48GB VRAM) - **Separate Repository**
- **Architecture**: Triple worker system with job queuing and real-time status

### 🔗 Repository Structure

**Three Distinct File Locations:**

1. **ourvidz-1** (This Repository - Frontend)
   ```
   ourvidz-1/
   ├── src/                    # React frontend application
   ├── supabase/              # Database, migrations, edge functions
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

## 📚 Documentation Navigation

### **Core Architecture**
- [02-ARCHITECTURE.md](./02-ARCHITECTURE.md) - System architecture overview
- [03-API.md](./03-API.md) - API endpoints and data flows
- [04-DEPLOYMENT.md](./04-DEPLOYMENT.md) - Deployment and environment setup

### **Worker System (Separate Repo)**
- [05-WORKER_SYSTEM.md](./05-WORKER_SYSTEM.md) - Consolidated worker documentation
- [06-WORKER_API.md](./06-WORKER_API.md) - Worker API specifications
- [07-RUNPOD_SETUP.md](./07-RUNPOD_SETUP.md) - RunPod infrastructure

### **Development & Operations**
- [08-ADMIN.md](./08-ADMIN.md) - Admin portal and management
- [09-TESTING.md](./09-TESTING.md) - Testing strategies and procedures
- [10-CHANGELOG.md](./10-CHANGELOG.md) - Version history and updates

## 🤖 AI Assistant Guidelines

### **When Working on This Project:**
1. **Frontend Changes**: Work in `src/` directory (this repo)
2. **Database Changes**: Work in `supabase/` directory (this repo)
3. **Worker Changes**: Note that workers are in separate `ourvidz-worker` repo
4. **Model Storage**: Models are stored inside the RunPod container (persistent across restarts)
5. **Documentation**: Update relevant docs in `docs/` directory (this repo)

### **Key Technologies:**
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Workers**: Python, FastAPI, RunPod, RTX 6000 ADA
- **AI Models**: SDXL, WAN, various video generation models

### **Important Notes:**
- **Supabase is ONLINE** - Not local development
- **Workers are separate repo** - Python files in `ourvidz-worker` repository, called at startup by RunPod server
- **Models in container storage** - AI models stored inside RunPod container (persistent, no external dependencies)
- **Real-time system** - Uses WebSocket connections for job status
- **Production focus** - All systems are production-ready

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

### **Database Operations**
```bash
# Run migrations (in Supabase dashboard)
# SQL commands must be run manually in online terminal
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
- ✅ Worker system active on RunPod
- ✅ Real-time job queuing working
- ✅ Admin portal functional

### **Recent Updates:**
- JSDoc automation system implemented
- Documentation consolidation in progress
- Worker system optimized for performance

---

**For detailed information about specific systems, refer to the numbered documentation files above.** 