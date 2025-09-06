# OurVidz Edge Functions - Complete Implementation Reference

**Last Updated:** July 27, 2025  
**Status:** ✅ Production Ready - Hybrid Enhancement System Active, ContentCompliantEnhancementOrchestrator Live

---

## **🚀 Edge Functions Overview**

OurVidz uses three core edge functions for job management and enhancement:

1. **`queue-job`** - Job submission and queue management
2. **`job-callback`** - Worker callback processing and status updates
3. **`enhance-prompt`** - AI-powered prompt enhancement with ContentCompliantEnhancementOrchestrator

All functions have been updated with the hybrid enhancement system, standardized parameters, enhanced error handling, and comprehensive metadata management.

---

## **🎯 Enhanced Prompt Function (`/functions/v1/enhance-prompt`)**

### **Purpose**
AI-powered prompt enhancement using the ContentCompliantEnhancementOrchestrator with system prompts, intelligent worker selection, and comprehensive analytics.

### **Key Features (July 27, 2025)**
- **ContentCompliantEnhancementOrchestrator**: AI-powered enhancement with system prompts
- **System Prompt Templates**: 4 specialized prompts for different model/quality combinations
- **Intelligent Worker Selection**: Routes to chat vs WAN workers based on job type
- **Critical Token Management**: Fixed SDXL compression (77-token CLIP encoder limit)
- **Quality Preservation**: Intelligent compression preserving visual quality terms
- **Comprehensive Analytics**: Full enhancement tracking and quality validation
- **Multi-Tier Fallback**: Robust error handling with graceful degradation

### **System Prompt Templates**

#### **SDXL_FAST (75 tokens)**
```typescript
"Enhance this prompt for SDXL fast generation (15 steps). Focus on visual clarity, composition, and immediate visual impact. Keep the core concept but add cinematic lighting, professional photography terms, and visual appeal. Target: 75 tokens max."
```

#### **SDXL_HIGH (75 tokens)**
```typescript
"Enhance this prompt for SDXL high-quality generation (25 steps). Focus on professional quality, artistic excellence, and detailed visual elements. Add masterful composition, professional photography terms, and artistic direction. Target: 75 tokens max."
```

#### **WAN_FAST (175 tokens)**
```typescript
"Enhance this prompt for WAN fast video generation. Focus on motion, temporal consistency, and cinematic flow. Add dynamic movement, camera techniques, and visual storytelling elements. Emphasize smooth transitions and engaging visual sequences. Target: 175 tokens max."
```

#### **WAN_HIGH_7B (250 tokens)**
```typescript
"Enhance this prompt for WAN high-quality video generation with 7B enhancement. Focus on cinematic quality, artistic excellence, and sophisticated visual storytelling. Add masterful cinematography, professional film techniques, and artistic direction. Emphasize visual coherence and temporal consistency. Target: 250 tokens max."
```

### **Request Parameters**

#### **Required Parameters**
```typescript
{
  prompt: string,
  jobType: 'sdxl_image_fast' | 'sdxl_image_high' | 'image_fast' | 'image_high' | 
           'video_fast' | 'video_high' | 'image7b_fast_enhanced' | 'image7b_high_enhanced' | 
           'video7b_fast_enhanced' | 'video7b_high_enhanced',
  userId: string
}
```

#### **Optional Parameters**
```typescript
{
  sessionId?: string,  // For conversation tracking
  quality?: 'fast' | 'high',  // Override quality detection
  model?: 'sdxl' | 'wan' | 'auto'  // Override model selection
}
```

### **Response Format**
```typescript
{
  success: boolean,
  enhancedPrompt: string,
  originalPrompt: string,
  compressionRatio: number,
  qualityScore: number,
  tokenCount: {
    original: number,
    enhanced: number,
    compressed: number
  },
  analytics: {
    enhancementMethod: 'chat_worker' | 'wan_worker' | 'system_prompt',
    processingTime: number,
    fallbackUsed: boolean,
    qualityMetrics: {
      coherence: number,
      visualAppeal: number,
      technicalQuality: number
    }
  }
}
```

