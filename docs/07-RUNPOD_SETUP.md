# RunPod Setup Documentation - Consolidated

**Last Updated:** July 30, 2025  
**Repository:** `ourvidz-worker` (Separate from this frontend repo)  
**Status:** Production Active

## 🚀 Overview

OurVidz workers run on **RunPod.io** using **RTX 6000 ADA (48GB VRAM)** hardware for AI content generation. This setup provides high-performance GPU computing for image and video generation.

## 🏗️ RunPod Infrastructure

### **Hardware Specifications**
```
GPU: NVIDIA RTX 6000 ADA
VRAM: 49GB GDDR6 total (47GB usable with safety buffer)
CPU: High-performance multi-core
RAM: 755GB system memory
Storage: NVMe SSD (100GB+) + 308TB network storage
Network: High-speed internet connection
```

### **Verified Workspace Structure**
```
/workspace/
├── models/                    # ~63GB - All AI models
│   ├── huggingface_cache/     # ~30GB - Qwen models
│   │   ├── models--Qwen--Qwen2.5-7B-Instruct/    # ~15GB - Chat/Instruct model
│   │   └── hub/
│   │       └── models--Qwen--Qwen2.5-7B/         # ~15GB - Base model
│   ├── sdxl-lustify/          # ~6.5GB - SDXL model
│   └── wan2.1-t2v-1.3b/       # ~17GB - WAN model
├── python_deps/               # ~3.0GB - Persistent dependencies
├── ourvidz-worker/            # ~8.3MB - Worker scripts
├── Wan2.1/                    # ~48MB - WAN code directory
└── test_output/               # ~4.7MB - Test outputs
```

### **Container Architecture**
```
┌─────────────────────────────────────┐
│           RunPod Container          │
├─────────────────────────────────────┤
│  Ubuntu 20.04 + CUDA 11.8          │
│  ├── Python 3.9+                   │
│  ├── FastAPI (API Server)          │
│  ├── AI Models (SDXL, WAN, etc.)   │
│  ├── Worker Scripts                │
│  └── Monitoring Tools              │
└─────────────────────────────────────┘
```

## 🔧 Container Setup

### **Base Dockerfile**
```dockerfile
# Use NVIDIA CUDA base image
FROM nvidia/cuda:11.8-devel-ubuntu20.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV CUDA_VISIBLE_DEVICES=0

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    git \
    wget \
    curl \
    vim \
    htop \
    nvidia-cuda-toolkit \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create model directories
RUN mkdir -p /app/models/sdxl /app/models/wan /app/models/video /app/models/chat

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start the application
CMD ["python3", "main.py"]
```

### **Requirements.txt**
```txt
# Core dependencies
fastapi==0.104.1
uvicorn==0.24.0
pydantic==2.5.0
python-multipart==0.0.6

# AI/ML libraries
torch==2.1.0
torchvision==0.16.0
diffusers==0.24.0
transformers==4.36.0
accelerate==0.25.0

# Image processing
Pillow==10.1.0
opencv-python==4.8.1.78
numpy==1.24.3

# Database
supabase==2.0.2
psycopg2-binary==2.9.9

# Utilities
python-dotenv==1.0.0
requests==2.31.0
aiofiles==23.2.1
python-jose==3.3.0

# Monitoring
prometheus-client==0.19.0
structlog==23.2.0
```

## 🚀 Deployment Process

### **1. Build Container Image**
```bash
# Build the Docker image
docker build -t ourvidz/worker:latest .

# Tag for different worker types
docker tag ourvidz/worker:latest ourvidz/sdxl-worker:latest
docker tag ourvidz/worker:latest ourvidz/wan-worker:latest
docker tag ourvidz/worker:latest ourvidz/video-worker:latest
docker tag ourvidz/worker:latest ourvidz/chat-worker:latest
```

### **2. Push to Container Registry**
```bash
# Push to Docker Hub or private registry
docker push ourvidz/worker:latest
docker push ourvidz/sdxl-worker:latest
docker push ourvidz/wan-worker:latest
docker push ourvidz/video-worker:latest
docker push ourvidz/chat-worker:latest
```

### **3. Deploy on RunPod**
```bash
# Create RunPod template
runpodctl create-template \
  --name "ourvidz-sdxl-worker" \
  --image "ourvidz/sdxl-worker:latest" \
  --gpu "RTX 6000 ADA" \
  --memory "64GB" \
  --storage "100GB" \
  --ports "8000:8000" \
  --env "WORKER_TYPE=sdxl" \
  --env "SUPABASE_URL=https://your-project.supabase.co" \
  --env "SUPABASE_SERVICE_ROLE_KEY=your_service_role_key"
```

