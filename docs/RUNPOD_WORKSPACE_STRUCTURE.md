# OurVidz RunPod Workspace Structure - Current State

**Last Updated:** July 27, 2025 at 12:00 PM CST  
**Status:** ✅ Production Ready - Triple Worker System Active (SDXL + Chat + WAN 1.3B)  
**System:** RTX 6000 ADA (49GB VRAM, optimized memory management)

---

## Overview

This document describes the verified current state of the `/workspace` directory on the OurVidz RunPod server. The system now features a **triple worker orchestration** with SDXL, Chat, and WAN 1.3B workers, comprehensive reference frame support, and intelligent memory management.

---

## 📊 Storage Summary (Verified Current State)

```bash
Total Storage: ~66GB
Available Space: 34GB+ (308TB network storage, plenty available)

Storage Breakdown:
├── Models: ~63GB (optimized cache structure)
├── Python Dependencies: ~3.0GB (all working)
├── WAN Code: ~48MB (Wan2.1 directory)
├── Worker Scripts: ~8.3MB (fresh from GitHub)
├── Test Output: ~4.7MB
└── Other: <1MB

GPU: RTX 6000 ADA (49GB total, smart memory management)
RAM: 755GB total, optimized usage
```

---

## 🏗️ Verified Directory Structure

```
/workspace/
├── models/                    # ~63GB - All AI models
│   ├── huggingface_cache/     # ~30GB - Qwen models (optimized)
│   │   ├── models--Qwen--Qwen2.5-7B-Instruct/    # ~15GB - Chat/Instruct model
│   │   └── hub/
│   │       └── models--Qwen--Qwen2.5-7B/         # ~15GB - Base model (active)
│   ├── sdxl-lustify/          # ~6.5GB - SDXL model
│   └── wan2.1-t2v-1.3b/       # ~17GB - WAN model
├── python_deps/               # ~3.0GB - Persistent dependencies
│   └── lib/python3.11/site-packages/
│       ├── transformers/      # v4.53.1 ✅
│       ├── diffusers/         # v0.34.0 ✅
│       ├── compel/            # v2.1.1 ✅
│       └── torch/             # v2.4.1+cu124 ✅
├── ourvidz-worker/            # ~8.3MB - Worker scripts (fresh from GitHub)
│   ├── dual_orchestrator.py  # Triple worker orchestrator
│   ├── sdxl_worker.py         # SDXL worker (~51.7KB)
│   ├── chat_worker.py         # Chat worker (NEW)
│   ├── wan_worker.py          # WAN worker (~110KB)
│   ├── wan_generate.py        # WAN generation logic
│   └── backup_wan_generate.py # Backup
├── Wan2.1/                    # ~48MB - WAN code directory
├── test_output/               # ~4.7MB - Test outputs
├── output/                    # ~512B - Output directory
└── backup_requirements.txt    # ~512B - Backup requirements
```

---

## 🤖 Model Configuration (Verified Paths)

### **SDXL Model (~6.5GB)**
- **Path**: `/workspace/models/sdxl-lustify/lustifySDXLNSFWSFW_v20.safetensors`
- **Status**: ✅ Active - Used by SDXL worker
- **Purpose**: Fast image generation (3-8s per image)
- **Features**: Batch generation (1, 3, or 6 images), two quality tiers

### **WAN Model (~17GB)**
- **Path**: `/workspace/models/wan2.1-t2v-1.3b/`
- **Status**: ✅ Active - Used by WAN worker  
- **Purpose**: Video generation and enhanced image processing
- **Features**: Comprehensive reference frame support (5 modes)

### **Qwen Base Model (~15GB)**
- **Path**: `/workspace/models/huggingface_cache/hub/models--Qwen--Qwen2.5-7B/`
- **Hardcoded in WAN Worker**: Line 45 - `/snapshots/d149729398750b98c0af14eb82c78cfe92750796`
- **Status**: ✅ Active - Used for NSFW prompt enhancement
- **Purpose**: Unrestricted content generation (no safety filters)

### **Qwen Instruct Model (~15GB)**
- **Path**: `/workspace/models/huggingface_cache/models--Qwen--Qwen2.5-7B-Instruct/`
- **Status**: ✅ Active - Used by Chat worker
- **Purpose**: Conversational features, storyboarding, character chat
- **Features**: Cinematic prompt enhancement, memory management

---

## 🎯 Triple Worker System (Production Ready)

### **Worker Orchestration**
```bash
# Priority-based startup sequence:
1. SDXL Worker (Priority 1) - Fast image generation
2. Chat Worker (Priority 2) - Prompt enhancement & conversation
3. WAN Worker (Priority 3) - Video & enhanced image generation
```

### **SDXL Worker Features**
- **Batch generation**: 1, 3, or 6 images per request
- **Two quality tiers**: Fast (15 steps) and High (25 steps)
- **Reference image support**: Style, composition, and character modes
- **Performance**: 30-42s total (3-8s per image)
- **Job types**: `sdxl_image_fast`, `sdxl_image_high`