### **Orchestrator Architecture**

#### **ContentCompliantEnhancementOrchestrator Class**
```typescript
class ContentCompliantEnhancementOrchestrator {
  // Model-specific system prompts
  private getSystemPromptTemplate(context) { /* 4 specialized prompts */ }
  
  // Intelligent worker selection
  private selectOptimalWorker(context) { /* Chat vs WAN routing */ }
  
  // Critical token management
  private postProcessEnhancement(enhanced, context) { /* Fixed compression */ }
  
  // Smart compression preserving quality
  private intelligentCompress(prompt, target, strategies) { /* Visual quality preservation */ }
}
```

---

## **📤 Queue Job Function (`/functions/v1/queue-job`)**

### **Purpose**
Submit generation jobs to the appropriate worker queue with enhanced parameter validation and metadata management.

### **Key Features (July 16, 2025)**
- **Standardized Parameters**: Consistent job structure across all job types
- **Enhanced Negative Prompts**: Automatic generation for SDXL jobs with intelligent scene detection
- **Seed Support**: User-controlled seeds for reproducible generation
- **Flexible Quantities**: SDXL jobs support 1, 3, or 6 images per batch
- **Reference Image Support**: Optional image-to-image generation with type and strength control
- **Dual Worker Routing**: Automatic queue selection (SDXL vs WAN)
- **Comprehensive Error Handling**: Enhanced validation and debugging

### **Request Parameters**

#### **Required Parameters**
```typescript
{
  jobType: 'sdxl_image_fast' | 'sdxl_image_high' | 'image_fast' | 'image_high' | 
           'video_fast' | 'video_high' | 'image7b_fast_enhanced' | 'image7b_high_enhanced' | 
           'video7b_fast_enhanced' | 'video7b_high_enhanced',
  metadata: {
    prompt: string,
    num_images?: 1 | 3 | 6,  // SDXL only - flexible quantities
    seed?: number,           // Optional - for reproducible generation
    reference_image_url?: string,  // Optional - for image-to-image
    reference_type?: 'style' | 'composition' | 'character',  // Optional
    reference_strength?: number,  // Optional - 0.1-1.0
    credits?: number
  }
}
```

#### **Optional Parameters**
```typescript
{
  projectId?: string,  // UUID - for project-based generation
  videoId?: string,    // UUID - for video jobs
  imageId?: string     // UUID - for image jobs
}
```

### **Job Type Parsing Logic**

#### **SDXL Jobs**
```typescript
// Pattern: sdxl_image_fast, sdxl_image_high
const isSDXL = jobType.startsWith('sdxl_');
const parts = jobType.split('_');
const format = parts[1];  // 'image'
const quality = parts[2]; // 'fast' or 'high'
```

#### **Enhanced WAN Jobs**
```typescript
// Pattern: image7b_fast_enhanced, video7b_high_enhanced
const isEnhanced = jobType.includes('enhanced');
if (jobType.startsWith('image7b_')) {
  format = 'image';
  quality = jobType.includes('_fast_') ? 'fast' : 'high';
} else if (jobType.startsWith('video7b_')) {
  format = 'video';
  quality = jobType.includes('_fast_') ? 'fast' : 'high';
}
```

#### **Standard WAN Jobs**
```typescript
// Pattern: image_fast, image_high, video_fast, video_high
const parts = jobType.split('_');
const format = parts[0];  // 'image' or 'video'
const quality = parts[1]; // 'fast' or 'high'
```

### **Enhanced Negative Prompt Generation (SDXL Only)**