## 🔧 Worker Configuration

### **Environment Variables**
```bash
# Required environment variables
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
WORKER_TYPE=sdxl  # sdxl, wan, video, chat
POLLING_INTERVAL=2  # seconds
MAX_CONCURRENT_JOBS=2
LOG_LEVEL=INFO

# Optional configuration
MODEL_CACHE_DIR=/app/models
TEMP_DIR=/tmp
API_PORT=8000
HEALTH_CHECK_INTERVAL=30
```

### **Worker-Specific Configurations**

#### **SDXL Worker**
```bash
# SDXL worker configuration
WORKER_TYPE=sdxl
POLLING_INTERVAL=2
MAX_CONCURRENT_JOBS=2
MEMORY_LIMIT=12  # GB
MODEL_PATH=/app/models/sdxl
```

#### **WAN Worker**
```bash
# WAN worker configuration
WORKER_TYPE=wan
POLLING_INTERVAL=5
MAX_CONCURRENT_JOBS=4
MEMORY_LIMIT=6  # GB
MODEL_PATH=/app/models/wan
```

#### **Video Worker**
```bash
# Video worker configuration
WORKER_TYPE=video
POLLING_INTERVAL=10
MAX_CONCURRENT_JOBS=1
MEMORY_LIMIT=16  # GB
MODEL_PATH=/app/models/video
```

#### **Chat Worker**
```bash
# Chat worker configuration
WORKER_TYPE=chat
POLLING_INTERVAL=1
MAX_CONCURRENT_JOBS=8
MEMORY_LIMIT=4  # GB
MODEL_PATH=/app/models/chat
```

## 📊 Resource Management

### **GPU Memory Allocation**
```python
# GPU memory management
import torch

def setup_gpu_memory():
    """Configure GPU memory allocation"""
    if torch.cuda.is_available():
        # Set memory fraction based on worker type
        memory_fraction = {
            'sdxl': 0.25,    # 12GB / 48GB
            'wan': 0.125,    # 6GB / 48GB
            'video': 0.33,   # 16GB / 48GB
            'chat': 0.083    # 4GB / 48GB
        }
        
        worker_type = os.environ.get('WORKER_TYPE', 'sdxl')
        torch.cuda.set_per_process_memory_fraction(memory_fraction[worker_type])
```

### **Concurrent Job Limits**
```python
# Job queue management
from concurrent.futures import ThreadPoolExecutor
import asyncio

class JobManager:
    def __init__(self):
        self.max_concurrent = int(os.environ.get('MAX_CONCURRENT_JOBS', 2))
        self.executor = ThreadPoolExecutor(max_workers=self.max_concurrent)
        self.active_jobs = 0
    
    async def process_job(self, job_data):
        if self.active_jobs >= self.max_concurrent:
            raise Exception("Maximum concurrent jobs reached")
        
        self.active_jobs += 1
        try:
            result = await self.executor.submit(self._process_job, job_data)
            return result
        finally:
            self.active_jobs -= 1
```

## 🔍 Monitoring & Health Checks

### **Health Check Endpoint**
```python
from fastapi import FastAPI
import psutil
import GPUtil

app = FastAPI()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check GPU
        gpus = GPUtil.getGPUs()
        gpu_utilization = gpus[0].load * 100 if gpus else 0
        gpu_memory = gpus[0].memoryUsed if gpus else 0
        
        # Check system resources
        cpu_usage = psutil.cpu_percent()
        memory_usage = psutil.virtual_memory().percent
        disk_usage = psutil.disk_usage('/').percent
        
        return {
            "status": "healthy",
            "worker_type": os.environ.get("WORKER_TYPE"),
            "gpu_utilization": gpu_utilization,
            "gpu_memory_used": gpu_memory,
            "cpu_usage": cpu_usage,
            "memory_usage": memory_usage,
            "disk_usage": disk_usage,
            "active_jobs": get_active_job_count(),
            "uptime": get_uptime()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
```

