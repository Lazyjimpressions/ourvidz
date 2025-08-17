
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface JobRequest {
  prompt: string;
  original_prompt?: string;
  job_type: 'sdxl_image_fast' | 'sdxl_image_high' | 'video_fast' | 'video_high' | 'wan_video_fast' | 'wan_video_high';
  quality?: 'fast' | 'high';
  format?: string;
  model_type?: string;
  enhanced_prompt?: string;
  reference_image_url?: string;
  reference_strength?: number;
  seed?: number;
  metadata?: any;
  // Advanced SDXL settings
  num_images?: number;
  steps?: number;
  guidance_scale?: number;
  negative_prompt?: string;
  compel_enabled?: boolean;
  compel_weights?: string;
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
    const validJobTypes = ['sdxl_image_fast', 'sdxl_image_high', 'video_fast', 'video_high', 'wan_video_fast', 'wan_video_high'];
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
    let templateName = 'none'; // Default template name
    
    // Always enhance if user_requested_enhancement or exact_copy_mode (to get template name)
    const shouldEnhance = (jobRequest.metadata?.user_requested_enhancement && 
                          !jobRequest.metadata?.skip_enhancement &&
                          jobRequest.metadata?.enhancement_model !== 'none') ||
                          jobRequest.metadata?.exact_copy_mode;

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
          templateName = enhanceResponse.data?.templateName || enhanceResponse.data?.strategy || enhanceResponse.data?.template_name || 'enhanced';
          console.log('✅ Prompt enhanced successfully', { templateName: templateName });
        } else {
          console.warn('⚠️ Enhancement failed, using original prompt', enhanceResponse.error);
          enhancedPrompt = originalPrompt;
          templateName = 'enhancement_failed';
        }
      } catch (error) {
        console.error('❌ Enhancement failed:', error);
        enhancedPrompt = originalPrompt;
        templateName = 'enhancement_error';
      }
    }

    // If no enhancement was requested or enhancement was skipped, use original prompt
    if (!enhancedPrompt) {
      enhancedPrompt = originalPrompt;
      templateName = 'original_prompt';
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
        template_name: templateName,
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
    const queueName = (jobRequest.job_type.startsWith('sdxl') || jobRequest.job_type.includes('image')) ? 'sdxl_queue' : 'wan_queue'
    
    // Translate job type for worker - WAN worker expects video_fast/video_high, not wan_video_fast/wan_video_high
    const workerJobType = jobRequest.job_type.startsWith('wan_video_') 
      ? jobRequest.job_type.replace('wan_video_', 'video_') 
      : jobRequest.job_type

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

    // Helper function to derive resolution from aspect ratio
    const getResolutionFromAspectRatio = (ratio?: string): string => {
      switch (ratio) {
        case '1:1': return '1024x1024';
        case '16:9': return '1024x576';
        case '9:16': return '576x1024';
        default: return '1024x1024';
      }
    };

    const queuePayload = {
      id: job.id,                    // Worker expects 'id' field
      type: workerJobType,           // Worker expects translated job type (video_fast instead of wan_video_fast)
      prompt: enhancedPrompt,        // Worker uses 'prompt' for generation
      user_id: user.id,              // snake_case for worker
      config: {
        num_images: dbFormat === 'video' ? 1 : (jobRequest.num_images || jobRequest.metadata?.num_images || 1),
        steps: jobRequest.steps || jobRequest.metadata?.steps || 25,
        guidance_scale: jobRequest.guidance_scale || jobRequest.metadata?.guidance_scale || 7.5,
        resolution: getResolutionFromAspectRatio(jobRequest.metadata?.aspect_ratio),
        seed: jobRequest.seed || jobRequest.metadata?.seed,
        negative_prompt: jobRequest.negative_prompt || jobRequest.metadata?.negative_prompt || undefined
      },
      metadata: {
        ...jobRequest.metadata,
        reference_image_url: jobRequest.reference_image_url,
        reference_strength: jobRequest.reference_strength,
        reference_type: jobRequest.metadata?.reference_type || 'style',
        nsfw_optimization: nsfwOptimization
      },
      compel_enabled: jobRequest.compel_enabled || jobRequest.metadata?.compel_enabled || false,
      compel_weights: jobRequest.compel_weights || jobRequest.metadata?.compel_weights || undefined,
      // Legacy fields for compatibility
      job_id: job.id,
      job_type: jobRequest.job_type,
      quality: quality,
      format: outputFormat,
      content_type: contentType
    }

    console.log(`📋 Enqueuing job ${job.id} to ${queueName}:`, {
      original_job_type: jobRequest.job_type,
      worker_job_type: workerJobType,
      config: queuePayload.config,
      has_metadata: !!queuePayload.metadata,
      compel_enabled: queuePayload.compel_enabled,
      legacy_fields: {
        job_type: jobRequest.job_type,
        format: outputFormat,
        quality: quality,
        content_type: contentType
      }
    });

    try {
      const enqueueResponse = await fetch(`${redisUrl}/rpush/${queueName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${redisToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(queuePayload)
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
