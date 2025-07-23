# OurVidz.com - Technical Architecture

**Last Updated:** July 16, 2025  
**System:** Dual Worker Architecture on RTX 6000 ADA (48GB VRAM)  
**Deployment:** Production on Lovable (https://ourvidz.lovable.app/)  
**Status:** ✅ All 10 Job Types Available - Multi-Reference System Live

---

## **🎯 System Overview**

OurVidz is a comprehensive AI content generation platform featuring:

- **Dual Worker Architecture**: SDXL for high-quality images, WAN for videos
- **Flexible SDXL Quantities**: User-selectable 1, 3, or 6 images per batch
- **Multi-Reference System (SDXL Only)**: Supports separate reference images for style, composition, and character. Reference images are stored in a dedicated Supabase bucket.
- **Compel Integration (SDXL)**: Present in code, not used for SDXL due to model incompatibility. Prompt library enhancement is in progress.
- **Qwen 7B Prompt Enhancement**: Used for WAN jobs and instant enhancement in frontend modal.
- **Edge Functions**: All four (queue-job, job-callback, enhance-prompt, generate-admin-image) are live and use standardized parameters.
- **Seed Control**: Reproducible generation with user-controlled seeds
- **Enhanced Negative Prompts**: Intelligent generation for SDXL with multi-party scene detection
- **Standardized Callbacks**: Consistent parameters across all workers

---

## **🏗️ Architecture Components**

### **Frontend (React + TypeScript)**
```
src/
├── pages/
│   ├── Workspace.tsx          # Main workspace with multi-reference support
│   ├── Library.tsx            # Asset management
│   └── Admin.tsx              # Admin dashboard
├── components/
│   ├── workspace/
│   │   ├── MultiReferencePanel.tsx    # Multi-reference image management
│   │   ├── CharacterReferenceWarning.tsx  # Character reference warnings
│   │   ├── EnhancedSeedInput.tsx      # Enhanced seed input
│   │   └── SeedDisplay.tsx            # Seed display
│   ├── ImageInputControls.tsx         # Image generation controls
│   ├── VideoInputControls.tsx         # Video generation controls
│   └── PromptInfoModal.tsx            # Enhanced prompt information
├── hooks/
│   ├── useGeneration.ts               # Generation management
│   ├── useRealtimeWorkspace.ts        # Real-time workspace updates
│   └── useRealtimeGenerationStatus.ts # Real-time status updates
└── types/
    └── workspace.ts                   # Type definitions
```

### **Backend (Supabase + Edge Functions)**
```
supabase/
├── functions/
│   ├── queue-job/             # Job submission and queue management
│   └── job-callback/          # Worker callback processing
├── migrations/                # Database schema updates
└── config.toml               # Supabase configuration
```

### **Workers (Python)**
```
workers/
├── sdxl_worker.py            # SDXL image generation
└── wan_worker.py             # WAN video and enhanced image generation
```

---

## **🔄 Data Flow Architecture**

### **Job Submission Flow**
```mermaid
graph TD
    A[User Input] --> B[Frontend Validation]
    B --> C[Queue Job Edge Function]
    C --> D[Database Job Record]
    C --> E[Redis Queue]
    E --> F[Worker Polling]
    F --> G[Generation Execution]
    G --> H[Asset Upload]
    H --> I[Callback Edge Function]
    I --> J[Database Update]
    J --> K[Frontend Update]
```

### **Multi-Reference Flow**
```mermaid
graph TD
    A[Reference Image Upload] --> B[Storage Bucket]
    B --> C[Metadata Extraction]
    C --> D[Reference Type Selection]
    D --> E[Strength Configuration]
    E --> F[Job Payload]
    F --> G[Worker Processing]
    G --> H[Image-to-Image Generation]
    H --> I[Result Storage]
    I --> J[Callback Processing]
```

### **Flexible Quantity Flow**
```mermaid
graph TD
    A[Quantity Selection] --> B[1, 3, or 6 Images]
    B --> C[Batch Configuration]
    C --> D[SDXL Worker]
    D --> E[Parallel Generation]
    E --> F[Multiple Assets]
    F --> G[Batch Upload]
    G --> H[Callback with Array]
    H --> I[Database Updates]
```

---

## **🎨 SDXL Worker Architecture**

### **Model Configuration**
```python
class LustifySDXLWorker:
    def __init__(self):
        self.model_path = "/workspace/models/sdxl-lustify/lustifySDXLNSFWSFW_v20.safetensors"
        self.pipeline = StableDiffusionXLPipeline
        self.model_loaded = False
        
        # Job configurations with batch support
        self.job_configs = {
            'sdxl_image_fast': {
                'content_type': 'image',
                'file_extension': 'png',
                'height': 1024,
                'width': 1024,
                'num_inference_steps': 15,
                'guidance_scale': 6.0,
                'storage_bucket': 'sdxl_image_fast',
                'expected_time_per_image': 4,
                'quality_tier': 'fast',
                'phase': 1,
                'supports_flexible_quantities': True
            },
            'sdxl_image_high': {
                'content_type': 'image', 
                'file_extension': 'png',
                'height': 1024,
                'width': 1024,
                'num_inference_steps': 25,
                'guidance_scale': 7.5,
                'storage_bucket': 'sdxl_image_high',
                'expected_time_per_image': 8,
                'quality_tier': 'high',
                'phase': 1,
                'supports_flexible_quantities': True
            }
        }
```

### **Reference Image Processing**
```python
def process_reference_images(self, job_data):
    """Process multiple reference images for image-to-image generation"""
    references = []
    
    # Extract reference parameters
    reference_image_url = job_data.get('reference_image_url')
    reference_type = job_data.get('reference_type', 'style')
    reference_strength = job_data.get('reference_strength', 0.7)
    
    if reference_image_url:
        # Load and process reference image
        reference_image = self.load_reference_image(reference_image_url)
        
        # Apply reference type processing
        if reference_type == 'style':
            processed_image = self.apply_style_reference(reference_image, reference_strength)
        elif reference_type == 'composition':
            processed_image = self.apply_composition_reference(reference_image, reference_strength)
        elif reference_type == 'character':
            processed_image = self.apply_character_reference(reference_image, reference_strength)
        
        references.append(processed_image)
    
    return references
```

### **Flexible Quantity Generation**
```python
def generate_with_quantity(self, prompt, config, num_images):
    """Generate multiple images with flexible quantities"""
    results = []
    seed = config.get('seed', random.randint(1, 999999999))
    
    for i in range(num_images):
        # Generate with consistent seed for reproducibility
        result = self.generate_single_image(prompt, config, seed)
        results.append(result)
    
    return results
```

---

## **🎬 WAN Worker Architecture**

### **Model Configuration**
```python
class WANWorker:
    def __init__(self):
        self.model = "wan_2_1_1_3b"
        self.supported_jobs = [
            'image_fast', 'image_high',
            'video_fast', 'video_high',
            'image7b_fast_enhanced', 'image7b_high_enhanced',
            'video7b_fast_enhanced', 'video7b_high_enhanced'
        ]
        
        # Job configurations
        self.job_configs = {
            'image_fast': {
                'sample_steps': 25,
                'sample_guide_scale': 6.5,
                'expected_time': 25-40
            },
            'video_high': {
                'sample_steps': 50,
                'sample_guide_scale': 7.5,
                'frame_num': 83,
                'expected_time': 180-240
            }
        }
```

### **Video Generation Pipeline**
```python
def generate_video(self, prompt, config):
    """Generate video with temporal consistency"""
    frame_num = config.get('frame_num', 83)
    sample_solver = config.get('sample_solver', 'unipc')
    sample_shift = config.get('sample_shift', 5.0)
    
    # Generate video with reference frame support
    if config.get('reference_image_url'):
        video = self.generate_video_with_reference(
            prompt, 
            config['reference_image_url'],
            frame_num
        )
    else:
        video = self.generate_standard_video(prompt, frame_num)
    
    return video
```

---

## **📤 Edge Functions Architecture**

### **Queue Job Function**
```typescript
// Enhanced job submission with standardized parameters
async function handleJobSubmission(req) {
  const { jobType, metadata, projectId, videoId, imageId } = await req.json();
  
  // Parse job type for routing
  const { format, quality, isSDXL, isEnhanced } = parseJobType(jobType);
  
  // Generate negative prompt for SDXL only
  let negativePrompt = '';
  if (isSDXL) {
    negativePrompt = generateNegativePromptForSDXL(metadata.prompt);
  }
  
  // Create comprehensive metadata
  const jobMetadata = {
    ...metadata,
    model_variant: isSDXL ? 'lustify_sdxl' : 'wan_2_1_1_3b',
    queue: isSDXL ? 'sdxl_queue' : 'wan_queue',
    negative_prompt: negativePrompt,
    seed: metadata.seed,
    num_images: metadata.num_images || (isSDXL ? 1 : 1),
    reference_image_url: metadata.reference_image_url,
    reference_type: metadata.reference_type,
    reference_strength: metadata.reference_strength,
    expected_generation_time: calculateExpectedTime(format, quality, isEnhanced),
    dual_worker_routing: true,
    negative_prompt_supported: isSDXL,
    edge_function_version: '2.1.0'
  };
  
  // Create job record and queue
  const job = await createJobRecord(jobMetadata);
  await queueJob(job, isSDXL ? 'sdxl_queue' : 'wan_queue');
  
  return { success: true, job, queueLength: await getQueueLength() };
}
```

### **Job Callback Function**
```typescript
// Standardized callback processing
async function handleJobCallback(req) {
  const { job_id, status, assets, error_message, metadata } = await req.json();
  
  // Validate parameters
  if (!job_id) throw new Error('job_id is required');
  if (status === 'completed' && (!assets || assets.length === 0)) {
    throw new Error('No assets provided for completed job');
  }
  
  // Retrieve and update job
  const currentJob = await getJob(job_id);
  const updatedMetadata = mergeMetadata(currentJob.metadata, metadata);
  
  // Process assets based on job type
  const { format, quality, isSDXL, isEnhanced } = parseJobType(currentJob.job_type);
  
  if (format === 'image') {
    await handleImageCallback(currentJob, status, assets, quality, isSDXL, isEnhanced);
  } else if (format === 'video') {
    await handleVideoCallback(currentJob, status, assets, quality, isEnhanced);
  }
  
  return { success: true, message: 'Callback processed successfully' };
}
```

---

## **🗄️ Database Schema**

### **Jobs Table**
```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  job_type TEXT NOT NULL,
  format TEXT NOT NULL,
  quality TEXT NOT NULL,
  model_type TEXT NOT NULL,
  status TEXT DEFAULT 'queued',
  metadata JSONB DEFAULT '{}',
  project_id UUID REFERENCES projects(id),
  video_id UUID REFERENCES videos(id),
  image_id UUID REFERENCES images(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Enhanced metadata structure
metadata JSONB {
  "model_variant": "lustify_sdxl" | "wan_2_1_1_3b",
  "queue": "sdxl_queue" | "wan_queue",
  "negative_prompt": "string",  -- SDXL only
  "negative_prompt_generation_error": "string",
  "seed": 123456789,
  "num_images": 1 | 3 | 6,
  "reference_image_url": "string",
  "reference_type": "style" | "composition" | "character",
  "reference_strength": 0.1-1.0,
  "generation_time": 15.5,
  "expected_generation_time": 25-240,
  "dual_worker_routing": true,
  "negative_prompt_supported": true | false,
  "edge_function_version": "2.1.0",
  "prompt_length": 150,
  "prompt_word_count": 25,
  "generation_timestamp": "2025-07-16T...",
  "sample_steps": 25 | 50,
  "sample_guide_scale": 6.5 | 7.5,
  "sample_solver": "unipc",
  "sample_shift": 5.0,
  "batch_count": 1,
  "content_type": "image" | "video",
  "file_extension": "png" | "mp4"
}
```

### **Images Table**
```sql
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  prompt TEXT NOT NULL,
  title TEXT,
  image_url TEXT,
  thumbnail_url TEXT,
  status TEXT DEFAULT 'queued',
  quality TEXT,
  format TEXT DEFAULT 'png',
  generation_mode TEXT DEFAULT 'standalone',
  job_id UUID REFERENCES jobs(id),
  image_index INTEGER DEFAULT 0,  -- For multi-image batches
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enhanced metadata for multi-image support
metadata JSONB {
  "model_type": "sdxl" | "wan" | "enhanced-7b",
  "is_sdxl": true | false,
  "is_enhanced": true | false,
  "seed": 123456789,
  "generation_time": 15.5,
  "image_index": 0,  -- For multi-image batches
  "total_images": 3,
  "original_job_id": "uuid",
  "callback_processed_at": "2025-07-16T...",
  "negative_prompt": "string",  -- SDXL only
  "job_type": "string",
  "callback_debug": {
    "job_type": "sdxl_image_fast",
    "primary_asset": "url",
    "received_assets": ["url1", "url2", "url3"],
    "processing_timestamp": "2025-07-16T..."
  }
}
```

### **Videos Table**
```sql
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  prompt TEXT NOT NULL,
  title TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  signed_url TEXT,
  signed_url_expires_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'queued',
  quality TEXT,
  format TEXT DEFAULT 'mp4',
  generation_mode TEXT DEFAULT 'standalone',
  job_id UUID REFERENCES jobs(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enhanced metadata for video jobs
metadata JSONB {
  "model_type": "wan" | "enhanced-7b",
  "is_enhanced": true | false,
  "seed": 123456789,
  "generation_time": 180.5,
  "stored_path": "exact/path/from/worker",
  "bucket": "video_fast" | "video_high" | "video7b_fast_enhanced" | "video7b_high_enhanced",
  "path_consistency_fixed": true,
  "callback_processed_at": "2025-07-16T...",
  "thumbnail_placeholder": true,
  "prompt": "string"
}
```

---

## **🛠️ Storage Architecture**

### **Storage Buckets**
```
Storage/
├── sdxl_image_fast/          # Fast SDXL images
├── sdxl_image_high/          # High quality SDXL images
├── image_fast/               # Fast WAN images
├── image_high/               # High quality WAN images
├── video_fast/               # Fast WAN videos
├── video_high/               # High quality WAN videos
├── image7b_fast_enhanced/    # Enhanced fast images
├── image7b_high_enhanced/    # Enhanced high quality images
├── video7b_fast_enhanced/    # Enhanced fast videos
├── video7b_high_enhanced/    # Enhanced high quality videos
├── reference_images/         # User reference images
└── workspace_assets/         # Workspace assets
```

### **File Organization**
```
Bucket Structure:
├── {user_id}/
│   ├── {job_id}_0.png        # First image in batch
│   ├── {job_id}_1.png        # Second image in batch
│   ├── {job_id}_2.png        # Third image in batch
│   └── {job_id}.mp4          # Video files
```

---

## **🔧 Error Handling Architecture**

### **Comprehensive Error Tracking**
```typescript
// Enhanced error logging with context
interface ErrorContext {
  job_id: string;
  user_id: string;
  job_type: string;
  error_type: string;
  error_message: string;
  stack_trace: string;
  timestamp: string;
  worker_version: string;
  metadata: Record<string, any>;
}

// Error handling in edge functions
try {
  await processJob(jobData);
} catch (error) {
  const errorContext: ErrorContext = {
    job_id: jobData.id,
    user_id: jobData.user_id,
    job_type: jobData.type,
    error_type: error.constructor.name,
    error_message: error.message,
    stack_trace: error.stack,
    timestamp: new Date().toISOString(),
    worker_version: '2.1.0',
    metadata: jobData.metadata
  };
  
  await logError(errorContext);
  await sendErrorCallback(jobData.id, error.message);
}
```

### **Worker Error Recovery**
```python
# Worker error handling
try:
    result = generate_content(prompt, config)
except torch.cuda.OutOfMemoryError:
    # Handle VRAM issues
    cleanup_gpu_memory()
    retry_generation(prompt, config)
except ValueError as e:
    # Handle parameter errors
    log_parameter_error(e)
    send_error_callback(job_id, str(e))
except Exception as e:
    # Handle unexpected errors
    log_unexpected_error(e)
    send_error_callback(job_id, f"Generation failed: {str(e)}")
```

---

## **📊 Performance Monitoring**

### **Generation Time Tracking**
```typescript
// Performance monitoring in edge functions
interface PerformanceMetrics {
  job_id: string;
  job_type: string;
  expected_time: number;
  actual_time: number;
  performance_ratio: number;
  vram_used_gb: number;
  vram_total_gb: number;
  vram_utilization: number;
  timestamp: string;
}

// Track performance in callbacks
const performanceMetrics: PerformanceMetrics = {
  job_id: job_id,
  job_type: job_type,
  expected_time: metadata.expected_generation_time,
  actual_time: metadata.generation_time,
  performance_ratio: metadata.generation_time / metadata.expected_generation_time,
  vram_used_gb: metadata.vram_used_gb,
  vram_total_gb: metadata.vram_total_gb,
  vram_utilization: metadata.vram_utilization,
  timestamp: new Date().toISOString()
};

await logPerformanceMetrics(performanceMetrics);
```

### **Queue Monitoring**
```typescript
// Queue health monitoring
interface QueueMetrics {
  queue_name: string;
  queue_length: number;
  average_wait_time: number;
  jobs_per_hour: number;
  error_rate: number;
  timestamp: string;
}

// Monitor queue health
const queueMetrics: QueueMetrics = {
  queue_name: queueName,
  queue_length: await getQueueLength(queueName),
  average_wait_time: await calculateAverageWaitTime(queueName),
  jobs_per_hour: await getJobsPerHour(queueName),
  error_rate: await getErrorRate(queueName),
  timestamp: new Date().toISOString()
};

await logQueueMetrics(queueMetrics);
```

---

## **🚀 Recent Updates (July 16, 2025)**

### **Major Enhancements**
1. **Standardized Callback Parameters**: Consistent `job_id`, `assets` array across all workers
2. **Enhanced Negative Prompts**: Intelligent generation for SDXL with multi-party scene detection
3. **Seed Support**: User-controlled seeds for reproducible generation
4. **Flexible SDXL Quantities**: User-selectable 1, 3, or 6 images per batch
5. **Reference Image Support**: Optional image-to-image with type and strength control
6. **Comprehensive Error Handling**: Enhanced debugging and error tracking
7. **Metadata Consistency**: Improved data flow and storage
8. **Path Consistency Fix**: Fixed video path handling for WAN workers

### **Performance Improvements**
- Optimized batch processing for multi-image SDXL jobs
- Enhanced error recovery and retry mechanisms
- Improved Redis queue management
- Better resource utilization tracking

### **Developer Experience**
- Enhanced API documentation and examples
- Comprehensive debugging information
- Backward compatibility preservation
- Clear error messages and status codes

### **Backward Compatibility**
- All existing job types remain functional
- Legacy metadata fields are preserved
- Single-reference workflows continue to work
- Non-reference generation unchanged

---

## **🔮 Future Architecture Plans**

### **Phase 2 Enhancements**
- **Advanced Reference System**: Multiple reference images per job
- **Style Transfer**: Advanced style application techniques
- **Batch Processing**: Enhanced multi-job processing
- **Real-time Collaboration**: Multi-user workspace features

### **Phase 3 Enhancements**
- **Model Fine-tuning**: Custom model training capabilities
- **Advanced Analytics**: Comprehensive usage and performance analytics
- **API Rate Limiting**: Sophisticated rate limiting and quota management
- **Enterprise Features**: Team management and collaboration tools

---

## **📋 Current Status**

### **✅ Production Ready**
- All 10 job types operational
- Multi-reference system live
- Flexible SDXL quantities active
- Enhanced negative prompts implemented
- Standardized callback system active
- Comprehensive error handling active

### **🔄 In Development**
- Advanced reference workflows
- Enhanced analytics dashboard
- Performance optimization
- Additional model support

### **📈 Performance Metrics**
- **SDXL Performance**: 1 image: 3-8s, 3 images: 9-24s, 6 images: 18-48s
- **WAN Performance**: Images: 25-100s, Videos: 135-240s
- **Enhanced WAN**: Images: 85-240s, Videos: 195-240s
- **System Uptime**: 99.9% availability
- **Error Rate**: <0.1% job failures

---

## **🔄 Job Standardization Architecture**

### **SDXL & WAN Job Standardization: Design & Implementation**

#### **Background**
- **SDXL Jobs:** Generate multiple images per job (batch), previously handled with a placeholder record and array of image URLs.
- **WAN Jobs:** Generate a single video or image per job, handled with a single record updated on completion.

#### **Key Goals**
- Consistency across all job types
- Elimination of orphaned/placeholder records
- Simpler, more reliable real-time updates for workspace and library
- Maintainability and scalability

### **Standardized Approach: Record-Per-Asset Pattern**

#### **SDXL Jobs (Multi-Image)**
- **At job submission**: Create N image records (one per image) with status `queued` and `image_index` (0, 1, 2, ...)
- **On completion**: Update each record with its image URL and set status to `completed`
- **Benefits**: Consistent event handling, no orphans, deterministic mapping

#### **WAN Jobs (Single File)**
- **Continue creating/updating**: A single record per job
- **Consistent pattern**: Same UPDATE event handling as SDXL

### **Implementation Details**

#### **Phase 1: Add `image_index` Column**
```sql
-- Migration: Add nullable `image_index` to `images` table
ALTER TABLE images ADD COLUMN image_index INTEGER;

-- Used for deterministic mapping in SDXL jobs
-- No impact on WAN jobs (remains NULL)
```

#### **Phase 2: Update GenerationService for N-Record Creation**
```typescript
// File: src/lib/services/GenerationService.ts
// For SDXL jobs, create N image records with `image_index` 0..N-1
for (let i = 0; i < numImages; i++) {
  const image = await imageAPI.create({
    user_id: user.id,
    project_id: request.projectId,
    prompt: request.prompt,
    status: 'queued',
    image_index: i,  // Key: Each image gets unique index
    job_id: jobId,   // Key: Direct job_id assignment
    metadata: {
      model_type: 'sdxl',
      is_sdxl: true,
      bucket: config.bucket,
      job_format: request.format
    }
  });
}
```

#### **Phase 3: Update Job Callback for UPDATE Pattern**
```typescript
// File: supabase/functions/job-callback/index.ts
// Simplified UPDATE strategy (no INSERTs)
for (let i = 0; i < assets.length; i++) {
  const imageUrl = assets[i];
  
  const { data: updatedImage, error: updateError } = await supabase
    .from('images')
    .update({
      title: title,
      image_url: imageUrl,      // Set the actual URL
      status: 'completed',      // Mark as completed
      metadata: {
        ...jobMetadata,
        image_index: i,
        total_images: assets.length
      }
    })
    .eq('job_id', job.id)      // Match by job_id
    .eq('image_index', i)      // Match by image_index
    .select()
    .single();
}
```

#### **Phase 4: Simplify Frontend Event Handling**
```typescript
// Files: useRealtimeWorkspace.ts, useWorkspace.ts, useAssets.ts
// Remove INSERT event listeners for images
// Listen only for UPDATE events (status = 'completed')
// Workspace and library update in real time for both SDXL and WAN jobs

// Batched update processor with debouncing
const processBatchedUpdates = () => {
  if (pendingBatchUpdatesRef.current.size > 0) {
    const batchIds = Array.from(pendingBatchUpdatesRef.current);
    
    setWorkspaceFilter(prev => {
      const newFilter = new Set(prev);
      batchIds.forEach(id => newFilter.add(id));
      return newFilter;
    });
    
    // Single query invalidation for all batched items
    queryClient.invalidateQueries(['workspace', 'assets']);
  }
};
```

### **Benefits of Standardized Approach**

#### **Consistency**
- **Predictable Event Handling**: UPDATE for all completions
- **Deterministic Mapping**: Via `image_index` for SDXL jobs
- **Unified Frontend Logic**: Same event handling for all job types

#### **Reliability**
- **No Orphaned Records**: Eliminates placeholder records
- **No Race Conditions**: Deterministic asset mapping
- **Simplified Debugging**: Clear relationship between jobs and assets

#### **Performance**
- **Efficient Updates**: Direct record updates instead of INSERT/DELETE cycles
- **Reduced Database Load**: Fewer operations per job completion
- **Better Caching**: Consistent record IDs for frontend caching

### **Database Schema Updates**

#### **Enhanced Images Table**
```sql
-- Enhanced images table with image_index support
CREATE TABLE images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    image_index INTEGER,  -- NEW: For SDXL multi-image jobs
    title TEXT,
    image_url TEXT,
    status TEXT DEFAULT 'queued',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient callback updates
CREATE INDEX idx_images_job_index ON images(job_id, image_index);
```

#### **Migration Strategy**
```sql
-- Phase 1: Add image_index column
ALTER TABLE images ADD COLUMN image_index INTEGER;

-- Phase 2: Clean up orphaned records (if any)
DELETE FROM images WHERE job_id IS NULL AND status = 'queued';

-- Phase 3: Add index for performance
CREATE INDEX idx_images_job_index ON images(job_id, image_index);
```

### **Frontend Integration**

#### **Real-time Updates**
```typescript
// Simplified real-time subscription
useEffect(() => {
  const subscription = supabase
    .channel('workspace-updates')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'images',
      filter: `status=eq.completed`
    }, handleImageUpdate)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'videos',
      filter: `status=eq.completed`
    }, handleVideoUpdate)
    .subscribe();
    
  return () => subscription.unsubscribe();
}, []);
```

#### **Workspace Auto-Population**
```typescript
// Batched update processor for SDXL multi-image jobs
const handleImageUpdate = (payload: any) => {
  const { new: image } = payload;
  
  // Add to pending batch updates
  pendingBatchUpdatesRef.current.add(image.id);
  
  // Debounce batch processing
  if (batchTimeoutRef.current) {
    clearTimeout(batchTimeoutRef.current);
  }
  
  batchTimeoutRef.current = setTimeout(() => {
    processBatchedUpdates();
  }, 100);
};
```

### **Testing & Validation**

#### **SDXL Multi-Image Testing**
```typescript
// Test SDXL job with 6 images
const testSDXLJob = async () => {
  const job = await submitJob({
    type: 'sdxl_image_high',
    prompt: 'test prompt',
    num_images: 6
  });
  
  // Verify 6 image records created
  const images = await getImagesByJobId(job.id);
  expect(images).toHaveLength(6);
  expect(images[0].image_index).toBe(0);
  expect(images[5].image_index).toBe(5);
  
  // Verify all records updated on completion
  await simulateJobCompletion(job.id, 6);
  const completedImages = await getImagesByJobId(job.id);
  expect(completedImages.every(img => img.status === 'completed')).toBe(true);
};
```

#### **WAN Single-File Testing**
```typescript
// Test WAN video job
const testWANJob = async () => {
  const job = await submitJob({
    type: 'video_fast',
    prompt: 'test video prompt'
  });
  
  // Verify single video record created
  const videos = await getVideosByJobId(job.id);
  expect(videos).toHaveLength(1);
  
  // Verify record updated on completion
  await simulateJobCompletion(job.id, 1);
  const completedVideos = await getVideosByJobId(job.id);
  expect(completedVideos[0].status).toBe('completed');
};
```

This standardized approach ensures consistent, reliable, and maintainable job handling across all OurVidz job types while providing optimal performance and user experience. 