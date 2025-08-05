# Worker API Documentation - Consolidated

**Last Updated:** August 4, 2025  
**Repository:** `ourvidz-worker` (Separate from this frontend repo)  
**Status:** Production Active - **Pure Inference Engine Architecture**

## 🚀 Overview

The OurVidz worker API provides endpoints for AI content generation, running on **RunPod RTX 6000 ADA** hardware. This is a **separate repository** from the frontend application.

**🎯 NEW ARCHITECTURE**: The worker has been refactored to be a **pure inference engine** that respects all system prompts sent from the edge function without any override logic.

**✅ RESOLVED - MEDIUM PRIORITY**: Worker Code Interference Risk eliminated through pure inference architecture.

**Note:** For complete worker system details, see [CODEBASE_INDEX_ourvidz_worker.md](./CODEBASE_INDEX_ourvidz_worker.md) - the authoritative source for the `ourvidz-worker` repository.

## 🔌 API Endpoints

### **Base URL**
```
https://your-worker-url.runpod.net
```

### **Authentication**
Workers use internal authentication with Supabase service keys:
```python
import os
from supabase import create_client

supabase = create_client(
    os.environ.get("SUPABASE_URL"),
    os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
)
```

## 📋 Core Endpoints

### **1. Pure Inference Engine Endpoints** ⭐ **NEW ARCHITECTURE**

#### **Chat** - `POST /chat`
**NEW**: Pure inference endpoint that accepts messages array from edge functions.

```python
# Request
{
    "messages": [
        {"role": "system", "content": "System prompt from edge function"},
        {"role": "user", "content": "User message"}
    ],
    "max_tokens": 512,
    "temperature": 0.7,
    "top_p": 0.9
}

# Response
{
    "response": "AI response based on provided messages",
    "messages_used": [
        {"role": "system", "content": "System prompt from edge function"},
        {"role": "user", "content": "User message"}
    ],
    "model_info": {
        "model_name": "Qwen2.5-7B-Instruct",
        "model_loaded": true,
        "architecture": "pure_inference_engine"
    },
    "processing_time": 1.23
}
```

#### **Enhancement** - `POST /enhance`
**NEW**: Pure inference endpoint for prompt enhancement.

```python
# Request
{
    "messages": [
        {"role": "system", "content": "Enhancement system prompt from edge function"},
        {"role": "user", "content": "Original prompt to enhance"}
    ],
    "max_tokens": 200,
    "temperature": 0.7,
    "top_p": 0.9
}

# Response
{
    "enhanced_prompt": "Enhanced prompt result",
    "messages_used": [...],
    "processing_time": 0.85
}
```

#### **Generic Generation** - `POST /generate`
**NEW**: Generic inference endpoint for any messages array.

```python
# Request
{
    "messages": [
        {"role": "system", "content": "Any system prompt"},
        {"role": "user", "content": "Any user message"}
    ],
    "max_tokens": 512,
    "temperature": 0.7,
    "top_p": 0.9
}

# Response
{
    "response": "Generated response",
    "messages_used": [...],
    "processing_time": 1.45
}
```

#### **Worker Information** - `GET /worker/info`
**NEW**: Returns worker capabilities and architecture information.

```python
# Response
{
    "worker_type": "pure_inference_engine",
    "model": "Qwen2.5-7B-Instruct",
    "capabilities": {
        "chat": true,
        "enhancement": true,
        "generation": true,
        "hardcoded_prompts": false,
        "prompt_modification": false,
        "pure_inference": true
    },
    "architecture": {
        "template_override_risk": "eliminated",
        "separation_of_concerns": "complete",
        "edge_function_control": true
    }
}
```

### **2. Image Generation**

#### **Generate Image** - `POST /generate_image`
Generates images using SDXL or WAN models.

```python
# Request
{
    "prompt": "beautiful landscape with mountains",
    "model": "sdxl",  # "sdxl" or "wan"
    "quality": "fast",  # "fast" or "high"
    "width": 1024,
    "height": 1024,
    "steps": 20,
    "seed": 42,
    "negative_prompt": "blurry, low quality"
}

# Response
{
    "status": "success",
    "image_url": "https://storage.supabase.co/ourvidz-images/user_id/job_id.jpg",
    "metadata": {
        "model": "sdxl",
        "prompt": "beautiful landscape with mountains",
        "seed": 42,
        "steps": 20,
        "generation_time": 15.2
    }
}
```

