
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
    console.log('🚀 Queue-job function called - SDXL dual worker version');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization')
          }
        }
      }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ Authentication failed:', userError?.message);
      throw new Error('Authentication required');
    }
    console.log('✅ User authenticated:', user.id);

    const { jobType, metadata, projectId, videoId, imageId } = await req.json();
    
    console.log('📋 Creating job with dual worker routing:', {
      jobType,
      projectId,
      videoId,
      imageId,
      userId: user.id,
      queue: metadata?.queue
    });

    // Validate job type
    const validJobTypes = [
      'sdxl_image_fast', 'sdxl_image_high',
      'image_fast', 'image_high', 
      'video_fast', 'video_high'
    ];
    
    if (!validJobTypes.includes(jobType)) {
      throw new Error(`Invalid job type: ${jobType}`);
    }

    // Extract format and quality from job type
    const [format, quality] = jobType.split('_').slice(-2); // Get last 2 parts
    const isSDXL = jobType.startsWith('sdxl_');
    const modelVariant = isSDXL ? 'lustify_sdxl' : 'wan_2_1_1_3b';
    
    // Determine queue routing
    const queueName = isSDXL ? 'sdxl_queue' : 'wan_queue';
    
    console.log('🎯 Job routing determined:', {
      isSDXL,
      queueName,
      modelVariant,
      format,
      quality
    });

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        job_type: jobType,
        format: format,
        quality: quality,
        model_type: jobType,
        metadata: {
          ...metadata,
          model_variant: modelVariant,
          queue: queueName,
          dual_worker_routing: true
        },
        project_id: projectId,
        video_id: videoId,
        image_id: imageId,
        status: 'queued'
      })
      .select()
      .single();

    if (jobError) {
      console.error('❌ Error creating job:', jobError);
      throw jobError;
    }
    console.log('✅ Job created successfully:', job.id);

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

    // Format job payload for appropriate worker
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
      isSDXL: isSDXL,
      bucket: metadata?.bucket || (isSDXL ? `sdxl_${quality}` : `${format}_${quality}`),
      metadata: {
        ...metadata,
        model_variant: modelVariant,
        dual_worker_routing: true
      },
      timestamp: new Date().toISOString()
    };

    console.log('📤 Pushing job to Redis queue:', {
      jobId: job.id,
      jobType,
      queueName
    });

    // Push job to appropriate Upstash Redis queue
    const redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
    const redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
    
    if (!redisUrl || !redisToken) {
      console.error('❌ Redis configuration missing');
      throw new Error('Redis configuration missing');
    }

    // Use LPUSH to add job to the appropriate queue (worker uses RPOP)
    const redisResponse = await fetch(`${redisUrl}/lpush/${queueName}`, {
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

    // Log usage with dual worker tracking
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
        queue: queueName,
        dual_worker_routing: true
      }
    });

    console.log('📈 Usage logged successfully');

    return new Response(JSON.stringify({
      success: true,
      job,
      message: 'Job queued successfully - SDXL dual worker version',
      queueLength: redisResult.result || 0,
      modelVariant: modelVariant,
      jobType: jobType,
      queue: queueName,
      isSDXL: isSDXL
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
