# OurVidz.com - Services Configuration

**Last Updated:** July 5, 2025  
**Services:** Supabase, Upstash Redis, RunPod, Lovable

---

## **Supabase Configuration**

### **Project Setup**
```yaml
Project Details:
  Name: ourvidz-production
  Region: us-east-1
  Database: PostgreSQL 15
  Storage: Object storage with CDN
  Auth: Built-in authentication system

Environment Variables:
  SUPABASE_URL: https://[project-id].supabase.co
  SUPABASE_ANON_KEY: [anon-key-for-frontend]
  SUPABASE_SERVICE_KEY: [service-key-for-backend]
```

### **Database Schema**
```sql
-- Jobs table for tracking generation jobs
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL,
    prompt TEXT NOT NULL,
    config JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- Assets table for generated content
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    width INTEGER,
    height INTEGER,
    duration INTEGER, -- for videos
    bucket_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profiles table
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    subscription_tier VARCHAR(20) DEFAULT 'free',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Job formats configuration
CREATE TABLE job_formats (
    id SERIAL PRIMARY KEY,
    job_type VARCHAR(50) UNIQUE NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    duration INTEGER, -- for videos
    sample_steps INTEGER NOT NULL,
    sample_guide_scale DECIMAL(3,2) NOT NULL,
    frame_num INTEGER, -- for videos
    is_enhanced BOOLEAN DEFAULT FALSE
);

-- Job qualities configuration
CREATE TABLE job_qualities (
    id SERIAL PRIMARY KEY,
    job_type VARCHAR(50) UNIQUE NOT NULL,
    quality_level VARCHAR(20) NOT NULL,
    description TEXT,
    estimated_time INTEGER -- seconds
);
```

### **RLS Policies**
```sql
-- Jobs table policies
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own jobs" ON jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own jobs" ON jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" ON jobs
    FOR UPDATE USING (auth.uid() = user_id);

-- Assets table policies
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own assets" ON assets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assets" ON assets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assets" ON assets
    FOR DELETE USING (auth.uid() = user_id);

-- User profiles policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);
```

### **Storage Buckets**
```yaml
Bucket Configuration:
  All buckets are private (authenticated access only)
  File size limits: 20MB for images, 100MB for videos
  Allowed file types: PNG for images, MP4 for videos

SDXL Buckets:
  sdxl_image_fast:
    Purpose: SDXL fast generation images
    Max Size: 20MB
    Allowed Types: image/png
    
  sdxl_image_high:
    Purpose: SDXL high-quality generation images
    Max Size: 20MB
    Allowed Types: image/png

WAN Standard Buckets:
  image_fast:
    Purpose: WAN fast generation images
    Max Size: 20MB
    Allowed Types: image/png
    
  image_high:
    Purpose: WAN high-quality generation images
    Max Size: 20MB
    Allowed Types: image/png
    
  video_fast:
    Purpose: WAN fast generation videos
    Max Size: 100MB
    Allowed Types: video/mp4
    
  video_high:
    Purpose: WAN high-quality generation videos
    Max Size: 100MB
    Allowed Types: video/mp4

WAN Enhanced Buckets:
  image7b_fast_enhanced:
    Purpose: Qwen-enhanced fast images
    Max Size: 20MB
    Allowed Types: image/png
    
  image7b_high_enhanced:
    Purpose: Qwen-enhanced high-quality images
    Max Size: 20MB
    Allowed Types: image/png
    
  video7b_fast_enhanced:
    Purpose: Qwen-enhanced fast videos
    Max Size: 100MB
    Allowed Types: video/mp4
    
  video7b_high_enhanced:
    Purpose: Qwen-enhanced high-quality videos
    Max Size: 100MB
    Allowed Types: video/mp4
```

