# Worker System Documentation

**Last Updated:** August 31, 2025  
**Status:** ✅ Production Ready with Pure Inference Engine Architecture

## Overview

The OurVidz worker system consists of specialized AI workers running on RunPod RTX 6000 ADA instances. The system has been **completely overhauled** to implement a **Pure Inference Engine** architecture with enhanced logging and monitoring.

## Repository Structure

**IMPORTANT:** The worker implementations are located in a separate repository:
- **Main App**: `/Users/jonathanhughes/Development/ourvidz` (this repository)
- **Workers**: `https://github.com/Lazyjimpressions/ourvidz-worker` (separate repository)

```
ourvidz-worker/ (GitHub Repository)
├── chat_worker.py          # Pure inference engine (Qwen Instruct)
├── wan_worker.py           # Video generation (Qwen Base)
├── sdxl_worker.py          # Image generation (SDXL)
├── dual_orchestrator.py    # Triple worker orchestrator
├── memory_manager.py       # VRAM management
├── memory_emergency_handler.py # Emergency memory management
├── worker_registration.py  # Dynamic registration
├── startup.sh              # Production startup
├── requirements.txt        # Python dependencies
├── Dockerfile             # Container configuration
└── README.md              # Setup instructions
```

## Worker Types

### Chat Worker (chat_worker.py)
**Purpose:** Pure inference engine for chat, enhancement, and general AI tasks  
**Model:** Qwen 2.5-7B Instruct + Base  
**Architecture:** Pure Inference Engine - No Hardcoded Prompts

#### 🎯 NEW ARCHITECTURE: Pure Inference Engine

**Key Changes (August 2025):**
- **Removed hardcoded prompts** - worker no longer contains any prompt logic
- **Template override risk eliminated** - workers cannot override database templates
- **New pure inference endpoints** (`/chat`, `/enhance`, `/generate`, `/worker/info`)
- **Enhanced logging** throughout all worker interactions
- **Memory optimization** and improved OOM handling
- **Edge function control** over all prompt construction

**Security Benefits:**
- Workers execute exactly what edge functions provide
- No possibility of prompt manipulation or overrides
- Complete audit trail of all AI interactions
- Database-driven template system with edge function control

#### Key Features

- **Pure Inference:** Executes exactly what edge functions provide - no overrides
- **Database-Driven Templates:** Respects all system prompts from edge functions
- **Enhanced Logging:** Comprehensive logging of all interactions
- **Memory Optimized:** Improved memory management and OOM handling
- **PyTorch 2.0:** Compiled models for better performance
- **Health Monitoring:** Real-time health checks and status reporting
- **Auto-Registration:** Detects RunPod URL and registers with Supabase

#### New Endpoints

```python
# Pure inference endpoints
@app.post("/chat")
async def pure_inference_chat(request: ChatRequest):
    """Pure inference chat - executes exactly what edge functions provide"""
    logger.info(f"Pure inference chat request: {len(request.messages)} messages")
    # Execute without any prompt modification
    return await execute_pure_inference(request.messages, request.max_tokens)

@app.post("/enhance") 
async def pure_inference_enhance(request: EnhanceRequest):
    """Pure inference enhancement - used by enhance-prompt edge function"""
    logger.info(f"Pure inference enhancement request: {len(request.messages)} messages")
    # Execute without any prompt modification
    return await execute_pure_inference(request.messages, request.max_tokens)

@app.post("/generate")
async def pure_inference_generate(request: GenerateRequest):
    """Generic pure inference for any AI task"""
    logger.info(f"Pure inference generation request: {len(request.messages)} messages")
    # Execute without any prompt modification
    return await execute_pure_inference(request.messages, request.max_tokens)

@app.get("/worker/info")
async def worker_info():
    """Get worker capabilities and architecture information"""
    return {
        "worker_type": "chat",
        "architecture": "pure_inference_engine",
        "capabilities": ["pure_inference", "no_prompt_overrides", "enhanced_logging"],
        "security_features": ["no_hardcoded_prompts", "edge_function_control"]
    }
```

#### Enhanced Logging

```python
# Request logging
logger.info(f"🎯 Pure inference request received: {len(messages)} messages")
logger.info(f"💬 System prompt length: {len(system_prompt)} characters")
logger.info(f"👤 User prompt length: {len(user_prompt)} characters")

# Execution logging
logger.info(f"🚀 Executing pure inference with {max_tokens} max tokens")
logger.info(f"⏱️ Generation started at {start_time}")

# Response logging
logger.info(f"✅ Pure inference completed in {generation_time:.2f}s")
logger.info(f"📊 Generated {tokens_generated} tokens")
logger.info(f"🎯 Pure inference mode: no template overrides detected")

# Error logging
logger.error(f"❌ Pure inference failed: {error}")
logger.warning(f"⚠️ Fallback to original prompt due to error")
```

### WAN Worker (wan_worker.py)
**Purpose:** Pure video generation with reference frame support  
**Model:** WAN 2.1 T2V 1.3B + Qwen Base  
**Status:** Pure inference engine with 5 reference modes

