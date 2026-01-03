
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * fal.ai Image/Video Generation Edge Function
 *
 * Key differences from Replicate:
 * - Uses model_key path directly (no version hash)
 * - Uses REST API with queue.fal.run
 * - Safety param is `enable_safety_checker` (not disable_safety_checker)
 * - Character limits (8,000-12,000 for Seedream, 1,000-2,000 for video)
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();

    // Validate character limit based on model type (fal.ai uses chars, not tokens)
    const promptLength = body.prompt?.length || 0;
    const isVideo = body.modality === 'video' || body.metadata?.modality === 'video';

    // Character limits: Seedream 8,000-12,000, WAN image 6,000-8,000, Video 1,000-2,000
    const charLimit = isVideo ? 2000 : 10000;
    const promptTooLong = promptLength > charLimit;

    if (promptTooLong) {
      console.warn(`⚠️ VALIDATION: Prompt is ${promptLength} chars, exceeds ${charLimit} char limit for ${isVideo ? 'video' : 'image'}!`);
    } else {
      console.log(`✅ VALIDATION: Prompt is ${promptLength} chars (within ${charLimit} char limit)`);
    }

    console.log('🎨 fal.ai request received:', {
      prompt: body.prompt?.slice(0, 100),
      prompt_length: promptLength,
      prompt_too_long: promptTooLong,
      apiModelId: body.apiModelId,
      jobType: body.jobType || body.job_type,
      modality: isVideo ? 'video' : 'image'
    });

    // Get authenticated user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      console.error('❌ User authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Resolve API model configuration
    let apiModel = null;

    if (body.apiModelId) {
      // Use specific model by ID
      const { data: model, error: modelError } = await supabase
        .from('api_models')
        .select(`
          *,
          api_providers!inner(*)
        `)
        .eq('id', body.apiModelId)
        .eq('is_active', true)
        .single();

      if (modelError || !model) {
        console.error('❌ Specified API model not found:', modelError);
        return new Response(
          JSON.stringify({ error: 'Specified API model not found or inactive' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      apiModel = model;
    } else {
      // No apiModelId provided - get default fal image model
      console.log('📸 No apiModelId provided, fetching default fal.ai image model...');

      const { data: defaultModel, error: defaultError } = await supabase
        .from('api_models')
        .select(`
          *,
          api_providers!inner(*)
        `)
        .eq('modality', isVideo ? 'video' : 'image')
        .eq('is_active', true)
        .eq('is_default', true)
        .eq('api_providers.name', 'fal')
        .single();

      if (defaultError || !defaultModel) {
        // Fallback: get any active fal image/video model
        console.log('⚠️ No default model found, trying first active fal.ai model...');
        const { data: fallbackModel, error: fallbackError } = await supabase
          .from('api_models')
          .select(`
            *,
            api_providers!inner(*)
          `)
          .eq('modality', isVideo ? 'video' : 'image')
          .eq('is_active', true)
          .eq('api_providers.name', 'fal')
          .order('priority', { ascending: true })
          .limit(1)
          .single();

        if (fallbackError || !fallbackModel) {
          console.error('❌ No fal.ai models available:', fallbackError);
          return new Response(
            JSON.stringify({ error: 'No fal.ai models configured. Please add one in api_models table.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }
        apiModel = fallbackModel;
        console.log('✅ Using fallback fal.ai model:', fallbackModel.display_name);
      } else {
        apiModel = defaultModel;
        console.log('✅ Using default fal.ai model:', defaultModel.display_name);
      }
    }

    // Validate provider is fal
    if (apiModel.api_providers.name !== 'fal') {
      console.error('❌ Invalid provider for fal-image function:', apiModel.api_providers.name);
      return new Response(
        JSON.stringify({ error: 'Model provider must be fal for this function' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get fal.ai API key
    const falApiKey = Deno.env.get(apiModel.api_providers.secret_name);
    if (!falApiKey) {
      console.error('❌ fal.ai API key not found for secret:', apiModel.api_providers.secret_name);
      return new Response(
        JSON.stringify({ error: 'fal.ai API key not configured in environment secrets' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('✅ Using fal.ai model from database:', {
      model_key: apiModel.model_key,
      display_name: apiModel.display_name,
      provider: apiModel.api_providers.name,
      modality: apiModel.modality
    });

    // Require prompt
    if (!body.prompt) {
      return new Response(
        JSON.stringify({ error: "Missing required field: prompt" }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Extract job parameters
    const quality = body.quality || 'high';

    // Normalize job_type for database constraint compatibility
    // Valid job types include: image_high, image_fast, video_high, video_fast, etc.
    const normalizeJobType = (jobType: string | undefined, isVideo: boolean, quality: string): string => {
      // If a valid job_type was passed, use it
      if (jobType) {
        // Check if it's already a valid format
        if (['image_high', 'image_fast', 'video_high', 'video_fast', 'wan_standard', 'wan_enhanced'].includes(jobType)) {
          return jobType;
        }
        // Map fal-specific types to valid types
        if (jobType === 'fal_image') return quality === 'fast' ? 'image_fast' : 'image_high';
        if (jobType === 'fal_video') return quality === 'fast' ? 'video_fast' : 'video_high';
      }

      // Default based on modality and quality
      if (isVideo) {
        return quality === 'fast' ? 'video_fast' : 'video_high';
      }
      return quality === 'fast' ? 'image_fast' : 'image_high';
    };

    const jobType = normalizeJobType(body.job_type || body.jobType, isVideo, quality);
    const contentMode = body.metadata?.contentType || 'sfw';

    // Detect if this is an i2i request
    const hasReferenceImage = !!(body.input?.image_url || body.input?.image || body.metadata?.referenceImage || body.metadata?.reference_image_url);
    const generationMode = hasReferenceImage ? 'i2i' : 'txt2img';

    console.log('🎯 Job parameters:', {
      jobType,
      quality,
      contentMode,
      generationMode,
      hasReferenceImage,
      model_key: apiModel.model_key
    });

    // Create job record
    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        job_type: jobType,
        original_prompt: body.prompt,
        status: 'queued',
        quality: quality,
        api_model_id: apiModel.id,
        model_type: 'sdxl', // fal Seedream maps to sdxl for constraint compatibility
        format: isVideo ? 'video' : 'image',
        metadata: {
          ...body.metadata,
          provider_name: apiModel.api_providers.name,
          model_key: apiModel.model_key,
          content_mode: contentMode,
          generation_mode: generationMode
        }
      })
      .select()
      .single();

    if (jobError || !jobData) {
      console.error('❌ Failed to create job:', jobError);
      return new Response(
        JSON.stringify({
          error: 'Failed to create job',
          details: jobError?.message || 'Unknown job creation error'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('✅ Job created:', jobData.id);

    // Build fal.ai input using database model configuration
    const modelInput: Record<string, any> = {
      prompt: body.prompt,
      ...apiModel.input_defaults
    };

    // Handle safety checker based on content mode
    // fal.ai uses `enable_safety_checker` (not disable_safety_checker)
    if (contentMode === 'nsfw') {
      modelInput.enable_safety_checker = false;
      console.log('🔓 Safety checker disabled for NSFW content');
    } else {
      modelInput.enable_safety_checker = true;
    }

    // Apply user input overrides
    if (body.input) {
      // Image size
      if (body.input.image_size) {
        modelInput.image_size = body.input.image_size;
      } else if (body.input.width && body.input.height) {
        modelInput.image_size = { width: body.input.width, height: body.input.height };
      }

      // Steps / inference steps
      if (body.input.num_inference_steps !== undefined) {
        modelInput.num_inference_steps = Math.min(Math.max(body.input.num_inference_steps, 1), 50);
      }

      // Guidance scale
      if (body.input.guidance_scale !== undefined) {
        modelInput.guidance_scale = Math.min(Math.max(body.input.guidance_scale, 1), 20);
      }

      // Negative prompt
      if (body.input.negative_prompt) {
        modelInput.negative_prompt = body.input.negative_prompt;
      }

      // Seed
      if (body.input.seed !== undefined) {
        modelInput.seed = body.input.seed;
      }

      // I2I specific: reference image and strength
      if (hasReferenceImage) {
        const imageUrl = body.input.image_url || body.input.image || body.metadata?.referenceImage || body.metadata?.reference_image_url;

        // Sign URL if it's a Supabase storage path
        let finalImageUrl = imageUrl;
        if (typeof imageUrl === 'string' && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
          const knownBuckets = ['user-library', 'workspace-temp', 'reference_images'];
          const parts = imageUrl.split('/');
          let bucket = '';
          let path = '';
          if (knownBuckets.includes(parts[0])) {
            bucket = parts[0];
            path = parts.slice(1).join('/');
          } else {
            bucket = 'user-library';
            path = imageUrl;
          }
          const { data: signed, error: signError } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
          if (!signError && signed?.signedUrl) {
            finalImageUrl = signed.signedUrl;
            console.log(`🔏 Signed i2i image URL for bucket "${bucket}"`);
          }
        }

        modelInput.image_url = finalImageUrl;

        // Strength for i2i
        if (body.input.strength !== undefined) {
          modelInput.strength = Math.min(Math.max(body.input.strength, 0.1), 1.0);
        }
      }

      // Video-specific params
      if (isVideo) {
        if (body.input.num_frames !== undefined) {
          modelInput.num_frames = body.input.num_frames;
        }
        if (body.input.resolution) {
          modelInput.resolution = body.input.resolution;
        }
        if (body.input.fps !== undefined) {
          modelInput.fps = body.input.fps;
        }
      }
    }

    // Map aspect ratio to dimensions if not explicitly provided
    if (!modelInput.image_size && body.metadata?.aspectRatio) {
      const aspectRatio = body.metadata.aspectRatio;
      const aspectRatioMap: Record<string, { width: number; height: number }> = {
        '1:1': { width: 1024, height: 1024 },
        '16:9': { width: 1344, height: 768 },
        '9:16': { width: 768, height: 1344 }
      };

      if (aspectRatioMap[aspectRatio]) {
        modelInput.image_size = aspectRatioMap[aspectRatio];
        console.log(`📐 Mapped aspect ratio ${aspectRatio} to ${modelInput.image_size.width}x${modelInput.image_size.height}`);
      }
    }

    // Remove null/undefined keys
    Object.keys(modelInput).forEach((key) => {
      if (modelInput[key] === null || modelInput[key] === undefined) {
        delete modelInput[key];
      }
    });

    console.log('🔧 fal.ai input configuration:', modelInput);

    // Update job status to processing
    await supabase
      .from('jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        metadata: {
          ...jobData.metadata,
          input_used: modelInput
        }
      })
      .eq('id', jobData.id);

    // Call fal.ai API using their synchronous endpoint
    // Note: fal.run is for sync, queue.fal.run is for async/polling
    const falEndpoint = `https://fal.run/${apiModel.model_key}`;

    console.log('🚀 Calling fal.ai API:', {
      endpoint: falEndpoint,
      model_key: apiModel.model_key
    });

    try {
      const falResponse = await fetch(falEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${falApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(modelInput)
      });

      if (!falResponse.ok) {
        const errorText = await falResponse.text();
        console.error('❌ fal.ai API error:', {
          status: falResponse.status,
          statusText: falResponse.statusText,
          body: errorText
        });

        await supabase
          .from('jobs')
          .update({
            status: 'failed',
            error_message: `fal.ai API error: ${falResponse.status} - ${errorText.slice(0, 500)}`
          })
          .eq('id', jobData.id);

        return new Response(JSON.stringify({
          error: 'fal.ai API request failed',
          details: errorText,
          status: falResponse.status
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: falResponse.status,
        });
      }

      const falResult = await falResponse.json();

      console.log('✅ fal.ai response received:', {
        request_id: falResult.request_id,
        status: falResult.status,
        has_images: !!falResult.images,
        has_video: !!falResult.video
      });

      // Handle queued response (async model)
      if (falResult.status === 'IN_QUEUE' || falResult.status === 'IN_PROGRESS') {
        // Store request_id for polling
        await supabase
          .from('jobs')
          .update({
            metadata: {
              ...jobData.metadata,
              fal_request_id: falResult.request_id,
              input_used: modelInput
            }
          })
          .eq('id', jobData.id);

        return new Response(JSON.stringify({
          jobId: jobData.id,
          requestId: falResult.request_id,
          status: 'queued',
          message: 'Request queued with fal.ai'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      // Handle immediate response (fast models)
      let resultUrl = null;
      let resultType = 'image';

      if (falResult.images && falResult.images.length > 0) {
        resultUrl = falResult.images[0].url;
        resultType = 'image';
      } else if (falResult.video?.url) {
        resultUrl = falResult.video.url;
        resultType = 'video';
      } else if (falResult.output?.url) {
        resultUrl = falResult.output.url;
        resultType = isVideo ? 'video' : 'image';
      }

      if (!resultUrl) {
        console.error('❌ No result URL in fal.ai response:', falResult);
        await supabase
          .from('jobs')
          .update({
            status: 'failed',
            error_message: 'No result URL in fal.ai response'
          })
          .eq('id', jobData.id);

        return new Response(JSON.stringify({
          error: 'No result URL in response',
          details: JSON.stringify(falResult)
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      console.log('🎉 Generation completed:', {
        resultUrl: resultUrl.slice(0, 50) + '...',
        resultType
      });

      // Update job with result
      await supabase
        .from('jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          result_url: resultUrl,
          metadata: {
            ...jobData.metadata,
            result_type: resultType,
            fal_response: falResult,
            input_used: modelInput
          }
        })
        .eq('id', jobData.id);

      // Store in workspace_assets
      const { error: assetError } = await supabase
        .from('workspace_assets')
        .insert({
          user_id: user.id,
          job_id: jobData.id,
          asset_type: resultType,
          asset_url: resultUrl,
          prompt: body.prompt,
          metadata: {
            model_key: apiModel.model_key,
            provider: 'fal',
            content_mode: contentMode,
            generation_mode: generationMode
          }
        });

      if (assetError) {
        console.warn('⚠️ Failed to create workspace asset:', assetError);
      }

      return new Response(JSON.stringify({
        jobId: jobData.id,
        status: 'completed',
        resultUrl,
        resultType
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });

    } catch (fetchError) {
      console.error('❌ fal.ai fetch error:', fetchError);

      await supabase
        .from('jobs')
        .update({
          status: 'failed',
          error_message: `fal.ai fetch error: ${(fetchError as Error).message}`
        })
        .eq('id', jobData.id);

      return new Response(JSON.stringify({
        error: 'Failed to call fal.ai API',
        details: (fetchError as Error).message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

  } catch (error) {
    console.error("❌ Error in fal-image function:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
