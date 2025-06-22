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
    const { jobId, status, outputUrl, errorMessage, enhancedPrompt } = await req.json();
    console.log('Processing job callback:', {
      jobId,
      status,
      outputUrl,
      enhancedPrompt
    });
    // Get current job to preserve existing metadata
    const { data: currentJob, error: fetchError } = await supabase.from('jobs').select('metadata, job_type, image_id, video_id').eq('id', jobId).single();
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
    // Handle enhanced prompt for enhance jobs
    if (currentJob.job_type === 'enhance' && enhancedPrompt) {
      updatedMetadata.enhanced_prompt = enhancedPrompt;
      console.log('Storing enhanced prompt:', enhancedPrompt);
    }
    // Add output URL for completed jobs
    if (status === 'completed' && outputUrl) {
      updatedMetadata.output_url = outputUrl;
    }
    updateData.metadata = updatedMetadata;
    // Update job status
    const { data: job, error: updateError } = await supabase.from('jobs').update(updateData).eq('id', jobId).select().single();
    if (updateError) {
      console.error('Error updating job:', updateError);
      throw updateError;
    }
    console.log('Job updated:', job);
    // Handle different job types
    if (job.job_type === 'image' && job.image_id) {
      await handleImageJobCallback(supabase, job, status, outputUrl, errorMessage);
    } else if (job.job_type === 'video' && job.video_id) {
      await handleVideoJobCallback(supabase, job, status, outputUrl, errorMessage);
    } else if (job.job_type === 'preview' && job.video_id) {
      await handlePreviewJobCallback(supabase, job, status, outputUrl, errorMessage);
    } else if (job.job_type === 'enhance') {
      await handleEnhanceJobCallback(supabase, job, status, enhancedPrompt, errorMessage);
    }
    return new Response(JSON.stringify({
      success: true,
      message: 'Job callback processed successfully',
      jobStatus: status
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Error in job-callback function:', error);
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
async function handleEnhanceJobCallback(supabase, job, status, enhancedPrompt, errorMessage) {
  console.log('Handling enhance job callback:', {
    jobId: job.id,
    status,
    enhancedPrompt
  });
  // For enhance jobs, we don't need to update any other tables
  // The enhanced prompt is already stored in the job metadata
  if (status === 'completed' && enhancedPrompt) {
    console.log('Enhanced prompt stored successfully for job:', job.id);
  } else if (status === 'failed') {
    console.log('Enhance job failed:', job.id, errorMessage);
  }
}
async function handlePreviewJobCallback(supabase, job, status, outputUrl, errorMessage) {
  console.log('Handling preview job callback:', {
    jobId: job.id,
    videoId: job.video_id,
    status,
    outputUrl
  });
  if (status === 'completed' && job.video_id && outputUrl) {
    console.log('Updating video with preview URL:', outputUrl);
    const { error: videoError } = await supabase.from('videos').update({
      status: 'completed',
      preview_url: outputUrl,
      completed_at: new Date().toISOString()
    }).eq('id', job.video_id);
    if (videoError) {
      console.error('Error updating video with preview URL:', videoError);
    } else {
      console.log('Video updated successfully with preview URL:', outputUrl);
    }
  } else if (status === 'failed' && job.video_id) {
    console.log('Preview generation failed, updating video status');
    const { error: videoError } = await supabase.from('videos').update({
      status: 'failed',
      error_message: errorMessage
    }).eq('id', job.video_id);
    if (videoError) {
      console.error('Error updating video status to failed:', videoError);
    } else {
      console.log('Video marked as failed');
    }
  } else if (status === 'processing' && job.video_id) {
    const { error: videoError } = await supabase.from('videos').update({
      status: 'processing'
    }).eq('id', job.video_id);
    if (videoError) {
      console.error('Error updating video status to processing:', videoError);
    } else {
      console.log('Video marked as processing');
    }
  }
}
async function handleImageJobCallback(supabase, job, status, outputUrl, errorMessage) {
  if (status === 'completed' && outputUrl) {
    const { error: imageError } = await supabase.from('images').update({
      status: 'completed',
      image_url: outputUrl,
      thumbnail_url: outputUrl // For now, use same URL for thumbnail
    }).eq('id', job.image_id);
    if (imageError) {
      console.error('Error updating image:', imageError);
    } else {
      console.log('Image updated successfully with URL:', outputUrl);
    }
  } else if (status === 'failed') {
    const { error: imageError } = await supabase.from('images').update({
      status: 'failed'
    }).eq('id', job.image_id);
    if (imageError) {
      console.error('Error updating image status to failed:', imageError);
    } else {
      console.log('Image marked as failed');
    }
  } else if (status === 'processing') {
    const { error: imageError } = await supabase.from('images').update({
      status: 'generating'
    }).eq('id', job.image_id);
    if (imageError) {
      console.error('Error updating image status to generating:', imageError);
    } else {
      console.log('Image marked as generating');
    }
  }
}
async function handleVideoJobCallback(supabase, job, status, outputUrl, errorMessage) {
  if (status === 'completed' && job.video_id && outputUrl) {
    const { error: videoError } = await supabase.from('videos').update({
      status: 'completed',
      video_url: outputUrl,
      completed_at: new Date().toISOString()
    }).eq('id', job.video_id);
    if (videoError) {
      console.error('Error updating video:', videoError);
    } else {
      console.log('Video updated successfully with URL:', outputUrl);
    }
  }
  if (status === 'failed' && job.video_id) {
    const { error: videoError } = await supabase.from('videos').update({
      status: 'failed',
      error_message: errorMessage
    }).eq('id', job.video_id);
    if (videoError) {
      console.error('Error updating video status to failed:', videoError);
    } else {
      console.log('Video marked as failed');
    }
  }
  if (status === 'processing' && job.video_id) {
    const { error: videoError } = await supabase.from('videos').update({
      status: 'processing'
    }).eq('id', job.video_id);
    if (videoError) {
      console.error('Error updating video status to processing:', videoError);
    } else {
      console.log('Video marked as processing');
    }
  }
}
