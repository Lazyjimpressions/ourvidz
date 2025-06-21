
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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Authentication required');
    }

    const { jobType, metadata, projectId, videoId } = await req.json();

    console.log('Creating job:', { jobType, projectId, videoId, userId: user.id });

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        job_type: jobType,
        metadata: metadata || {},
        project_id: projectId,
        video_id: videoId,
        status: 'queued'
      })
      .select()
      .single();

    if (jobError) {
      console.error('Error creating job:', jobError);
      throw jobError;
    }

    console.log('Job created successfully:', job);

    // Log usage for credits
    await supabase
      .from('usage_logs')
      .insert({
        user_id: user.id,
        action: jobType,
        credits_consumed: 1,
        metadata: { job_id: job.id, project_id: projectId }
      });

    // TODO: Send job to RunPod queue when RunPod integration is ready
    // For now, we'll simulate the queuing process
    console.log('Job queued for processing - RunPod integration pending');

    return new Response(
      JSON.stringify({ 
        success: true, 
        job,
        message: 'Job queued successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in queue-job function:', error);
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
