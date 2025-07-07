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
// Helper function to normalize asset paths to be user-scoped
function normalizeAssetPath(filePath, userId) {
  if (!filePath || !userId) return filePath;
  // Check if path already contains user ID prefix
  if (filePath.startsWith(`${userId}/`)) {
    return filePath; // Already user-scoped
  }
  // Add user ID prefix for consistency
  const normalizedPath = `${userId}/${filePath}`;
  console.log('🔧 Path normalization:', {
    originalPath: filePath,
    userId: userId,
    normalizedPath: normalizedPath
  });
  return normalizedPath;
}
async function handleImageJobCallback(supabase, job, status, assets, error_message, quality, isSDXL, isEnhanced) {
  console.log('🖼️ STANDARDIZED IMAGE CALLBACK PROCESSING:', {
    job_id: job.id,
    imageId: job.image_id,
    status,
    assets,
    assetsCount: assets ? assets.length : 0,
    jobType: job.job_type,
    quality,
    isSDXL,
    expectedBucket: isSDXL ? `sdxl_image_${quality}` : isEnhanced ? `image7b_${quality}_enhanced` : `image_${quality}`
  });
  if (status === 'completed' && assets && assets.length > 0) {
    console.log('✅ Processing completed image job with standardized assets');
    // Normalize paths to ensure user-scoped consistency
    let primaryImageUrl = normalizeAssetPath(assets[0], job.user_id);
    let imageUrlsArray = null;
    if (assets.length > 1) {
      console.log('🖼️ Multiple images received:', assets.length);
      // Normalize all image URLs in the array
      imageUrlsArray = assets.map((url) => normalizeAssetPath(url, job.user_id));
      primaryImageUrl = imageUrlsArray[0]; // Use first image as primary
    } else {
      console.log('🖼️ Single image received:', assets[0]);
    }
    // Validate file path format
    const filePathValidation = {
      hasSlash: primaryImageUrl ? primaryImageUrl.includes('/') : false,
      hasUnderscore: primaryImageUrl ? primaryImageUrl.includes('_') : false,
      hasPngExtension: primaryImageUrl ? primaryImageUrl.endsWith('.png') : false,
      length: primaryImageUrl ? primaryImageUrl.length : 0,
      startsWithUserId: primaryImageUrl ? primaryImageUrl.startsWith(job.user_id || 'unknown') : false,
      expectedPattern: `${job.user_id}/${isSDXL ? 'sdxl_' : ''}${job.id}_*.png`,
      isMultipleImages: !!imageUrlsArray,
      imageCount: imageUrlsArray ? imageUrlsArray.length : 1
    };
    console.log('🔍 File path validation:', filePathValidation);
    // Update image record with model type information and enhanced debugging
    const updateData = {
      status: 'completed',
      image_url: primaryImageUrl,
      image_urls: imageUrlsArray,
      thumbnail_url: primaryImageUrl,
      quality: quality,
      metadata: {
        ...job.metadata || {},
        model_type: isSDXL ? 'sdxl' : 'wan',
        is_sdxl: isSDXL,
        bucket: isSDXL ? `sdxl_image_${quality}` : isEnhanced ? `image7b_${quality}_enhanced` : `image_${quality}`,
        callback_processed_at: new Date().toISOString(),
        file_path_validation: filePathValidation,
        debug_info: {
          original_assets: assets,
          image_urls_received: imageUrlsArray,
          job_type: job.job_type,
          processed_at: new Date().toISOString()
        }
      }
    };
    console.log('🔄 Updating image record:', {
      imageId: job.image_id,
      updateData,
      expectedBucket: updateData.metadata.bucket
    });
    const { data: updatedImage, error: imageError } = await supabase.from('images').update(updateData).eq('id', job.image_id).select().single();
    if (imageError) {
      console.error('❌ CRITICAL: Error updating image record:', {
        imageId: job.image_id,
        error: imageError,
        updateData
      });
    } else {
      console.log('✅ Image record updated successfully:', {
        imageId: updatedImage.id,
        status: updatedImage.status,
        imageUrl: updatedImage.image_url,
        quality: updatedImage.quality,
        bucket: updatedImage.metadata?.bucket,
        isSDXL: updatedImage.metadata?.is_sdxl
      });
      // Verify the image can be found by AssetService logic
      console.log('🔍 Verifying image accessibility for AssetService:', {
        imageId: updatedImage.id,
        userId: job.user_id,
        imageUrl: updatedImage.image_url,
        status: updatedImage.status,
        quality: updatedImage.quality,
        metadata: updatedImage.metadata
      });
    }
  } else if (status === 'failed') {
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
  } else if (status === 'processing') {
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
    // Normalize ALL video paths to be user-scoped for consistency
    const normalizedVideoPath = normalizeAssetPath(assets[0], job.user_id);
    
    console.log('📹 Video path handling:', {
      originalPath: assets[0],
      normalizedPath: normalizedVideoPath,
      userId: job.user_id,
      jobType: job.job_type
    });

    // Store in both video_url and signed_url fields for consistency
    const updateData = {
      status: 'completed',
      video_url: normalizedVideoPath,
      signed_url: normalizedVideoPath,
      signed_url_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      completed_at: new Date().toISOString(),
      metadata: {
        ...job.metadata || {},
        callback_processed_at: new Date().toISOString(),
        normalized_path: normalizedVideoPath,
        bucket: isEnhanced ? `video7b_${quality}_enhanced` : `video_${quality}`
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
      console.log('✅ Video job updated successfully:', {
        videoId: job.video_id,
        path: normalizedVideoPath,
        bucket: updateData.metadata.bucket
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
