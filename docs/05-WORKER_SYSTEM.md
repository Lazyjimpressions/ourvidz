# Worker System Documentation - Consolidated

**Last Updated:** July 30, 2025  
**Repository:** `ourvidz-worker` (Separate from this frontend repo)  
**Status:** Production Active

## 🚀 Overview

The OurVidz worker system runs on **RunPod RTX 6000 ADA (48GB VRAM)** and handles all AI content generation. This is a **separate repository** from the frontend application.

### **Repository Structure**
```
ourvidz-worker/ (Separate Repository)
├── sdxl_worker.py              # SDXL image generation (Redis queue worker)
├── wan_worker.py               # WAN video/image generation (Redis queue worker)
├── chat_worker.py              # Chat worker with Flask API (Port 7861)
├── dual_orchestrator.py        # Triple worker orchestrator (ACTIVE)
├── memory_manager.py           # Memory management system
├── startup.sh                  # Production startup script
└── setup.sh                    # Environment setup script

/workspace/models/ (Container Storage)
├── sdxl-lustify/
│   └── lustifySDXLNSFWSFW_v20.safetensors
├── wan2.1-t2v-1.3b/            # WAN 2.1 T2V 1.3B model
└── huggingface_cache/
    ├── models--Qwen--Qwen2.5-7B/           # Qwen Base model
    └── models--Qwen--Qwen2.5-7B-Instruct/  # Qwen Instruct model
```

## 🔧 Worker Types & Capabilities

### **1. SDXL Worker (sdxl_worker.py)**
- **Purpose**: Fast image generation using LUSTIFY SDXL model
- **Polling**: 2-second intervals
- **Model**: `lustifySDXLNSFWSFW_v20.safetensors`
- **Performance**: 3-8 seconds per image (batch: 1, 3, or 6 images)
- **VRAM Usage**: 10GB (always loaded)
- **Job Types**: `sdxl_image_fast`, `sdxl_image_high`

**Prompt Engineering:**
- **Token Limit**: 75 tokens maximum (225 characters) - Critical: Exceeding 77 tokens causes CLIP truncation
- **Quality Tags**: `score_9, score_8_up, masterpiece, best quality`
- **Anatomical Accuracy**: Natural proportions, perfect anatomy, balanced features
- **NSFW Optimization**: Professional anatomical terminology, specific descriptors

**Scene Generation Features:**
- **Automatic Scene Detection**: Detects visual scenes in AI roleplay responses
- **Character Integration**: Maintains character consistency and narrative coherence
- **Pattern Recognition**: Identifies roleplay actions, movements, and environmental descriptions
- **One-Click Generation**: Optimized SDXL prompts for detected scenes

### **2. WAN Worker (wan_worker.py)**
- **Purpose**: Video and image generation with AI prompt enhancement
- **Polling**: 5-second intervals  
- **Models**: WAN 2.1 T2V 1.3B + Qwen 2.5-7B Base
- **Performance**: 25-240 seconds (depending on quality and enhancement)
- **VRAM Usage**: 30GB (load on demand)
- **Job Types**: 8 job types including enhanced variants

**Prompt Engineering:**
- **Token Limit**: 100 tokens maximum (300 characters)
- **Enhancement Strategy**: Hybrid approach (WAN built-in + Qwen external)
- **Motion Optimization**: Temporal consistency and motion quality
- **Cinematic Quality**: Professional video production standards

### **3. Chat Worker (chat_worker.py)**
- **Purpose**: Qwen Instruct service with dynamic prompts and NSFW optimization
- **Polling**: 3-second intervals
- **Model**: Qwen 2.5-7B Instruct
- **Performance**: 5-15 seconds for chat, 1-3 seconds for enhancement
- **VRAM Usage**: 15GB (load when possible)
- **Job Types**: `chat_enhance`, `chat_conversation`, `chat_unrestricted`, `admin_utilities`

**Key Features:**
- **Dynamic System Prompts**: Custom prompts per conversation with context awareness
- **Unrestricted Mode Detection**: Automatic adult content detection and processing
- **NSFW Optimization**: Zero content restrictions with anatomical accuracy
- **Simplified Enhancement**: Direct Qwen Instruct enhancement with memory management
- **OOM Handling**: Comprehensive error handling with retry logic and PyTorch 2.0 compilation

## 🏗️ Architecture

### **Triple Worker System**
```
Frontend (ourvidz-1) 
    ↓ HTTP/WebSocket
Supabase Edge Functions
    ↓ Job Queue
Worker System (ourvidz-worker)
    ↓ AI Processing
RunPod RTX 6000 ADA
```

