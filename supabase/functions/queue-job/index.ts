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
    console.log('🚀 Queue-job function called - redeployed version');
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')
        }
      }
    });
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ Authentication failed:', userError?.message);
      throw new Error('Authentication required');
    }
    console.log('✅ User authenticated:', user.id);
    const { jobType, metadata, projectId, videoId, imageId } = await req.json();
    console.log('📋 Creating job with clean job type:', {
      jobType,
      projectId,
      videoId,
      imageId,
      userId: user.id,
      modelVariant: metadata?.model_variant
    });
    // Extract format and quality from the clean job type
    const [format, quality] = jobType.split('_'); // e.g., 'image_fast' -> ['image', 'fast']
    const modelVariant = metadata?.model_variant || 'wan_2_1_1_3b'; // FIXED: Always use 1.3B model
    // Create job record with clean job type
    const { data: job, error: jobError } = await supabase.from('jobs').insert({
      user_id: user.id,
      job_type: jobType,
      format: format,
      quality: quality,
      model_type: jobType,
      metadata: {
        ...metadata,
        model_variant: modelVariant,
        clean_job_type: true
      },
      project_id: projectId,
      video_id: videoId,
      image_id: imageId,
      status: 'queued'
    }).select().single();
    if (jobError) {
      console.error('❌ Error creating job:', jobError);
      throw jobError;
    }
    console.log('✅ Job created successfully:', job.id);
    // Get project details for the prompt (if projectId provided)
    let prompt = '';
    let characterId = null;
    if (projectId) {
      const { data: project, error: projectError } = await supabase.from('projects').select('enhanced_prompt, original_prompt, character_id').eq('id', projectId).single();
      if (!projectError && project) {
        prompt = project.enhanced_prompt || project.original_prompt || '';
        characterId = project.character_id;
      }
    }
    // Use prompt from metadata if no project prompt available
    if (!prompt && metadata?.prompt) {
      prompt = metadata.prompt;
    }
    // Format job payload for RunPod worker with clean job type
    const jobPayload = {
      jobId: job.id,
      videoId: videoId,
      imageId: imageId,
      userId: user.id,
      jobType: jobType,
      format: format,
      quality: quality,
      modelType: jobType,
      modelVariant: modelVariant,
      prompt: prompt,
      characterId: characterId,
      cleanJobTypeConfig: {
        model: modelVariant,
        singleFrame: format === 'image',
        resolution: quality === 'high' ? '1280x720' : '832x480',
        steps: format === 'image' ? quality === 'high' ? 25 : 20 : 30
      },
      metadata: {
        ...metadata,
        model_variant: modelVariant,
        clean_job_type: true
      },
      timestamp: new Date().toISOString()
    };
    console.log('📤 Pushing job to Redis queue:', {
      jobId: job.id,
      jobType
    });
    // Push job to Upstash Redis using REST API
    const redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
    const redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
    if (!redisUrl || !redisToken) {
      console.error('❌ Redis configuration missing');
      throw new Error('Redis configuration missing');
    }
    // Use LPUSH to add job to the queue (worker uses RPOP)
    const redisResponse = await fetch(`${redisUrl}/lpush/job_queue`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${redisToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(jobPayload)
    });
    if (!redisResponse.ok) {
      const redisError = await redisResponse.text();
      console.error('❌ Redis push failed:', redisError);
      throw new Error(`Failed to queue job in Redis: ${redisError}`);
    }
    const redisResult = await redisResponse.json();
    console.log('✅ Job queued in Redis successfully:', redisResult);
    // Log usage with clean job type tracking
    await supabase.from('usage_logs').insert({
      user_id: user.id,
      action: jobType,
      format: format,
      quality: quality,
      credits_consumed: metadata.credits || 1,
      metadata: {
        job_id: job.id,
        project_id: projectId,
        image_id: imageId,
        video_id: videoId,
        model_type: jobType,
        model_variant: modelVariant,
        clean_job_type: true
      }
    });
    console.log('📈 Usage logged successfully');
    return new Response(JSON.stringify({
      success: true,
      job,
      message: 'Job queued successfully - redeployed version',
      queueLength: redisResult.result || 0,
      modelVariant: modelVariant,
      jobType: jobType
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('❌ Error in queue-job function:', error);
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