### **Chat Worker Features**
- **Prompt enhancement**: Qwen 2.5-7B Instruct for cinematic focus
- **Memory management**: Smart loading/unloading with PyTorch 2.0 compilation
- **Admin utilities**: Memory status, model info, emergency operations
- **Performance**: 5-15s for prompt enhancement
- **Job types**: `chat_enhance`, `chat_conversation`, `admin_utilities`

### **WAN Worker Features**
- **Video generation**: High-quality video with temporal consistency
- **Comprehensive reference frame support**: All 5 modes (none, single, start, end, both)
- **AI enhancement**: Qwen 7B Base prompt enhancement for improved quality
- **Performance**: 25-240s depending on job type and quality
- **Job types**: Standard (`image_fast`, `image_high`, `video_fast`, `video_high`) + Enhanced (`image7b_fast_enhanced`, `image7b_high_enhanced`, `video7b_fast_enhanced`, `video7b_high_enhanced`)

---

## 🔧 Environment Configuration (Verified Working)

### **Python Dependencies (~3.0GB)**
```bash
Location: /workspace/python_deps/lib/python3.11/site-packages/

Verified Packages:
✅ transformers: 4.53.1
✅ torch: 2.4.1+cu124
✅ diffusers: 0.34.0
✅ compel: 2.1.1 (for SDXL prompt weighting)

Status: All packages accessible and working
```

### **Environment Variables (Current Session)**
```bash
# ACTIVE DURING WORKERS:
PYTHONPATH=/workspace/python_deps/lib/python3.11/site-packages  ✅ Set
HF_HOME=/workspace/models/huggingface_cache                      ✅ Set in workers
TRANSFORMERS_CACHE=/workspace/models/huggingface_cache/hub       ✅ Set in workers
HUGGINGFACE_HUB_CACHE=/workspace/models/huggingface_cache/hub    ✅ Set in workers

# NOTE: Environment variables are set by startup script, not persistent in shell
```

### **Required Environment Setup**
```bash
# MANDATORY for all operations:
export PYTHONPATH=/workspace/python_deps/lib/python3.11/site-packages
export HF_HOME=/workspace/models/huggingface_cache
export TRANSFORMERS_CACHE=/workspace/models/huggingface_cache/hub
export HUGGINGFACE_HUB_CACHE=/workspace/models/huggingface_cache/hub

# Verification command:
python -c "import transformers, torch, diffusers, compel; print('✅ All working')"
```

---

## 🧠 Memory Management System

### **Smart VRAM Allocation**
- **Pressure Detection**: Critical/High/Medium/Low levels
- **Emergency Handling**: Force unload capabilities for critical situations
- **Predictive Loading**: Smart preloading based on usage patterns
- **Intelligent Fallback**: Selective vs nuclear unloading
- **Worker Coordination**: HTTP-based memory management

### **Memory Management Features**
| **Feature** | **Description** | **Use Case** |
|-------------|----------------|--------------|
| **Pressure Detection** | Critical/High/Medium/Low levels | Real-time monitoring |
| **Emergency Unload** | Force unload all except target | Critical situations |
| **Predictive Loading** | Smart preloading based on patterns | Performance optimization |
| **Intelligent Fallback** | Selective vs nuclear unloading | Memory pressure handling |
| **Worker Coordination** | HTTP-based memory management | Cross-worker communication |

---

## 🎬 Reference Frame Support Matrix

| **Reference Mode** | **Config Parameter** | **WAN Parameters** | **Use Case** |
|-------------------|---------------------|-------------------|--------------|
| **None** | No parameters | None | Standard T2V |
| **Single** | `config.image` | `--image ref.png` | I2V-style |
| **Start** | `config.first_frame` | `--first_frame start.png` | Start frame |
| **End** | `config.last_frame` | `--last_frame end.png` | End frame |
| **Both** | `config.first_frame` + `config.last_frame` | `--first_frame start.png --last_frame end.png` | Transition |

---

## 🔄 Cache Optimization Status

### **✅ Optimization Complete**
- **Added**: `TRANSFORMERS_CACHE` environment variable
- **Fixed**: Models now download to persistent storage only
- **Eliminated**: Wasteful downloads to `/root/.cache/`
- **Verified**: Both Qwen models accessible and working

### **🧹 Cache Structure (Optimized)**
```bash
/workspace/models/huggingface_cache/
├── models--Qwen--Qwen2.5-7B-Instruct/    # ~15GB - Instruct/Chat model
├── hub/
│   ├── models--Qwen--Qwen2.5-7B/         # ~15GB - Base model (active)
│   └── .locks/                            # Lock files (cleanup candidate)
└── .locks/                                # Lock files (cleanup candidate)

Total Qwen Storage: ~30GB (optimized)
Redundant/Cleanup: ~1KB lock files (negligible)
```