### **Edge Functions**
```typescript
// queue-job.ts - Job creation and queue routing
export const queueJob = async (req: Request) => {
  const { job_type, prompt, config } = await req.json();
  
  const validJobTypes = [
    'sdxl_image_fast', 'sdxl_image_high',
    'image_fast', 'image_high', 'video_fast', 'video_high',
    'image7b_fast_enhanced', 'image7b_high_enhanced',
    'video7b_fast_enhanced', 'video7b_high_enhanced'
  ];
  
  const queueMapping = {
    'sdxl_image_fast': 'sdxl_queue',
    'sdxl_image_high': 'sdxl_queue',
    'image_fast': 'wan_queue',
    'image_high': 'wan_queue',
    'video_fast': 'wan_queue',
    'video_high': 'wan_queue',
    'image7b_fast_enhanced': 'wan_queue',
    'image7b_high_enhanced': 'wan_queue',
    'video7b_fast_enhanced': 'wan_queue',
    'video7b_high_enhanced': 'wan_queue'
  };
  
  // Create job in database
  // Add job to appropriate Redis queue
  // Return job ID to frontend
};

// job-callback.ts - Job completion handling
export const jobCallback = async (req: Request) => {
  const { job_id, status, assets, error_message } = await req.json();
  
  // Update job status in database
  // Store asset metadata
  // Handle success/failure notifications
};
```

---

## **Upstash Redis Configuration**

### **Project Setup**
```yaml
Provider: Upstash Redis
Plan: Free Tier (10,000 requests/day)
Region: us-east-1
Database: Redis 7.0

Environment Variables:
  UPSTASH_REDIS_REST_URL: https://[region]-[id].upstash.io
  UPSTASH_REDIS_REST_TOKEN: [auth-token]
```

### **Queue Configuration**
```yaml
Queues:
  sdxl_queue:
    Purpose: SDXL image generation jobs
    Polling Interval: 2 seconds
    Job Structure: JSON with job metadata
    
  wan_queue:
    Purpose: WAN video generation jobs (standard + enhanced)
    Polling Interval: 5 seconds
    Job Structure: JSON with job metadata

Job Structure:
  {
    "id": "job-uuid",
    "type": "sdxl_image_fast",
    "prompt": "user prompt",
    "config": {
      "width": 1024,
      "height": 1024,
      "sample_steps": 20,
      "sample_guide_scale": 7.5
    },
    "user_id": "user-uuid",
    "created_at": "timestamp"
  }
```

### **Redis Operations**
```python
# Worker queue operations
import redis
import json

class RedisClient:
    def __init__(self):
        self.redis_url = os.getenv('UPSTASH_REDIS_REST_URL')
        self.redis_token = os.getenv('UPSTASH_REDIS_REST_TOKEN')
        
    def get_job(self, queue_name):
        # Get next job from queue
        # Return job data or None if empty
        
    def mark_job_complete(self, job_id):
        # Mark job as completed
        # Clean up job data
        
    def mark_job_failed(self, job_id, error):
        # Mark job as failed
        # Store error message
```

---

## **RunPod Configuration**

### **Instance Setup**
```yaml
Instance Type: RTX 6000 ADA
Specifications:
  GPU: NVIDIA RTX 6000 ADA (48GB VRAM)
  CPU: 8 vCPUs
  RAM: 32GB
  Storage: 100GB SSD + 100GB Network Volume
  OS: Ubuntu 22.04 LTS

Network Volume:
  Path: /workspace
  Size: 100GB
  Purpose: Persistent model storage
  Contents:
    /workspace/models/: All AI models
    /workspace/python_deps/: Python dependencies
    /workspace/workers/: Worker scripts
```

### **Model Storage Structure**
```yaml
/workspace/models/ (48GB total):
  huggingface_cache/ (15GB):
    hub/
      models--Qwen--Qwen2.5-7B-Instruct/ (15GB)
      models--Qwen--Qwen2.5-14B-Instruct/ (28GB, available)
      
  wan2.1-t2v-1.3b/ (17GB):
    model files for WAN 2.1 video generation
    
  sdxl-lustify/ (6.5GB):
    model files for SDXL image generation

/workspace/python_deps/:
  lib/python3.11/site-packages/: All Python packages
  requirements.txt: Package list
```