### **Resource Monitoring**
```python
# Resource monitoring
import time
import logging

logger = logging.getLogger(__name__)

def monitor_resources():
    """Monitor system resources"""
    while True:
        try:
            # GPU monitoring
            gpus = GPUtil.getGPUs()
            for gpu in gpus:
                logger.info(f"GPU {gpu.id}: {gpu.load*100:.1f}% utilization, "
                          f"{gpu.memoryUsed}MB memory used")
            
            # System monitoring
            cpu = psutil.cpu_percent()
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            logger.info(f"CPU: {cpu}%, Memory: {memory.percent}%, "
                       f"Disk: {disk.percent}%")
            
            # Alert if resources are high
            if cpu > 90 or memory.percent > 90 or disk.percent > 90:
                logger.warning("High resource usage detected!")
                
        except Exception as e:
            logger.error(f"Resource monitoring error: {e}")
        
        time.sleep(60)  # Check every minute
```

## 🔐 Security Configuration

### **Container Security**
```dockerfile
# Security best practices
# Use non-root user
RUN useradd -m -u 1000 worker
USER worker

# Remove unnecessary packages
RUN apt-get purge -y --auto-remove \
    && rm -rf /var/lib/apt/lists/*

# Set proper permissions
RUN chown -R worker:worker /app
```

### **Network Security**
```python
# API security
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer

security = HTTPBearer()

async def verify_token(token: str = Depends(security)):
    """Verify API token"""
    if token.credentials != os.environ.get("API_TOKEN"):
        raise HTTPException(status_code=401, detail="Invalid token")
    return token.credentials
```

## 🚨 Troubleshooting

### **Common Issues**

#### **GPU Memory Issues**
```bash
# Check GPU memory
nvidia-smi

# Monitor memory usage
watch -n 1 nvidia-smi

# Restart container if needed
docker restart ourvidz-worker
```

#### **Model Loading Issues**
```bash
# Check model files
ls -la /app/models/

# Verify model paths
python3 -c "import torch; print(torch.cuda.is_available())"

# Re-download models if corrupted
python3 download_models.py
```

#### **Network Connectivity**
```bash
# Test database connection
python3 -c "import supabase; print('Connected')"

# Test API endpoints
curl -f http://localhost:8000/health

# Check logs
docker logs ourvidz-worker
```

### **Debug Commands**
```bash
# Enter container
docker exec -it ourvidz-worker bash

# Check processes
ps aux | grep python

# Monitor GPU
nvidia-smi -l 1

# Check logs
tail -f /app/logs/worker.log

# Test API
curl -X GET http://localhost:8000/status
```

## 📈 Performance Optimization

### **Model Optimization**
```python
# Model optimization
import torch

def optimize_models():
    """Optimize models for inference"""
    # Enable memory efficient attention
    torch.backends.cuda.enable_mem_efficient_sdp(True)
    torch.backends.cuda.enable_flash_sdp(True)
    
    # Set optimization level
    torch.backends.cudnn.benchmark = True
    torch.backends.cudnn.deterministic = False
```

### **Memory Management**
```python
# Memory management
import gc

def cleanup_memory():
    """Clean up GPU memory"""
    torch.cuda.empty_cache()
    gc.collect()

def monitor_memory():
    """Monitor memory usage"""
    allocated = torch.cuda.memory_allocated() / 1024**3  # GB
    cached = torch.cuda.memory_reserved() / 1024**3     # GB
    
    if allocated > 0.8 * MEMORY_LIMIT:  # 80% threshold
        cleanup_memory()
```

## 🔄 Scaling & Auto-scaling

### **Horizontal Scaling**
```bash
# Scale workers based on queue length
QUEUE_LENGTH=$(curl -s https://api.supabase.co/functions/v1/queue-length)

if [ $QUEUE_LENGTH -gt 10 ]; then
    # Scale up
    runpodctl scale ourvidz-sdxl-worker --replicas 3
elif [ $QUEUE_LENGTH -lt 2 ]; then
    # Scale down
    runpodctl scale ourvidz-sdxl-worker --replicas 1
fi
```

### **Load Balancing**
```python
# Load balancing configuration
WORKER_CONFIGS = {
    'sdxl': {
        'replicas': 2,
        'max_load': 80,
        'scale_up_threshold': 10,
        'scale_down_threshold': 2
    },
    'wan': {
        'replicas': 3,
        'max_load': 70,
        'scale_up_threshold': 15,
        'scale_down_threshold': 5
    }
}
```

---

**For worker system details, see [05-WORKER_SYSTEM.md](./05-WORKER_SYSTEM.md)**  
**For worker API details, see [06-WORKER_API.md](./06-WORKER_API.md)** 