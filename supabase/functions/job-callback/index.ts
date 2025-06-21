
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

    const { jobId, status, result, error: jobError } = await req.json();

    console.log('Processing job callback:', { jobId, status });

    // Update job status
    const { data: job, error: updateError } = await supabase
      .from('jobs')
      .update({
        status,
        completed_at: status === 'completed' || status === 'failed' ? new Date().toISOString() : null,
        error_message: jobError || null,
        metadata: result || {}
      })
      .eq('id', jobId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating job:', updateError);
      throw updateError;
    }

    console.log('Job updated:', job);

    // If job completed successfully and has a video_id, update the video
    if (status === 'completed' && job.video_id && result?.video_url) {
      const { error: videoError } = await supabase
        .from('videos')
        .update({
          status: 'completed',
          video_url: result.video_url,
          thumbnail_url: result.thumbnail_url || null,
          completed_at: new Date().toISOString()
        })
        .eq('id', job.video_id);

      if (videoError) {
        console.error('Error updating video:', videoError);
      } else {
        console.log('Video updated successfully');
      }
    }

    // If job failed, mark video as failed
    if (status === 'failed' && job.video_id) {
      const { error: videoError } = await supabase
        .from('videos')
        .update({
          status: 'failed'
        })
        .eq('id', job.video_id);

      if (videoError) {
        console.error('Error updating video status to failed:', videoError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Job callback processed successfully'
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
