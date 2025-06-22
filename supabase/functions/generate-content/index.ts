
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateContentRequest {
  jobType: 'enhance' | 'image' | 'preview' | 'video';
  prompt: string;
  projectId?: string;
  videoId?: string;
  sceneId?: string;
  characterId?: string;
  metadata?: any;
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

    const requestData: GenerateContentRequest = await req.json();
    const { jobType, prompt, projectId, videoId, sceneId, characterId, metadata } = requestData;

    console.log('Creating content generation job:', { jobType, projectId, videoId, sceneId, userId: user.id });

    // Validate required fields
    if (!prompt) {
      throw new Error('Prompt is required');
    }

    if (!jobType) {
      throw new Error('Job type is required');
    }

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        job_type: jobType,
        metadata: {
          prompt,
          projectId,
          sceneId,
          characterId,
          ...metadata
        },
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

    // Format job payload for RunPod worker
    const jobPayload = {
      jobId: job.id,
      userId: user.id,
      jobType: jobType,
      prompt: prompt,
      projectId: projectId,
      videoId: videoId,
      sceneId: sceneId,
      characterId: characterId,
      metadata: metadata,
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
        action: `${jobType}_generation`,
        credits_consumed: 1,
        metadata: { job_id: job.id, project_id: projectId }
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        job,
        message: `${jobType} generation job queued successfully`,
        queueLength: redisResult.result || 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in generate-content function:', error);
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
