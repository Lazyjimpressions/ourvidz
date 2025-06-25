
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

    const { jobId, status, outputUrl, errorMessage, enhancedPrompt } = await req.json();

    console.log('Processing clean job type callback:', {
      jobId,
      status,
      outputUrl,
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

    // Add output URL for completed jobs
    if (status === 'completed' && outputUrl) {
      updatedMetadata.output_url = outputUrl;
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

    console.log('Clean job type updated:', job);

    // Handle different job types based on clean job type format
    const [format, quality] = job.job_type.split('_'); // e.g., 'image_fast' -> ['image', 'fast']

    if (format === 'image' && job.image_id) {
      await handleImageJobCallback(supabase, job, status, outputUrl, errorMessage);
    } else if (format === 'video' && job.video_id) {
      await handleVideoJobCallback(supabase, job, status, outputUrl, errorMessage);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Clean job type callback processed successfully',
      jobStatus: status,
      jobType: job.job_type,
      format: format,
      quality: quality
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });

  } catch (error) {
    console.error('Error in clean job type callback function:', error);
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

async function handleImageJobCallback(supabase, job, status, outputUrl, errorMessage) {
  console.log('Handling clean image job callback:', {
    jobId: job.id,
    imageId: job.image_id,
    status,
    outputUrl,
    jobType: job.job_type
  });

  if (status === 'completed' && outputUrl) {
    const { error: imageError } = await supabase
      .from('images')
      .update({
        status: 'completed',
        image_url: outputUrl,
        thumbnail_url: outputUrl // For now, use same URL for thumbnail
      })
      .eq('id', job.image_id);

    if (imageError) {
      console.error('Error updating image:', imageError);
    } else {
      console.log('Clean image job updated successfully with URL:', outputUrl);
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
      console.log('Clean image job marked as failed');
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
      console.log('Clean image job marked as generating');
    }
  }
}

async function handleVideoJobCallback(supabase, job, status, outputUrl, errorMessage) {
  console.log('Handling clean video job callback:', {
    jobId: job.id,
    videoId: job.video_id,
    status,
    outputUrl,
    jobType: job.job_type
  });

  if (status === 'completed' && job.video_id && outputUrl) {
    const { error: videoError } = await supabase
      .from('videos')
      .update({
        status: 'completed',
        video_url: outputUrl,
        completed_at: new Date().toISOString()
      })
      .eq('id', job.video_id);

    if (videoError) {
      console.error('Error updating video:', videoError);
    } else {
      console.log('Clean video job updated successfully with URL:', outputUrl);
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
      console.log('Clean video job marked as failed');
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
      console.log('Clean video job marked as processing');
    }
  }
}