#### **Generate Video** - `POST /generate_video`
Generates videos from prompts.

```python
# Request
{
    "prompt": "a cat walking through a garden",
    "duration": 5,  # seconds
    "fps": 24,
    "quality": "fast",
    "width": 512,
    "height": 512
}

# Response
{
    "status": "success",
    "video_url": "https://storage.supabase.co/ourvidz-videos/user_id/job_id.mp4",
    "thumbnail_url": "https://storage.supabase.co/ourvidz-thumbnails/user_id/job_id.jpg",
    "metadata": {
        "duration": 5,
        "fps": 24,
        "generation_time": 45.8
    }
}
```

### **3. Chat & Playground**

#### **Chat** - `POST /chat` ⭐ **UPDATED - Pure Inference Engine**
**NEW**: Single endpoint for all chat requests (SFW and NSFW). Worker respects all system prompts without override.

```python
# Request
{
    "message": "Hello, how are you?",
    "system_prompt": "You are a helpful AI assistant for OurVidz platform users.",
    "conversation_id": "conv_123",
    "context_type": "roleplay",  # "roleplay", "general", "creative", "admin"
    "conversation_history": [
        {"sender": "user", "content": "Previous message", "created_at": "2025-07-30T10:00:00Z"},
        {"sender": "assistant", "content": "Previous response", "created_at": "2025-07-30T10:00:01Z"}
    ],
    "project_id": "project_456"  # Optional
}

# Response
{
    "response": "Hello! I'm doing well, thank you for asking.",
    "conversation_history": [...],
    "system_prompt_used": "You are a helpful AI assistant for OurVidz platform users.",
    "model_info": {
        "model_name": "Qwen2.5-7B-Instruct",
        "model_loaded": true
    },
    "processing_time": 1.23
}
```

**Key Changes:**
- ✅ **No more `/chat/unrestricted` endpoint** - All chat goes through `/chat`
- ✅ **Worker respects ALL system prompts** without modification
- ✅ **No content filtering** - Edge function handles all content decisions
- ✅ **No prompt overrides** - Worker uses exactly what you send
- ✅ **Simplified response format** - Removed unnecessary fields

#### **Debug System Prompt** - `POST /chat/debug/system-prompt`
Test endpoint to verify system prompt handling.

```python
# Request
{
    "message": "test message",
    "system_prompt": "You are a helpful assistant.",
    "conversation_history": []
}

# Response
{
    "system_prompt_received": "You are a helpful assistant.",
    "system_prompt_used": "You are a helpful assistant.",
    "messages_built": [...],
    "no_override_detected": true,
    "pure_inference_mode": true
}
```

### **4. Health & Status**

#### **Health Check** - `GET /health`
Returns worker health status with new architecture info.

```python
# Response
{
    "status": "healthy",
    "architecture": "pure_inference_engine",
    "worker_type": "chat",
    "gpu_utilization": 45.2,
    "memory_usage": 8.5,  # GB
    "active_jobs": 2,
    "uptime": 3600,  # seconds
    "model_loaded": true,
    "system_prompt_features": {
        "pure_inference_engine": true,
        "no_prompt_overrides": true,
        "respects_provided_prompts": true,
        "template_override_risk": "eliminated"
    },
    "capabilities": {
        "hardcoded_prompts": false,
        "prompt_modification": false,
        "pure_inference": true
    }
}
```

#### **Status** - `GET /status`
Returns detailed worker status.

```python
# Response
{
    "worker_type": "chat",
    "status": "active",
    "architecture": "pure_inference_engine",
    "performance": {
        "jobs_completed": 150,
        "jobs_failed": 3,
        "average_generation_time": 18.5,
        "success_rate": 98.0
    },
    "resources": {
        "gpu_utilization": 45.2,
        "memory_usage": 8.5,
        "disk_usage": 25.3
    },
    "models": {
        "qwen_instruct": "loaded",
        "architecture": "pure_inference_engine"
    },
    "security": {
        "template_override_risk": "eliminated",
        "hardcoded_prompts": false,
        "edge_function_control": true
    }
}
```

