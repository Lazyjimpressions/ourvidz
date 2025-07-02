
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', 
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { jobId, status, filePath, errorMessage, enhancedPrompt } = await req.json();
    
    console.log('Processing job callback with enhanced SDXL support:', {
      jobId,
      status,
      filePath,
      enhancedPrompt
    });

    // Get current job to preserve existing metadata and check format
    const { data: currentJob, error: fetchError } = await supabase
      .from('jobs')
      .select('metadata, job_type, image_id, video_id, format, quality, model_type')
      .eq('id', jobId)
      .single();

    if (fetchError) {
      console.error('Error fetching current job:', fetchError);
      throw fetchError;
    }

    // Prepare update data
    const updateData = {
      status,
      completed_at: status === 'completed' || status === 'failed' ? new Date().toISOString() : null,
      error_message: errorMessage || null
    };

    // Merge metadata instead of overwriting
    let updatedMetadata = currentJob.metadata || {};

    // Handle enhanced prompt for image_high jobs (enhancement)
    if (currentJob.job_type === 'image_high' && enhancedPrompt) {
      updatedMetadata.enhanced_prompt = enhancedPrompt;
      console.log('Storing enhanced prompt for image_high job:', enhancedPrompt);
    }

    // Add file path for completed jobs
    if (status === 'completed' && filePath) {
      updatedMetadata.file_path = filePath;
    }

    updateData.metadata = updatedMetadata;

    // Update job status
    const { data: job, error: updateError } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating job:', updateError);
      throw updateError;
    }

    console.log('Job updated with enhanced SDXL support:', job);

    // Enhanced job type parsing to handle SDXL jobs
    let format, quality, isSDXL = false;
    
    if (job.job_type.startsWith('sdxl_')) {
      // Handle SDXL jobs: sdxl_image_fast -> image, fast, true
      isSDXL = true;
      const parts = job.job_type.replace('sdxl_', '').split('_');
      format = parts[0]; // 'image'
      quality = parts[1]; // 'fast' or 'high'
    } else {
      // Handle WAN jobs: image_fast -> image, fast, false
      const parts = job.job_type.split('_');
      format = parts[0]; // 'image' or 'video'
      quality = parts[1]; // 'fast' or 'high'
    }

    console.log('Enhanced job type parsing:', {
      originalJobType: job.job_type,
      format,
      quality,
      isSDXL
    });

    // Handle different job types based on parsed format
    if (format === 'image' && job.image_id) {
      await handleImageJobCallback(supabase, job, status, filePath, errorMessage, quality, isSDXL);
    } else if (format === 'video' && job.video_id) {
      await handleVideoJobCallback(supabase, job, status, filePath, errorMessage, quality);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Job callback processed successfully with SDXL support',
      jobStatus: status,
      jobType: job.job_type,
      format: format,
      quality: quality,
      isSDXL: isSDXL,
      filePath: filePath
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });

  } catch (error) {
    console.error('Error in job callback function:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});

async function handleImageJobCallback(supabase, job, status, filePath, errorMessage, quality, isSDXL) {
  console.log('Handling image job callback with SDXL support:', {
    jobId: job.id,
    imageId: job.image_id,
    status,
    filePath,
    jobType: job.job_type,
    quality,
    isSDXL
  });

  if (status === 'completed' && filePath) {
    // Update image record with model type information
    const updateData = {
      status: 'completed',
      image_url: filePath,
      thumbnail_url: filePath, // For now, use same path for thumbnail
      quality: quality,
      metadata: {
        ...(job.metadata || {}),
        model_type: isSDXL ? 'sdxl' : 'wan',
        is_sdxl: isSDXL,
        bucket: isSDXL ? `sdxl_${quality}` : `image_${quality}`
      }
    };

    const { error: imageError } = await supabase
      .from('images')
      .update(updateData)
      .eq('id', job.image_id);

    if (imageError) {
      console.error('Error updating image:', imageError);
    } else {
      console.log('Image job updated successfully with SDXL metadata:', {
        filePath,
        isSDXL,
        quality,
        bucket: isSDXL ? `sdxl_${quality}` : `image_${quality}`
      });
    }
  } else if (status === 'failed') {
    const { error: imageError } = await supabase
      .from('images')
      .update({
        status: 'failed'
      })
      .eq('id', job.image_id);

    if (imageError) {
      console.error('Error updating image status to failed:', imageError);
    } else {
      console.log('Image job marked as failed');
    }
  } else if (status === 'processing') {
    const { error: imageError } = await supabase
      .from('images')
      .update({
        status: 'generating'
      })
      .eq('id', job.image_id);

    if (imageError) {
      console.error('Error updating image status to generating:', imageError);
    } else {
      console.log('Image job marked as generating');
    }
  }
}

async function handleVideoJobCallback(supabase, job, status, filePath, errorMessage, quality) {
  console.log('Handling video job callback:', {
    jobId: job.id,
    videoId: job.video_id,
    status,
    filePath,
    jobType: job.job_type,
    quality
  });

  if (status === 'completed' && job.video_id && filePath) {
    const { error: videoError } = await supabase
      .from('videos')
      .update({
        status: 'completed',
        video_url: filePath,
        completed_at: new Date().toISOString()
      })
      .eq('id', job.video_id);

    if (videoError) {
      console.error('Error updating video:', videoError);
    } else {
      console.log('Video job updated successfully with filePath:', filePath);
    }
  }

  if (status === 'failed' && job.video_id) {
    const { error: videoError } = await supabase
      .from('videos')
      .update({
        status: 'failed',
        error_message: errorMessage
      })
      .eq('id', job.video_id);

    if (videoError) {
      console.error('Error updating video status to failed:', videoError);
    } else {
      console.log('Video job marked as failed');
    }
  }

  if (status === 'processing' && job.video_id) {
    const { error: videoError } = await supabase
      .from('videos')
      .update({
        status: 'processing'
      })
      .eq('id', job.video_id);

    if (videoError) {
      console.error('Error updating video status to processing:', videoError);
    } else {
      console.log('Video job marked as processing');
    }
  }
}
