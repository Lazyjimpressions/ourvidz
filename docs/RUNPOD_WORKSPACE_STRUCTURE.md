# OurVidz RunPod Workspace Structure - Current State

**Last Updated:** July 23, 2025 at 11:45 PM CST  
**Status:** ✅ Production Ready - Cache Optimized, Dual Models Active, Workers Operational  
**System:** RTX 6000 ADA (49GB VRAM, 19GB used, 29GB free)

---

## Overview

This document describes the verified current state of the `/workspace` directory on the OurVidz RunPod server. All paths, sizes, and configurations have been confirmed through direct inspection.

---

## 📊 Storage Summary (Verified Current State)

```bash
Total Storage: 66.1GB
Available Space: 34GB+ (308TB network storage, plenty available)

Storage Breakdown:
├── Models: 63GB (optimized cache structure)
├── Python Dependencies: 3.0GB (all working)
├── WAN Code: 48MB (Wan2.1 directory)
├── Worker Scripts: 8.3MB (fresh from GitHub)
├── Test Output: 4.7MB
└── Other: <1MB

GPU: RTX 6000 ADA (49GB total, 19GB used, 29GB free)
RAM: 755GB total, 82GB used, 641GB available
```

---

## 🏗️ Verified Directory Structure

```
/workspace/
├── models/                    # 63GB - All AI models
│   ├── huggingface_cache/     # 30GB - Qwen models (optimized)
│   │   ├── models--Qwen--Qwen2.5-7B-Instruct/    # 15GB - Chat/Instruct model
│   │   └── hub/
│   │       └── models--Qwen--Qwen2.5-7B/         # 15GB - Base model (active)
│   ├── sdxl-lustify/          # 6.5GB - SDXL model
│   └── wan2.1-t2v-1.3b/       # 17GB - WAN model
├── python_deps/               # 3.0GB - Persistent dependencies
│   └── lib/python3.11/site-packages/
│       ├── transformers/      # v4.53.1 ✅
│       ├── diffusers/         # v0.34.0 ✅
│       ├── compel/            # v2.1.1 ✅
│       └── torch/             # v2.4.1+cu124 ✅
├── ourvidz-worker/            # 8.3MB - Worker scripts (fresh from GitHub)
│   ├── dual_orchestrator.py  # Dual worker orchestrator
│   ├── sdxl_worker.py         # SDXL worker (51.7KB)
│   ├── wan_worker.py          # WAN worker (110KB)
│   ├── wan_generate.py        # WAN generation logic
│   └── backup_wan_generate.py # Backup
├── Wan2.1/                    # 48MB - WAN code directory
├── test_output/               # 4.7MB - Test outputs
├── output/                    # 512B - Output directory
└── backup_requirements.txt    # 512B - Backup requirements
```

---

## 🤖 Model Configuration (Verified Paths)

### **SDXL Model (6.5GB)**
- **Path**: `/workspace/models/sdxl-lustify/lustifySDXLNSFWSFW_v20.safetensors`
- **Status**: ✅ Active - Used by SDXL worker
- **Purpose**: Fast image generation (3-8s per image)

### **WAN Model (17GB)**
- **Path**: `/workspace/models/wan2.1-t2v-1.3b/`
- **Status**: ✅ Active - Used by WAN worker  
- **Purpose**: Video generation and enhanced image processing

### **Qwen Base Model (15GB)**
- **Path**: `/workspace/models/huggingface_cache/hub/models--Qwen--Qwen2.5-7B/`
- **Hardcoded in WAN Worker**: Line 45 - `/snapshots/d149729398750b98c0af14eb82c78cfe92750796`
- **Status**: ✅ Active - Used for NSFW prompt enhancement
- **Purpose**: Unrestricted content generation (no safety filters)

