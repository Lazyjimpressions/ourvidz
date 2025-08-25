
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// I2I constants
const DENOISE_COPY_MAX = 0.05;   // promptless exact copy
const DENOISE_MOD_MIN = 0.35;    // reference modify - increased for better changes
const DENOISE_MOD_MAX = 0.65;    // reference modify - increased for better changes
const CFG_COPY = 1.0;
const CFG_MOD_MIN = 4.0;
const CFG_MOD_MAX = 7.0;
const STEPS_COPY_MIN = 6;
const STEPS_COPY_MAX = 10;
const STEPS_MOD_MIN = 15;
const STEPS_MOD_DEFAULT = 25;
const STEPS_MOD_MAX = 30;

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
  denoise_strength?: number;
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

    // Normalize incoming fields
    const body = jobRequest;
    const originalPrompt = jobRequest.original_prompt || jobRequest.prompt || '';
    const userMetadata = jobRequest.metadata || {};

    const exactCopyMode = !!userMetadata.exact_copy_mode;
    let referenceUrl = userMetadata.reference_image_url || jobRequest.reference_image_url || null;
    const hasOriginalEnhancedPrompt = !!userMetadata.originalEnhancedPrompt;

    // Queue-time signing optimization: sign storage path reference URLs
    if (referenceUrl && (referenceUrl.startsWith('user-library/') || referenceUrl.startsWith('workspace-temp/'))) {
      try {
        const bucketName = referenceUrl.startsWith('user-library/') ? 'user-library' : 'workspace-temp';
        const { data: signedData, error: signError } = await supabaseClient.storage
          .from(bucketName)
          .createSignedUrl(referenceUrl.replace(`${bucketName}/`, ''), 3600); // 1 hour TTL

        if (!signError && signedData?.signedUrl) {
          referenceUrl = signedData.signedUrl;
          console.log('✅ Queue-time reference URL signed:', { originalPath: referenceUrl, bucket: bucketName });
        } else {
          console.warn('⚠️ Failed to sign reference URL:', signError);
        }
      } catch (error) {
        console.warn('⚠️ Reference URL signing failed:', error);
        // Continue with original URL
      }
    }
    const userPromptTrim = (originalPrompt || '').trim();

    // Standardize strength: prefer denoise_strength; map reference_strength if sent
    let denoise = typeof jobRequest.denoise_strength === 'number'
      ? jobRequest.denoise_strength
      : (typeof jobRequest.reference_strength === 'number' ? (1 - jobRequest.reference_strength) : undefined);

    // Resolve guidance and steps (optional overrides)
    let cfg = typeof jobRequest.guidance_scale === 'number'
      ? jobRequest.guidance_scale
      : (typeof userMetadata.guidance_scale === 'number' ? userMetadata.guidance_scale : undefined);

    let steps = typeof jobRequest.steps === 'number'
      ? jobRequest.steps
      : (typeof userMetadata.steps === 'number' ? userMetadata.steps : undefined);

    // Detect I2I branch with explicit, mutually exclusive predicates
    const isPromptlessUploadedExactCopy =
      exactCopyMode === true &&
      !!referenceUrl &&
      !hasOriginalEnhancedPrompt &&
      userPromptTrim.length === 0;

    const isReferenceModify =
      !!referenceUrl &&
      !isPromptlessUploadedExactCopy &&
      (
        userMetadata.reference_mode === 'modify' ||  // explicit override from client
        hasOriginalEnhancedPrompt ||                 // workspace/library item
        userPromptTrim.length > 0                    // uploaded with a modification prompt
      );

    // Determine database format (image/video) vs output format (png/mp4)
    const dbFormat = jobRequest.job_type.includes('image') ? 'image' : 'video';
    const outputFormat = jobRequest.format || (jobRequest.job_type.includes('image') ? 'png' : 'mp4');
    const quality = jobRequest.quality || (jobRequest.job_type.includes('high') ? 'high' : 'fast');

    // Enhancement decision
    let enhancedPrompt = jobRequest.enhanced_prompt || originalPrompt;
    let templateName = 'original_prompt';
    let shouldEnhance = false; // Initialize to track enhancement attempts

    if (isPromptlessUploadedExactCopy) {
      // Skip enhancement entirely
      enhancedPrompt = originalPrompt; // often empty; worker ignores prompt in copy branch
      templateName = 'exact_copy_skip_enhance';
    } else if (isReferenceModify) {
      // CRITICAL FIX: Always enhance when user provides modification, even with originalEnhancedPrompt
      shouldEnhance = 
        userPromptTrim.length > 0 && 
        !(userMetadata.skip_enhancement === true);

      if (shouldEnhance) {
        try {
          const enhanceResponse = await supabaseClient.functions.invoke('enhance-prompt', {
            body: {
              prompt: originalPrompt,
              jobType: jobRequest.job_type,
              format: jobRequest.job_type.includes('image') ? 'image' : 'video',
              quality: jobRequest.quality || (jobRequest.job_type.includes('high') ? 'high' : 'fast'),
              selectedModel: userMetadata?.enhancement_model || 'qwen_instruct',
              contentType: userMetadata?.contentType || 'sfw',
              metadata: { 
                reference_mode: 'modify', 
                exact_copy_mode: false, 
                original_enhanced_prompt: userMetadata.originalEnhancedPrompt,
                ...userMetadata 
              }
            }
          });
          if (enhanceResponse?.data?.enhanced_prompt) {
            enhancedPrompt = enhanceResponse.data.enhanced_prompt;
            templateName = enhanceResponse.data?.enhancement_metadata?.template_name || 'enhanced_modify';
          } else {
            // Fallback: compose manually if enhancement fails
            const basePrompt = userMetadata.originalEnhancedPrompt || 'maintain the same subject';
            enhancedPrompt = `${basePrompt}, ${userPromptTrim}`;
            templateName = 'manual_compose_fallback';
          }
        } catch (error) {
          console.warn('⚠️ Enhancement failed, using fallback composition:', error);
          // Fallback: compose manually if enhancement errors
          const basePrompt = userMetadata.originalEnhancedPrompt || 'maintain the same subject';
          enhancedPrompt = `${basePrompt}, ${userPromptTrim}`;
          templateName = 'manual_compose_error';
        }
      } else {
        // Use original prompt (from metadata if provided)
        enhancedPrompt = userMetadata.originalEnhancedPrompt || originalPrompt;
        templateName = hasOriginalEnhancedPrompt ? 'original_from_metadata' : 'original_prompt';
      }
    } else {
      // Non-exact-copy flows (txt2img/video): keep existing enhancement logic
      const shouldEnhance = (jobRequest.metadata?.user_requested_enhancement && 
                            !jobRequest.metadata?.skip_enhancement &&
                            jobRequest.metadata?.enhancement_model !== 'none');

      if (shouldEnhance && !jobRequest.enhanced_prompt) {
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
            templateName = enhanceResponse.data?.enhancement_metadata?.template_name || 
                           enhanceResponse.data?.templateUsed || 
                           enhanceResponse.data?.strategy || 
                           enhanceResponse.data?.templateName || 
                           enhanceResponse.data?.template_name || 'enhanced';
            console.log('✅ Prompt enhanced successfully', { 
              templateName, 
              tokenCount: enhanceResponse.data?.enhancement_metadata?.token_count,
              enhancementData: enhanceResponse.data 
            });
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
    }

    // Clamp and finalize denoise/cfg/steps
    if (isPromptlessUploadedExactCopy) {
      denoise = Math.min(typeof denoise === 'number' ? denoise : 0.04, DENOISE_COPY_MAX);
      cfg = CFG_COPY;
      steps = Math.max(STEPS_COPY_MIN, Math.min(typeof steps === 'number' ? steps : 8, STEPS_COPY_MAX));
      // Remove negative prompts in this branch
      jobRequest.negative_prompt = undefined;
    } else if (isReferenceModify) {
      const d = typeof denoise === 'number' ? denoise : 0.5; // FIXED: Default to 0.5 for better changes
      denoise = Math.max(DENOISE_MOD_MIN, Math.min(d, DENOISE_MOD_MAX));

      const g = typeof cfg === 'number' ? cfg : 6.0;
      cfg = Math.max(CFG_MOD_MIN, Math.min(g, CFG_MOD_MAX));

      const s = typeof steps === 'number' ? steps : STEPS_MOD_DEFAULT;
      steps = Math.max(STEPS_MOD_MIN, Math.min(s, STEPS_MOD_MAX));
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
        format: dbFormat,
        model_type: jobRequest.model_type,
        metadata: {
          ...jobRequest.metadata,
          reference_image_url: referenceUrl || jobRequest.reference_image_url,
          reference_strength: jobRequest.reference_strength,
          denoise_strength: denoise,
          guidance_scale: cfg,
          steps: steps,
          seed: jobRequest.seed,
          enhancement_metadata: {
            template_name: templateName,
            enhancement_model: jobRequest.metadata?.enhancement_model || 'qwen_instruct',
            content_mode: jobRequest.metadata?.contentType || 'sfw'
          }
        }
      })
      .select()
      .single()

    if (jobError) {
      console.error('Failed to create job:', jobError)
      return new Response('Failed to create job', { status: 500, headers: corsHeaders })
    }

    // Build worker payload
    const isImageJob = jobRequest.job_type.includes('image');
    const pipeline = (isPromptlessUploadedExactCopy || isReferenceModify) ? 'img2img' : (isImageJob ? 'txt2img' : 'video');

    const getResolutionFromAspectRatio = (ratio?: string): string => {
      switch (ratio) {
        case '1:1': return '1024x1024';
        case '16:9': return '1024x576';
        case '9:16': return '576x1024';
        default: return '1024x1024';
      }
    };

    // Clamp batch size to SDXL worker requirements [1, 3, 6]
    const batchCount = isImageJob ? (jobRequest.num_images || userMetadata.num_images || 1) : 1;
    const clampedBatchCount = batchCount <= 1 ? 1 : (batchCount <= 3 ? 3 : 6);

    const queuePayload = {
      id: job.id,
      type: jobRequest.job_type.replace('wan_video_', 'video_'),
      prompt: enhancedPrompt,
      user_id: user.id,
      config: {
        pipeline,                 // 'img2img' for I2I branches
        num_images: clampedBatchCount,
        num_inference_steps: steps,  // ✅ FIXED: Worker expects num_inference_steps, not steps
        guidance_scale: cfg,
        denoise_strength: denoise,
        resolution: getResolutionFromAspectRatio(userMetadata?.aspect_ratio),
        seed: jobRequest.seed || userMetadata.seed
      },
      metadata: {
        ...userMetadata,
        // ✅ CRITICAL: Include strength parameters for worker
        denoise_strength: denoise,
        reference_strength: jobRequest.reference_strength,
        exact_copy_mode: isPromptlessUploadedExactCopy,
        reference_mode: isReferenceModify ? 'modify' : (isPromptlessUploadedExactCopy ? 'copy' : undefined),
        reference_image_url: referenceUrl || undefined,
        // Keep original prompt/seed context for pure-inference workers
        originalEnhancedPrompt: userMetadata.originalEnhancedPrompt || undefined,
        originalSeed: userMetadata.seed || undefined,
        reference_type: userMetadata.reference_type || (isPromptlessUploadedExactCopy ? 'character' : 'style'),
        nsfw_optimization: (userMetadata.contentType || 'sfw') === 'nsfw'
      },
      // ✅ FIXED: Only include negative_prompt for modify/txt2img flows
      negative_prompt: isPromptlessUploadedExactCopy ? undefined : (jobRequest.negative_prompt || userMetadata.negative_prompt),
      compel_enabled: jobRequest.compel_enabled || userMetadata.compel_enabled || false,
      compel_weights: jobRequest.compel_weights || userMetadata.compel_weights || undefined,
      // Legacy for compatibility
      job_id: job.id,
      job_type: jobRequest.job_type,
      quality: jobRequest.quality || (jobRequest.job_type.includes('high') ? 'high' : 'fast'),
      format: isImageJob ? 'image' : 'video',
      content_type: userMetadata.contentType || 'sfw'
    }

    // ✅ ENHANCED LOGGING: Detailed parameter verification before enqueueing
    console.log('🎯 I2I MODE RESOLUTION', {
      job_id: job.id,
      isPromptlessUploadedExactCopy,
      isReferenceModify,
      pipeline: queuePayload.config.pipeline,
      denoise_strength: queuePayload.config.denoise_strength,
      guidance_scale: queuePayload.config.guidance_scale,
      num_inference_steps: queuePayload.config.num_inference_steps, // ✅ FIXED FIELD NAME
      num_images: queuePayload.config.num_images,
      reference_url_present: !!referenceUrl,
      hasOriginalEnhancedPrompt,
      metadata_exact_copy_mode: queuePayload.metadata.exact_copy_mode,
      metadata_reference_mode: queuePayload.metadata.reference_mode,
      metadata_denoise_strength: queuePayload.metadata.denoise_strength,
      metadata_reference_strength: queuePayload.metadata.reference_strength,
      negative_prompt_included: !!queuePayload.negative_prompt,
      // 🆕 ADDITIONAL LOGGING for troubleshooting
      has_user_modification: userPromptTrim.length > 0,
      user_prompt_length: userPromptTrim.length,
      final_prompt_preview: enhancedPrompt.substring(0, 100),
      template_name: templateName,
      enhancement_attempted: shouldEnhance,
      // 🆕 NEW: Classification tracking
      classification_source: userMetadata.reference_mode === 'modify' ? 'override_reference_mode' : 
                           (hasOriginalEnhancedPrompt ? 'originalEnhancedPrompt' : 
                           (userPromptTrim.length > 0 ? 'user_prompt' : 'default')),
      exact_copy_mode_input: exactCopyMode,
      reference_mode_override: userMetadata.reference_mode
    });

    // Determine queue based on job type
    const queueName = (jobRequest.job_type.startsWith('sdxl') || jobRequest.job_type.includes('image')) ? 'sdxl_queue' : 'wan_queue'
    
    // Enqueue to Redis
    const redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL')
    const redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')

    if (!redisUrl || !redisToken) {
      console.error('Redis configuration missing')
      return new Response('Queue service unavailable', { status: 503, headers: corsHeaders })
    }

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