### **Worker Deployment**
```yaml
Startup Command:
  python dual_orchestrator.py

Environment Variables:
  SUPABASE_URL: [supabase-url]
  SUPABASE_SERVICE_KEY: [supabase-service-key]
  UPSTASH_REDIS_REST_URL: [redis-url]
  UPSTASH_REDIS_REST_TOKEN: [redis-token]
  HF_HOME: /workspace/models/huggingface_cache
  PYTHONPATH: /workspace/python_deps/lib/python3.11/site-packages

Python Environment:
  Version: Python 3.11.10
  PyTorch: 2.4.1+cu124
  CUDA: 12.4
  Key Packages:
    - torch
    - transformers
    - diffusers
    - accelerate
    - dashscope
    - aiohttp
    - redis
    - supabase
```

### **Worker Scripts**
```python
# dual_orchestrator.py - Main orchestrator
import asyncio
from sdxl_worker import SDXLWorker
from enhanced_wan_worker import EnhancedWANWorker
from redis_client import RedisClient

class DualOrchestrator:
    def __init__(self):
        self.sdxl_worker = SDXLWorker()
        self.wan_worker = EnhancedWANWorker()
        self.redis_client = RedisClient()
        
    async def start(self):
        # Start both workers
        # Monitor processes
        # Handle job routing
        
    async def process_sdxl_queue(self):
        # Poll sdxl_queue every 2 seconds
        # Process SDXL jobs
        
    async def process_wan_queue(self):
        # Poll wan_queue every 5 seconds
        # Process WAN jobs (standard + enhanced)

if __name__ == "__main__":
    orchestrator = DualOrchestrator()
    asyncio.run(orchestrator.start())
```

---

## **Lovable Configuration**

### **Project Setup**
```yaml
Service: Lovable (AI-powered testing)
Purpose: Automated testing and quality assurance
Integration: API-based testing for frontend components

Configuration:
  API Key: [lovable-api-key]
  Project ID: [project-id]
  Test Environment: Production-like testing environment

Test Coverage:
  - User authentication flows
  - Job creation and submission
  - Asset generation and display
  - Payment and subscription flows
  - Error handling and edge cases
```

### **Testing Strategy**
```yaml
Automated Tests:
  - End-to-end user workflows
  - API endpoint testing
  - UI component testing
  - Performance testing
  - Security testing

Test Scenarios:
  - User registration and login
  - Job creation with different types
  - Asset generation and retrieval
  - Error handling and recovery
  - Payment processing
  - Subscription management
```

---

## **Environment Configuration**

### **Development Environment**
```yaml
Frontend:
  VITE_SUPABASE_URL: [dev-supabase-url]
  VITE_SUPABASE_ANON_KEY: [dev-anon-key]
  VITE_API_BASE_URL: http://localhost:5173

Backend:
  SUPABASE_URL: [dev-supabase-url]
  SUPABASE_SERVICE_KEY: [dev-service-key]
  UPSTASH_REDIS_REST_URL: [dev-redis-url]
  UPSTASH_REDIS_REST_TOKEN: [dev-redis-token]

Workers:
  SUPABASE_URL: [dev-supabase-url]
  SUPABASE_SERVICE_KEY: [dev-service-key]
  UPSTASH_REDIS_REST_URL: [dev-redis-url]
  UPSTASH_REDIS_REST_TOKEN: [dev-redis-token]
  HF_HOME: /workspace/models/huggingface_cache
```

