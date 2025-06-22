
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { jobId, status, outputUrl, errorMessage } = await req.json();

    console.log('Processing job callback:', { jobId, status, outputUrl });

    // Update job status
    const updateData: any = {
      status,
      completed_at: status === 'completed' || status === 'failed' ? new Date().toISOString() : null,
      error_message: errorMessage || null
    };

    // Add output URL to metadata if successful
    if (status === 'completed' && outputUrl) {
      updateData.metadata = { video_url: outputUrl };
    }

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

    console.log('Job updated:', job);

    // If job completed successfully and has a video_id, update the video
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
        console.log('Video updated successfully with URL:', outputUrl);
      }
    }

    // If job failed, mark video as failed
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
        console.log('Video marked as failed');
      }
    }

    // If job is processing, update video status
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
        console.log('Video marked as processing');
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Job callback processed successfully',
        jobStatus: status
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in job-callback function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