#### Key Features
- **Pure Inference:** Executes exactly what edge functions provide
- **5 Reference Frame Modes:** none, single, start, end, both
- **I2I Pipeline:** `denoise_strength` parameter for consistency
- **Video Thumbnail Generation:** Mid-frame extraction for better representation
- **Internal Auto-Enhancement:** Qwen Base for enhanced job types
- **Thread-Safe Timeouts:** Concurrent.futures implementation

#### Job Types
- **Standard:** `image_fast` (25-40s), `image_high` (40-100s), `video_fast` (135-180s), `video_high` (180-240s)
- **Enhanced:** `image7b_fast_enhanced` (85-100s), `image7b_high_enhanced` (100-240s), `video7b_fast_enhanced` (195-240s), `video7b_high_enhanced` (240+s)

### SDXL Worker (sdxl_worker.py)
**Purpose:** Pure image generation with I2I pipeline  
**Model:** LUSTIFY SDXL  
**Status:** Pure inference engine with batch processing

#### Key Features
- **Pure Inference:** Executes exactly what edge functions provide
- **Batch Processing:** Support for 1, 3, or 6 image generation
- **I2I Pipeline:** First-class support using StableDiffusionXLImg2ImgPipeline
- **Two I2I Modes:** Promptless exact copy and reference modify
- **Thumbnail Generation:** 256px WEBP thumbnails for each image
- **Memory Efficient:** Attention slicing + xformers

#### Job Types
- `sdxl_image_fast` - 15 steps, 30s total (3-8s per image)
- `sdxl_image_high` - 25 steps, 42s total (5-10s per image)

## 🏗️ Pure Inference Engine Architecture

### Before (Problematic Architecture)

```python
# OLD: Worker contained hardcoded prompts and logic
class ChatWorker:
    def __init__(self):
        self.system_prompt = "You are an AI assistant..."  # ❌ Hardcoded
        self.enhancement_rules = [...]  # ❌ Hardcoded rules
    
    async def enhance_prompt(self, user_prompt):
        # ❌ Worker modified prompts
        enhanced = self.apply_enhancement_rules(user_prompt)
        return enhanced
    
    async def chat(self, user_message):
        # ❌ Worker overrode system prompts
        messages = [{"role": "system", "content": self.system_prompt}]
        return await self.generate(messages)
```

### After (Pure Inference Engine)

```python
# NEW: Worker executes exactly what edge functions provide
class PureInferenceWorker:
    def __init__(self):
        self.model = None
        # No hardcoded prompts or logic
    
    async def chat(self, messages):
        # ✅ Execute exactly what's provided
        return await self.model.generate(messages=messages)
    
    async def enhance(self, messages):
        # ✅ Execute exactly what's provided
        return await self.model.generate(messages=messages)
```

## 🧠 Memory Management

### Memory Allocation
- **SDXL:** 10GB (Always loaded) - Memory fraction: 0.21 (21%)
- **Chat:** 15GB (Load when possible) - Memory fraction: 0.31 (31%)
- **WAN:** 30GB (Load on demand) - Memory fraction: 0.63 (63%)

### Memory Manager Features
- **Pressure Detection:** Critical/High/Medium/Low levels
- **Emergency Operations:** Force unload capabilities
- **Predictive Loading:** Smart preloading based on patterns
- **Worker Coordination:** HTTP-based memory management
- **Hard Memory Limits:** `torch.cuda.set_per_process_memory_limit()` enforcement
- **Memory Emergency Handler:** Active conflict resolution between workers

### Memory Management Analysis (Updated)

**CRITICAL FINDING:** The memory management system has been **successfully implemented** and is working correctly. The CUDA OOM errors were caused by **missing hard memory limits**, which have now been fixed.

**Key Fixes Implemented:**
1. **Hard Memory Limits**: Added `torch.cuda.set_per_process_memory_limit()` to prevent workers from exceeding allocated memory
2. **Pre-loading Memory Checks**: Workers now check available memory before loading models
3. **Memory Emergency Handler**: Active conflict resolution between workers
4. **Environment Variables**: Proper `PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True` configuration

**Current Status:** ✅ **RESOLVED** - The memory management system is now properly enforcing limits and preventing CUDA OOM errors.

## 🔧 Triple Orchestrator

### Purpose
Central job distribution system that routes jobs to appropriate workers based on job type and current system load.

### Key Features
- **Priority-based startup:** SDXL (1) → Chat (2) → WAN (3)
- **Graceful validation:** Environment and model readiness checks
- **Automatic restart:** Worker failure recovery
- **Production logging:** Comprehensive monitoring

### Job Types Managed
- **SDXL:** `sdxl_image_fast`, `sdxl_image_high`
- **Chat:** `chat_enhance`, `chat_conversation`, `chat_unrestricted`, `admin_utilities`
- **WAN:** `image_fast`, `image_high`, `video_fast`, `video_high`, enhanced variants

## 🚀 Production Startup