---

## 🔍 System Performance (Current)

### **GPU Status**
```bash
RTX 6000 ADA Generation: 49GB total
Smart Memory Management: Active
Available: Optimized allocation for triple worker system
```

### **Memory Status**
```bash
RAM: 755GB total, optimized usage
Memory Management: Intelligent VRAM allocation and coordination
```

### **Storage Performance**
- **Network Storage**: 308TB total, plenty available
- **Model Loading**: Fast access from persistent storage
- **Cache Efficiency**: ✅ Optimized, no redundant downloads

---

## 🚨 Critical File Locations

### **Model Paths (Exact)**
```bash
# SDXL (verified):
/workspace/models/sdxl-lustify/lustifySDXLNSFWSFW_v20.safetensors

# WAN (verified):
/workspace/models/wan2.1-t2v-1.3b/diffusion_pytorch_model.safetensors

# Qwen Base (active in WAN worker):
/workspace/models/huggingface_cache/hub/models--Qwen--Qwen2.5-7B/snapshots/d149729398750b98c0af14eb82c78cfe92750796

# Qwen Instruct (active in Chat worker):
/workspace/models/huggingface_cache/models--Qwen--Qwen2.5-7B-Instruct/
```

### **Worker Scripts (verified)**
```bash
/workspace/ourvidz-worker/dual_orchestrator.py  # Triple worker orchestrator
/workspace/ourvidz-worker/sdxl_worker.py        # SDXL generation
/workspace/ourvidz-worker/chat_worker.py         # Chat worker (NEW)
/workspace/ourvidz-worker/wan_worker.py          # WAN worker (line 45: Qwen path)
```

---

## 🔧 Troubleshooting Reference

### **Environment Issues**
```bash
# If imports fail:
export PYTHONPATH=/workspace/python_deps/lib/python3.11/site-packages

# If models not found:
export HF_HOME=/workspace/models/huggingface_cache

# If cache issues:
export TRANSFORMERS_CACHE=/workspace/models/huggingface_cache/hub
```

### **Model Access Verification**
```bash
# Test Qwen Base model (WAN worker):
ls -la /workspace/models/huggingface_cache/hub/models--Qwen--Qwen2.5-7B/

# Test Qwen Instruct model (Chat worker):
ls -la /workspace/models/huggingface_cache/models--Qwen--Qwen2.5-7B-Instruct/

# Test SDXL model:
ls -la /workspace/models/sdxl-lustify/lustifySDXLNSFWSFW_v20.safetensors

# Test WAN model:
ls -la /workspace/models/wan2.1-t2v-1.3b/diffusion_pytorch_model.safetensors
```

### **Worker Testing**
```bash
# Test SDXL worker only:
python sdxl_worker.py

# Test Chat worker only:
python chat_worker.py

# Test WAN worker only:
python wan_worker.py

# Start production system:
./startup.sh
```

---

## 📋 System Architecture

### **Triple Worker Orchestrator**
- **Concurrent Management**: SDXL, Chat, and WAN workers
- **Priority-based startup**: SDXL (1) → Chat (2) → WAN (3)
- **Smart Memory Management**: Intelligent VRAM allocation and coordination
- **Job Queue System**: Redis-based job distribution
- **Storage Integration**: Supabase storage for generated content
- **Error Handling**: Comprehensive error recovery and fallback mechanisms

### **Backend Integration**
- **Database**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Queue**: Upstash Redis (REST API)
- **Frontend**: [Lovable](https://ourvidz.lovable.app/) (React/TypeScript)

---

## 📊 Success Metrics

### **Storage Efficiency**
- ✅ Optimized cache structure (~30GB for dual Qwen models)
- ✅ Eliminated redundant downloads 
- ✅ 34GB+ available space for future expansion

### **System Stability**
- ✅ All three workers operational
- ✅ All dependencies accessible
- ✅ GPU resources well-managed with smart allocation
- ✅ Environment consistently configured

### **Production Readiness**
- ✅ Triple worker system active
- ✅ Comprehensive reference frame support
- ✅ Intelligent memory management
- ✅ 13 job types supported (NSFW-capable)

---

## 🎯 Current Status Summary

**Infrastructure**: ✅ Triple worker system active and stable  
**Models**: ✅ All active and verified (~63GB total)  
**Dependencies**: ✅ Working and accessible (~3GB)  
**Workers**: ✅ SDXL + Chat + WAN operational with latest GitHub code  
**Cache**: ✅ Optimized for efficiency  
**Memory Management**: ✅ Intelligent VRAM allocation and coordination  
**Reference Frames**: ✅ All 5 modes supported  
**Job Types**: ✅ 13 comprehensive job types (NSFW-capable)

**Total System**: Production ready with triple worker orchestration, comprehensive reference frame support, and intelligent memory management