### **Qwen Instruct Model (15GB)**
- **Path**: `/workspace/models/huggingface_cache/models--Qwen--Qwen2.5-7B-Instruct/`
- **Status**: ✅ Ready for Chat integration
- **Purpose**: Conversational features, storyboarding, character chat
- **Note**: This IS the "Chat" model (Qwen doesn't have separate Chat variant)

---

## 🔧 Environment Configuration (Verified Working)

### **Python Dependencies (3.0GB)**
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

## 🎯 Worker Scripts (Fresh from GitHub)

### **Location**: `/workspace/ourvidz-worker/` (8.3MB)

```bash
dual_orchestrator.py  # 20.9KB - Manages both SDXL and WAN workers
sdxl_worker.py        # 51.7KB - SDXL image generation
wan_worker.py         # 110KB  - WAN video/image + Qwen enhancement
wan_generate.py       # 22.8KB - WAN generation logic
backup_wan_generate.py # 22.8KB - Backup version
```

### **Key Worker Configuration**
- **WAN Worker Qwen Path**: Hardcoded to Base model (line 45)
- **Enhancement**: Uses Base model for unrestricted NSFW content
- **Integration Ready**: Can add Chat model support using Instruct model
- **Status**: ✅ All workers operational

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
├── models--Qwen--Qwen2.5-7B-Instruct/    # 15GB - Instruct/Chat model
├── hub/
│   ├── models--Qwen--Qwen2.5-7B/         # 15GB - Base model (active)
│   └── .locks/                            # Lock files (cleanup candidate)
└── .locks/                                # Lock files (cleanup candidate)

Total Qwen Storage: 30GB (optimized)
Redundant/Cleanup: ~1KB lock files (negligible)
```

---

## 💬 Chat Model Integration Plan

### **Current Status**
- ✅ **Base Model**: Active for unrestricted prompt enhancement
- ✅ **Instruct Model**: Ready for chat features (already downloaded)
- 🔄 **Integration**: Ready to implement in WAN worker

### **Integration Strategy**
```python
# Extend existing wan_worker.py with:
def load_qwen_chat_model(self):
    # Load from: /workspace/models/huggingface_cache/models--Qwen--Qwen2.5-7B-Instruct/
    
def enhance_prompt_with_chat(self, prompt, session_id=None):
    # Use Instruct model for conversational enhancement
```

### **Use Cases Ready**
- **Storyboarding**: Multi-turn conversation for scene development
- **Character Chat**: Role-based conversations
- **Admin Assistance**: Interactive prompt guidance

---

## 🔍 System Performance (Current)

### **GPU Status**
```bash
RTX 6000 ADA Generation: 49GB total
Current Usage: 19GB used (workers active)
Available: 29GB free (plenty for Chat model)
```

### **Memory Status**
```bash
RAM: 755GB total, 82GB used, 641GB available
Swap: Not configured (not needed)
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

# Qwen Instruct (ready for Chat):
/workspace/models/huggingface_cache/models--Qwen--Qwen2.5-7B-Instruct/
```

### **Worker Scripts (verified)**
```bash
/workspace/ourvidz-worker/dual_orchestrator.py  # Main orchestrator
/workspace/ourvidz-worker/wan_worker.py         # Line 45: Qwen path
/workspace/ourvidz-worker/sdxl_worker.py        # SDXL generation
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

# Test Qwen Instruct model (Chat ready):
ls -la /workspace/models/huggingface_cache/models--Qwen--Qwen2.5-7B-Instruct/

# Test SDXL model:
ls -la /workspace/models/sdxl-lustify/lustifySDXLNSFWSFW_v20.safetensors

# Test WAN model:
ls -la /workspace/models/wan2.1-t2v-1.3b/diffusion_pytorch_model.safetensors
```

---

## 📋 Next Steps Status

### **✅ Phase 1 Complete**
- Cache optimization implemented
- Environment variables configured  
- Storage analysis completed
- Both Qwen models verified and accessible

### **🔄 Phase 2 Ready**
- Chat model integration (use existing Instruct model)
- WAN worker extension for conversational features
- Edge function updates for Chat support

### **📅 Phase 3 Planned**
- Storyboarding UI components
- Session management implementation
- Character chat features

---

## 📊 Success Metrics

### **Storage Efficiency**
- ✅ Optimized cache structure (30GB for dual Qwen models)
- ✅ Eliminated redundant downloads 
- ✅ 34GB+ available space for future expansion

### **System Stability**
- ✅ All workers operational
- ✅ All dependencies accessible
- ✅ GPU resources well-managed (29GB free)
- ✅ Environment consistently configured

### **Integration Readiness**
- ✅ Base model active for current enhancement
- ✅ Instruct model ready for Chat features
- ✅ Foundation set for conversational AI features

---

## 🎯 Current Status Summary

**Infrastructure**: ✅ Optimized and stable  
**Models**: ✅ All active and verified (63GB total)  
**Dependencies**: ✅ Working and accessible (3GB)  
**Workers**: ✅ Operational with latest GitHub code  
**Cache**: ✅ Optimized for efficiency  
**Chat Ready**: ✅ Instruct model available for integration

**Total System**: Production ready with foundation for Chat integration