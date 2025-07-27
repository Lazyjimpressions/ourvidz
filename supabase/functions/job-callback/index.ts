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
    const updateData: any = {
      status,
      completed_at: status === 'completed' || status === 'failed' ? new Date().toISOString() : null,
      error_message: error_message || null
    };
    // Merge metadata instead of overwriting
    let updatedMetadata = currentJob.metadata || {};
    
    // PHASE 1 FIX: Extract worker metadata from requestBody.metadata
    const workerMetadata = requestBody.metadata || {};
    if (workerMetadata.seed) {
      updatedMetadata.seed = workerMetadata.seed;
      console.log('🌱 Storing seed from worker:', workerMetadata.seed);
    }
    if (workerMetadata.generation_time) {
      updatedMetadata.generation_time = workerMetadata.generation_time;
      console.log('⏱️ Storing generation time from worker:', workerMetadata.generation_time);
    }
    if (workerMetadata.num_images) {
      updatedMetadata.num_images = workerMetadata.num_images;
    }
    
    // PHASE 1 FIX: Extract enhancement metadata from worker response
    if (workerMetadata.original_prompt) {
      updatedMetadata.original_prompt = workerMetadata.original_prompt;
      console.log('📝 Storing original prompt from worker:', workerMetadata.original_prompt);
    }
    if (workerMetadata.final_prompt) {
      updatedMetadata.enhanced_prompt = workerMetadata.final_prompt;
      console.log('📝 Storing enhanced prompt from worker:', workerMetadata.final_prompt);
    }
    if (workerMetadata.enhancement_strategy) {
      updatedMetadata.enhancement_strategy = workerMetadata.enhancement_strategy;
      console.log('🔧 Storing enhancement strategy from worker:', workerMetadata.enhancement_strategy);
    } else if (workerMetadata.final_prompt && workerMetadata.original_prompt && 
               workerMetadata.final_prompt !== workerMetadata.original_prompt) {
      // Detect enhancement if prompts differ but no strategy specified
      updatedMetadata.enhancement_strategy = 'auto_detected';
      console.log('🔧 Auto-detected enhancement strategy (prompts differ)');
    }
    if (workerMetadata.qwen_expansion_percentage) {
      updatedMetadata.qwen_expansion_percentage = workerMetadata.qwen_expansion_percentage;
      console.log('📊 Storing qwen expansion percentage:', workerMetadata.qwen_expansion_percentage);
    }
    if (workerMetadata.compel_weights) {
      updatedMetadata.compel_weights = workerMetadata.compel_weights;
      console.log('⚖️ Storing compel weights from worker:', workerMetadata.compel_weights);
    }
    
    // REFERENCE IMAGE SUPPORT: Store reference data from worker
    if (workerMetadata.reference_image_url) {
      updatedMetadata.reference_image_url = workerMetadata.reference_image_url;
      updatedMetadata.reference_strength = workerMetadata.reference_strength;
      updatedMetadata.reference_type = workerMetadata.reference_type;
      console.log('🖼️ Storing reference image data from worker:', {
        url: workerMetadata.reference_image_url,
        strength: workerMetadata.reference_strength,
        type: workerMetadata.reference_type
      });
    }
    
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
    
    // PHASE 2 FIX: Update job table with enhancement fields
    if (updatedMetadata.original_prompt) {
      updateData.original_prompt = updatedMetadata.original_prompt;
    }
    if (updatedMetadata.enhanced_prompt) {
      updateData.enhanced_prompt = updatedMetadata.enhanced_prompt;
    }
    if (updatedMetadata.enhancement_strategy) {
      updateData.enhancement_strategy = updatedMetadata.enhancement_strategy;
    }
    if (updatedMetadata.qwen_expansion_percentage) {
      updateData.qwen_expansion_percentage = updatedMetadata.qwen_expansion_percentage;
    }
    if (updatedMetadata.compel_weights) {
      updateData.compel_weights = updatedMetadata.compel_weights;
    }
    
    console.log('🔄 Updating job with standardized metadata and enhancement fields:', {
      job_id,
      updateData,
      metadataKeys: Object.keys(updatedMetadata),
      enhancementFields: {
        original_prompt: !!updateData.original_prompt,
        enhanced_prompt: !!updateData.enhanced_prompt,
        enhancement_strategy: updateData.enhancement_strategy,
        qwen_expansion_percentage: updateData.qwen_expansion_percentage
      }
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

    // Handle prompt test results if this is a test job
    if (job.metadata?.created_from === 'admin_prompt_testing' && job.metadata?.prompt_test_metadata) {
      console.log('🧪 Processing prompt test job callback:', {
        job_id: job.id,
        status,
        test_metadata: job.metadata.prompt_test_metadata
      });
      await handlePromptTestCallback(supabase, job, status, assets, error_message);
    }
    // Enhanced job type parsing to handle SDXL jobs AND enhanced WAN jobs
    let format, quality, isSDXL = false, isEnhanced = false;
    if (job.job_type.startsWith('sdxl_')) {
      // Handle SDXL jobs: sdxl_image_fast -> image, fast, true
      isSDXL = true;
      const parts = job.job_type.replace('sdxl_', '').split('_');
      format = parts[0]; // 'image'
      quality = parts[1]; // 'fast' or 'high'
    } else if (job.job_type.includes('enhanced')) {
      // PHASE 3 FIX: Enhanced WAN jobs: video7b_fast_enhanced, image7b_high_enhanced
      isEnhanced = true;
      console.log('🔧 PHASE 3: Processing enhanced job type:', job.job_type);
      
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
        console.log('⚠️ PHASE 3: Using fallback enhanced job parsing:', { parts, format, quality });
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
    if (format === 'image') {
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
// REMOVED: Path normalization - workers now upload with correct paths
// No longer needed as all workers upload to standardized paths
async function handleImageJobCallback(supabase, job, status, assets, error_message, quality, isSDXL, isEnhanced) {
  console.log('🖼️ IMAGE CALLBACK PROCESSING (SIMPLIFIED):', {
    job_id: job.id,
    job_type: job.job_type,
    status,
    assets,
    assetsCount: assets ? assets.length : 0,
    quality,
    isSDXL,
    isEnhanced,
    timestamp: new Date().toISOString()
  });
  
  if (status === 'completed' && assets && assets.length > 0) {
    // Extract title from job metadata or prompt
    const jobMetadata = job.metadata || {};
    const prompt = jobMetadata.prompt || jobMetadata.original_prompt || 'Untitled Image';
    const baseTitle = prompt.length <= 60 ? prompt : prompt.substring(0, 60) + '...';
    
    console.log('✅ PHASE 3: Processing completed job - updating by job_id and image_index');
    
    // PHASE 3 FIX: Enhanced update strategy with better error handling
    const updatedImages = [];
    for (let i = 0; i < assets.length; i++) {
      const imageUrl = assets[i];
      const title = assets.length > 1 ? `${baseTitle} (${i + 1})` : baseTitle;
      
      console.log(`🔄 PHASE 3: Updating image ${i + 1}/${assets.length} by job_id and index:`, {
        jobId: job.id,
        imageIndex: i,
        assetUrl: imageUrl,
        isEnhanced,
        jobType: job.job_type
      });
      
      // PHASE 3 FIX: Enhanced metadata handling for all job types
      const imageMetadata = {
        ...jobMetadata,
        model_type: isSDXL ? 'sdxl' : isEnhanced ? 'enhanced-7b' : 'wan',
        is_sdxl: isSDXL,
        is_enhanced: isEnhanced,
        callback_processed_at: new Date().toISOString(),
        original_job_id: job.id,
        image_index: i,
        total_images: assets.length,
        // PHASE 1 FIX: Store worker metadata in image metadata
        seed: jobMetadata.seed,
        generation_time: jobMetadata.generation_time,
        negative_prompt: jobMetadata.negative_prompt,
        // REFERENCE IMAGE SUPPORT: Store reference data in image metadata
        reference_image_url: jobMetadata.reference_image_url,
        reference_strength: jobMetadata.reference_strength,
        reference_type: jobMetadata.reference_type,
        job_type: job.job_type, // Store job_type for model detection
        callback_debug: {
          job_type: job.job_type,
          primary_asset: assets[0],
          received_assets: assets,
          processing_timestamp: new Date().toISOString(),
          enhanced_job_fix: 'phase_3_implementation'
        }
      };
      
      // PHASE 3 FIX: Update image table with enhancement fields
      const imageUpdate: any = {
        title: title,
        image_url: imageUrl,
        thumbnail_url: imageUrl,
        status: 'completed',
        metadata: imageMetadata
      };
      
      // Add enhancement fields to image table columns
      if (jobMetadata.original_prompt) {
        imageUpdate.original_prompt = jobMetadata.original_prompt;
      }
      if (jobMetadata.enhanced_prompt) {
        imageUpdate.enhanced_prompt = jobMetadata.enhanced_prompt;
      }
      if (jobMetadata.enhancement_strategy) {
        imageUpdate.enhancement_strategy = jobMetadata.enhancement_strategy;
      }
      if (jobMetadata.qwen_expansion_percentage) {
        imageUpdate.qwen_expansion_percentage = jobMetadata.qwen_expansion_percentage;
      }
      if (jobMetadata.compel_weights) {
        imageUpdate.compel_weights = jobMetadata.compel_weights;
      }
      if (jobMetadata.seed) {
        imageUpdate.seed = jobMetadata.seed;
      }
      
      console.log('🔄 PHASE 3: Updating image with enhancement data:', {
        jobId: job.id,
        imageIndex: i,
        enhancementFields: {
          original_prompt: !!imageUpdate.original_prompt,
          enhanced_prompt: !!imageUpdate.enhanced_prompt,
          enhancement_strategy: imageUpdate.enhancement_strategy,
          qwen_expansion: imageUpdate.qwen_expansion_percentage,
          seed: imageUpdate.seed
        }
      });

      const { data: updatedImage, error: updateError } = await supabase
        .from('images')
        .update(imageUpdate)
        .eq('job_id', job.id)
        .eq('image_index', i)
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ PHASE 3: Error updating image by job_id and index:', {
          jobId: job.id,
          imageIndex: i,
          error: updateError,
          isEnhanced,
          jobType: job.job_type
        });
        
        // PHASE 3 FIX: Fallback for enhanced images without image_index
        if (isEnhanced && updateError.code === 'PGRST116') {
          console.log('🔄 PHASE 3: Attempting fallback update for enhanced image without index');
          
          const { data: fallbackImage, error: fallbackError } = await supabase
            .from('images')
            .update(imageUpdate)
            .eq('job_id', job.id)
            .is('image_index', null)
            .select()
            .single();
          
          if (!fallbackError && fallbackImage) {
            console.log('✅ PHASE 3: Fallback update successful for enhanced image:', {
              imageId: fallbackImage.id,
              jobId: job.id,
              status: fallbackImage.status
            });
            updatedImages.push(fallbackImage);
          } else {
            console.error('❌ PHASE 3: Fallback update also failed:', fallbackError);
          }
        }
      } else {
        console.log('✅ PHASE 3: Successfully updated image:', {
          imageId: updatedImage.id,
          imageIndex: i,
          jobId: job.id,
          status: updatedImage.status,
          isEnhanced,
          jobType: job.job_type
        });
        updatedImages.push(updatedImage);
      }
    }
    
    console.log('🎉 IMAGE UPDATE COMPLETED:', {
      jobId: job.id,
      totalAssets: assets.length,
      recordsUpdated: updatedImages.length,
      success: updatedImages.length === assets.length
    });
    
    // PHASE 4 FIX: Add enhancement analytics tracking
    await trackEnhancementAnalytics(supabase, job, status, updatedImages.length > 0);
    
  } else if (status === 'failed' && job.image_id) {
    console.log('❌ Processing failed image job');
    const { error: imageError } = await supabase.from('images').update({
      status: 'failed',
      metadata: {
        ...job.metadata || {},
        error_message: error_message,
        failed_at: new Date().toISOString()
      }
    }).eq('id', job.image_id);
    if (imageError) {
      console.error('❌ Error updating image status to failed:', imageError);
    } else {
      console.log('✅ Image job marked as failed');
    }
  } else if (status === 'processing' && job.image_id) {
    console.log('🔄 Processing image job in progress');
    const { error: imageError } = await supabase.from('images').update({
      status: 'generating',
      metadata: {
        ...job.metadata || {},
        processing_started_at: new Date().toISOString()
      }
    }).eq('id', job.image_id);
    if (imageError) {
      console.error('❌ Error updating image status to generating:', imageError);
    } else {
      console.log('✅ Image job marked as generating');
    }
  }
}

// ============= LEGACY IMAGE INSERT HANDLER =============
async function handleLegacyImageInsert(supabase, job, assets, jobMetadata, baseTitle, quality, isSDXL, isEnhanced) {
  const createdImages = [];
  for (let i = 0; i < assets.length; i++) {
    const imageUrl = assets[i];
    const title = assets.length > 1 ? `${baseTitle} (${i + 1})` : baseTitle;
    
    const imageData = {
      user_id: job.user_id,
      prompt: jobMetadata.prompt || jobMetadata.original_prompt || 'Untitled Image',
      title: title,
      image_url: imageUrl,
      thumbnail_url: imageUrl,
      status: 'completed',
      quality: quality,
      format: 'png',
      generation_mode: 'standalone',
      job_id: job.id,
              metadata: {
          ...jobMetadata,
          model_type: isSDXL ? 'sdxl' : isEnhanced ? 'enhanced-7b' : 'wan',
          is_sdxl: isSDXL,
          is_enhanced: isEnhanced,
          callback_processed_at: new Date().toISOString(),
          original_job_id: job.id,
          image_index: i,
          total_images: assets.length,
          // REFERENCE IMAGE SUPPORT: Store reference data in image metadata
          reference_image_url: jobMetadata.reference_image_url,
          reference_strength: jobMetadata.reference_strength,
          reference_type: jobMetadata.reference_type
        }
    };
    
    const { data: newImage, error: imageError } = await supabase
      .from('images')
      .insert(imageData)
      .select()
      .single();
    
    if (imageError) {
      console.error('❌ Error creating image record:', {
        imageIndex: i,
        error: imageError
      });
    } else {
      console.log('✅ Image record created:', {
        imageId: newImage.id,
        imageIndex: i,
        jobId: job.id
      });
      createdImages.push(newImage);
    }
  }
  
  console.log('✅ Created individual image records:', {
    jobId: job.id,
    totalImages: assets.length,
    createdCount: createdImages.length
  });
}

// ============= VIDEO JOB CALLBACK HANDLER =============
async function handleVideoJobCallback(supabase, job, status, assets, error_message, quality, isEnhanced) {
  console.log('📹 STANDARDIZED VIDEO CALLBACK PROCESSING:', {
    job_id: job.id,
    videoId: job.video_id,
    status,
    assets,
    assetsCount: assets ? assets.length : 0,
    jobType: job.job_type,
    quality,
    isEnhanced
  });
  if (status === 'completed' && job.video_id && assets && assets.length > 0) {
    // Store video path exactly as returned by WAN worker - no normalization
    const videoPath = assets[0];
    
    console.log('📹 Video path handling (FIXED):', {
      receivedPath: assets[0],
      storedPath: videoPath,
      userId: job.user_id,
      jobType: job.job_type,
      pathConsistencyFixed: true
    });

    // Extract title from job metadata or prompt
    const jobMetadata = job.metadata || {};
    const prompt = jobMetadata.prompt || jobMetadata.original_prompt || 'Untitled Video';
    const title = prompt.length <= 60 ? prompt : prompt.substring(0, 60) + '...';

    // Generate placeholder thumbnail URL for videos
    const placeholderThumbnailUrl = `system_assets/video-placeholder-thumbnail.png`;
    
    console.log('📹 Setting video thumbnail:', {
      videoId: job.video_id,
      placeholderThumbnailUrl,
      hasVideoUrl: !!videoPath
    });

    // Store exact path from worker - this matches actual storage structure  
    const updateData = {
      status: 'completed',
      title: title,
      video_url: videoPath,
      thumbnail_url: placeholderThumbnailUrl,
      signed_url: videoPath,
      signed_url_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
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

    const { error: videoError } = await supabase.from('videos').update(updateData).eq('id', job.video_id);
    
    if (videoError) {
      console.error('❌ Error updating video:', {
        videoId: job.video_id,
        error: videoError,
        updateData
      });
    } else {
      console.log('✅ Video job updated successfully with path consistency fix:', {
        videoId: job.video_id,
        storedPath: videoPath,
        bucket: updateData.metadata.bucket,
        pathConsistencyFixed: true
      });
    }
  }
  if (status === 'failed' && job.video_id) {
    const { error: videoError } = await supabase.from('videos').update({
      status: 'failed',
      error_message: error_message
    }).eq('id', job.video_id);
    if (videoError) {
      console.error('❌ Error updating video status to failed:', videoError);
    } else {
      console.log('✅ Video job marked as failed');
    }
  }
  if (status === 'processing' && job.video_id) {
    const { error: videoError } = await supabase.from('videos').update({
      status: 'processing'
    }).eq('id', job.video_id);
    if (videoError) {
      console.error('❌ Error updating video status to processing:', videoError);
    } else {
      console.log('✅ Video job marked as processing');
    }
  }
}

async function handlePromptTestCallback(supabase, job, status, assets, error_message) {
  console.log('🧪 Processing prompt test callback:', {
    job_id: job.id,
    status,
    test_metadata: job.metadata?.prompt_test_metadata,
    assets: assets
  });

  try {
    // Find the test result record by job_id
    const { data: testResult, error: findError } = await supabase
      .from('model_test_results')
      .select('*')
      .eq('job_id', job.id)
      .single();

    if (findError) {
      console.error('❌ Error finding test result:', findError);
      return;
    }

    // Prepare update data based on job status
    let updateData: any = {
      success: status === 'completed',
      test_metadata: {
        ...testResult.test_metadata,
        job_status: status,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
        error_message: error_message || null
      }
    };

    // Add generated content URLs if completed successfully
    if (status === 'completed' && assets && assets.length > 0) {
      // For images, link to the image record
      if (job.image_id) {
        const { data: imageData } = await supabase
          .from('images')
          .select('image_url')
          .eq('id', job.image_id)
          .single();
        
        if (imageData) {
          updateData.image_id = job.image_id;
          updateData.test_metadata = {
            ...updateData.test_metadata,
            image_url: imageData.image_url,
            content_type: 'image'
          };
        }
      }
      
      // For videos, link to the video record
      if (job.video_id) {
        const { data: videoData } = await supabase
          .from('videos')
          .select('video_url, thumbnail_url')
          .eq('id', job.video_id)
          .single();
        
        if (videoData) {
          updateData.video_id = job.video_id;
          updateData.test_metadata = {
            ...updateData.test_metadata,
            video_url: videoData.video_url,
            thumbnail_url: videoData.thumbnail_url,
            content_type: 'video'
          };
        }
      }
    }

    // Update the test result
    const { error: updateError } = await supabase
      .from('model_test_results')
      .update(updateData)
      .eq('job_id', job.id);

    if (updateError) {
      console.error('❌ Error updating test result:', updateError);
    } else {
      console.log('✅ Test result updated successfully:', {
        job_id: job.id,
        success: updateData.success,
        content_type: updateData.test_metadata?.content_type
      });
    }
  } catch (error) {
    console.error('❌ Error in prompt test callback handler:', error);
  }
}

// PHASE 4 FIX: Enhancement analytics tracking function
async function trackEnhancementAnalytics(supabase, job, status, hasImages) {
  try {
    // Only track completed jobs with enhancement data
    if (status !== 'completed') return;
    
    const jobMetadata = job.metadata || {};
    const hasEnhancement = jobMetadata.enhancement_strategy && jobMetadata.enhancement_strategy !== 'none';
    
    if (!hasEnhancement) {
      console.log('📊 Skipping analytics tracking - no enhancement detected');
      return;
    }
    
    console.log('📊 PHASE 4: Tracking enhancement analytics:', {
      jobId: job.id,
      enhancement_strategy: jobMetadata.enhancement_strategy,
      original_prompt: !!jobMetadata.original_prompt,
      enhanced_prompt: !!jobMetadata.enhanced_prompt,
      qwen_expansion: jobMetadata.qwen_expansion_percentage,
      hasImages
    });
    
    // Calculate token expansion if available
    let tokenExpansion = null;
    if (jobMetadata.original_prompt && jobMetadata.enhanced_prompt) {
      const originalLength = jobMetadata.original_prompt.length;
      const enhancedLength = jobMetadata.enhanced_prompt.length;
      tokenExpansion = originalLength > 0 ? ((enhancedLength - originalLength) / originalLength) * 100 : 0;
    }
    
    // Insert into job_enhancement_analysis table
    const analyticsData = {
      id: job.id, // Use job ID as primary key
      user_id: job.user_id,
      job_type: job.job_type,
      model_type: jobMetadata.model_type || 'unknown',
      status: job.status,
      original_prompt: jobMetadata.original_prompt,
      enhanced_prompt: jobMetadata.enhanced_prompt,
      enhancement_strategy: jobMetadata.enhancement_strategy,
      enhancement_time_ms: jobMetadata.enhancement_time_ms || null,
      qwen_expansion_percentage: jobMetadata.qwen_expansion_percentage || null,
      quality_improvement: jobMetadata.quality_improvement || null,
      quality_rating: jobMetadata.quality_rating || null,
      generation_time_seconds: jobMetadata.generation_time || null,
      created_at: job.created_at,
      completed_at: job.completed_at,
      enhancement_display_name: `${jobMetadata.enhancement_strategy} (${job.job_type})`
    };
    
    const { error: analyticsError } = await supabase
      .from('job_enhancement_analysis')
      .upsert(analyticsData, { onConflict: 'id' });
    
    if (analyticsError) {
      console.error('❌ PHASE 4: Error inserting enhancement analytics:', analyticsError);
    } else {
      console.log('✅ PHASE 4: Enhancement analytics tracked successfully:', {
        jobId: job.id,
        strategy: jobMetadata.enhancement_strategy,
        tokenExpansion,
        generationTime: jobMetadata.generation_time
      });
    }
    
    // Also track in image-specific analytics if this is an image job
    if (job.job_type.includes('image') && hasImages) {
      const imageAnalyticsData = {
        id: job.id, // Use job ID as primary key
        user_id: job.user_id,
        prompt: jobMetadata.original_prompt,
        enhanced_prompt: jobMetadata.enhanced_prompt,
        format: jobMetadata.format || 'png',
        quality: job.quality || 'fast',
        status: job.status,
        enhancement_strategy: jobMetadata.enhancement_strategy,
        enhancement_time_ms: jobMetadata.enhancement_time_ms || null,
        qwen_expansion_percentage: jobMetadata.qwen_expansion_percentage || null,
        compel_weights: jobMetadata.compel_weights || null,
        quality_improvement: jobMetadata.quality_improvement || null,
        quality_rating: jobMetadata.quality_rating || null,
        created_at: job.created_at,
        enhancement_display_name: `${jobMetadata.enhancement_strategy} (${job.job_type})`
      };
      
      const { error: imageAnalyticsError } = await supabase
        .from('image_enhancement_analysis')
        .upsert(imageAnalyticsData, { onConflict: 'id' });
      
      if (imageAnalyticsError) {
        console.error('❌ PHASE 4: Error inserting image enhancement analytics:', imageAnalyticsError);
      } else {
        console.log('✅ PHASE 4: Image enhancement analytics tracked successfully');
      }
    }
    
  } catch (error) {
    console.error('❌ PHASE 4: Error in enhancement analytics tracking:', error);
  }
}