#### **Priority System**
```typescript
function generateNegativePromptForSDXL(userPrompt: string): string {
  // Priority 1: Critical Quality (Always Included)
  const criticalNegatives = [
    "bad anatomy", "extra limbs", "deformed", "missing limbs",
    "worst quality", "low quality", "normal quality", "lowres"
  ];

  // Priority 2: Anatomical Accuracy (Always Included)
  const anatomicalNegatives = [
    "deformed hands", "extra fingers", "deformed face", "malformed",
    "bad hands", "bad fingers", "missing fingers", "distorted features"
  ];

  // Priority 3: Technical Artifacts (High Priority)
  const artifactNegatives = [
    "text", "watermark", "logo", "signature", "contact info",
    "username", "artist name", "title", "caption"
  ];

  // Priority 4: Style Prevention (Medium Priority)
  const styleNegatives = [
    "anime", "cartoon", "graphic", "render", "cgi", "3d",
    "painting", "drawing", "illustration", "sketch"
  ];

  // Priority 5: NSFW-Specific (Conditional)
  const nsfwNegatives = ["child", "minor"];

  // Priority 6: Multi-Party Scene Prevention (Critical for group scenes)
  const multiPartyNegatives = [
    "three girls", "all girls", "only girls", "no male", "missing male",
    "disembodied penis", "floating penis", "detached penis",
    "penis not attached", "wrong gender ratio", "incorrect participants",
    "wrong number of people"
  ];

  // Priority 7: Position and Action Accuracy (Critical for explicit scenes)
  const positionNegatives = [
    "wrong position", "incorrect pose", "impossible position",
    "unnatural pose", "penis in wrong place", "anatomical mismatch",
    "position confusion", "wrong body parts", "misplaced anatomy",
    "anatomical errors"
  ];

  // Priority 8: NSFW Anatomical Improvements (Conditional)
  const nsfwAnatomicalNegatives = [
    "deformed breasts", "extra breasts", "anatomical errors",
    "wrong anatomy", "distorted bodies", "unnatural poses"
  ];

  // Build SDXL negative prompt with priority system
  let sdxlNegatives = [
    ...criticalNegatives,
    ...anatomicalNegatives,
    ...artifactNegatives.slice(0, 4),
    ...styleNegatives.slice(0, 3),
    ...nsfwNegatives
  ];

  // Enhanced multi-party prevention for group scenes
  const promptLower = userPrompt.toLowerCase();
  const hasMultiplePeople = promptLower.includes('two') || promptLower.includes('both') || 
                           promptLower.includes('sisters') || promptLower.includes('girls');
  const hasFemales = promptLower.includes('girl') || promptLower.includes('woman') || 
                    promptLower.includes('sister') || promptLower.includes('female');
  const hasMales = promptLower.includes('guy') || promptLower.includes('man') || 
                  promptLower.includes('male') || promptLower.includes('boy');

  if (hasMultiplePeople && hasFemales && hasMales) {
    sdxlNegatives.push(...multiPartyNegatives.slice(0, 6));
  } else if (hasMultiplePeople && hasFemales && !hasMales) {
    sdxlNegatives.push("three girls", "all girls", "only girls", "wrong number of people");
  }

  // Add position accuracy for explicit scenes
  if (promptLower.includes('sex') || promptLower.includes('oral') || 
      promptLower.includes('doggy') || promptLower.includes('sucking')) {
    sdxlNegatives.push(...positionNegatives.slice(0, 5));
  }

  // Add NSFW anatomical improvements if applicable
  if (promptLower.includes('naked') || promptLower.includes('nude') || 
      promptLower.includes('sex') || promptLower.includes('topless')) {
    sdxlNegatives.push(...nsfwAnatomicalNegatives.slice(0, 4));
  }

  return sdxlNegatives.join(", ");
}
```

### **Queue Routing Logic**

#### **SDXL Jobs**
```typescript
const queueName = 'sdxl_queue';
const modelVariant = 'lustify_sdxl';
```

#### **WAN Jobs (Standard & Enhanced)**
```typescript
const queueName = 'wan_queue';
const modelVariant = 'wan_2_1_1_3b';
```

### **Job Metadata Structure**