### **Job Flow**
1. **Frontend** sends generation request
2. **Edge Function** (`queue-job`) creates job in database
3. **Worker** polls for new jobs every 2-10 seconds
4. **Worker** processes job using appropriate AI model
5. **Worker** updates job status in real-time
6. **Frontend** receives status updates via WebSocket

## 📊 Performance Metrics

### **Hardware Specifications**
- **GPU**: RTX 6000 ADA (48GB VRAM)
- **Total VRAM**: 49GB (47GB usable with 2GB safety buffer)
- **Memory Allocation**:
  - SDXL: 10GB (always loaded)
  - Chat: 15GB (load when possible)
  - WAN: 30GB (load on demand)

### **Performance Benchmarks**
| Worker Type | Avg Time | VRAM Usage | Job Types |
|-------------|----------|------------|-----------|
| SDXL Fast   | 3-8s     | 10GB       | sdxl_image_fast |
| SDXL High   | 3-8s     | 10GB       | sdxl_image_high |
| WAN Fast    | 25-180s  | 30GB       | image_fast, video_fast |
| WAN High    | 40-240s  | 30GB       | image_high, video_high |
| WAN Enhanced| 85-240s  | 30GB       | Enhanced variants |
| Chat        | 5-15s    | 15GB       | chat_conversation |
| Chat Enhance| 1-3s     | 15GB       | chat_enhance |

## 🔌 API Integration

### **Worker Endpoints**
```python
# Base URL: https://{RUNPOD_POD_ID}-{PORT}.proxy.runpod.net

# SDXL Worker (Port 7859) - Redis queue worker only
GET /health
GET /status

# Chat Worker (Port 7861) - Flask API
GET /health
POST /chat
POST /chat/unrestricted
POST /enhance
POST /enhance/legacy
GET /enhancement/info
GET /chat/health
GET /memory/status
GET /model/info
POST /memory/load
POST /memory/unload
POST /admin

# WAN Worker (Port 7860) - Redis queue worker + Flask API
GET /
GET /health
POST /enhance
GET /debug/env

# Memory Manager
GET /memory/status
POST /emergency/operation
GET /memory/report
```

### **Job Status Updates**
```typescript
// Real-time status via WebSocket
interface JobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  result?: {
    imageUrl?: string;
    videoUrl?: string;
    metadata?: any;
  };
  error?: string;
}
```

## 🚀 Deployment

### **RunPod Setup**
1. **Container**: Custom Docker image with all dependencies
2. **Environment**: GPU-enabled pod with RTX 6000 ADA
3. **Scaling**: Auto-scaling based on job queue length
4. **Monitoring**: Health checks every 30 seconds

### **Environment Variables**
```bash
# Required for worker operation
SUPABASE_URL=              # Supabase database URL
SUPABASE_SERVICE_KEY=      # Supabase service key
UPSTASH_REDIS_REST_URL=    # Redis queue URL
UPSTASH_REDIS_REST_TOKEN=  # Redis authentication token
WAN_WORKER_API_KEY=        # API key for WAN worker authentication
HF_TOKEN=                  # Optional HuggingFace token
```

## 🔍 Monitoring & Debugging

### **Health Checks**
- **Worker Health**: `/health` endpoint returns 200 if healthy
- **Model Loading**: Verifies all models are loaded correctly
- **VRAM Usage**: Monitors GPU memory utilization
- **Job Processing**: Tracks successful/failed job rates

### **Logging**
```python
# Structured logging for debugging
logger.info(f"Processing job {job_id} with type {job_type}")
logger.error(f"Job {job_id} failed: {error_message}")
logger.debug(f"VRAM usage: {gpu_memory_used}GB")
```

## 🔧 Development Notes

### **Important Considerations**
- **Separate Repository**: Workers are in `ourvidz-worker`, not this repo
- **Redis Queue Workers**: SDXL and WAN workers are pure Redis queue workers (no direct API)
- **Flask API**: Chat worker provides Flask API endpoints on Port 7861
- **Model Storage**: All models stored inside container at `/workspace/models/`
- **Memory Management**: Smart VRAM allocation with memory manager
- **Triple Worker System**: Orchestrated by `dual_orchestrator.py`
- **Real-time Updates**: WebSocket connections for live status via Supabase
- **Error Handling**: Comprehensive error handling and retry logic

### **Common Issues**
1. **VRAM Overflow**: Monitor concurrent job limits
2. **Model Loading**: Ensure all model paths are correct
3. **Network Timeouts**: Handle long-running generation jobs
4. **Memory Leaks**: Regular container restarts recommended

---

**For API specifications, see [06-WORKER_API.md](./06-WORKER_API.md)**  
**For RunPod setup details, see [07-RUNPOD_SETUP.md](./07-RUNPOD_SETUP.md)** 