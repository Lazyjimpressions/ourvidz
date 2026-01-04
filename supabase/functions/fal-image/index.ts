
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let apiModel: any = null;

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

    // Guard: ensure apiModel is not null (TypeScript narrowing)
    if (!apiModel) {
      console.error('❌ No API model resolved');
      return new Response(
        JSON.stringify({ error: 'Failed to resolve API model' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
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

    // Capture model info for use later (avoids TypeScript narrowing issues in nested try-catch)
    const modelKey = apiModel.model_key;
    const modelDisplayName = apiModel.display_name;
    const providerName = apiModel.api_providers.name;
    const modelModality = apiModel.modality;

    console.log('✅ Using fal.ai model from database:', {
      model_key: modelKey,
      display_name: modelDisplayName,
      provider: providerName,
      modality: modelModality
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
    // Default to NSFW for this platform - safety checker off by default
    const contentMode = body.metadata?.contentType || 'nsfw';

    // Detect if this is an i2i/i2v request
    const hasReferenceImage = !!(body.input?.image_url || body.input?.image || body.metadata?.referenceImage || body.metadata?.reference_image_url || body.metadata?.start_reference_url);
    const generationMode = hasReferenceImage ? (isVideo ? 'i2v' : 'i2i') : (isVideo ? 'txt2vid' : 'txt2img');
    
    // Check if this is WAN 2.1 i2v model (requires reference image)
    const isWanI2V = modelKey.toLowerCase().includes('wan-i2v') || modelKey.toLowerCase().includes('wan/v2.1') || body.metadata?.is_wan_i2v === true;
    
    // Validate reference image for WAN 2.1 i2v
    if (isVideo && isWanI2V && !hasReferenceImage) {
      console.error('❌ WAN 2.1 i2v requires a reference image');
      return new Response(
        JSON.stringify({ 
          error: 'Reference image required',
          details: 'WAN 2.1 i2v requires a reference image to generate video. Please provide an image_url in input or reference_image_url in metadata.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('🎯 Job parameters:', {
      jobType,
      quality,
      contentMode,
      generationMode,
      hasReferenceImage,
      model_key: apiModel.model_key,
      // Debug I2I detection
      input_image_url: body.input?.image_url ? 'present' : 'missing',
      input_image: body.input?.image ? 'present' : 'missing',
      metadata_referenceImage: body.metadata?.referenceImage ? 'present' : 'missing',
      metadata_reference_image_url: body.metadata?.reference_image_url ? 'present' : 'missing'
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

    // I2I specific: reference image and strength (must be handled BEFORE other input overrides)
    // This needs to run even if body.input is empty, as long as hasReferenceImage is true
    if (hasReferenceImage) {
        const imageUrl = body.input.image_url || body.input.image || body.metadata?.referenceImage || body.metadata?.reference_image_url;

        // Validate that image URL exists and is not empty for I2I requests
        if (!imageUrl || (typeof imageUrl === 'string' && imageUrl.trim() === '')) {
          console.error('❌ I2I request detected but no valid image URL provided:', {
            input_image_url: body.input?.image_url,
            input_image: body.input?.image,
            metadata_referenceImage: body.metadata?.referenceImage,
            metadata_reference_image_url: body.metadata?.reference_image_url
          });
          return new Response(
            JSON.stringify({ 
              error: 'I2I request requires a valid reference image URL',
              details: 'Please provide image_url in input, or reference_image_url in metadata. The URL cannot be empty.'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

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
          } else {
            console.warn(`⚠️ Failed to sign image URL for bucket "${bucket}":`, signError);
            // Continue with original URL - might be already signed or external
          }
        }

        // Validate final image URL before setting
        if (!finalImageUrl || finalImageUrl.trim() === '') {
          console.error('❌ Final image URL is empty after processing');
          return new Response(
            JSON.stringify({ 
              error: 'Invalid reference image URL',
              details: 'Image URL could not be resolved or signed'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        // Validate URL format (must be http/https or data URI)
        if (!finalImageUrl.startsWith('http://') && !finalImageUrl.startsWith('https://') && !finalImageUrl.startsWith('data:')) {
          console.error('❌ Invalid image URL format:', finalImageUrl.substring(0, 100));
          return new Response(
            JSON.stringify({ 
              error: 'Invalid reference image URL format',
              details: 'Image URL must be a valid HTTP/HTTPS URL or data URI'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        // Seedream edit models (v4/edit, v4.5/edit) require image_urls (plural, array)
        // Other models use image_url (singular, string)
        const modelKeyLower = (apiModel.model_key || '').toLowerCase();
        const isSeedreamEdit = modelKeyLower.includes('seedream') && modelKeyLower.includes('edit');
        
        console.log('🔍 I2I parameter detection:', {
          model_key: apiModel.model_key,
          model_key_lower: modelKeyLower,
          is_seedream_edit: isSeedreamEdit,
          will_use_image_urls: isSeedreamEdit
        });
        
        if (isSeedreamEdit) {
          modelInput.image_urls = [finalImageUrl];
          // Remove image_url if it was set by input_defaults
          delete modelInput.image_url;
          console.log(`✅ I2I image_urls (array) set for Seedream edit model: ${finalImageUrl.substring(0, 60)}...`);
        } else {
          modelInput.image_url = finalImageUrl;
          // Remove image_urls if it was set by input_defaults
          delete modelInput.image_urls;
          console.log(`✅ I2I image_url (string) set: ${finalImageUrl.substring(0, 60)}...`);
        }

        // Strength for i2i (default to 0.5 if not provided for modify mode)
        if (body.input?.strength !== undefined) {
          modelInput.strength = Math.min(Math.max(body.input.strength, 0.1), 1.0);
        } else {
          // Default strength for I2I if not specified
          modelInput.strength = 0.5;
          console.log('📊 Using default I2I strength: 0.5');
        }
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

      // Video-specific params
      if (isVideo) {
        // Check if this is WAN 2.1 i2v model (already detected above, but check again for safety)
        const isWanI2V = modelKey.toLowerCase().includes('wan-i2v') || modelKey.toLowerCase().includes('wan/v2.1') || body.metadata?.is_wan_i2v === true;
        
        if (isWanI2V) {
          // WAN 2.1 i2v uses specific parameter names
          // Map duration to num_frames and frames_per_second
          if (body.metadata?.duration) {
            const targetDuration = body.metadata.duration;
            // Default: 81 frames at 16 fps = 5 seconds
            // Calculate optimal num_frames and fps to match target duration
            const defaultFps = 16;
            const defaultNumFrames = 81;
            const calculatedNumFrames = Math.round(targetDuration * defaultFps);
            // Clamp to valid range: 81-100
            const numFrames = Math.max(81, Math.min(100, calculatedNumFrames));
            modelInput.num_frames = numFrames;
            modelInput.frames_per_second = defaultFps;
            console.log(`🎬 WAN I2V: Mapped duration ${targetDuration}s to num_frames=${numFrames}, fps=${defaultFps}`);
          } else {
            // Use defaults from input_defaults
            modelInput.num_frames = modelInput.num_frames || 81;
            modelInput.frames_per_second = modelInput.frames_per_second || 16;
          }
          
          // Map quality to resolution
          if (body.quality === 'fast') {
            modelInput.resolution = '480p';
          } else if (body.quality === 'high') {
            modelInput.resolution = '720p';
          } else if (body.input?.resolution) {
            modelInput.resolution = body.input.resolution;
          } else {
            modelInput.resolution = modelInput.resolution || '720p';
          }
          
          // Set aspect_ratio from metadata or input
          if (body.metadata?.aspectRatio) {
            modelInput.aspect_ratio = body.metadata.aspectRatio === 'auto' ? 'auto' : body.metadata.aspectRatio;
          } else if (body.input?.aspect_ratio) {
            modelInput.aspect_ratio = body.input.aspect_ratio;
          }
          
          // Guide scale (motion intensity can map to this)
          if (body.input?.guide_scale !== undefined) {
            modelInput.guide_scale = body.input.guide_scale;
          } else if (body.metadata?.motion_intensity !== undefined) {
            // Map motion intensity to guide_scale (0-1 -> 1-20, default 5)
            const motionIntensity = body.metadata.motion_intensity;
            const guideScale = 1 + (motionIntensity * 19); // Map 0-1 to 1-20
            modelInput.guide_scale = Math.round(guideScale * 10) / 10; // Round to 1 decimal
          }
          
          // WAN 2.1 i2v uses image_url (not image) for reference - REQUIRED
          let wanImageUrl: string | undefined;
          if (body.input?.image) {
            wanImageUrl = body.input.image;
            delete modelInput.image; // Remove 'image' if it exists
          } else if (body.input?.image_url) {
            wanImageUrl = body.input.image_url;
          } else if (body.metadata?.reference_image_url || body.metadata?.start_reference_url) {
            wanImageUrl = body.metadata.reference_image_url || body.metadata.start_reference_url;
          }
          
          // CRITICAL: WAN 2.1 i2v REQUIRES image_url - validate before proceeding
          if (!wanImageUrl || (typeof wanImageUrl === 'string' && wanImageUrl.trim() === '')) {
            console.error('❌ WAN 2.1 i2v requires image_url but it is missing!');
            return new Response(
              JSON.stringify({ 
                error: 'Reference image required for WAN 2.1 i2v',
                details: 'WAN 2.1 i2v is an image-to-video model and requires a reference image. Please provide image_url in input or reference_image_url/start_reference_url in metadata.'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
          }
          
          // Sign URL if it's a Supabase storage path
          let finalWanImageUrl = wanImageUrl;
          if (typeof wanImageUrl === 'string' && !wanImageUrl.startsWith('http') && !wanImageUrl.startsWith('data:')) {
            const knownBuckets = ['user-library', 'workspace-temp', 'reference_images'];
            const parts = wanImageUrl.split('/');
            let bucket = '';
            let path = '';
            if (knownBuckets.includes(parts[0])) {
              bucket = parts[0];
              path = parts.slice(1).join('/');
            } else {
              bucket = 'user-library';
              path = wanImageUrl;
            }
            const { data: signed, error: signError } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
            if (!signError && signed?.signedUrl) {
              finalWanImageUrl = signed.signedUrl;
              console.log(`🔏 Signed WAN i2v image URL for bucket "${bucket}"`);
            } else {
              console.warn(`⚠️ Failed to sign WAN i2v image URL for bucket "${bucket}":`, signError);
            }
          }
          
          // Validate final image URL format
          if (!finalWanImageUrl || (!finalWanImageUrl.startsWith('http://') && !finalWanImageUrl.startsWith('https://') && !finalWanImageUrl.startsWith('data:'))) {
            console.error('❌ Invalid WAN i2v image URL format:', finalWanImageUrl?.substring(0, 100));
            return new Response(
              JSON.stringify({ 
                error: 'Invalid reference image URL for WAN 2.1 i2v',
                details: 'Image URL must be a valid HTTP/HTTPS URL or data URI'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
          }
          
          modelInput.image_url = finalWanImageUrl;
          console.log(`✅ WAN I2V: Set image_url: ${finalWanImageUrl.substring(0, 60)}...`);
        } else {
          // Other video models (non-WAN i2v)
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

    // Final check: For Seedream edit models, ensure image_urls is set and image_url is removed
    // This MUST run before sending to fal.ai API
    const modelKeyLower = (apiModel.model_key || '').toLowerCase();
    const isSeedreamEdit = modelKeyLower.includes('seedream') && modelKeyLower.includes('edit');
    
    // Re-check hasReferenceImage from request body (in case it wasn't detected earlier)
    const finalHasReferenceImage = !!(body.input?.image_url || body.input?.image || body.metadata?.referenceImage || body.metadata?.reference_image_url);
    
    console.log('🔍 FINAL CHECK - Model detection:', {
      model_key: apiModel.model_key,
      model_key_lower: modelKeyLower,
      is_seedream_edit: isSeedreamEdit,
      has_reference_image: hasReferenceImage,
      final_has_reference_image: finalHasReferenceImage,
      body_input_image_url: body.input?.image_url ? 'present' : 'missing',
      body_input_image: body.input?.image ? 'present' : 'missing',
      body_metadata_referenceImage: body.metadata?.referenceImage ? 'present' : 'missing',
      body_metadata_reference_image_url: body.metadata?.reference_image_url ? 'present' : 'missing',
      current_image_url: modelInput.image_url ? 'present' : 'missing',
      current_image_urls: modelInput.image_urls ? `present (${Array.isArray(modelInput.image_urls) ? modelInput.image_urls.length : 'not array'})` : 'missing'
    });
    
    // For Seedream edit models, ALWAYS check if we need to set image_urls
    if (isSeedreamEdit && finalHasReferenceImage) {
      // Try to get the image URL from any source
      let imageUrlToUse = modelInput.image_url || 
                          body.input?.image_url || 
                          body.input?.image || 
                          body.metadata?.referenceImage || 
                          body.metadata?.reference_image_url;
      
      // If we found an image URL but image_urls isn't set, set it now
      if (imageUrlToUse && !modelInput.image_urls) {
        // Sign URL if needed
        if (typeof imageUrlToUse === 'string' && !imageUrlToUse.startsWith('http') && !imageUrlToUse.startsWith('data:')) {
          const knownBuckets = ['user-library', 'workspace-temp', 'reference_images'];
          const parts = imageUrlToUse.split('/');
          let bucket = '';
          let path = '';
          if (knownBuckets.includes(parts[0])) {
            bucket = parts[0];
            path = parts.slice(1).join('/');
          } else {
            bucket = 'user-library';
            path = imageUrlToUse;
          }
          const { data: signed, error: signError } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
          if (!signError && signed?.signedUrl) {
            imageUrlToUse = signed.signedUrl;
            console.log(`🔏 FINAL CHECK: Signed image URL for bucket "${bucket}"`);
          }
        }
        
        modelInput.image_urls = [imageUrlToUse];
        console.log('🔄 FINAL CHECK: Set image_urls for Seedream edit model from request body');
      }
      
      // Always remove image_url for Seedream edit models
      if (modelInput.image_url) {
        delete modelInput.image_url;
        console.log('🗑️ FINAL CHECK: Removed image_url for Seedream edit model');
      }
      
      // Ensure image_urls is an array
      if (modelInput.image_urls && !Array.isArray(modelInput.image_urls)) {
        modelInput.image_urls = [modelInput.image_urls];
        console.log('🔄 FINAL CHECK: Converted image_urls to array');
      }
      
      // CRITICAL: If image_urls is still missing, this is an error
      if (!modelInput.image_urls || !Array.isArray(modelInput.image_urls) || modelInput.image_urls.length === 0) {
        console.error('❌ FINAL CHECK: Seedream edit model requires image_urls but it is missing!');
        return new Response(
          JSON.stringify({ 
            error: 'Seedream edit models require image_urls (array)',
            details: 'Please provide a reference image URL in input.image_url, input.image, metadata.referenceImage, or metadata.reference_image_url'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    } else if (!isSeedreamEdit && finalHasReferenceImage) {
      // For non-Seedream models, ensure image_url is set and image_urls is removed
      if (!modelInput.image_url && modelInput.image_urls && Array.isArray(modelInput.image_urls) && modelInput.image_urls.length > 0) {
        modelInput.image_url = modelInput.image_urls[0];
        console.log('🔄 FINAL CHECK: Converted image_urls to image_url for non-Seedream model');
      }
      if (modelInput.image_urls) {
        delete modelInput.image_urls;
        console.log('🗑️ FINAL CHECK: Removed image_urls for non-Seedream model');
      }
    }

    // Remove null/undefined keys
    Object.keys(modelInput).forEach((key) => {
      if (modelInput[key] === null || modelInput[key] === undefined) {
        delete modelInput[key];
      }
    });

    // FINAL VALIDATION: WAN 2.1 i2v MUST have image_url
    const finalIsWanI2V = modelKey.toLowerCase().includes('wan-i2v') || modelKey.toLowerCase().includes('wan/v2.1') || body.metadata?.is_wan_i2v === true;
    if (isVideo && finalIsWanI2V && !modelInput.image_url) {
      console.error('❌ FINAL VALIDATION: WAN 2.1 i2v requires image_url but it is missing!');
      return new Response(
        JSON.stringify({ 
          error: 'Reference image required for WAN 2.1 i2v',
          details: 'WAN 2.1 i2v is an image-to-video model and requires a reference image. Please provide image_url in input or reference_image_url/start_reference_url in metadata.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log('🔧 fal.ai input configuration (FINAL):', {
      model_key: apiModel.model_key,
      is_seedream_edit: isSeedreamEdit,
      is_wan_i2v: finalIsWanI2V,
      has_reference_image: hasReferenceImage,
      // Mask sensitive URLs in logs
      image_url: modelInput.image_url ? `${modelInput.image_url.substring(0, 60)}...` : (modelInput.image_urls ? 'present (array)' : 'missing'),
      image_urls: modelInput.image_urls ? `[${modelInput.image_urls.length} URL(s)]` : 'missing',
      prompt_preview: modelInput.prompt ? `${modelInput.prompt.substring(0, 100)}...` : 'missing'
    });

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
        let errorDetails;
        try {
          errorDetails = JSON.parse(errorText);
        } catch {
          errorDetails = { message: errorText };
        }
        
        console.error('❌ fal.ai API error:', {
          status: falResponse.status,
          statusText: falResponse.statusText,
          error: errorDetails,
          request_preview: {
            model_key: apiModel.model_key,
            has_image_url: !!modelInput.image_url,
            image_url_preview: modelInput.image_url ? modelInput.image_url.substring(0, 60) : 'missing',
            has_prompt: !!modelInput.prompt,
            prompt_length: modelInput.prompt?.length || 0,
            strength: modelInput.strength,
            image_size: modelInput.image_size
          }
        });

        await supabase
          .from('jobs')
          .update({
            status: 'failed',
            error_message: `fal.ai API error: ${falResponse.status} - ${errorDetails.message || errorText.slice(0, 500)}`
          })
          .eq('id', jobData.id);

        return new Response(JSON.stringify({
          error: 'fal.ai API request failed',
          details: errorDetails.message || errorText,
          status: falResponse.status,
          debug: falResponse.status === 422 ? {
            model_key: apiModel.model_key,
            has_image_url: !!modelInput.image_url,
            has_prompt: !!modelInput.prompt,
            input_keys: Object.keys(modelInput)
          } : undefined
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
      let resultUrl: string | null = null;
      let resultType = 'image';

      if (falResult.images && falResult.images.length > 0) {
        resultUrl = falResult.images[0].url as string;
        resultType = 'image';
      } else if (falResult.video?.url) {
        resultUrl = falResult.video.url as string;
        resultType = 'video';
      } else if (falResult.output?.url) {
        resultUrl = falResult.output.url as string;
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

      // Download the image from fal.ai and upload to Supabase storage
      // This is required for the realtime subscription to work (frontend expects temp_storage_path)
      let storagePath = '';
      let fileSizeBytes = 0;

      try {
        console.log('📥 Downloading image from fal.ai...');
        const imageResponse = await fetch(resultUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image: ${imageResponse.status}`);
        }

        const imageBuffer = await imageResponse.arrayBuffer();
        fileSizeBytes = imageBuffer.byteLength;

        // Generate storage path: workspace-temp/{user_id}/{job_id}_{timestamp}.{ext}
        const extension = resultType === 'video' ? 'mp4' : 'png';
        const timestamp = Date.now();
        storagePath = `${user.id}/${jobData.id}_${timestamp}.${extension}`;

        console.log('📤 Uploading to Supabase storage:', storagePath);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('workspace-temp')
          .upload(storagePath, imageBuffer, {
            contentType: resultType === 'video' ? 'video/mp4' : 'image/png',
            upsert: true
          });

        if (uploadError) {
          console.error('❌ Failed to upload to storage:', uploadError);
          // Fall back to using the external URL
          storagePath = resultUrl;
        } else {
          console.log('✅ Image uploaded to storage:', uploadData.path);
          storagePath = uploadData.path;
        }
      } catch (downloadError) {
        console.error('❌ Failed to download/upload image:', downloadError);
        // Fall back to using the external URL
        storagePath = resultUrl;
      }

      // Update job with result
      await supabase
        .from('jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          result_url: storagePath, // Use storage path for consistency
          metadata: {
            ...jobData.metadata,
            result_type: resultType,
            fal_response: falResult,
            input_used: modelInput,
            original_fal_url: resultUrl // Keep original for reference
          }
        })
        .eq('id', jobData.id);

      // Store in workspace_assets with temp_storage_path (required for realtime subscription)
      // Extract seed from fal.ai response (required for workspace_assets NOT NULL constraint)
      const generationSeed = falResult.seed || Math.floor(Math.random() * 1000000000);

      const { error: assetError } = await supabase
        .from('workspace_assets')
        .insert({
          user_id: user.id,
          job_id: jobData.id,
          asset_type: resultType,
          temp_storage_path: storagePath, // ✅ Frontend expects this column, not asset_url
          file_size_bytes: fileSizeBytes,
          mime_type: resultType === 'video' ? 'video/mp4' : 'image/png',
          original_prompt: body.prompt,
          model_used: modelKey,
          generation_seed: generationSeed, // ✅ Required: NOT NULL constraint
          generation_settings: {
            model_key: modelKey,
            provider: 'fal',
            content_mode: contentMode,
            generation_mode: generationMode,
            seed: generationSeed
          }
        });

      if (assetError) {
        console.warn('⚠️ Failed to create workspace asset:', assetError);
      } else {
        console.log('✅ Workspace asset created with temp_storage_path');
      }

      // Handle character portrait destination - update character's image_url automatically
      if (body.metadata?.destination === 'character_portrait' && body.metadata?.character_id) {
        console.log('🖼️ Updating character portrait for:', body.metadata.character_id);

        // Determine the full image path - only prepend bucket if it's a storage path (not external URL)
        const fullImagePath = storagePath.startsWith('http') ? storagePath : `workspace-temp/${storagePath}`;

        const characterUpdateData: Record<string, any> = {
          image_url: fullImagePath,
          reference_image_url: fullImagePath, // Use same image as reference for consistency
          updated_at: new Date().toISOString()
        };

        // If we have a seed, lock it for character consistency
        if (generationSeed) {
          characterUpdateData.seed_locked = generationSeed;
        }

        const { error: charUpdateError } = await supabase
          .from('characters')
          .update(characterUpdateData)
          .eq('id', body.metadata.character_id);

        if (charUpdateError) {
          console.warn('⚠️ Failed to update character image:', charUpdateError);
        } else {
          console.log('✅ Character portrait updated successfully');
        }
      }

      // Handle character scene destination - update scene's image_url
      if (body.metadata?.destination === 'character_scene' && body.metadata?.scene_id) {
        console.log('🎬 Updating character scene for:', body.metadata.scene_id);

        // Determine the full image path - only prepend bucket if it's a storage path (not external URL)
        const sceneImagePath = storagePath.startsWith('http') ? storagePath : `workspace-temp/${storagePath}`;

        const { error: sceneUpdateError } = await supabase
          .from('character_scenes')
          .update({
            image_url: sceneImagePath,
            updated_at: new Date().toISOString()
          })
          .eq('id', body.metadata.scene_id);

        if (sceneUpdateError) {
          console.warn('⚠️ Failed to update character scene:', sceneUpdateError);
        } else {
          console.log('✅ Character scene updated successfully');
        }
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