#### **Comprehensive Metadata**
```typescript
const jobMetadata = {
  ...metadata,
  model_variant: modelVariant,
  queue: queueName,
  dual_worker_routing: true,
  negative_prompt_supported: isSDXL,
  
  // SDXL-specific fields
  ...isSDXL && {
    negative_prompt: negativePrompt,
    negative_prompt_generation_error: negativePromptError
  },
  
  // Enhanced tracking fields
  prompt_length: prompt.length,
  prompt_word_count: prompt.split(' ').length,
  generation_timestamp: new Date().toISOString(),
  edge_function_version: '2.1.0',
  
  // Performance tracking
  expected_generation_time: isEnhanced ? 
    format === 'video' ? quality === 'high' ? 240 : 195 : 
    quality === 'high' ? 100 : 85 : 
    format === 'video' ? quality === 'high' ? 180 : 135 : 
    quality === 'high' ? 40 : 25,
  
  // Quality settings
  sample_steps: quality === 'high' ? 50 : 25,
  sample_guide_scale: quality === 'high' ? 7.5 : 6.5,
  sample_solver: 'euler',  // Fixed: Changed from 'unipc' to avoid CUDA solver errors
  sample_shift: 5.0,
  
  // User-controlled batch settings
  num_images: metadata?.num_images || (isSDXL ? 1 : 1),
  batch_count: metadata?.batch_count || 1,
  
  // Content type tracking
  content_type: format,
  file_extension: format === 'video' ? 'mp4' : 'png',
  
  // User context
  user_id: user.id,
  project_id: projectId,
  video_id: videoId,
  image_id: imageId,
  character_id: characterId
};
```

### **Worker Payload Structure**

#### **SDXL Payload**
```typescript
const jobPayload = {
  id: job.id,
  type: jobType,
  prompt: prompt,
  config: {
    size: '480*832',
    sample_steps: quality === 'high' ? 50 : 25,
    sample_guide_scale: quality === 'high' ? 7.5 : 6.5,
    sample_solver: 'euler',  // Fixed: Changed from 'unipc' to avoid CUDA solver errors
    sample_shift: 5.0,
    frame_num: format === 'video' ? 83 : 1,
    enhance_prompt: isEnhanced,
    ...metadata?.seed && { seed: metadata.seed },
    expected_time: expectedGenerationTime,
    content_type: format,
    file_extension: format === 'video' ? 'mp4' : 'png',
    num_images: metadata?.num_images || 1
  },
  user_id: user.id,
  created_at: new Date().toISOString(),
  ...isSDXL && { negative_prompt: negativePrompt },
  video_id: videoId,
  image_id: imageId,
  character_id: characterId,
  model_variant: modelVariant,
  bucket: metadata?.bucket || (isSDXL ? `sdxl_image_${quality}` : 
                               isEnhanced ? `${format}7b_${quality}_enhanced` : 
                               `${format}_${quality}`),
  metadata: jobMetadata
};
```

### **Response Structure**

#### **Success Response**
```typescript
{
  success: true,
  job: {
    id: string,
    user_id: string,
    job_type: string,
    format: 'image' | 'video',
    quality: 'fast' | 'high',
    model_type: string,
    status: 'queued',
    metadata: jobMetadata
  },
  queueLength: number,
  modelVariant: string,
  jobType: string,
  queue: string,
  isSDXL: boolean,
  negativePromptSupported: boolean,
  fixes_applied: string[],
  debug: {
    userId: string,
    hasPrompt: boolean,
    promptLength: number,
    promptWordCount: number,
    hasNegativePrompt: boolean,
    negativePromptLength: number,
    negativePromptWordCount: number,
    negativePromptError: string | null,
    redisConfigured: boolean,
    metadataFields: number,
    timestamp: string
  }
}
```

---

## **📥 Job Callback Function (`/functions/v1/job-callback`)**

### **Purpose**
Process worker callbacks with standardized parameters and comprehensive metadata management.

### **Key Features (July 16, 2025)**
- **Standardized Parameters**: Consistent `job_id`, `assets` array across all workers
- **Metadata Preservation**: Merges worker metadata with existing job metadata
- **Enhanced Error Handling**: Comprehensive debugging and error tracking
- **Multi-Asset Support**: Handles multiple images/videos per job
- **Seed Tracking**: Stores and preserves generation seeds for reproducibility
- **Path Consistency**: Fixed video path handling for WAN workers