### **Production Environment**
```yaml
Frontend:
  VITE_SUPABASE_URL: [prod-supabase-url]
  VITE_SUPABASE_ANON_KEY: [prod-anon-key]
  VITE_API_BASE_URL: https://ourvidz.com

Backend:
  SUPABASE_URL: [prod-supabase-url]
  SUPABASE_SERVICE_KEY: [prod-service-key]
  UPSTASH_REDIS_REST_URL: [prod-redis-url]
  UPSTASH_REDIS_REST_TOKEN: [prod-redis-token]

Workers:
  SUPABASE_URL: [prod-supabase-url]
  SUPABASE_SERVICE_KEY: [prod-service-key]
  UPSTASH_REDIS_REST_URL: [prod-redis-url]
  UPSTASH_REDIS_REST_TOKEN: [prod-redis-token]
  HF_HOME: /workspace/models/huggingface_cache
```

---

## **Service Dependencies**

### **Frontend Dependencies**
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "@tanstack/react-query": "^5.17.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "lucide-react": "^0.294.0",
    "sonner": "^1.2.0",
    "react-hook-form": "^7.48.0",
    "@hookform/resolvers": "^3.3.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.1.0",
    "typescript": "^5.2.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

### **Worker Dependencies**
```txt
# requirements.txt
torch==2.4.1+cu124
transformers==4.36.0
diffusers==0.25.0
accelerate==0.25.0
dashscope==1.14.0
aiohttp==3.9.0
redis==5.0.0
supabase==2.3.0
pillow==10.1.0
opencv-python==4.8.1
numpy==1.24.0
```

---

## **Monitoring & Analytics**

### **Service Health Monitoring**
```yaml
Supabase:
  - Database connection status
  - API response times
  - Storage bucket availability
  - Edge function execution times
  
Upstash Redis:
  - Queue depth monitoring
  - Response times
  - Error rates
  - Request count limits
  
RunPod:
  - GPU utilization
  - Memory usage
  - Worker process status
  - Model loading times
  
Lovable:
  - Test execution status
  - Test coverage metrics
  - Performance benchmarks
  - Error detection rates
```

### **Performance Metrics**
```yaml
Key Metrics:
  - Job success rate (>95% target)
  - Average generation time per job type
  - Queue processing latency
  - User session duration
  - Asset generation volume
  - Error rates and types
  
Alerting:
  - Job failure rate >5%
  - Generation time >300s
  - Queue depth >100 jobs
  - GPU utilization <50%
  - Service downtime
```

---

## **Security Configuration**

### **API Security**
```yaml
Authentication:
  - JWT tokens for user sessions
  - Service keys for backend operations
  - API rate limiting
  
Authorization:
  - Row-level security (RLS) on all tables
  - User isolation for data access
  - Role-based access control
  
Data Protection:
  - Encrypted data in transit (HTTPS)
  - Encrypted data at rest
  - Secure environment variables
  - No sensitive data in client-side code
```

### **Infrastructure Security**
```yaml
RunPod Security:
  - Isolated GPU instances
  - Secure network access
  - Encrypted storage volumes
  - Regular security updates
  
Supabase Security:
  - SOC 2 compliance
  - GDPR compliance
  - Regular security audits
  - Automated vulnerability scanning
  
Upstash Security:
  - Encrypted Redis connections
  - Access token authentication
  - Network isolation
  - Regular security updates
```

---

## **Backup & Recovery**

### **Data Backup Strategy**
```yaml
Database Backups:
  - Supabase automatic daily backups
  - Point-in-time recovery available
  - Cross-region backup replication
  
Storage Backups:
  - Supabase storage redundancy
  - Multiple availability zones
  - Automatic backup verification
  
Model Backups:
  - Models stored on persistent network volume
  - Version control for model configurations
  - Recovery procedures documented
```

### **Disaster Recovery**
```yaml
Recovery Procedures:
  - Database restoration from backups
  - Worker redeployment procedures
  - Service reconfiguration steps
  - User notification protocols
  
Recovery Time Objectives:
  - Database: <1 hour
  - Workers: <30 minutes
  - Frontend: <15 minutes
  - Full system: <2 hours
```

**Status: 🔧 SERVICES CONFIGURED - READY FOR DEPLOYMENT** 