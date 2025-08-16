
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface JobRequest {
  prompt: string;
  original_prompt?: string;
  job_type: 'sdxl_image_fast' | 'sdxl_image_high' | 'video_fast' | 'video_high';
  quality?: 'fast' | 'high';
  format?: string;
  model_type?: string;
  enhanced_prompt?: string;
  reference_image_url?: string;
  reference_strength?: number;
  seed?: number;
  metadata?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Missing authorization', { status: 401, headers: corsHeaders })
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response('Invalid authorization', { status: 401, headers: corsHeaders })
    }

    const jobRequest: JobRequest = await req.json()

    // Validate job_type
    const validJobTypes = ['sdxl_image_fast', 'sdxl_image_high', 'video_fast', 'video_high'];
    if (!jobRequest.job_type || !validJobTypes.includes(jobRequest.job_type)) {
      return new Response(`Invalid job_type. Must be one of: ${validJobTypes.join(', ')}`, { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    // Determine original prompt - prefer original_prompt, fallback to prompt
    const originalPrompt = jobRequest.original_prompt || jobRequest.prompt;
    if (!originalPrompt) {
      return new Response('Missing required field: original_prompt or prompt', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    // Determine database format (image/video) vs output format (png/mp4)
    const dbFormat = jobRequest.job_type.includes('image') ? 'image' : 'video';
    const outputFormat = jobRequest.format || (jobRequest.job_type.includes('image') ? 'png' : 'mp4');
    const quality = jobRequest.quality || (jobRequest.job_type.includes('high') ? 'high' : 'fast');

    // Handle prompt enhancement if needed
    let enhancedPrompt = jobRequest.enhanced_prompt;
    const shouldEnhance = jobRequest.metadata?.user_requested_enhancement && 
                         !jobRequest.metadata?.skip_enhancement &&
                         jobRequest.metadata?.enhancement_model !== 'none';

    if (shouldEnhance && !enhancedPrompt) {
      try {
        console.log('🔧 Enhancing prompt before queuing job...', {
          model: jobRequest.metadata?.enhancement_model || 'qwen_instruct',
          contentType: jobRequest.metadata?.contentType || 'sfw'
        });
        
        const enhanceResponse = await supabaseClient.functions.invoke('enhance-prompt', {
          body: {
            prompt: originalPrompt,
            jobType: jobRequest.job_type,
            format: dbFormat,
            quality: quality,
            selectedModel: jobRequest.metadata?.enhancement_model || 'qwen_instruct',
            contentType: jobRequest.metadata?.contentType || 'sfw',
            metadata: jobRequest.metadata || {}
          }
        });

        if (enhanceResponse.data?.enhanced_prompt) {
          enhancedPrompt = enhanceResponse.data.enhanced_prompt;
          console.log('✅ Prompt enhanced successfully');
        } else {
          console.warn('⚠️ Enhancement failed, using original prompt', enhanceResponse.error);
          enhancedPrompt = originalPrompt;
        }
      } catch (error) {
        console.error('❌ Enhancement failed:', error);
        enhancedPrompt = originalPrompt;
      }
    }

    // If no enhancement was requested or enhancement was skipped, use original prompt
    if (!enhancedPrompt) {
      enhancedPrompt = originalPrompt;
    }

    // Create job record
    const { data: job, error: jobError } = await supabaseClient
      .from('jobs')
      .insert({
        user_id: user.id,
        job_type: jobRequest.job_type,
        status: 'queued',
        original_prompt: originalPrompt,
        enhanced_prompt: enhancedPrompt || originalPrompt,
        quality: quality,
        format: dbFormat,  // Store as 'image'/'video' in database
        model_type: jobRequest.model_type,
        metadata: {
          ...jobRequest.metadata,
          reference_image_url: jobRequest.reference_image_url,
          reference_strength: jobRequest.reference_strength,
          seed: jobRequest.seed
        }
      })
      .select()
      .single()

    if (jobError) {
      console.error('Failed to create job:', jobError)
      return new Response('Failed to create job', { status: 500, headers: corsHeaders })
    }

    // Determine queue based on job type
    const queueName = jobRequest.job_type.startsWith('sdxl') ? 'sdxl_queue' : 'wan_queue'

    // Enqueue to Redis
    const redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL')
    const redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')

    if (!redisUrl || !redisToken) {
      console.error('Redis configuration missing')
      return new Response('Queue service unavailable', { status: 503, headers: corsHeaders })
    }

    // Derive content type and NSFW optimization for worker
    const contentType = jobRequest.metadata?.contentType || 'sfw';
    const nsfwOptimization = contentType === 'nsfw';

    const queuePayload = {
      id: job.id,                    // Worker expects 'id' field
      job_id: job.id,               // Also include job_id for compatibility
      user_id: user.id,             // snake_case for worker
      job_type: jobRequest.job_type,
      original_prompt: originalPrompt,
      enhanced_prompt: enhancedPrompt,
      prompt: enhancedPrompt,       // Worker uses 'prompt' for generation
      quality: quality,
      format: outputFormat,         // Use output format (png/mp4) for worker
      model_type: jobRequest.model_type,
      reference_image_url: jobRequest.reference_image_url,
      reference_strength: jobRequest.reference_strength,
      seed: jobRequest.seed,
      content_type: contentType,
      nsfw_optimization: nsfwOptimization,
      metadata: jobRequest.metadata || {}
    }

    console.log(`📋 Enqueuing job ${job.id} to ${queueName}:`, {
      job_type: jobRequest.job_type,
      format: outputFormat,
      quality: quality,
      content_type: contentType,
      enhancement_model: jobRequest.metadata?.enhancement_model || 'none',
      has_reference: !!jobRequest.reference_image_url
    });

    try {
      const enqueueResponse = await fetch(`${redisUrl}/rpush/${queueName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${redisToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: JSON.stringify(queuePayload) })
      })

      if (!enqueueResponse.ok) {
        throw new Error(`Redis enqueue failed: ${enqueueResponse.status}`)
      }

      console.log(`✅ Job ${job.id} enqueued to ${queueName}`)

    } catch (error) {
      console.error('Failed to enqueue job:', error)
      
      // Update job status to failed
      await supabaseClient
        .from('jobs')
        .update({ 
          status: 'failed',
          error_message: 'Failed to enqueue job'
        })
        .eq('id', job.id)

      return new Response('Failed to enqueue job', { status: 500, headers: corsHeaders })
    }

    return new Response(
      JSON.stringify({ 
        jobId: job.id,
        status: 'queued',
        queueName,
        message: 'Job successfully queued'
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      },
    )

  } catch (error) {
    console.error('Queue job error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      },
    )
  }
})