### **Request Parameters (Standardized)**

#### **Required Parameters**
```typescript
{
  job_id: string,           // UUID - job identifier
  status: 'processing' | 'completed' | 'failed',
  assets: string[],         // Array of asset URLs - standardized format
  error_message?: string,   // Optional - for failed jobs
  enhancedPrompt?: string,  // Optional - for image_high jobs
  metadata?: {              // Optional - worker metadata
    seed?: number,          // Worker-generated seed
    generation_time?: number, // Actual generation time
    num_images?: number     // Number of images generated
  }
}
```

### **Callback Processing Flow**

#### **1. Parameter Validation**
```typescript
// Validate critical parameters with standardized naming
if (!job_id) {
  throw new Error('job_id is required');
}

if (!primaryAsset && status === 'completed') {
  console.error('❌ CRITICAL: No assets provided for completed job');
}
```

#### **2. Job Retrieval**
```typescript
const { data: currentJob, error: fetchError } = await supabase
  .from('jobs')
  .select('metadata, job_type, image_id, video_id, format, quality, model_type, user_id')
  .eq('id', job_id)
  .single();
```

#### **3. Metadata Merging**
```typescript
let updatedMetadata = currentJob.metadata || {};

// Extract worker metadata from requestBody.metadata
const workerMetadata = requestBody.metadata || {};

if (workerMetadata.seed) {
  updatedMetadata.seed = workerMetadata.seed;
}

if (workerMetadata.generation_time) {
  updatedMetadata.generation_time = workerMetadata.generation_time;
}

if (workerMetadata.num_images) {
  updatedMetadata.num_images = workerMetadata.num_images;
}

// Handle enhanced prompt for image_high jobs
if (currentJob.job_type === 'image_high' && enhancedPrompt) {
  updatedMetadata.enhanced_prompt = enhancedPrompt;
}
```

#### **4. Asset Processing**
```typescript
if (status === 'completed' && primaryAsset) {
  updatedMetadata.primary_asset = primaryAsset;
  updatedMetadata.all_assets = assets;
  updatedMetadata.callback_processed_at = new Date().toISOString();
  updatedMetadata.callback_debug = {
    received_assets: assets,
    primary_asset: primaryAsset,
    job_type: currentJob.job_type,
    processing_timestamp: new Date().toISOString()
  };
}
```

### **Job Type Parsing (Enhanced)**

#### **SDXL Jobs**
```typescript
if (job.job_type.startsWith('sdxl_')) {
  isSDXL = true;
  const parts = job.job_type.replace('sdxl_', '').split('_');
  format = parts[0]; // 'image'
  quality = parts[1]; // 'fast' or 'high'
}
```

#### **Enhanced WAN Jobs**
```typescript
else if (job.job_type.includes('enhanced')) {
  isEnhanced = true;
  if (job.job_type.startsWith('video7b_')) {
    format = 'video';
    quality = job.job_type.includes('_fast_') ? 'fast' : 'high';
  } else if (job.job_type.startsWith('image7b_')) {
    format = 'image';
    quality = job.job_type.includes('_fast_') ? 'fast' : 'high';
  }
}
```

#### **Standard WAN Jobs**
```typescript
else {
  const parts = job.job_type.split('_');
  format = parts[0]; // 'image' or 'video'
  quality = parts[1]; // 'fast' or 'high'
}
```

### **Image Job Callback Handler**

