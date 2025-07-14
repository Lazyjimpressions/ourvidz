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
    
    console.log('✅ Processing completed job - updating by job_id and image_index');
    
    // Simple strategy: Update images by job_id and image_index directly
    const updatedImages = [];
    for (let i = 0; i < assets.length; i++) {
      const imageUrl = assets[i];
      const title = assets.length > 1 ? `${baseTitle} (${i + 1})` : baseTitle;
      
      console.log(`🔄 Updating image ${i + 1}/${assets.length} by job_id and index:`, {
        jobId: job.id,
        imageIndex: i,
        assetUrl: imageUrl
      });
      
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
      
      if (updateError) {
        console.error('❌ Error updating image by job_id and index:', {
          jobId: job.id,
          imageIndex: i,
          error: updateError
        });
      } else {
        console.log('✅ Successfully updated image:', {
          imageId: updatedImage.id,
          imageIndex: i,
          jobId: job.id,
          status: updatedImage.status
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
        total_images: assets.length
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
    let updateData = {
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
