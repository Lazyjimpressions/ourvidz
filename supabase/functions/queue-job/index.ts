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
    console.log('🚀 Queue-job function called - Enhanced SDXL dual worker version');
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
      return new Response(JSON.stringify({
        error: 'Authentication required',
        success: false,
        details: userError?.message
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 401
      });
    }
    console.log('✅ User authenticated:', user.id);
    const { jobType, metadata, projectId, videoId, imageId } = await req.json();
    console.log('📋 Creating job with enhanced dual worker routing:', {
      jobType,
      projectId,
      videoId,
      imageId,
      userId: user.id,
      queue: metadata?.queue,
      timestamp: new Date().toISOString()
    });
    // Enhanced job type validation
    const validJobTypes = [
      'sdxl_image_fast',
      'sdxl_image_high',
      'image_fast',
      'image_high',
      'video_fast',
      'video_high',
      'image7b_fast_enhanced',
      'image7b_high_enhanced',
      'video7b_fast_enhanced',
      'video7b_high_enhanced'
    ];
    if (!validJobTypes.includes(jobType)) {
      console.error('❌ Invalid job type provided:', jobType);
      console.log('✅ Valid job types:', validJobTypes);
      return new Response(JSON.stringify({
        error: `Invalid job type: ${jobType}`,
        success: false,
        validJobTypes: validJobTypes
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    // Extract format and quality from job type
    const [format, quality] = jobType.split('_').slice(-2); // Get last 2 parts
    const isSDXL = jobType.startsWith('sdxl_');
    const modelVariant = isSDXL ? 'lustify_sdxl' : 'wan_2_1_1_3b';
    // Determine queue routing - all enhanced jobs use wan_queue
    const queueName = isSDXL ? 'sdxl_queue' : 'wan_queue';
    console.log('🎯 Enhanced job routing determined:', {
      isSDXL,
      queueName,
      modelVariant,
      format,
      quality,
      originalJobType: jobType
    });
    // Validate Redis configuration
    const redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
    const redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
    if (!redisUrl || !redisToken) {
      console.error('❌ Redis configuration missing:', {
        hasUrl: !!redisUrl,
        hasToken: !!redisToken
      });
      return new Response(JSON.stringify({
        error: 'Redis configuration missing',
        success: false,
        details: 'UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not configured'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    // Create job record with enhanced error handling
    const { data: job, error: jobError } = await supabase.from('jobs').insert({
      user_id: user.id,
      job_type: jobType,
      format: format,
      quality: quality,
      model_type: jobType,
      metadata: {
        ...metadata,
        model_variant: modelVariant,
        queue: queueName,
        dual_worker_routing: true,
        created_timestamp: new Date().toISOString()
      },
      project_id: projectId,
      video_id: videoId,
      image_id: imageId,
      status: 'queued'
    }).select().single();
    if (jobError) {
      console.error('❌ Error creating job in database:', {
        error: jobError,
        jobType,
        userId: user.id,
        format,
        quality
      });
      return new Response(JSON.stringify({
        error: 'Failed to create job record',
        success: false,
        details: jobError.message,
        jobType: jobType
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    console.log('✅ Job created successfully in database:', job.id);
    // Get project details for the prompt (if projectId provided)
    let prompt = '';
    let characterId = null;
    if (projectId) {
      const { data: project, error: projectError } = await supabase.from('projects').select('enhanced_prompt, original_prompt, character_id').eq('id', projectId).single();
      if (!projectError && project) {
        prompt = project.enhanced_prompt || project.original_prompt || '';
        characterId = project.character_id;
        console.log('📄 Project prompt retrieved:', {
          projectId,
          hasPrompt: !!prompt
        });
      } else {
        console.warn('⚠️ Could not retrieve project prompt:', projectError?.message);
      }
    }
    // Use prompt from metadata if no project prompt available
    if (!prompt && metadata?.prompt) {
      prompt = metadata.prompt;
      console.log('📝 Using metadata prompt');
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
      numImages: format === 'video' ? 1 : 6,
      bucket: metadata?.bucket || (isSDXL ? `sdxl_image_${quality}` : `${format}_${quality}`),
      metadata: {
        ...metadata,
        model_variant: modelVariant,
        dual_worker_routing: true,
        num_images: format === 'video' ? 1 : 6,
        queue_timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };
    console.log('📤 Pushing job to Redis queue with enhanced payload:', {
      jobId: job.id,
      jobType,
      queueName,
      isSDXL,
      hasPrompt: !!prompt,
      payloadSize: JSON.stringify(jobPayload).length
    });
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
      console.error('❌ Redis push failed:', {
        status: redisResponse.status,
        statusText: redisResponse.statusText,
        error: redisError,
        queueName,
        jobId: job.id
      });
      // Update job status to failed
      await supabase.from('jobs').update({
        status: 'failed',
        error_message: `Redis queue failed: ${redisError}`
      }).eq('id', job.id);
      return new Response(JSON.stringify({
        error: `Failed to queue job in Redis: ${redisError}`,
        success: false,
        details: {
          redisStatus: redisResponse.status,
          queueName,
          jobId: job.id
        }
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    const redisResult = await redisResponse.json();
    console.log('✅ Job queued in Redis successfully:', {
      jobId: job.id,
      queueLength: redisResult.result || 0,
      queueName
    });
    // Log usage with enhanced dual worker tracking
    const usageLogResult = await supabase.from('usage_logs').insert({
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
        dual_worker_routing: true,
        usage_timestamp: new Date().toISOString()
      }
    });
    if (usageLogResult.error) {
      console.warn('⚠️ Usage logging failed:', usageLogResult.error);
    } else {
      console.log('📈 Usage logged successfully');
    }
    return new Response(JSON.stringify({
      success: true,
      job,
      message: 'Job queued successfully - Enhanced SDXL dual worker version',
      queueLength: redisResult.result || 0,
      modelVariant: modelVariant,
      jobType: jobType,
      queue: queueName,
      isSDXL: isSDXL,
      debug: {
        userId: user.id,
        hasPrompt: !!prompt,
        redisConfigured: true,
        timestamp: new Date().toISOString()
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('❌ Unhandled error in queue-job function:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    return new Response(JSON.stringify({
      error: error.message,
      success: false,
      details: 'Unhandled server error',
      timestamp: new Date().toISOString()
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