#### **Completed Jobs**
```typescript
async function handleImageJobCallback(supabase, job, status, assets, error_message, quality, isSDXL, isEnhanced) {
  if (status === 'completed' && assets && assets.length > 0) {
    const jobMetadata = job.metadata || {};
    const prompt = jobMetadata.prompt || jobMetadata.original_prompt || 'Untitled Image';
    const baseTitle = prompt.length <= 60 ? prompt : prompt.substring(0, 60) + '...';

    // Update images by job_id and image_index directly
    const updatedImages = [];
    for(let i = 0; i < assets.length; i++) {
      const imageUrl = assets[i];
      const title = assets.length > 1 ? `${baseTitle} (${i + 1})` : baseTitle;

      const { data: updatedImage, error: updateError } = await supabase
        .from('images')
        .update({
          title: title,
          image_url: imageUrl,
          thumbnail_url: imageUrl,
          status: 'completed',
          metadata: {
            ...jobMetadata,
            model_type: isSDXL ? 'sdxl' : 'wan',
            is_sdxl: isSDXL,
            is_enhanced: isEnhanced,
            callback_processed_at: new Date().toISOString(),
            original_job_id: job.id,
            image_index: i,
            total_images: assets.length,
            seed: jobMetadata.seed,
            generation_time: jobMetadata.generation_time,
            negative_prompt: jobMetadata.negative_prompt,
            job_type: job.job_type,
            callback_debug: {
              job_type: job.job_type,
              primary_asset: assets[0],
              received_assets: assets,
              processing_timestamp: new Date().toISOString()
            }
          }
        })
        .eq('job_id', job.id)
        .eq('image_index', i)
        .select()
        .single();

      if (!updateError) {
        updatedImages.push(updatedImage);
      }
    }
  }
}
```

### **Video Job Callback Handler**

#### **Completed Jobs (Path Consistency Fixed)**
```typescript
async function handleVideoJobCallback(supabase, job, status, assets, error_message, quality, isEnhanced) {
  if (status === 'completed' && job.video_id && assets && assets.length > 0) {
    // Store video path exactly as returned by WAN worker - no normalization
    const videoPath = assets[0];
    
    const jobMetadata = job.metadata || {};
    const prompt = jobMetadata.prompt || jobMetadata.original_prompt || 'Untitled Video';
    const title = prompt.length <= 60 ? prompt : prompt.substring(0, 60) + '...';
    
    // Generate placeholder thumbnail URL for videos
    const placeholderThumbnailUrl = `system_assets/video-placeholder-thumbnail.png`;
    
    const updateData = {
      status: 'completed',
      title: title,
      video_url: videoPath,
      thumbnail_url: placeholderThumbnailUrl,
      signed_url: videoPath,
      signed_url_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      completed_at: new Date().toISOString(),
      metadata: {
        ...jobMetadata,
        prompt: prompt,
        callback_processed_at: new Date().toISOString(),
        stored_path: videoPath,
        thumbnail_placeholder: true,
        bucket: isEnhanced ? `video7b_${quality}_enhanced` : `video_${quality}`,
        path_consistency_fixed: true
      }
    };

    const { error: videoError } = await supabase
      .from('videos')
      .update(updateData)
      .eq('id', job.video_id);
  }
}
```

### **Response Structure**

#### **Success Response**
```typescript
{
  success: true,
  message: 'Job callback processed successfully with standardized parameters',
  debug: {
    job_id: string,
    jobStatus: string,
    jobType: string,
    format: string,
    quality: string,
    isSDXL: boolean,
    isEnhanced: boolean,
    assetsProcessed: number,
    processingTimestamp: string
  }
}
```

---

## **🔧 Error Handling & Debugging**

### **Comprehensive Error Tracking**
```typescript
// Enhanced error logging with context
console.error('❌ CRITICAL: Error in job callback function:', {
  error: error.message,
  stack: error.stack,
  timestamp: new Date().toISOString()
});
```

### **Parameter Validation**
```typescript
// Validate critical parameters with standardized naming
if (!job_id) {
  console.error('❌ CRITICAL: No job_id provided in callback');
  throw new Error('job_id is required');
}

if (!primaryAsset && status === 'completed') {
  console.error('❌ CRITICAL: No assets provided for completed job', {
    job_id,
    status,
    assets,
    assetsCount: assets ? assets.length : 0,
    primaryAsset
  });
}
```

### **Database Error Handling**
```typescript
// Enhanced database error handling
if (updateError) {
  console.error('❌ CRITICAL: Error updating job:', {
    job_id,
    error: updateError,
    updateData
  });
  throw updateError;
}
```

