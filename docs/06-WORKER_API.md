# Worker API Documentation - Consolidated

**Last Updated:** July 30, 2025  
**Repository:** `ourvidz-worker` (Separate from this frontend repo)  
**Status:** Production Active

## 🚀 Overview

The OurVidz worker API provides endpoints for AI content generation, running on **RunPod RTX 6000 ADA** hardware. This is a **separate repository** from the frontend application.

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

### **1. Image Generation**

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

### **2. Chat & Playground**

#### **Chat** - `POST /chat`
Real-time chat functionality for the playground.

```python
# Request
{
    "message": "Hello, how are you?",
    "context": "previous conversation context",
    "model": "gpt-4",  # or other available models
    "temperature": 0.7
}

# Response
{
    "status": "success",
    "response": "Hello! I'm doing well, thank you for asking.",
    "model": "gpt-4",
    "tokens_used": 25,
    "response_time": 1.2
}
```

### **3. Health & Status**

#### **Health Check** - `GET /health`
Returns worker health status.

```python
# Response
{
    "status": "healthy",
    "worker_type": "sdxl",
    "gpu_utilization": 45.2,
    "memory_usage": 8.5,  # GB
    "active_jobs": 2,
    "uptime": 3600,  # seconds
    "model_loaded": True
}
```

#### **Status** - `GET /status`
Returns detailed worker status.

```python
# Response
{
    "worker_type": "sdxl",
    "status": "active",
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
        "sdxl_base": "loaded",
        "sdxl_refiner": "loaded",
        "wan_model": "not_loaded"
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
        "polling_interval": 1
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
        load_chat_models()
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
# Prompt validation
def validate_prompt(prompt: str):
    """Validate and sanitize prompts"""
    if len(prompt) > 1000:
        raise ValueError("Prompt too long")
    
    # Remove potentially harmful content
    sanitized = sanitize_prompt(prompt)
    return sanitized
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
    "DATABASE_ERROR": "Database operation failed"
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
python main.py --worker-type sdxl --dev

# Test endpoints
curl -X POST http://localhost:8000/generate_image \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test image", "model": "sdxl"}'
```

### **Testing Endpoints**
```python
# Health check test
def test_health():
    response = requests.get("http://localhost:8000/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

# Image generation test
def test_image_generation():
    data = {
        "prompt": "test prompt",
        "model": "sdxl",
        "quality": "fast"
    }
    response = requests.post("http://localhost:8000/generate_image", json=data)
    assert response.status_code == 200
    assert "image_url" in response.json()
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
        "memory_usage": get_memory_usage()
    }
```

---

**For worker system details, see [05-WORKER_SYSTEM.md](./05-WORKER_SYSTEM.md)**  
**For RunPod setup, see [07-RUNPOD_SETUP.md](./07-RUNPOD_SETUP.md)** 