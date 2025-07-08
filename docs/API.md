# OurVidz API Reference

**Last Updated:** July 7, 2025  
**Status:** ✅ Production Ready - All 10 Job Types Supported  
**System:** Dual Worker (SDXL + WAN) on RTX 6000 ADA (48GB VRAM)

---

## **🎯 Quick Reference**

### **Active Job Types (10 Total)**
```yaml
SDXL Jobs (2) - 6-Image Batches:
  sdxl_image_fast: 29.9s (3.1s per image) - 1024x1024 PNG
  sdxl_image_high: 42.4s (5.0s per image) - 1024x1024 PNG

WAN Standard Jobs (4) - Single Files:
  image_fast: 73s - 480x832 PNG
  image_high: 90s - 480x832 PNG  
  video_fast: 251.5s - 480x832 MP4 (5s duration)
  video_high: 359.7s - 480x832 MP4 (6s duration)

WAN Enhanced Jobs (4) - AI-Enhanced:
  image7b_fast_enhanced: 233.5s - 480x832 PNG (Qwen enhanced)
  image7b_high_enhanced: 104s - 480x832 PNG (Qwen enhanced)
  video7b_fast_enhanced: 263.9s - 480x832 MP4 (Qwen enhanced)
  video7b_high_enhanced: 370.0s - 480x832 MP4 (Qwen enhanced)
```

---

## **🚀 Job Creation API**

### **Endpoint: `POST /api/queue-job`**
**Authentication:** Required (JWT token)

### **Request Payload:**
```typescript
{
  jobType: string,           // One of 10 job types above
  metadata?: {
    prompt?: string,         // User input prompt
    credits?: number,        // Credits consumed (default: 1)
    bucket?: string          // Storage bucket (auto-detected)
  },
  projectId?: string,        // Optional project reference
  videoId?: string,          // Optional video ID
  imageId?: string           // Optional image ID
}
```

### **Response:**
```typescript
{
  success: boolean,
  job: {
    id: string,              // Database job ID
    user_id: string,         // User identifier
    job_type: string,        // Job type
    status: 'queued',        // Initial status
    created_at: string,      // ISO timestamp
    metadata: object         // Job metadata
  },
  message: string,           // Success message
  queueLength: number,       // Current queue depth
  modelVariant: string,      // Model being used
  isSDXL: boolean,          // SDXL vs WAN job
  negativePromptSupported: boolean  // SDXL only
}
```

### **Example Request:**
```typescript
// SDXL Fast Image Generation (6 images)
const response = await fetch('/api/queue-job', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    jobType: 'sdxl_image_fast',
    metadata: {
      prompt: 'beautiful woman in garden',
      credits: 1
    }
  })
});

// WAN Video Generation (single video)
const response = await fetch('/api/queue-job', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    jobType: 'video_fast',
    metadata: {
      prompt: 'woman walking in park',
      credits: 1
    }
  })
});
```

---

## **📊 Job Status & Monitoring**

### **Job Status Values:**
```yaml
queued: Job created, waiting in queue
processing: Job picked up by worker, generating content
completed: Job finished successfully
failed: Job failed with error
```

### **Real-time Status Updates:**
Workers automatically call back to update job status. Frontend should poll for updates:

```typescript
// Poll job status every 2-5 seconds
const checkJobStatus = async (jobId: string) => {
  const response = await fetch(`/api/jobs/${jobId}`);
  const job = await response.json();
  
  switch (job.status) {
    case 'completed':
      // Handle completion - assets available
      handleJobCompletion(job);
      break;
    case 'failed':
      // Handle failure - show error
      handleJobFailure(job);
      break;
    case 'processing':
      // Update progress UI
      updateProgressUI(job);
      break;
  }
};
```

---

## **📁 Asset Handling**

### **SDXL Jobs (6-Image Batches):**
```typescript
// SDXL returns array of 6 image URLs
const handleSDXLCompletion = (job) => {
  const imageUrls = job.metadata.all_assets; // Array of 6 URLs
  const primaryImage = job.metadata.primary_asset; // First image
  
  // Display 6 images in grid
  displayImageGrid(imageUrls);
  
  // Store in database
  await saveImagesToDatabase(imageUrls, job.id);
};
```

