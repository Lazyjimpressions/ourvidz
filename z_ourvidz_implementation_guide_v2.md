# **OurVidz.com - Complete Implementation Guide v2.0**
*Updated Technical Specification - June 21, 2025*

## **Executive Summary**

OurVidz.com is an AI-powered video generation platform that creates videos from text prompts with consistent character representation. The implementation follows a phased approach: Phase 1 focuses on 5-second videos with text-based characters, scaling to 30-minute videos through clip stitching in future phases.

**Key Specifications:**
- **Phase 1**: 5-second videos, 720p, 16fps, MP4 format
- **Future Phases**: Video lengths up to 30 minutes via stitching multiple 5-second clips
- **User Flow**: Text input → AI prompt enhancement → Preview image → User approval → Final video
- **Character System**: Phase 1 (text descriptions) → Phase 2 (image uploads + IP-Adapter)
- **Architecture**: 4-service stack (Netlify, Supabase, Upstash Redis, RunPod)
- **AI Model**: Wan 2.1 14B (Apache 2.0, no content restrictions)
- **Timeline**: 4-week Phase 1 implementation
- **Launch**: US-only, mobile-optimized, 1-2 beta users

---

## **1. Technical Architecture Overview**

### **1.1 System Components**
```
Frontend (Lovable/Netlify) 
    ↓ HTTPS/API calls
Supabase (Auth/DB/Storage/Edge Functions)
    ↓ Redis job queue
Upstash Redis (Job orchestration)
    ↓ Job processing
RunPod GPU Worker (Single RTX 4090 + Wan 2.1 14B)
    ↓ File upload
Supabase Storage (Video output)
```

### **1.2 GPU Workflow (RTX 4090 + Wan 2.1 14B)**
```python
# Sequential model loading for optimal 24GB VRAM usage
Job received → Load Mistral 7B → Enhance prompt → Unload
              ↓
              Load Wan 2.1 14B → Generate preview frame → Unload  
              ↓ (User approval)
              Load Wan 2.1 14B → Generate 5-sec video → Unload
```

### **1.3 Phased Development Strategy**

**Phase 1 (Weeks 1-4): Core Video Generation**
- Single 5-second videos
- Text-based character descriptions
- Preview-approve workflow
- Basic user interface

**Phase 2 (Month 2): Character System**
- Character image uploads
- IP-Adapter integration for consistency
- Character library management
- Advanced prompt templates

**Phase 3 (Month 3): Extended Videos**
- Video stitching system (5s → 15s → 30s → 30min)
- Scene transition optimization
- Storyboard generation workflow
- Multi-scene character consistency

### **1.4 Video Length Scaling Strategy**
```typescript
const VIDEO_LENGTHS = {
  "5s": { clips: 1, credits: 1 },      // Phase 1
  "15s": { clips: 3, credits: 2 },     // Phase 2
  "30s": { clips: 6, credits: 3 },     // Phase 2
  "60s": { clips: 12, credits: 5 },    // Phase 3
  "5min": { clips: 60, credits: 20 },  // Phase 3
  "30min": { clips: 360, credits: 100 } // Phase 4
}
```

---

## **2. AI Model Specifications**

### **2.1 Wan 2.1 14B Video Generation**