## 🔄 Job Processing

### **Job Polling**
Workers continuously poll for new jobs:

```python
# Polling interval (seconds)
SDXL_WORKER_POLLING = 2
WAN_WORKER_POLLING = 5
VIDEO_WORKER_POLLING = 10
CHAT_WORKER_POLLING = 1
```

### **Job Status Updates**
Workers update job status in real-time:

```python
# Job status update
{
    "job_id": "job_123",
    "status": "processing",
    "progress": 45,  # 0-100
    "current_step": "generating_image",
    "estimated_completion": "2025-07-30T15:30:00Z"
}
```

### **Job Completion**
```python
# Successful completion
{
    "job_id": "job_123",
    "status": "completed",
    "result": {
        "image_url": "https://storage.supabase.co/ourvidz-images/user_id/job_123.jpg",
        "metadata": {
            "model": "sdxl",
            "prompt": "beautiful landscape",
            "generation_time": 15.2
        }
    }
}

# Failed job
{
    "job_id": "job_123",
    "status": "failed",
    "error": "VRAM out of memory",
    "error_code": "VRAM_OVERFLOW"
}
```

## 🏗️ Worker Architecture

### **Worker Types**
```python
# Worker configuration
WORKER_CONFIGS = {
    "sdxl": {
        "model_path": "/models/sdxl/",
        "max_concurrent_jobs": 2,
        "memory_limit": 12,  # GB
        "polling_interval": 2
    },
    "wan": {
        "model_path": "/models/wan/",
        "max_concurrent_jobs": 4,
        "memory_limit": 6,  # GB
        "polling_interval": 5
    },
    "video": {
        "model_path": "/models/video/",
        "max_concurrent_jobs": 1,
        "memory_limit": 16,  # GB
        "polling_interval": 10
    },
    "chat": {
        "model_path": "/models/chat/",
        "max_concurrent_jobs": 8,
        "memory_limit": 4,  # GB
        "polling_interval": 1,
        "architecture": "pure_inference_engine"  # NEW
    }
}
```

### **Model Loading**
```python
# Model loading process
def load_models():
    """Load AI models into GPU memory"""
    if WORKER_TYPE == "sdxl":
        load_sdxl_models()
    elif WORKER_TYPE == "wan":
        load_wan_models()
    elif WORKER_TYPE == "video":
        load_video_models()
    elif WORKER_TYPE == "chat":
        load_chat_models()  # Pure inference engine
```

## 📊 Performance Metrics

### **Generation Times**
| Model | Quality | Avg Time | VRAM Usage | Concurrent Jobs |
|-------|---------|----------|------------|-----------------|
| SDXL  | Fast    | 15s      | 8GB        | 2               |
| SDXL  | High    | 30s      | 12GB       | 1               |
| WAN   | Fast    | 5s       | 4GB        | 4               |
| WAN   | High    | 10s      | 6GB        | 2               |
| Video | Fast    | 60s      | 16GB       | 1               |
| Video | High    | 120s     | 20GB       | 1               |
| Chat  | N/A     | 5-15s    | 4GB        | 8               |

### **Resource Monitoring**
```python
# GPU monitoring
def monitor_gpu():
    """Monitor GPU utilization and memory"""
    gpu_util = get_gpu_utilization()
    memory_used = get_gpu_memory_used()
    
    if memory_used > MEMORY_LIMIT:
        log_warning(f"GPU memory usage high: {memory_used}GB")
    
    return {
        "utilization": gpu_util,
        "memory_used": memory_used,
        "temperature": get_gpu_temperature()
    }
```

## 🔐 Security

### **Authentication**
```python
# Worker authentication
def authenticate_request(request):
    """Authenticate incoming requests"""
    api_key = request.headers.get("X-API-Key")
    if api_key != os.environ.get("WORKER_API_KEY"):
        raise HTTPException(status_code=401, detail="Invalid API key")
```

### **Input Validation**
```python
# Prompt validation - Simplified for pure inference
def validate_prompt(prompt: str):
    """Validate and sanitize prompts"""
    if len(prompt) > 1000:
        raise ValueError("Prompt too long")
    
    # No content filtering - edge function handles this
    return prompt
```

## 🚨 Error Handling

