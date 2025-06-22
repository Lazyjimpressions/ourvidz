
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

    const { jobType, metadata, projectId, videoId, imageId } = await req.json();

    console.log('Creating job:', { jobType, projectId, videoId, imageId, userId: user.id });

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        job_type: jobType,
        metadata: metadata || {},
        project_id: projectId,
        video_id: videoId,
        image_id: imageId, // Now properly handling imageId
        status: 'queued'
      })
      .select()
      .single();

    if (jobError) {
      console.error('Error creating job:', jobError);
      throw jobError;
    }

    console.log('Job created successfully:', job);

    // Get project details for the prompt (if projectId provided)
    let prompt = '';
    let characterId = null;
    
    if (projectId) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('enhanced_prompt, original_prompt, character_id')
        .eq('id', projectId)
        .single();
      
      if (!projectError && project) {
        prompt = project.enhanced_prompt || project.original_prompt || '';
        characterId = project.character_id;
      }
    }

    // Use prompt from metadata if no project prompt available
    if (!prompt && metadata?.prompt) {
      prompt = metadata.prompt;
    }

    // Format job payload for RunPod worker with standardized structure
    const jobPayload = {
      jobId: job.id,
      videoId: videoId,
      imageId: imageId, // Include imageId for image jobs
      userId: user.id,
      jobType: jobType,
      prompt: prompt,
      characterId: characterId,
      metadata: metadata || {},
      timestamp: new Date().toISOString()
    };

    console.log('Pushing job to Redis queue:', jobPayload);

    // Push job to Upstash Redis using REST API
    const redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
    const redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

    if (!redisUrl || !redisToken) {
      throw new Error('Redis configuration missing');
    }

    // Use LPUSH to add job to the queue (worker uses RPOP)
    const redisResponse = await fetch(`${redisUrl}/lpush/ourvidz_job_queue`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${redisToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jobPayload)
    });

    if (!redisResponse.ok) {
      const redisError = await redisResponse.text();
      console.error('Redis push failed:', redisError);
      throw new Error(`Failed to queue job in Redis: ${redisError}`);
    }

    const redisResult = await redisResponse.json();
    console.log('Job queued in Redis successfully:', redisResult);

    // Log usage for credits
    await supabase
      .from('usage_logs')
      .insert({
        user_id: user.id,
        action: jobType,
        credits_consumed: 1,
        metadata: { job_id: job.id, project_id: projectId, image_id: imageId, video_id: videoId }
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        job,
        message: 'Job queued successfully in Redis',
        queueLength: redisResult.result || 0
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