### Startup Sequence
1. **Environment Validation:** PyTorch/CUDA version checks
2. **Model Readiness:** SDXL, WAN, Qwen model verification
3. **Memory Assessment:** VRAM availability analysis
4. **Worker Launch:** Priority-based startup (SDXL → Chat → WAN)
5. **Auto-Registration:** RunPod URL detection and registration
6. **Health Monitoring:** Continuous worker status tracking

### Startup Command
```bash
./startup.sh
```

## 📊 Performance Metrics

### Chat Worker
- **Chat Enhancement:** 1-3 seconds (direct inference)
- **Chat Conversation:** 5-15 seconds (dynamic prompts)
- **Model Loading:** 15GB VRAM required for Qwen Instruct
- **Memory Management:** Automatic cleanup and validation

### SDXL Worker
- **Fast (15 steps):** 30s total (3-8s per image)
- **High (25 steps):** 42s total (5-10s per image)
- **Batch Support:** 1, 3, or 6 images per request
- **I2I Processing:** +2-5s for reference image processing
- **Thumbnail Generation:** +0.5-1s per image

### WAN Worker
- **Fast Images:** 25-40s
- **High Images:** 40-100s
- **Fast Videos:** 135-180s
- **High Videos:** 180-240s
- **Enhanced Variants:** +60-120s for AI enhancement
- **Video Thumbnail Generation:** +1-2s per video (mid-frame extraction)

## 🔑 Environment Configuration

### Required Environment Variables
```bash
SUPABASE_URL=              # Supabase database URL
SUPABASE_SERVICE_ROLE_KEY= # Supabase service key
UPSTASH_REDIS_REST_URL=    # Redis queue URL
UPSTASH_REDIS_REST_TOKEN=  # Redis authentication token
WAN_WORKER_API_KEY=        # API key for WAN worker authentication
HF_TOKEN=                  # Optional HuggingFace token
RUNPOD_POD_ID=             # RunPod pod ID for auto-registration
```

### RunPod Deployment
- **Chat Worker URL:** `https://{RUNPOD_POD_ID}-7861.proxy.runpod.net`
- **SDXL/WAN Worker URL:** `https://{RUNPOD_POD_ID}-7860.proxy.runpod.net`
- **Auto-Registration:** Detects `RUNPOD_POD_ID` and registers with Supabase
- **Health Monitoring:** Continuous status tracking via `/health` endpoints

## 🛡️ Error Handling & Recovery

### Error Types
- `OOM_ERROR` - Out of memory (retryable)
- `MODEL_LOAD_ERROR` - Model loading failed
- `INVALID_PROMPT` - Prompt validation failed
- `WORKER_UNAVAILABLE` - Worker not loaded
- `TIMEOUT_ERROR` - Request timeout
- `REFERENCE_FRAME_ERROR` - Reference processing failed
- `I2I_PIPELINE_ERROR` - Image-to-image pipeline error
- `THUMBNAIL_GENERATION_ERROR` - Thumbnail generation failed

### Recovery Mechanisms
- **OOM Errors:** Automatic retry with memory cleanup
- **Network Errors:** 3 retries with exponential backoff
- **Model Errors:** Single retry with model reload
- **Reference Frame Errors:** Graceful fallback to standard generation
- **I2I Errors:** Fallback to text-to-image generation
- **Thumbnail Errors:** Continue without thumbnail (non-critical)

## 📋 Integration Guide

### Frontend Integration
1. **Job Submission:** Send jobs to appropriate worker endpoints
2. **Status Monitoring:** Poll callback endpoint for job status
3. **Asset Retrieval:** Download generated assets from callback URLs
4. **Thumbnail Display:** Use `thumbnail_url` for grid views and previews
5. **Memory Management:** Monitor memory status for optimization
6. **Error Handling:** Implement retry logic for transient errors

### Enhanced Callback Format
```json
{
  "job_id": "job_123",
  "worker_id": "worker_001",
  "status": "completed|failed|processing",
  "assets": [
    {
      "type": "image|video|text",
      "url": "workspace-temp/user123/job123/0.png",
      "thumbnail_url": "workspace-temp/user123/job123/0.thumb.webp",
      "metadata": {
        "width": 1024,
        "height": 1024,
        "format": "png",
        "batch_size": 1,
        "steps": 25,
        "guidance_scale": 7.5,
        "seed": 12345,
        "file_size_bytes": 2048576,
        "asset_index": 0,
        "denoise_strength": 0.15,
        "pipeline": "img2img",
        "resize_policy": "center_crop",
        "negative_prompt_used": true
      }
    }
  ],
  "metadata": {
    "enhancement_source": "qwen_instruct",
    "unrestricted_mode": false,
    "processing_time": 15.2,
    "reference_mode": "single",
    "batch_size": 1,
    "exact_copy_mode": false
  }
}
```

---

**🎯 This worker system provides a pure inference engine architecture with centralized edge function intelligence, ensuring maximum flexibility, security, and maintainability while delivering high-quality AI content generation capabilities.**