**Model Details:**
- **HuggingFace**: `Wan-AI/Wan2.1-T2V-14B` and `Wan-AI/Wan2.1-I2V-14B-720P`
- **License**: Apache 2.0 (no content restrictions - perfect for NSFW)
- **VRAM Requirements**: ~20GB for 14B model (fits RTX 4090's 24GB)
- **Performance**: 4-6 minutes for 5-second 720p video
- **Capabilities**: Text-to-video, image-to-video, bilingual text generation

**Technical Specifications:**
```python
# Wan 2.1 14B Configuration
{
  "resolution": "720p (1280x720)",
  "fps": 16,
  "max_frames": 80,  # 5 seconds
  "guidance_scale": 7.5,
  "num_inference_steps": 25,
  "torch_dtype": "float16"
}
```

### **2.2 Mistral 7B Prompt Enhancement**
- **Model**: `mistralai/Mistral-7B-Instruct-v0.2`
- **Purpose**: Convert casual user prompts to video-optimized descriptions
- **VRAM**: ~14GB when loaded
- **Processing Time**: 10-30 seconds per prompt

### **2.3 Phase 2: IP-Adapter Character Consistency**
- **Integration**: IP-Adapter + Wan 2.1 for character image conditioning
- **Models**: `h94/IP-Adapter` + custom training on Wan 2.1
- **Purpose**: Maintain character appearance across multiple videos

---

## **3. Database Schema (Updated)**

### **3.1 Core Tables**
```sql
-- User management (unchanged)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    age_verified BOOLEAN DEFAULT FALSE,
    subscription_status TEXT DEFAULT 'inactive',
    credits_remaining INTEGER DEFAULT 0,
    last_login TIMESTAMP
);

-- Enhanced character library for future image uploads
CREATE TABLE characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL, -- Phase 1: text descriptions
    appearance_tags TEXT[], 
    reference_image_url TEXT, -- Phase 2: uploaded images
    ip_adapter_embedding_url TEXT, -- Phase 2: processed embeddings
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced projects for multi-scene support
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT,
    original_prompt TEXT NOT NULL,
    enhanced_prompt TEXT,
    character_id UUID REFERENCES characters(id),
    target_duration INTEGER DEFAULT 5, -- Phase 2: 5, 15, 30, 60, etc.
    scene_count INTEGER DEFAULT 1, -- Phase 2: multiple scenes
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced video table for clip management
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    scene_number INTEGER DEFAULT 1, -- Phase 2: for multi-scene videos
    preview_url TEXT,
    video_url TEXT,
    final_stitched_url TEXT, -- Phase 2: for combined videos
    status TEXT DEFAULT 'draft',
    duration INTEGER DEFAULT 5,
    resolution TEXT DEFAULT '720p',
    format TEXT DEFAULT 'mp4',
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days')
);

-- Enhanced job tracking
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL, -- 'enhance', 'preview', 'video', 'stitch'
    status TEXT DEFAULT 'queued',
    error_message TEXT,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    metadata JSONB, -- Additional job-specific data
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- Usage tracking
CREATE TABLE usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'video_generated', 'preview_created', 'credit_used'
    credits_consumed INTEGER DEFAULT 1,
    metadata JSONB, -- Additional context
    created_at TIMESTAMP DEFAULT NOW()
);

-- Phase 2: Storyboard table
CREATE TABLE storyboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    scene_number INTEGER,
    scene_prompt TEXT,
    preview_image_url TEXT,
    approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### **3.2 Row Level Security (RLS)**
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own data" ON users FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage own characters" ON characters FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own projects" ON projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own videos" ON videos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own jobs" ON jobs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own usage" ON usage_logs FOR ALL USING (auth.uid() = user_id);
```

### **3.3 Storage Buckets (Updated)**
```yaml
# Phase 1 Buckets
videos-preview: # Preview frame images (720p PNG)
  public: false
  max_size: 10MB
  file_types: ["image/png", "image/jpeg"]

videos-final: # Individual 5-second videos (720p MP4)
  public: false  
  max_size: 100MB
  file_types: ["video/mp4"]

# Phase 2 Buckets  
character-references: # User uploaded character images
  public: false
  max_size: 20MB
  file_types: ["image/png", "image/jpeg", "image/webp"]

character-embeddings: # IP-Adapter processed embeddings
  public: false
  max_size: 50MB
  file_types: ["application/octet-stream"]

videos-stitched: # Combined multi-scene videos
  public: false
  max_size: 1GB
  file_types: ["video/mp4"]

system-assets: # UI assets, logos
  public: true
  max_size: 5MB
  file_types: ["image/*"]
```

---

## **4. API Specification**

### **4.1 Supabase Edge Functions**

#### **4.1.1 Queue Job Function (`queue-job.ts`)**
```typescript
// /supabase/functions/queue-job/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const { jobType, videoId, prompt, characterId } = await req.json()

    // Verify user authentication
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return new Response(JSON.stringify({ error: 'No authorization token' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: `Bearer ${token}` }
        }
      }
    )

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Authentication failed' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Check user credits (skip for preview jobs)
    if (jobType === 'video') {
      const { data: userProfile } = await supabase
        .from('users')
        .select('credits_remaining')
        .eq('id', user.id)
        .single()

      if (!userProfile || userProfile.credits_remaining <= 0) {
        return new Response(JSON.stringify({ error: 'Insufficient credits' }), { 
          status: 402,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        video_id: videoId,
        user_id: user.id,
        job_type: jobType,
        status: 'queued'
      })
      .select()
      .single()

    if (jobError) {
      console.error('Job creation error:', jobError)
      return new Response(JSON.stringify({ error: 'Failed to create job' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Queue job to Redis
    const jobPayload = {
      jobId: job.id,
      videoId,
      userId: user.id,
      jobType,
      prompt,
      characterId,
      timestamp: new Date().toISOString()
    }

    const redisResponse = await fetch(
      `${Deno.env.get('UPSTASH_REDIS_REST_URL')}/lpush/job-queue/${encodeURIComponent(JSON.stringify(jobPayload))}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('UPSTASH_REDIS_REST_TOKEN')}`
        }
      }
    )

    if (!redisResponse.ok) {
      console.error('Redis queue error:', await redisResponse.text())
      return new Response(JSON.stringify({ error: 'Failed to queue job' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log(`Job ${job.id} queued successfully for user ${user.id}`)

    return new Response(JSON.stringify({ 
      jobId: job.id, 
      status: 'queued',
      message: `${jobType} job queued successfully` 
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Queue job error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
```

#### **4.1.2 Job Callback Function (`job-callback.ts`)**
```typescript
// /supabase/functions/job-callback/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const { jobId, status, outputUrl, errorMessage } = await req.json()

    if (!jobId || !status) {
      return new Response(JSON.stringify({ error: 'Missing jobId or status' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Use service role key for database updates
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Update job status
    const { error: jobUpdateError } = await supabase
      .from('jobs')
      .update({
        status,
        error_message: errorMessage,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (jobUpdateError) {
      console.error('Job update error:', jobUpdateError)
      return new Response(JSON.stringify({ error: 'Failed to update job' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // If job completed successfully, update video record
    if (status === 'completed' && outputUrl) {
      // Get job details to determine what to update
      const { data: job } = await supabase
        .from('jobs')
        .select('video_id, job_type, user_id')
        .eq('id', jobId)
        .single()

      if (job) {
        const updateField = job.job_type === 'preview' ? 'preview_url' : 'video_url'
        const statusUpdate = job.job_type === 'preview' ? 'preview_ready' : 'completed'

        const videoUpdate = {
          [updateField]: outputUrl,
          status: statusUpdate
        }

        // If final video, mark completion time
        if (job.job_type === 'video') {
          videoUpdate.completed_at = new Date().toISOString()
        }

        const { error: videoUpdateError } = await supabase
          .from('videos')
          .update(videoUpdate)
          .eq('id', job.video_id)

        if (videoUpdateError) {
          console.error('Video update error:', videoUpdateError)
        }

        // If final video completed, deduct credit
        if (job.job_type === 'video' && status === 'completed') {
          const { error: creditError } = await supabase.rpc('deduct_credit', {
            user_id: job.user_id
          })

          if (creditError) {
            console.error('Credit deduction error:', creditError)
          }

          // Log usage
          await supabase
            .from('usage_logs')
            .insert({
              user_id: job.user_id,
              action: 'video_generated',
              credits_consumed: 1,
              metadata: { video_id: job.video_id, job_id: jobId }
            })
        }
      }
    }

    // If job failed, could refund credit here
    if (status === 'failed') {
      console.log(`Job ${jobId} failed: ${errorMessage}`)
      // TODO: Implement credit refund logic if needed
    }

    console.log(`Job ${jobId} callback processed: ${status}`)

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Job callback error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
```