### **Error Types**
```python
# Common error codes
ERROR_CODES = {
    "VRAM_OVERFLOW": "GPU memory exceeded",
    "MODEL_LOAD_FAILED": "Failed to load AI model",
    "INVALID_PROMPT": "Invalid or unsafe prompt",
    "GENERATION_FAILED": "Image/video generation failed",
    "NETWORK_ERROR": "Network connectivity issue",
    "DATABASE_ERROR": "Database operation failed",
    "SYSTEM_PROMPT_MISSING": "System prompt not provided"  # NEW
}
```

### **Retry Logic**
```python
# Retry configuration
RETRY_CONFIG = {
    "max_retries": 3,
    "backoff_factor": 2,
    "retryable_errors": ["NETWORK_ERROR", "DATABASE_ERROR"]
}

def retry_operation(operation, max_retries=3):
    """Retry operation with exponential backoff"""
    for attempt in range(max_retries):
        try:
            return operation()
        except Exception as e:
            if attempt == max_retries - 1:
                raise e
            time.sleep(2 ** attempt)
```

## 🔧 Development & Testing

### **Local Development**
```bash
# Run worker locally
python main.py --worker-type chat --dev

# Test endpoints
curl -X POST http://localhost:7861/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "test message", 
    "system_prompt": "You are a helpful assistant.",
    "conversation_id": "test_123"
  }'
```

### **Testing Endpoints**
```python
# Health check test
def test_health():
    response = requests.get("http://localhost:7861/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert response.json()["architecture"] == "pure_inference_engine"

# Chat test with system prompt
def test_chat_with_system_prompt():
    data = {
        "message": "test message",
        "system_prompt": "You are a helpful assistant.",
        "conversation_id": "test_123"
    }
    response = requests.post("http://localhost:7861/chat", json=data)
    assert response.status_code == 200
    assert "response" in response.json()
    assert response.json()["system_prompt_used"] == "You are a helpful assistant."
```

## 📈 Monitoring & Logging

### **Structured Logging**
```python
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Log job processing
logger.info(f"Processing job {job_id} with type {job_type}")
logger.info(f"Using system prompt: {system_prompt[:100]}...")  # NEW
logger.error(f"Job {job_id} failed: {error_message}")
```

### **Metrics Collection**
```python
# Performance metrics
def collect_metrics():
    """Collect performance metrics"""
    return {
        "jobs_processed": get_jobs_processed(),
        "average_generation_time": get_avg_generation_time(),
        "success_rate": get_success_rate(),
        "gpu_utilization": get_gpu_utilization(),
        "memory_usage": get_memory_usage(),
        "system_prompt_respect_rate": get_system_prompt_respect_rate()  # NEW
    }
```

## 🎯 **Migration Guide**

### **For Frontend Systems**

#### **Step 1: Update API Calls**
- ❌ Remove any calls to `/chat/unrestricted`
- ✅ Ensure all chat requests go through `/chat`
- ✅ Always provide `system_prompt` field

#### **Step 2: Update Response Handling**
- ❌ Remove handling of `unrestricted_mode` field
- ❌ Remove handling of `custom_system_preserved` field  
- ❌ Remove handling of `enhanced_system_prompt` field
- ✅ Handle new `system_prompt_used` field

#### **Step 3: Implement Prompt Logic**
- ✅ Add logic to detect conversation type
- ✅ Add logic to retrieve prompts from prompt table
- ✅ Add logic to handle content filtering
- ✅ Add logic to select appropriate system prompts

### **Example Migration**

**Before:**
```python
# Old unrestricted endpoint
response = requests.post(f"{worker_url}/chat/unrestricted", json={
    "message": "Hello",
    "conversation_id": "123"
})
```

**After:**
```python
# New unified endpoint with system prompt
response = requests.post(f"{worker_url}/chat", json={
    "message": "Hello",
    "system_prompt": "You are a helpful assistant.",
    "conversation_id": "123",
    "context_type": "general"
})
```

---

**For worker system details, see [05-WORKER_SYSTEM.md](./05-WORKER_SYSTEM.md)**  
**For RunPod setup, see [07-RUNPOD_SETUP.md](./07-RUNPOD_SETUP.md)**

**🎯 NEW**: **Pure Inference Engine Architecture** - Worker respects all system prompts without override 