### **WAN Jobs (Single Files):**
```typescript
// WAN returns single file URL
const handleWANCompletion = (job) => {
  const fileUrl = job.metadata.primary_asset; // Single URL
  
  if (job.job_type.includes('video')) {
    // Handle video
    displayVideoPlayer(fileUrl);
    await saveVideoToDatabase(fileUrl, job.id);
  } else {
    // Handle image
    displayImage(fileUrl);
    await saveImageToDatabase(fileUrl, job.id);
  }
};
```

---

## **🔧 Edge Functions Implementation**

### **Queue-Job Edge Function (`queue-job.ts`)**

**Purpose**: Job creation and queue routing with standardized parameter handling  
**Authentication**: JWT verification required  
**Status**: ✅ Production Ready

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  
  try {
    console.log('🚀 Queue-job function called - STANDARDIZED: Worker callback parameter consistency');
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')
        }
      }
    });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ Authentication failed:', userError?.message);
      return new Response(JSON.stringify({
        error: 'Authentication required',
        success: false,
        details: userError?.message
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 401
      });
    }
    
    console.log('✅ User authenticated:', user.id);
    const { jobType, metadata, projectId, videoId, imageId } = await req.json();
    
    console.log('📋 Creating job with STANDARDIZED worker parameters:', {
      jobType,
      projectId,
      videoId,
      imageId,
      userId: user.id,
      queue: metadata?.queue,
      timestamp: new Date().toISOString()
    });
    
    // Enhanced job type validation
    const validJobTypes = [
      'sdxl_image_fast',
      'sdxl_image_high',
      'image_fast',
      'image_high',
      'video_fast',
      'video_high',
      'image7b_fast_enhanced',
      'image7b_high_enhanced',
      'video7b_fast_enhanced',
      'video7b_high_enhanced'
    ];
    
    if (!validJobTypes.includes(jobType)) {
      console.error('❌ Invalid job type provided:', jobType);
      console.log('✅ Valid job types:', validJobTypes);
      return new Response(JSON.stringify({
        error: `Invalid job type: ${jobType}`,
        success: false,
        validJobTypes: validJobTypes
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    
    // Robust parsing function for all job type patterns
    function parseJobType(jobType) {
      const isSDXL = jobType.startsWith('sdxl_');
      const isEnhanced = jobType.includes('enhanced');
      let format;
      let quality;
      
      if (isSDXL) {
        // SDXL patterns: sdxl_image_fast, sdxl_image_high
        const parts = jobType.split('_');
        format = parts[1]; // 'image'
        quality = parts[2]; // 'fast' or 'high'
      } else if (isEnhanced) {
        // Enhanced patterns: image7b_fast_enhanced, video7b_high_enhanced
        if (jobType.startsWith('image7b_')) {
          format = 'image';
          quality = jobType.includes('_fast_') ? 'fast' : 'high';
        } else if (jobType.startsWith('video7b_')) {
          format = 'video';
          quality = jobType.includes('_fast_') ? 'fast' : 'high';
        } else {
          // Fallback for unknown enhanced patterns
          format = jobType.includes('video') ? 'video' : 'image';
          quality = jobType.includes('fast') ? 'fast' : 'high';
        }
      } else {
        // Standard patterns: image_fast, image_high, video_fast, video_high
        const parts = jobType.split('_');
        format = parts[0]; // 'image' or 'video'
        quality = parts[1]; // 'fast' or 'high'
      }
      
      return {
        format,
        quality,
        isSDXL,
        isEnhanced
      };
    }
    
    // Extract format and quality from job type
    const { format, quality, isSDXL, isEnhanced } = parseJobType(jobType);
    const modelVariant = isSDXL ? 'lustify_sdxl' : 'wan_2_1_1_3b';
    
    // Determine queue routing - all enhanced jobs use wan_queue
    const queueName = isSDXL ? 'sdxl_queue' : 'wan_queue';
    
    // Enhanced logging with format and quality detection
    console.log('🎯 FIXED job routing determined:', {
      isSDXL,
      isEnhanced,
      queueName,
      modelVariant,
      format,
      quality,
      originalJobType: jobType,
      negativePromptSupported: isSDXL,
      parsedCorrectly: true
    });
    
    // Validate Redis configuration
    const redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
    const redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
    if (!redisUrl || !redisToken) {
      console.error('❌ Redis configuration missing:', {
        hasUrl: !!redisUrl,
        hasToken: !!redisToken
      });
      return new Response(JSON.stringify({
        error: 'Redis configuration missing',
        success: false,
        details: 'UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not configured'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    
    // Create job record with enhanced error handling
    const { data: job, error: jobError } = await supabase.from('jobs').insert({
      user_id: user.id,
      job_type: jobType,
      format: format,
      quality: quality,
      model_type: jobType,
      metadata: {
        ...metadata,
        model_variant: modelVariant,
        queue: queueName,
        dual_worker_routing: true,
        negative_prompt_supported: isSDXL,
        created_timestamp: new Date().toISOString()
      },
      project_id: projectId,
      video_id: videoId,
      image_id: imageId,
      status: 'queued'
    }).select().single();
    
    if (jobError) {
      console.error('❌ Error creating job in database:', {
        error: jobError,
        jobType,
        userId: user.id,
        format,
        quality
      });
      return new Response(JSON.stringify({
        error: 'Failed to create job record',
        success: false,
        details: jobError.message,
        jobType: jobType
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    
    console.log('✅ Job created successfully in database:', job.id);
    
    // Get project details for the prompt (if projectId provided)
    let prompt = '';
    let characterId = null;
    if (projectId) {
      const { data: project, error: projectError } = await supabase.from('projects').select('enhanced_prompt, original_prompt, character_id').eq('id', projectId).single();
      if (!projectError && project) {
        prompt = project.enhanced_prompt || project.original_prompt || '';
        characterId = project.character_id;
        console.log('📄 Project prompt retrieved:', {
          projectId,
          hasPrompt: !!prompt
        });
      } else {
        console.warn('⚠️ Could not retrieve project prompt:', projectError?.message);
      }
    }
    
    // Use prompt from metadata if no project prompt available
    if (!prompt && metadata?.prompt) {
      prompt = metadata.prompt;
      console.log('📝 Using metadata prompt');
    }
    
    // CRITICAL FIX: Only generate negative prompt for SDXL jobs
    let negativePrompt = '';
    if (isSDXL) {
      negativePrompt = generateNegativePromptForSDXL(prompt);
      console.log('🚫 Generated SDXL negative prompt:', negativePrompt);
    } else {
      console.log('🚫 WAN job detected - NO negative prompt (not supported by WAN 2.1)');
    }
    
    // Format job payload for appropriate worker
    const jobPayload = {
      id: job.id,
      type: jobType,
      prompt: prompt,
      config: {
        size: '480*832',
        sample_steps: quality === 'high' ? 50 : 25,
        sample_guide_scale: quality === 'high' ? 7.5 : 6.5,
        sample_solver: 'unipc',
        sample_shift: 5.0,
        frame_num: format === 'video' ? 83 : 1,
        enhance_prompt: isEnhanced,
        expected_time: isEnhanced ? format === 'video' ? quality === 'high' ? 240 : 195 : quality === 'high' ? 100 : 85 : format === 'video' ? quality === 'high' ? 180 : 135 : quality === 'high' ? 40 : 25,
        content_type: format,
        file_extension: format === 'video' ? 'mp4' : 'png'
      },
      user_id: user.id,
      created_at: new Date().toISOString(),
      // CRITICAL FIX: Only include negative_prompt for SDXL jobs
      ...isSDXL && {
        negative_prompt: negativePrompt
      },
      // Additional metadata
      video_id: videoId,
      image_id: imageId,
      character_id: characterId,
      model_variant: modelVariant,
      bucket: metadata?.bucket || (isSDXL ? `sdxl_image_${quality}` : isEnhanced ? `${format}7b_${quality}_enhanced` : `${format}_${quality}`),
      metadata: {
        ...metadata,
        model_variant: modelVariant,
        dual_worker_routing: true,
        negative_prompt_supported: isSDXL,
        // Only include negative_prompt in metadata for SDXL
        ...isSDXL && {
          negative_prompt: negativePrompt
        },
        num_images: isSDXL ? 6 : 1,
        queue_timestamp: new Date().toISOString()
      }
    };
    
    console.log('📤 Pushing FIXED job to Redis queue:', {
      jobId: job.id,
      jobType,
      queueName,
      isSDXL,
      hasPrompt: !!prompt,
      hasNegativePrompt: isSDXL && !!negativePrompt,
      negativePromptSupported: isSDXL,
      payloadSize: JSON.stringify(jobPayload).length
    });
    
    // Use LPUSH to add job to the appropriate queue (worker uses RPOP)
    const redisResponse = await fetch(`${redisUrl}/lpush/${queueName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${redisToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(jobPayload)
    });
    
    if (!redisResponse.ok) {
      const redisError = await redisResponse.text();
      console.error('❌ Redis push failed:', {
        status: redisResponse.status,
        statusText: redisResponse.statusText,
        error: redisError,
        queueName,
        jobId: job.id
      });
      // Update job status to failed
      await supabase.from('jobs').update({
        status: 'failed',
        error_message: `Redis queue failed: ${redisError}`
      }).eq('id', job.id);
      return new Response(JSON.stringify({
        error: `Failed to queue job in Redis: ${redisError}`,
        success: false,
        details: {
          redisStatus: redisResponse.status,
          queueName,
          jobId: job.id
        }
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    
    const redisResult = await redisResponse.json();
    console.log('✅ Job queued in Redis successfully:', {
      jobId: job.id,
      queueLength: redisResult.result || 0,
      queueName,
      negativePromptIncluded: isSDXL
    });
    
    // Log usage with enhanced dual worker tracking
    const usageLogResult = await supabase.from('usage_logs').insert({
      user_id: user.id,
      action: jobType,
      format: format,
      quality: quality,
      credits_consumed: metadata.credits || 1,
      metadata: {
        job_id: job.id,
        project_id: projectId,
        image_id: imageId,
        video_id: videoId,
        model_type: jobType,
        model_variant: modelVariant,
        queue: queueName,
        dual_worker_routing: true,
        negative_prompt_supported: isSDXL,
        usage_timestamp: new Date().toISOString()
      }
    });
    
    if (usageLogResult.error) {
      console.warn('⚠️ Usage logging failed:', usageLogResult.error);
    } else {
      console.log('📈 Usage logged successfully');
    }
    
    return new Response(JSON.stringify({
      success: true,
      job,
      message: 'Job queued successfully - FIXED: WAN negative prompt removal',
      queueLength: redisResult.result || 0,
      modelVariant: modelVariant,
      jobType: jobType,
      queue: queueName,
      isSDXL: isSDXL,
      negativePromptSupported: isSDXL,
      fixes_applied: [
        'Removed negative prompt generation for WAN jobs',
        'Simplified job payload structure',
        'Fixed parameter naming consistency',
        'Added proper WAN 2.1 configuration'
      ],
      debug: {
        userId: user.id,
        hasPrompt: !!prompt,
        hasNegativePrompt: isSDXL && !!negativePrompt,
        redisConfigured: true,
        timestamp: new Date().toISOString()
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
    
  } catch (error) {
    console.error('❌ Unhandled error in queue-job function:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    return new Response(JSON.stringify({
      error: error.message,
      success: false,
      details: 'Unhandled server error',
      timestamp: new Date().toISOString()
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});

// FIXED: Negative prompt generation - ONLY for SDXL jobs
function generateNegativePromptForSDXL(userPrompt = '') {
  console.log('🎨 Generating negative prompt for SDXL job only');
  // SDXL-optimized negative prompts (keep under 77 tokens)
  const criticalNegatives = [
    "bad anatomy",
    "extra limbs",
    "deformed",
    "missing limbs"
  ];
  const qualityNegatives = [
    "low quality",
    "bad quality",
    "worst quality",
    "blurry",
    "pixelated"
  ];
  const anatomicalNegatives = [
    "deformed hands",
    "extra fingers",
    "deformed face",
    "malformed"
  ];
  const artifactNegatives = [
    "text",
    "watermark",
    "logo",
    "signature"
  ];
  // NSFW-specific anatomical improvements for SDXL
  const nsfwNegatives = [
    "deformed breasts",
    "extra breasts",
    "anatomical errors",
    "wrong anatomy",
    "distorted bodies",
    "unnatural poses"
  ];
  // Build SDXL negative prompt (token-efficient)
  const sdxlNegatives = [
    ...criticalNegatives,
    ...qualityNegatives.slice(0, 3),
    ...anatomicalNegatives.slice(0, 4),
    ...artifactNegatives.slice(0, 3),
    "ugly",
    "poorly drawn"
  ];
  // Add NSFW negatives if applicable
  if (userPrompt.toLowerCase().includes('naked') || userPrompt.toLowerCase().includes('nude') || userPrompt.toLowerCase().includes('sex')) {
    sdxlNegatives.push(...nsfwNegatives.slice(0, 4)); // Limit for token efficiency
  }
  const result = sdxlNegatives.join(", ");
  console.log('✅ SDXL negative prompt generated:', result);
  return result;
}
```

### **Job Callback Edge Function (`job-callback.ts`)**

**Purpose**: Central callback handler for OurVidz AI content generation workers  
**Authentication**: JWT verification disabled (called by workers)  
**Status**: ✅ Production Ready - Path Consistency Fixed

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const requestBody = await req.json();
    const { job_id, status, assets, error_message, enhancedPrompt } = requestBody;
    
    // Standardized parameter handling: all workers now send 'assets' array
    const primaryAsset = assets && assets.length > 0 ? assets[0] : null;
    
    console.log('🔍 STANDARDIZED CALLBACK DEBUGGING - Received request:', {
      job_id,
      status,
      assets,
      assetsCount: assets ? assets.length : 0,
      primaryAsset,
      error_message,
      enhancedPrompt,
      fullRequestBody: requestBody,
      timestamp: new Date().toISOString()
    });
    
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
    
    // Get current job to preserve existing metadata and check format
    console.log('🔍 Fetching job details for:', job_id);
    const { data: currentJob, error: fetchError } = await supabase.from('jobs').select('metadata, job_type, image_id, video_id, format, quality, model_type, user_id').eq('id', job_id).single();
    
    if (fetchError) {
      console.error('❌ CRITICAL: Error fetching current job:', {
        job_id,
        error: fetchError,
        errorMessage: fetchError.message,
        errorCode: fetchError.code
      });
      throw fetchError;
    }
    
    console.log('✅ Job details fetched successfully:', {
      job_id: currentJob.id,
      jobType: currentJob.job_type,
      imageId: currentJob.image_id,
      videoId: currentJob.video_id,
      userId: currentJob.user_id,
      quality: currentJob.quality,
      modelType: currentJob.model_type,
      existingMetadata: currentJob.metadata
    });
    
    // Prepare update data
    const updateData = {
      status,
      completed_at: status === 'completed' || status === 'failed' ? new Date().toISOString() : null,
      error_message: error_message || null
    };
    
    // Merge metadata instead of overwriting
    let updatedMetadata = currentJob.metadata || {};
    
    // Handle enhanced prompt for image_high jobs (enhancement)
    if (currentJob.job_type === 'image_high' && enhancedPrompt) {
      updatedMetadata.enhanced_prompt = enhancedPrompt;
      console.log('📝 Storing enhanced prompt for image_high job:', enhancedPrompt);
    }
    
    // Add assets for completed jobs with standardized validation
    if (status === 'completed' && primaryAsset) {
      console.log('📁 Processing completed job with standardized assets:', {
        job_id,
        assets,
        assetsCount: assets ? assets.length : 0,
        primaryAsset,
        assetLength: primaryAsset.length,
        assetPattern: primaryAsset.includes('/') ? 'contains slash' : 'no slash'
      });
      updatedMetadata.primary_asset = primaryAsset;
      updatedMetadata.all_assets = assets;
      updatedMetadata.callback_processed_at = new Date().toISOString();
      updatedMetadata.callback_debug = {
        received_assets: assets,
        primary_asset: primaryAsset,
        job_type: currentJob.job_type,
        processing_timestamp: new Date().toISOString()
      };
    } else if (status === 'completed' && !primaryAsset) {
      console.error('❌ CRITICAL: Completed job has no assets!', {
        job_id,
        status,
        assets,
        primaryAsset,
        jobType: currentJob.job_type
      });
      updatedMetadata.callback_error = {
        issue: 'completed_without_assets',
        timestamp: new Date().toISOString(),
        received_status: status,
        received_assets: assets,
        primary_asset: primaryAsset
      };
    }
    
    updateData.metadata = updatedMetadata;
    
    console.log('🔄 Updating job with standardized metadata:', {
      job_id,
      updateData,
      metadataKeys: Object.keys(updatedMetadata)
    });
    
    // Update job status
    const { data: job, error: updateError } = await supabase.from('jobs').update(updateData).eq('id', job_id).select().single();
    
    if (updateError) {
      console.error('❌ CRITICAL: Error updating job:', {
        job_id,
        error: updateError,
        updateData
      });
      throw updateError;
    }
    
    console.log('✅ Job updated successfully with standardized processing:', {
      job_id: job.id,
      status: job.status,
      jobType: job.job_type,
      metadata: job.metadata
    });
    
    // Enhanced job type parsing to handle SDXL jobs AND enhanced WAN jobs
    let format, quality, isSDXL = false, isEnhanced = false;
    
    if (job.job_type.startsWith('sdxl_')) {
      // Handle SDXL jobs: sdxl_image_fast -> image, fast, true
      isSDXL = true;
      const parts = job.job_type.replace('sdxl_', '').split('_');
      format = parts[0]; // 'image'
      quality = parts[1]; // 'fast' or 'high'
    } else if (job.job_type.includes('enhanced')) {
      // Handle enhanced WAN jobs: video7b_fast_enhanced, image7b_high_enhanced
      isEnhanced = true;
      if (job.job_type.startsWith('video7b_')) {
        format = 'video';
        quality = job.job_type.includes('_fast_') ? 'fast' : 'high';
      } else if (job.job_type.startsWith('image7b_')) {
        format = 'image';
        quality = job.job_type.includes('_fast_') ? 'fast' : 'high';
      } else {
        // Fallback for unknown enhanced patterns
        const parts = job.job_type.split('_');
        format = parts[0].replace('7b', ''); // Remove '7b' suffix
        quality = parts[1]; // 'fast' or 'high'
      }
    } else {
      // Handle standard WAN jobs: image_fast, video_high -> image/video, fast/high, false
      const parts = job.job_type.split('_');
      format = parts[0]; // 'image' or 'video'
      quality = parts[1]; // 'fast' or 'high'
    }
    
    console.log('🔧 Enhanced job type parsing with enhanced job support:', {
      originalJobType: job.job_type,
      parsedFormat: format,
      parsedQuality: quality,
      isSDXL,
      isEnhanced,
      expectedBucket: isSDXL ? `sdxl_image_${quality}` : isEnhanced ? `${format}7b_${quality}_enhanced` : `${format}_${quality}`
    });
    
    // Handle different job types based on parsed format with standardized assets
    if (format === 'image' && job.image_id) {
      console.log('🖼️ Processing image job callback...');
      await handleImageJobCallback(supabase, job, status, assets, error_message, quality, isSDXL, isEnhanced);
    } else if (format === 'video' && job.video_id) {
      console.log('📹 Processing video job callback...');
      await handleVideoJobCallback(supabase, job, status, assets, error_message, quality, isEnhanced);
    } else {
      console.error('❌ CRITICAL: Unknown job format or missing ID:', {
        format,
        imageId: job.image_id,
        videoId: job.video_id,
        jobType: job.job_type
      });
    }
    
    console.log('✅ STANDARDIZED CALLBACK PROCESSING COMPLETE:', {
      job_id,
      status,
      format,
      quality,
      isSDXL,
      isEnhanced,
      assets,
      assetsCount: assets ? assets.length : 0,
      processingTimestamp: new Date().toISOString()
    });
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Job callback processed successfully with standardized parameters',
      debug: {
        job_id,
        jobStatus: status,
        jobType: job.job_type,
        format: format,
        quality: quality,
        isSDXL: isSDXL,
        isEnhanced: isEnhanced,
        assetsProcessed: assets ? assets.length : 0,
        processingTimestamp: new Date().toISOString()
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
    
  } catch (error) {
    console.error('❌ CRITICAL: Error in job callback function:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    return new Response(JSON.stringify({
      error: error.message,
      success: false,
      debug: {
        timestamp: new Date().toISOString(),
        errorType: error.constructor.name
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});

// Helper functions for handling different job types
async function handleImageJobCallback(supabase, job, status, assets, error_message, quality, isSDXL, isEnhanced) {
  // Implementation for image job callbacks
  // Handles both SDXL (6-image batches) and WAN (single images)
}

async function handleVideoJobCallback(supabase, job, status, assets, error_message, quality, isEnhanced) {
  // Implementation for video job callbacks
  // Handles WAN video generation (single videos)
}
```

---

## **🎨 Job Type Details**

### **SDXL Image Generation**
```yaml
Models: LUSTIFY SDXL (NSFW-capable)
Resolution: 1024x1024 (square)
Format: PNG
Batch Size: 6 images per job
Quality: Excellent NSFW content

Performance:
  sdxl_image_fast: 29.9s total (3.1s per image)
  sdxl_image_high: 42.4s total (5.0s per image)

Storage Buckets:
  sdxl_image_fast: 5MB limit per image
  sdxl_image_high: 10MB limit per image

Frontend Handling:
  - Display 6 images in grid layout
  - Allow user to select preferred image
  - Store all 6 images in user library
  - Enable download of individual images
```

### **WAN Video Generation**
```yaml
Models: WAN 2.1 T2V 1.3B
Resolution: 480x832 (portrait)
Format: MP4
Duration: 5-6 seconds
Quality: Good to excellent

Performance:
  video_fast: 251.5s average (4m 11s)
  video_high: 359.7s (6m)
  video7b_fast_enhanced: 263.9s average (4m 24s)
  video7b_high_enhanced: 370.0s average (6m 10s)

Storage Buckets:
  video_fast: 50MB limit
  video_high: 200MB limit
  video7b_fast_enhanced: 100MB limit
  video7b_high_enhanced: 100MB limit

Frontend Handling:
  - Display video player with controls
  - Show generation progress (0-100%)
  - Enable download of MP4 file
  - Store in user video library
```

### **WAN Image Generation**
```yaml
Models: WAN 2.1 T2V 1.3B
Resolution: 480x832 (portrait)
Format: PNG
Quality: Backup images (not primary)

Performance:
  image_fast: 73s (estimated)
  image_high: 90s (estimated)
  image7b_fast_enhanced: 233.5s (Qwen enhanced)
  image7b_high_enhanced: 104s (Qwen enhanced)

Storage Buckets:
  image_fast: 5MB limit
  image_high: 10MB limit
  image7b_fast_enhanced: 20MB limit
  image7b_high_enhanced: 20MB limit

Frontend Handling:
  - Display single image
  - Enable download
  - Store in user image library
```

---

## **🔧 Enhanced Jobs (Qwen 7B)**

### **What Enhanced Jobs Do:**
```yaml
Input: "woman walking"
Output: "一位穿着简约白色连衣裙的东方女性在阳光明媚的公园小径上散步。她的头发自然披肩，步伐轻盈。背景中有绿树和鲜花点缀的小道，阳光透过树叶洒下斑驳光影。镜头采用跟随镜头，捕捉她自然行走的姿态。纪实摄影风格。中景镜头。"

Benefits:
  - 3,400% prompt expansion (75 → 2,627 characters)
  - Professional cinematic descriptions
  - Enhanced anatomical accuracy
  - Better visual quality and detail
  - NSFW-optimized content enhancement

Performance Overhead:
  - 14-112s additional processing time
  - Qwen 7B model loading and enhancement
  - Higher quality output justifies time cost
```

### **When to Use Enhanced Jobs:**
```yaml
Recommended:
  - Professional content creation
  - High-quality output requirements
  - Complex scene descriptions
  - NSFW content with anatomical accuracy

Not Recommended:
  - Quick previews or iterations
  - Simple prompts that work well as-is
  - Time-sensitive content creation
```

---

## **🚨 Error Handling**

### **Common Error Scenarios:**
```yaml
Job Creation Errors:
  - Invalid job type: Return 400 with valid job types list
  - Authentication failed: Return 401
  - Redis queue full: Return 503 with retry guidance
  - User credits insufficient: Return 402 with upgrade prompt

Job Processing Errors:
  - Model loading failed: Retry automatically
  - Generation timeout: Mark as failed after 15 minutes
  - Storage upload failed: Retry with exponential backoff
  - GPU memory issues: Worker auto-restart

Frontend Error Handling:
  - Show user-friendly error messages
  - Provide retry options where appropriate
  - Log errors for debugging
  - Graceful degradation for partial failures
```

### **Error Response Format:**
```typescript
{
  success: false,
  error: string,           // User-friendly error message
  details?: string,        // Technical details for debugging
  retryable?: boolean,     // Whether retry is recommended
  suggestedAction?: string // What user should do
}
```

---

## **📈 Performance Monitoring**

### **Key Metrics to Track:**
```yaml
Job Success Rate: >95% target
Average Generation Times:
  - SDXL fast: 29.9s
  - SDXL high: 42.4s
  - WAN video_fast: 251.5s
  - WAN video_high: 359.7s
  - Enhanced jobs: +14-112s overhead

Queue Performance:
  - sdxl_queue: 2-second polling
  - wan_queue: 5-second polling
  - Average queue depth: <10 jobs
  - Max queue wait time: <5 minutes

System Health:
  - GPU memory usage: <35GB peak
  - Worker uptime: >99%
  - Storage bucket availability: 100%
  - API response time: <500ms
```

### **Frontend Monitoring:**
```typescript
// Track job performance
const trackJobPerformance = (jobType, startTime, endTime) => {
  const duration = endTime - startTime;
  analytics.track('job_completed', {
    jobType,
    duration,
    success: true
  });
};

// Monitor queue health
const checkQueueHealth = async () => {
  const response = await fetch('/api/queue-status');
  const status = await response.json();
  
  if (status.queueDepth > 10) {
    showQueueWarning('High queue volume, expect longer wait times');
  }
};
```

---

## **🔗 Integration Examples**

### **Complete Job Flow:**
```typescript
// 1. Create job
const createJob = async (jobType, prompt) => {
  const response = await fetch('/api/queue-job', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ jobType, metadata: { prompt } })
  });
  
  const result = await response.json();
  if (result.success) {
    return result.job.id;
  } else {
    throw new Error(result.error);
  }
};

// 2. Monitor progress
const monitorJob = async (jobId) => {
  const interval = setInterval(async () => {
    const response = await fetch(`/api/jobs/${jobId}`);
    const job = await response.json();
    
    updateProgressUI(job);
    
    if (job.status === 'completed') {
      clearInterval(interval);
      handleJobCompletion(job);
    } else if (job.status === 'failed') {
      clearInterval(interval);
      handleJobFailure(job);
    }
  }, 2000); // Poll every 2 seconds
};

// 3. Handle completion
const handleJobCompletion = (job) => {
  if (job.job_type.startsWith('sdxl_')) {
    // Handle 6-image batch
    const imageUrls = job.metadata.all_assets;
    displayImageGrid(imageUrls);
  } else {
    // Handle single file
    const fileUrl = job.metadata.primary_asset;
    if (job.job_type.includes('video')) {
      displayVideoPlayer(fileUrl);
    } else {
      displayImage(fileUrl);
    }
  }
};
```

---

## **📋 Quick Reference Cheat Sheet**

### **Job Type Matrix:**
| Job Type | Output | Time | Quality | Enhancement |
|----------|--------|------|---------|-------------|
| `sdxl_image_fast` | 6 PNG | 30s | Excellent | No |
| `sdxl_image_high` | 6 PNG | 42s | Premium | No |
| `image_fast` | 1 PNG | 73s | Good | No |
| `image_high` | 1 PNG | 90s | Better | No |
| `video_fast` | 1 MP4 | 252s | Good | No |
| `video_high` | 1 MP4 | 360s | Better | No |
| `image7b_fast_enhanced` | 1 PNG | 234s | Enhanced | Yes |
| `image7b_high_enhanced` | 1 PNG | 104s | Enhanced | Yes |
| `video7b_fast_enhanced` | 1 MP4 | 264s | Enhanced | Yes |
| `video7b_high_enhanced` | 1 MP4 | 370s | Enhanced | Yes |

### **API Endpoints:**
```yaml
POST /api/queue-job: Create new job
GET /api/jobs/{id}: Get job status
GET /api/assets: Get user assets
DELETE /api/assets/{id}: Delete asset
```

### **Status Values:**
```yaml
queued → processing → completed/failed
```

---

**This document provides everything needed to integrate with the OurVidz API system. For technical implementation details, see the worker source code in the separate repository.** 