### **4.2 SQL Functions for Credit Management**
```sql
-- Credit management functions
-- Run this in Supabase SQL Editor

-- Function to deduct credits safely
CREATE OR REPLACE FUNCTION deduct_credit(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET credits_remaining = GREATEST(credits_remaining - 1, 0)
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add credits (for payments/refunds)
CREATE OR REPLACE FUNCTION add_credits(user_id UUID, amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET credits_remaining = credits_remaining + amount
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set subscription status and credits
CREATE OR REPLACE FUNCTION update_subscription(
  user_id UUID, 
  new_status TEXT, 
  credit_amount INTEGER
)
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET 
    subscription_status = new_status,
    credits_remaining = credit_amount
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **4.3 Frontend API Service**
```typescript
// lib/videoAPI.ts
class VideoAPI {
  // Create new project
  static async createProject(title: string, prompt: string, characterId?: string) {
    const { data } = await supabase
      .from('projects')
      .insert({ title, original_prompt: prompt, character_id: characterId })
      .select()
      .single()
    return data
  }

  // Start generation pipeline  
  static async startGeneration(projectId: string) {
    const { data: video } = await supabase
      .from('videos')
      .insert({ project_id: projectId, status: 'draft' })
      .select()
      .single()

    // Queue prompt enhancement
    await supabase.functions.invoke('queue-job', {
      body: {
        jobType: 'enhance',
        videoId: video.id,
        prompt: project.original_prompt,
        characterId: project.character_id
      }
    })

    return video
  }

  // Generate preview
  static async generatePreview(videoId: string, enhancedPrompt: string) {
    return supabase.functions.invoke('queue-job', {
      body: { 
        jobType: 'preview', 
        videoId,
        prompt: enhancedPrompt
      }
    })
  }

  // Generate final video
  static async generateVideo(videoId: string, enhancedPrompt: string) {
    return supabase.functions.invoke('queue-job', {
      body: { 
        jobType: 'video', 
        videoId,
        prompt: enhancedPrompt
      }
    })
  }
}
```

---

## **5. RunPod GPU Worker Implementation (Updated)**

### **5.1 Docker Configuration**

#### **5.1.1 Updated Dockerfile**
```dockerfile
# Optimized for Wan 2.1 14B
FROM pytorch/pytorch:2.1.0-cuda12.1-cudnn8-devel

WORKDIR /workspace

# System dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create model directory
RUN mkdir -p /workspace/models

# Copy scripts
COPY download_models.py .
COPY worker.py .

# Download Wan 2.1 14B models (pre-build for faster startup)
RUN python download_models.py

# Set environment variables
ENV MODEL_PATH=/workspace/models
ENV PYTHONUNBUFFERED=1
ENV TORCH_HOME=/workspace/models

# Worker startup
CMD ["python", "-u", "worker.py"]
```

#### **5.1.2 Requirements.txt**
```txt
torch>=2.1.0
torchvision>=0.16.0
diffusers>=0.24.0
transformers>=4.36.0
accelerate>=0.25.0
redis>=5.0.1
requests>=2.31.0
pillow>=10.1.0
opencv-python>=4.8.1
numpy>=1.24.0
pydantic>=2.0.0
fastapi>=0.100.0
uvicorn>=0.23.0
```

#### **5.1.3 Updated Model Download Script**
```python
# download_models.py - Wan 2.1 14B
import os
import torch
from diffusers import WanVideoPipeline
from transformers import AutoTokenizer, AutoModelForCausalLM

def download_models():
    """Download and cache Wan 2.1 14B and Mistral 7B models"""
    model_path = "/workspace/models"
    os.makedirs(model_path, exist_ok=True)
    
    print("🎥 Downloading Wan 2.1 14B Text-to-Video...")
    wan_t2v_pipeline = WanVideoPipeline.from_pretrained(
        "Wan-AI/Wan2.1-T2V-14B",
        torch_dtype=torch.float16,
        cache_dir=f"{model_path}/wan_t2v"
    )
    print("✅ Wan 2.1 T2V downloaded")
    
    # Phase 2: Image-to-Video model
    print("🖼️ Downloading Wan 2.1 14B Image-to-Video (Phase 2)...")
    wan_i2v_pipeline = WanVideoPipeline.from_pretrained(
        "Wan-AI/Wan2.1-I2V-14B-720P",
        torch_dtype=torch.float16,
        cache_dir=f"{model_path}/wan_i2v"
    )
    print("✅ Wan 2.1 I2V downloaded")
    
    print("📝 Downloading Mistral 7B for prompt enhancement...")
    mistral_tokenizer = AutoTokenizer.from_pretrained(
        "mistralai/Mistral-7B-Instruct-v0.2",
        cache_dir=f"{model_path}/mistral"
    )
    mistral_model = AutoModelForCausalLM.from_pretrained(
        "mistralai/Mistral-7B-Instruct-v0.2",
        torch_dtype=torch.float16,
        cache_dir=f"{model_path}/mistral"
    )
    print("✅ Mistral 7B downloaded")
    
    print("🎉 All models downloaded successfully!")
    print(f"📁 Models stored in: {model_path}")