---

## **📊 Performance Monitoring**

### **Generation Time Tracking**
```typescript
// Store actual generation time from worker
if (workerMetadata.generation_time) {
  updatedMetadata.generation_time = workerMetadata.generation_time;
  console.log('⏱️ Storing generation time from worker:', workerMetadata.generation_time);
}
```

### **Expected vs Actual Performance**
```typescript
// Performance tracking in metadata
expected_generation_time: isEnhanced ? 
  format === 'video' ? quality === 'high' ? 240 : 195 : 
  quality === 'high' ? 100 : 85 : 
  format === 'video' ? quality === 'high' ? 180 : 135 : 
  quality === 'high' ? 40 : 25
```

---

## **🔄 Database Schema Updates**

### **Jobs Table Enhancements**
```sql
-- Enhanced metadata fields for comprehensive tracking
metadata JSONB {
  "model_variant": "lustify_sdxl" | "wan_2_1_1_3b",
  "queue": "sdxl_queue" | "wan_queue",
  "negative_prompt": "string",  -- SDXL only
  "negative_prompt_generation_error": "string",  -- Error tracking
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
  "sample_solver": "euler",  // Fixed: Changed from 'unipc' to avoid CUDA solver errors
  "sample_shift": 5.0,
  "batch_count": 1,
  "content_type": "image" | "video",
  "file_extension": "png" | "mp4",
  "user_id": "uuid",
  "project_id": "uuid",
  "video_id": "uuid",
  "image_id": "uuid",
  "character_id": "uuid"
}
```

### **Images Table Enhancements**
```sql
-- Enhanced metadata for multi-image support and debugging
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

### **Videos Table Enhancements**
```sql
-- Enhanced metadata for video jobs with path consistency
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

## **🛠️ Storage Buckets**

### **SDXL Buckets**
- `sdxl_image_fast` - Fast SDXL image generation
- `sdxl_image_high` - High quality SDXL image generation

### **WAN Buckets**
- `image_fast` - Fast WAN image generation
- `image_high` - High quality WAN image generation
- `video_fast` - Fast WAN video generation
- `video_high` - High quality WAN video generation

### **Enhanced WAN Buckets**
- `image7b_fast_enhanced` - Enhanced fast image generation
- `image7b_high_enhanced` - Enhanced high quality image generation
- `video7b_fast_enhanced` - Enhanced fast video generation
- `video7b_high_enhanced` - Enhanced high quality video generation

### **Reference Image Buckets**
- `reference_images` - User-uploaded reference images
- `workspace_assets` - Workspace reference assets

---

## **📈 Usage Tracking**

### **Usage Logs Table**
```sql
-- Enhanced usage tracking with comprehensive metadata
metadata JSONB {
  "job_id": "uuid",
  "project_id": "uuid",
  "image_id": "uuid",
  "video_id": "uuid",
  "model_type": "string",
  "model_variant": "lustify_sdxl" | "wan_2_1_1_3b",
  "queue": "sdxl_queue" | "wan_queue",
  "dual_worker_routing": true,
  "negative_prompt_supported": true | false,
  "usage_timestamp": "2025-07-16T..."
}
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

## **enhance-prompt Edge Function**
- Provides rule-based and Qwen-style prompt enhancement for both backend and frontend use.
- Used by the PromptEnhancementModal in the frontend for instant prompt enhancement.

## **Multi-Reference System (SDXL Only)**
- Supports separate reference images for style, composition, and character.
- Reference images are stored in a dedicated Supabase bucket (`reference_images`).

## **Compel Integration (SDXL)**
- Present in code, not used for SDXL due to model incompatibility. Prompt library enhancement is in progress.

## **Qwen 7B Prompt Enhancement**
- Used for WAN jobs and instant enhancement in frontend modal.

## **Callback & Queue Standardization**
- All edge functions and workers use standardized callback and job queue parameters (job_id, assets array, compel metadata, etc.). 