if __name__ == "__main__":
    download_models()
```

### **5.2 Updated GPU Worker Script**

#### **5.2.1 Main Worker with Wan 2.1 14B**
```python
# worker.py - Updated for Wan 2.1 14B
import os
import json
import time
import torch
import requests
import subprocess
from PIL import Image
from typing import Optional, List
from diffusers import WanVideoPipeline
from transformers import AutoTokenizer, AutoModelForCausalLM

class VideoWorker:
    def __init__(self):
        """Initialize worker with Wan 2.1 14B models"""
        self.model_path = "/workspace/models"
        
        # Model instances (loaded on demand)
        self.wan_t2v_pipeline = None
        self.wan_i2v_pipeline = None  # Phase 2
        self.mistral_model = None
        self.mistral_tokenizer = None
        
        # Environment variables
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_service_key = os.getenv('SUPABASE_SERVICE_KEY')
        
        print("🚀 OurVidz Worker initialized with Wan 2.1 14B")
        self.log_gpu_memory()

    def log_gpu_memory(self):
        """Monitor RTX 4090 24GB VRAM usage"""
        if torch.cuda.is_available():
            memory_allocated = torch.cuda.memory_allocated() / 1024**3
            memory_reserved = torch.cuda.memory_reserved() / 1024**3
            total_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3
            print(f"🔥 GPU Memory - Used: {memory_allocated:.2f}GB / {total_memory:.0f}GB")

    def load_mistral(self):
        """Load Mistral 7B for prompt enhancement (~14GB VRAM)"""
        if self.mistral_model is None:
            print("📝 Loading Mistral 7B...")
            self.mistral_tokenizer = AutoTokenizer.from_pretrained(
                "mistralai/Mistral-7B-Instruct-v0.2",
                cache_dir=f"{self.model_path}/mistral"
            )
            self.mistral_model = AutoModelForCausalLM.from_pretrained(
                "mistralai/Mistral-7B-Instruct-v0.2",
                torch_dtype=torch.float16,
                device_map="auto",
                cache_dir=f"{self.model_path}/mistral"
            )
            print("✅ Mistral 7B loaded")
            self.log_gpu_memory()

    def unload_mistral(self):
        """Free Mistral memory for Wan 2.1"""
        if self.mistral_model is not None:
            print("🗑️ Unloading Mistral 7B...")
            del self.mistral_model
            del self.mistral_tokenizer
            self.mistral_model = None
            self.mistral_tokenizer = None
            torch.cuda.empty_cache()
            print("✅ Mistral 7B unloaded")
            self.log_gpu_memory()

    def load_wan_t2v(self):
        """Load Wan 2.1 14B Text-to-Video (~20GB VRAM)"""
        if self.wan_t2v_pipeline is None:
            print("🎥 Loading Wan 2.1 14B Text-to-Video...")
            self.wan_t2v_pipeline = WanVideoPipeline.from_pretrained(
                "Wan-AI/Wan2.1-T2V-14B",
                torch_dtype=torch.float16,
                cache_dir=f"{self.model_path}/wan_t2v"
            ).to("cuda")
            print("✅ Wan 2.1 T2V loaded")
            self.log_gpu_memory()

    def load_wan_i2v(self):
        """Load Wan 2.1 14B Image-to-Video (Phase 2)"""
        if self.wan_i2v_pipeline is None:
            print("🖼️ Loading Wan 2.1 14B Image-to-Video...")
            self.wan_i2v_pipeline = WanVideoPipeline.from_pretrained(
                "Wan-AI/Wan2.1-I2V-14B-720P",
                torch_dtype=torch.float16,
                cache_dir=f"{self.model_path}/wan_i2v"
            ).to("cuda")
            print("✅ Wan 2.1 I2V loaded")
            self.log_gpu_memory()

    def unload_wan_models(self):
        """Free all Wan 2.1 memory"""
        if self.wan_t2v_pipeline is not None:
            print("🗑️ Unloading Wan 2.1 T2V...")
            del self.wan_t2v_pipeline
            self.wan_t2v_pipeline = None
            torch.cuda.empty_cache()
        
        if self.wan_i2v_pipeline is not None:
            print("🗑️ Unloading Wan 2.1 I2V...")
            del self.wan_i2v_pipeline
            self.wan_i2v_pipeline = None
            torch.cuda.empty_cache()
        
        print("✅ Wan 2.1 models unloaded")
        self.log_gpu_memory()

    def enhance_prompt(self, original_prompt: str, character_description: str = None) -> str:
        """Enhanced prompt generation with character support"""
        self.load_mistral()
        
        system_prompt = """You are an expert at converting casual text into detailed video generation prompts for Wan 2.1.

Create a cinematic, vivid prompt optimized for AI video generation. Focus on:
- Visual details and composition
- Lighting and atmosphere  
- Movement and camera work
- Realistic physics and motion

Keep under 200 words. Make it specific and cinematic."""

        if character_description:
            system_prompt += f"\n\nCharacter to include: {character_description}"

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": original_prompt}
        ]

        try:
            input_text = self.mistral_tokenizer.apply_chat_template(
                messages, tokenize=False, add_generation_prompt=True
            )
            inputs = self.mistral_tokenizer(input_text, return_tensors="pt").to("cuda")

            with torch.no_grad():
                outputs = self.mistral_model.generate(
                    **inputs,
                    max_new_tokens=300,
                    temperature=0.7,
                    do_sample=True,
                    pad_token_id=self.mistral_tokenizer.eos_token_id
                )

            enhanced = self.mistral_tokenizer.decode(
                outputs[0][inputs.input_ids.shape[1]:], 
                skip_special_tokens=True
            )
            
            self.unload_mistral()
            return enhanced.strip()
            
        except Exception as e:
            self.unload_mistral()
            print(f"❌ Prompt enhancement failed: {e}")
            return original_prompt

    def generate_preview(self, prompt: str) -> Optional[Image.Image]:
        """Generate single preview frame with Wan 2.1 T2V"""
        self.load_wan_t2v()
        
        try:
            # Generate single frame for preview
            result = self.wan_t2v_pipeline(
                prompt=prompt,
                height=720,
                width=1280,
                num_frames=1,  # Single frame for preview
                num_inference_steps=20,  # Faster for preview
                guidance_scale=7.5
            )
            
            # Extract first frame
            preview_image = result.frames[0][0] if result.frames else None
            self.unload_wan_models()
            return preview_image
            
        except Exception as e:
            self.unload_wan_models()
            print(f"❌ Preview generation failed: {e}")
            return None

    def generate_video(self, prompt: str) -> Optional[List[Image.Image]]:
        """Generate 5-second video with Wan 2.1 T2V (80 frames at 16fps)"""
        self.load_wan_t2v()
        
        try:
            result = self.wan_t2v_pipeline(
                prompt=prompt,
                height=720,
                width=1280,
                num_frames=80,  # 5 seconds at 16fps
                num_inference_steps=25,  # Higher quality for final
                guidance_scale=7.5
            )
            
            frames = result.frames[0] if result.frames else None
            self.unload_wan_models()
            return frames
            
        except Exception as e:
            self.unload_wan_models()
            print(f"❌ Video generation failed: {e}")
            return None

    def save_and_upload_image(self, image: Image.Image, filename: str) -> Optional[str]:
        """Save image and upload to Supabase storage"""
        try:
            # Save locally
            local_path = f"/tmp/{filename}"
            image.save(local_path, "PNG", quality=95)
            
            # Upload to Supabase
            upload_url = self.upload_to_supabase(local_path, f"videos-preview/{filename}")
            
            # Cleanup
            os.remove(local_path)
            return upload_url
            
        except Exception as e:
            print(f"❌ Image upload failed: {e}")
            return None

    def save_and_upload_video(self, frames: List[Image.Image], filename: str) -> Optional[str]:
        """Convert frames to MP4 and upload with optimized settings"""
        try:
            # Create temporary directory
            temp_dir = f"/tmp/frames_{int(time.time())}"
            os.makedirs(temp_dir, exist_ok=True)
            
            # Save frames
            for i, frame in enumerate(frames):
                frame.save(f"{temp_dir}/frame_{i:04d}.png")
            
            # FFmpeg with optimized settings for web streaming
            output_path = f"/tmp/{filename}"
            subprocess.run([
                "ffmpeg", "-y",
                "-framerate", "16",
                "-i", f"{temp_dir}/frame_%04d.png",
                "-c:v", "libx264",
                "-preset", "medium",
                "-crf", "23",
                "-pix_fmt", "yuv420p",
                "-movflags", "+faststart",  # Web optimization
                "-profile:v", "baseline",   # Better compatibility
                output_path
            ], check=True, capture_output=True)
            
            # Upload to Supabase
            upload_url = self.upload_to_supabase(output_path, f"videos-final/{filename}")
            
            # Cleanup
            subprocess.run(["rm", "-rf", temp_dir])
            os.remove(output_path)
            
            return upload_url
            
        except Exception as e:
            print(f"❌ Video processing failed: {e}")
            return None

    def upload_to_supabase(self, file_path: str, storage_path: str) -> str:
        """Upload file to Supabase storage"""
        try:
            with open(file_path, 'rb') as file:
                response = requests.post(
                    f"{self.supabase_url}/storage/v1/object/{storage_path}",
                    files={'file': file},
                    headers={
                        'Authorization': f"Bearer {self.supabase_service_key}",
                    }
                )
            
            if response.status_code == 200:
                return f"{self.supabase_url}/storage/v1/object/public/{storage_path}"
            else:
                raise Exception(f"Upload failed: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"❌ Supabase upload error: {e}")
            raise

    def notify_completion(self, job_id: str, status: str, output_url: str = None, error_message: str = None):
        """Notify Supabase of job completion"""
        try:
            callback_data = {
                'jobId': job_id,
                'status': status,
                'outputUrl': output_url,
                'errorMessage': error_message
            }
            
            response = requests.post(
                f"{self.supabase_url}/functions/v1/job-callback",
                json=callback_data,
                headers={
                    'Authorization': f"Bearer {self.supabase_service_key}",
                    'Content-Type': 'application/json'
                }
            )
            
            if response.status_code == 200:
                print(f"✅ Job {job_id} callback sent successfully")
            else:
                print(f"❌ Callback failed: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"❌ Callback error: {e}")

    def process_job(self, job_data: dict):
        """Process a single job"""
        job_id = job_data['jobId']
        job_type = job_data['jobType']
        
        print(f"🔄 Processing job {job_id} ({job_type})")
        
        try:
            if job_type == 'enhance':
                enhanced_prompt = self.enhance_prompt(
                    job_data['prompt'], 
                    job_data.get('characterDescription')
                )
                print(f"✅ Enhanced prompt: {enhanced_prompt[:100]}...")
                self.notify_completion(job_id, 'completed')
                
            elif job_type == 'preview':
                preview_image = self.generate_preview(job_data['prompt'])
                if preview_image:
                    filename = f"{job_data['videoId']}_preview.png"
                    upload_url = self.save_and_upload_image(preview_image, filename)
                    if upload_url:
                        print(f"✅ Preview uploaded: {upload_url}")
                        self.notify_completion(job_id, 'completed', upload_url)
                    else:
                        raise Exception("Failed to upload preview")
                else:
                    raise Exception("Failed to generate preview")
                    
            elif job_type == 'video':
                video_frames = self.generate_video(job_data['prompt'])
                if video_frames:
                    filename = f"{job_data['videoId']}_final.mp4"
                    upload_url = self.save_and_upload_video(video_frames, filename)
                    if upload_url:
                        print(f"✅ Video uploaded: {upload_url}")
                        self.notify_completion(job_id, 'completed', upload_url)
                    else:
                        raise Exception("Failed to upload video")
                else:
                    raise Exception("Failed to generate video")
            
            print(f"🎉 Job {job_id} completed successfully")
            
        except Exception as e:
            error_msg = str(e)
            print(f"❌ Job {job_id} failed: {error_msg}")
            self.notify_completion(job_id, 'failed', error_message=error_msg)

    def run(self):
        """Main worker loop with Redis REST API"""
        print("🎬 OurVidz GPU Worker with Wan 2.1 14B started!")
        print("⏳ Waiting for jobs...")
        
        while True:
            try:
                # Poll Redis queue via REST API (Upstash compatible)
                response = requests.get(
                    f"{os.getenv('UPSTASH_REDIS_REST_URL')}/brpop/job-queue/60",
                    headers={
                        'Authorization': f"Bearer {os.getenv('UPSTASH_REDIS_REST_TOKEN')}"
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('result'):
                        queue_name, job_json = result['result']
                        job_data = json.loads(job_json)
                        self.process_job(job_data)
                    else:
                        print("💤 No jobs, waiting...")
                else:
                    print(f"⚠️ Redis connection issue: {response.status_code}")
                    time.sleep(30)
                    
            except Exception as e:
                print(f"❌ Worker error: {e}")
                time.sleep(30)

if __name__ == "__main__":
    # Environment variable validation
    required_vars = [
        'UPSTASH_REDIS_REST_URL',
        'UPSTASH_REDIS_REST_TOKEN', 
        'SUPABASE_URL',
        'SUPABASE_SERVICE_KEY'
    ]
    
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        exit(1)
    
    worker = VideoWorker()
    worker.run()
```

---

## **6. Frontend Implementation (Lovable/Netlify)**

### **6.1 Project Structure**
```
src/
├── components/
│   ├── ui/           # shadcn/ui components
│   ├── VideoPlayer.tsx
│   ├── CharacterForm.tsx
│   ├── ProjectForm.tsx
│   ├── JobStatus.tsx
│   ├── AgeVerification.tsx
│   └── AuthForm.tsx
├── pages/
│   ├── index.tsx     # Landing page
│   ├── create.tsx    # Project creation
│   ├── preview.tsx   # Preview approval
│   ├── dashboard.tsx # User dashboard
│   └── auth.tsx      # Authentication
├── lib/
│   ├── supabase.ts   # Supabase client
│   ├── api.ts        # API service
│   └── types.ts      # TypeScript types
├── hooks/
│   └── useAuth.ts    # Authentication hook
└── styles/
    └── globals.css   # Tailwind + custom styles
```

### **6.2 Key Components**

#### **6.2.1 Video Creation Flow**
```typescript
// pages/create.tsx
import { useState } from 'react'
import { useRouter } from 'next/router'
import { VideoAPI } from '@/lib/api'

export default function CreateVideo() {
  const [prompt, setPrompt] = useState('')
  const [selectedCharacter, setSelectedCharacter] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      // Create project
      const project = await VideoAPI.createProject(
        'Untitled Video',
        prompt,
        selectedCharacter?.id
      )
      
      // Start generation pipeline
      const video = await VideoAPI.startGeneration(project.id)
      
      // Redirect to preview page
      router.push(`/preview/${video.id}`)
      
    } catch (error) {
      console.error('Failed to create video:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Create Your Video</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Character Selection */}
        <CharacterSelector 
          selected={selectedCharacter}
          onSelect={setSelectedCharacter}
        />
        
        {/* Prompt Input */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Describe your video scene
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A woman walking confidently down a busy street..."
            className="w-full h-32 p-3 border rounded-lg"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading || !prompt.trim()}
          className="w-full bg-blue-600 text-white py-3 rounded-lg disabled:opacity-50"
        >
          {isLoading ? 'Creating...' : 'Create Video'}
        </button>
      </form>
    </div>
  )
}
```

### **6.3 Mobile Optimization**
```css
/* styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Mobile-first responsive design */
.container {
  @apply px-4 sm:px-6 lg:px-8;
}

/* Video player mobile optimization */
video {
  @apply w-full h-auto;
  max-height: 70vh;
}

/* Form inputs mobile optimization */
input, textarea, select {
  @apply text-base; /* Prevents zoom on iOS */
}

/* Touch-friendly buttons */
button {
  @apply min-h-[44px] min-w-[44px]; /* iOS touch target size */
}
```

---

## **7. Cost Analysis (Updated for Wan 2.1 14B)**

### **7.1 Infrastructure Costs (Monthly)**

| Service | Usage | Cost | Notes |
|---------|-------|------|--------|
| **RunPod RTX 4090 Spot** | 100 videos × 5 min = 8.3 hrs | **$3.32** | Wan 2.1 14B processing time |
| **Supabase Pro** | Database + Auth + Storage | $25.00 | Upgraded for file storage |
| **Upstash Redis** | Job queue operations | $10.00 | Queue management |
| **Netlify** | Static hosting | $0.00 | Free tier sufficient |
| **Domain + SSL** | ourvidz.com | $1.25 | Annual domain cost |
| **Total** | | **$39.57** | |

### **7.2 Updated Pricing Strategy**
```
Phase 1 Subscription Tiers:
- Starter: $9.99/month (10 videos × 5s) = $1.00 per video
- Pro: $19.99/month (25 videos × 5s) = $0.80 per video  
- Creator: $39.99/month (60 videos × 5s) = $0.67 per video

Phase 2+ Extended Video Pricing:
- 15-second videos: 2 credits (3 × 5s clips)
- 30-second videos: 3 credits (6 × 5s clips)
- 60-second videos: 5 credits (12 × 5s clips)

Cost per 5-second video: ~$0.40
Gross margin: 60-85%
```

### **7.3 Break-even Analysis**
- **Fixed costs**: $39.57/month
- **Variable cost**: $0.40 per video
- **Break-even**: 40 Starter subscriptions OR 20 Pro subscriptions

---

## **8. Security & Compliance**

### **8.1 Age Verification Flow**
```typescript
// Age gate implementation
export function AgeGate() {
  const [isVerified, setIsVerified] = useState(false)
  
  const handleVerification = () => {
    // Set local storage flag
    localStorage.setItem('age_verified', 'true')
    setIsVerified(true)
  }
  
  if (isVerified || localStorage.getItem('age_verified') === 'true') {
    return null
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg max-w-md">
        <h2 className="text-2xl font-bold mb-4">Age Verification Required</h2>
        <p className="mb-6">
          This site contains AI-generated content intended for adults. 
          You must be 18 or older to proceed.
        </p>
        <div className="flex gap-4">
          <button
            onClick={handleVerification}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg"
          >
            I am 18 or older
          </button>
          <button
            onClick={() => window.location.href = 'https://google.com'}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  )
}
```

### **8.2 Data Retention Policy**
```sql
-- Automated cleanup functions
CREATE OR REPLACE FUNCTION cleanup_expired_videos()
RETURNS void AS $$
BEGIN
  -- Delete expired video files (30 days old)
  DELETE FROM videos 
  WHERE expires_at < NOW() 
  AND status = 'completed';
  
  -- Log cleanup action
  INSERT INTO usage_logs (user_id, action, metadata)
  SELECT user_id, 'video_expired', 
         json_build_object('video_id', id, 'expired_at', expires_at)
  FROM videos 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup to run daily
SELECT cron.schedule('cleanup-videos', '0 2 * * *', 'SELECT cleanup_expired_videos();');
```

---

## **9. Implementation Timeline (Updated)**

### **9.1 Phase 1: MVP (4 weeks) ✅ In Progress**

**Week 1: Infrastructure ✅ COMPLETED**
- [x] Supabase project setup
- [x] Database schema with RLS
- [x] Storage buckets configuration
- [x] Edge Functions deployment
- [x] Frontend authentication integration

**Week 2: GPU Worker (Current)**
- [ ] RunPod account and Docker setup
- [ ] Wan 2.1 14B model integration
- [ ] Upstash Redis queue testing
- [ ] End-to-end job processing

**Week 3: Frontend Integration**
- [ ] Video creation flow
- [ ] Preview approval interface
- [ ] Character text management
- [ ] Real-time status updates

**Week 4: Launch Preparation**
- [ ] End-to-end testing
- [ ] Age verification
- [ ] Mobile optimization
- [ ] Beta user onboarding

### **9.2 Phase 2: Character Images (Month 2)**
- [ ] Character image upload system
- [ ] IP-Adapter integration with Wan 2.1
- [ ] Character consistency testing
- [ ] Enhanced prompt templates

### **9.3 Phase 3: Extended Videos (Month 3)**
- [ ] Video stitching algorithm
- [ ] Multi-scene workflow
- [ ] Storyboard generation
- [ ] Scene transition optimization

---

## **10. Technical Specifications (Updated)**

### **10.1 Wan 2.1 14B Performance Benchmarks**

```yaml
RTX 4090 Performance:
  Preview Generation: 60-90 seconds (1 frame)
  5-second Video: 4-6 minutes (80 frames)
  VRAM Usage: 20-22GB peak
  Memory Management: Sequential load/unload
  
Quality Metrics:
  Resolution: 720p (1280x720)
  Frame Rate: 16fps
  Codec: H.264 (web-optimized)
  File Size: ~15-25MB per 5-second video
```

### **10.2 Video Stitching Algorithm (Phase 2)**

```python
# Phase 2: Multi-clip stitching
def stitch_video_clips(clip_urls: List[str], target_duration: int) -> str:
    """
    Combine multiple 5-second clips into longer videos
    with smooth transitions and character consistency
    """
    clips_needed = target_duration // 5
    
    # Download clips
    temp_clips = []
    for i, url in enumerate(clip_urls[:clips_needed]):
        clip_path = f"/tmp/clip_{i}.mp4"
        download_file(url, clip_path)
        temp_clips.append(clip_path)
    
    # FFmpeg concatenation with crossfade transitions
    filter_complex = build_crossfade_filter(temp_clips)
    
    subprocess.run([
        "ffmpeg", "-y",
        *[item for clip in temp_clips for item in ["-i", clip]],
        "-filter_complex", filter_complex,
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "23",
        "-movflags", "+faststart",
        f"/tmp/stitched_{int(time.time())}.mp4"
    ])
    
    return upload_stitched_video()
```

---

## **11. Monitoring & Maintenance**

### **11.1 Key Metrics to Track**

**Business Metrics:**
- Daily/Monthly Active Users
- Subscription conversion rate
- Videos generated per user
- Average revenue per user (ARPU)
- Churn rate

**Technical Metrics:**
- Video generation success rate
- Average generation time
- GPU utilization
- Queue depth and processing time
- Error rates by job type

**Cost Metrics:**
- GPU costs per video
- Storage costs
- Queue operation costs
- Cost per acquisition (CPA)

### **11.2 Monitoring Stack**
```yaml
# Supabase Dashboard:
- User growth and engagement
- Database performance
- Storage usage
- API response times

# RunPod Monitoring:  
- GPU utilization and costs
- Worker uptime
- Generation success rates
- Resource usage patterns

# Upstash Redis:
- Queue length and throughput
- Job success/failure rates
- Memory usage
- Connection statistics

# Netlify Analytics:
- Site performance
- User behavior
- Geographic distribution
- Device/browser analytics
```

### **11.3 Automated Alerting**
```typescript
// Critical alerts to implement
const criticalAlerts = {
  'High Queue Depth': 'Queue > 20 jobs for > 10 minutes',
  'Generation Failures': 'Failure rate > 10% in 1 hour',
  'GPU Worker Down': 'No jobs processed in 15 minutes', 
  'Storage Limit': 'Storage usage > 80% of quota',
  'Payment Failures': 'Payment failure rate > 5%',
  'Site Down': 'Frontend not responding for > 2 minutes'
}
```

---

## **12. Phase Roadmap Summary**

### **12.1 Current Status**
- ✅ **Infrastructure**: Supabase, Redis, Frontend connected
- 🔄 **In Progress**: GPU worker with Wan 2.1 14B
- ⏳ **Next**: Frontend video creation flow

### **12.2 Success Metrics by Phase**

**Phase 1 (4 weeks):**
- [ ] 100% 5-second video generation success rate
- [ ] <6 minutes average generation time
- [ ] 2-3 beta users creating videos daily
- [ ] Mobile-responsive interface

**Phase 2 (Month 2):**
- [ ] Character image upload working
- [ ] 90%+ character consistency across videos
- [ ] 15-30 second video stitching
- [ ] 20+ active users

**Phase 3 (Month 3):**
- [ ] Up to 5-minute videos via stitching
- [ ] Storyboard approval workflow
- [ ] 100+ videos generated monthly
- [ ] Revenue generation ($500+ MRR)

---

## **13. Deployment Checklist**

### **13.1 Pre-Launch**
- [ ] Legal review completed
- [ ] Age verification system tested
- [ ] Payment processor approved (Phase 2)
- [ ] Wan 2.1 14B models downloaded and tested
- [ ] Backup systems configured
- [ ] Monitoring alerts set up
- [ ] Documentation complete
- [ ] Support system ready

### **13.2 Launch Day**
- [ ] DNS propagated
- [ ] SSL certificates active
- [ ] All services health-checked
- [ ] Test user flow end-to-end
- [ ] Monitor queues and logs
- [ ] Marketing campaign live (if applicable)
- [ ] Support team briefed

### **13.3 Post-Launch**
- [ ] Daily metrics review
- [ ] User feedback collection
- [ ] Performance optimization
- [ ] Cost analysis
- [ ] Feature prioritization
- [ ] Scaling plan execution

---

## **Conclusion**

This updated implementation guide reflects our current progress and clarifies the phased approach. **Wan 2.1 14B** is confirmed as the ideal model choice with Apache 2.0 licensing, RTX 4090 compatibility, and no content restrictions for NSFW generation.

**Immediate Next Steps:**
1. Complete GPU worker deployment with Wan 2.1 14B
2. Test end-to-end video generation pipeline
3. Build frontend video creation interface
4. Onboard first beta users

The system is designed to start simple with 5-second videos and scale systematically to support the full PRD vision of 30-minute content through intelligent clip stitching and character consistency.

**Phase 1 Success Criteria:**
- 100% video generation success rate
- <6 minutes total generation time
- 2-3 satisfied beta users
- Mobile-responsive experience
- Foundation for Phase 2 scaling

**Phase 2+ Vision:**
- Character image uploads with IP-Adapter
- Extended videos via intelligent stitching
- Storyboard workflow for complex productions
- Scaling to 30-minute video capabilities

This implementation provides a solid foundation for building OurVidz.com into a leading AI video generation platform for adult content creation.
