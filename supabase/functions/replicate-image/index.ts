
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Replicate from "https://esm.sh/replicate@0.25.2";
import { getDatabaseNegativePrompts } from '../_shared/cache-utils.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log('🎬 Replicate request received:', {
      prompt: body.prompt?.slice(0, 100),
      apiModelId: body.apiModelId,
      jobType: body.jobType
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

    // Resolve API model configuration - REQUIRED, no fallbacks
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
      // Use default model for replicate image generation - REQUIRE apiModelId instead
      return new Response(
        JSON.stringify({ error: 'apiModelId is required for Replicate image generation' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Validate provider and get API key
    if (apiModel.api_providers.name !== 'replicate') {
      console.error('❌ Invalid provider for replicate-image function:', apiModel.api_providers.name);
      return new Response(
        JSON.stringify({ error: 'Model provider must be Replicate for this function' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    if (!apiModel.version) {
      console.error('❌ Model version required for Replicate API:', apiModel.model_key);
      return new Response(
        JSON.stringify({ error: 'Model version is required in api_models table for Replicate models' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    // Validate version format (Replicate uses a 32-64 char hex hash)
    const versionId: string = apiModel.version;
    const versionFormatOk = /^[a-f0-9]{32,64}$/i.test(versionId);
    if (!versionFormatOk) {
      console.error('❌ Invalid Replicate version format. Expected hex hash, got:', versionId);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid Replicate version format',
          details: 'api_models.version must be the version ID (hash), not a model slug or name',
          provided: versionId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    const replicateApiKey = Deno.env.get(apiModel.api_providers.secret_name);
    if (!replicateApiKey) {
      console.error('❌ Replicate API key not found for secret:', apiModel.api_providers.secret_name);
      return new Response(
        JSON.stringify({ error: 'Replicate API key not configured in environment secrets' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    console.log('✅ Using Replicate model from database:', {
      model_key: apiModel.model_key,
      version: apiModel.version,
      display_name: apiModel.display_name,
      provider: apiModel.api_providers.name
    });

    const replicate = new Replicate({ auth: replicateApiKey });

    // If checking status
    if (body.predictionId) {
      console.log("🔍 Checking status for prediction:", body.predictionId);
      const prediction = await replicate.predictions.get(body.predictionId);
      console.log("📊 Status check response:", { 
        id: prediction.id, 
        status: prediction.status,
        progress: prediction.progress 
      });
      return new Response(JSON.stringify(prediction), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate image with model configuration
    if (!body.prompt) {
      return new Response(
        JSON.stringify({ error: "Missing required field: prompt" }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Extract and validate job parameters - Accept any Replicate image model job type
    const jobType = body.job_type || body.jobType;
    if (!jobType) {
      console.error('❌ Missing job type for replicate-image function');
      return new Response(
        JSON.stringify({ error: 'Job type is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    const quality = body.quality || (jobType.includes('_high') ? 'high' : 'fast');
    
    // Detect if this is an i2i request based on reference image
    const hasReferenceImage = !!(body.input?.image || body.metadata?.referenceImage || body.metadata?.reference_image_url);
    
    // Normalize model_type for database constraint compatibility
    const normalizeModelType = (modelFamily: string | null, modelKey: string, isI2I: boolean = false): string => {                                              
      if (!modelFamily) return 'rv51'; // Default fallback
      
      const family = modelFamily.toLowerCase();
      const key = modelKey.toLowerCase();
      
      // Map model families to valid database enum values
      if (family.includes('rv') || key.includes('realistic')) return 'rv51';                                                            
      if (family.includes('flux') || key.includes('flux')) return 'flux';                                                               
      if (family.includes('sdxl') || key.includes('sdxl')) {
        // Check if this is a Replicate SDXL model (not local Lustify SDXL)
        if (apiModel.api_providers.name === 'replicate') {
          return isI2I ? 'replicate-sdxl-i2i' : 'replicate-sdxl';
        }
        return 'sdxl'; // Local Lustify SDXL
      }
      if (jobType.includes('rv51')) return 'rv51'; // Fallback from job_type                                                            
      
      // Final fallback
      return 'rv51';
    };
    
    const normalizedModelType = normalizeModelType(apiModel.model_family, apiModel.model_key, hasReferenceImage);
    
    console.log('🎯 Job parameters validated:', {
      jobType_from_body: body.job_type,
      jobType_legacy: body.jobType,
      final_jobType: jobType,
      quality_from_body: body.quality,
      final_quality: quality,
      model_family_raw: apiModel.model_family,
      model_key: apiModel.model_key,
      normalized_model_type: normalizedModelType
    });

    // Compose negative prompt: base negative + user-provided negative
    let baseNegativePrompt = '';
    let userProvidedNegative = body.input?.negative_prompt || body.metadata?.negative_prompt || '';
    
    // Always fetch base negative prompts from database
    try {
      // Use content mode directly from toggle - no detection or fallback
      const contentMode = body.metadata?.contentType; // Direct from UI toggle
      
      if (contentMode && (contentMode === 'sfw' || contentMode === 'nsfw')) {
        // Determine generation mode for targeted negative prompts
        const generationMode = hasReferenceImage ? 'i2i' : 'txt2img';
        
        // Get base negative prompts from database
        const { data: negativePrompts, error: negError } = await supabase
          .from('negative_prompts')
          .select('negative_prompt')
          .eq('model_type', normalizedModelType.replace('-i2i', '')) // Remove i2i suffix for lookup
          .eq('content_mode', contentMode)
          .eq('generation_mode', generationMode)
          .eq('is_active', true)
          .order('priority', { ascending: false });
        
        if (!negError && negativePrompts?.length > 0) {
          baseNegativePrompt = negativePrompts.map(np => np.negative_prompt).join(', ');
          console.log(`📝 Fetched base ${generationMode} negative prompts for ${normalizedModelType}_${contentMode}: ${negativePrompts.length} prompts`);
        } else {
          console.log(`⚠️ No ${generationMode} negative prompts found for ${normalizedModelType}_${contentMode}`);
        }
      } else {
        console.log('⚠️ No valid content mode provided from toggle, using empty base negative');
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch base negative prompts:', error);
    }
    
    // Compose final negative prompt: base + user additions
    let finalNegativePrompt = '';
    if (baseNegativePrompt && userProvidedNegative) {
      finalNegativePrompt = `${baseNegativePrompt}, ${userProvidedNegative}`;
      console.log('🎯 Composed negative prompt: base + user additions');
    } else if (baseNegativePrompt) {
      finalNegativePrompt = baseNegativePrompt;
      console.log('🎯 Using base negative prompt only');
    } else if (userProvidedNegative) {
      finalNegativePrompt = userProvidedNegative;
      console.log('🎯 Using user negative prompt only');
    }

    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        job_type: jobType,
        original_prompt: body.prompt,
        status: 'queued',
        quality: quality,
        api_model_id: apiModel.id, // Always populated from database
        model_type: normalizedModelType, // Normalized lowercase value
        format: 'image',
        metadata: {
          ...body.metadata,
          provider_name: apiModel.api_providers.name,
          model_key: apiModel.model_key,
          version: apiModel.version,
          api_model_configured: true,
          content_mode: body.metadata?.contentType || null, // Direct from toggle
          negative_prompt_auto_populated: !!finalNegativePrompt,
          negative_prompt_source: finalNegativePrompt ? 'database' : (body.input?.negative_prompt ? 'user' : 'none')
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

    // Build Replicate request using database model configuration
    console.log(`🎨 Generating with database model: ${apiModel.display_name} (${apiModel.model_key}:${apiModel.version})`);
    
    // Start with defaults from API model configuration
    const modelInput = {
      num_outputs: 1, // Explicitly request single image to avoid grid composites
      ...apiModel.input_defaults,
      prompt: body.prompt || body.metadata?.original_prompt // Override with user's prompt (must come after spread to avoid being overwritten)
    };

    // Ensure we have a prompt
    if (!modelInput.prompt) {
      return new Response(
        JSON.stringify({ error: "No prompt provided in body.prompt or metadata.original_prompt" }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
    
    // Disable safety checker for NSFW content
    const contentMode = body.metadata?.contentType;
    if (contentMode === 'nsfw') {
      modelInput.disable_safety_checker = true;
      console.log('🔓 Safety checker disabled for NSFW content');
    }
    
    // Get model capabilities for input validation - ensure proper types
    const capabilities = apiModel.capabilities || {};
    const allowedInputKeys = Array.isArray(capabilities.allowed_input_keys) ? capabilities.allowed_input_keys : [];
    const inputKeyMappings = (typeof capabilities.input_key_mappings === 'object' && capabilities.input_key_mappings && !Array.isArray(capabilities.input_key_mappings)) ? capabilities.input_key_mappings : {};
    const allowedSchedulers = Array.isArray(capabilities.allowed_schedulers) ? capabilities.allowed_schedulers : [];
    
    // Handle scheduler aliases robustly - ensure it's an object, not array
    let schedulerAliases: Record<string, string> = {};
    if (typeof capabilities.scheduler_aliases === 'object' && capabilities.scheduler_aliases && !Array.isArray(capabilities.scheduler_aliases)) {
      schedulerAliases = capabilities.scheduler_aliases as Record<string, string>;
    }
    
    console.log('🔧 Model capabilities:', {
      allowed_input_keys: allowedInputKeys,
      allowed_schedulers: allowedSchedulers,
      scheduler_aliases: schedulerAliases,
      input_key_mappings: inputKeyMappings
    });
    
    // Apply user input overrides with model-specific validation
    if (body.input) {
      // Map steps with model-specific key names - handle both steps and num_inference_steps
      if (body.input.steps !== undefined) {
        const stepsKey = inputKeyMappings.steps || (allowedInputKeys.includes('num_inference_steps') ? 'num_inference_steps' : 'steps');
        modelInput[stepsKey] = Math.min(Math.max(body.input.steps, 1), 100);
        console.log(`🔧 Mapped steps: ${body.input.steps} -> ${stepsKey}:${modelInput[stepsKey]}`);
      }
      
      // Map guidance_scale with model-specific key names - relax hard clamp
      if (body.input.guidance_scale !== undefined) {
        const guidanceKey = inputKeyMappings.guidance_scale || 'guidance_scale';
        // Only apply basic bounds unless capabilities specify strict limits
        modelInput[guidanceKey] = Math.min(Math.max(body.input.guidance_scale, 1), 20);
        console.log(`🔧 Mapped guidance_scale: ${body.input.guidance_scale} -> ${guidanceKey}:${modelInput[guidanceKey]}`);
      }

      // Handle i2i fields if this is an i2i request
      if (hasReferenceImage) {
        const imageKey = inputKeyMappings.i2i_image_key || 'image';
        const strengthKey = inputKeyMappings.i2i_strength_key || 'strength';
        
        // Map image field
        let imageValue = body.input.image || body.input[imageKey];
        if (!imageValue && body.metadata) {
          imageValue = body.metadata.reference_image_url || body.metadata.referenceImage;
        }
        
        if (imageValue) {
          modelInput[imageKey] = imageValue;
          console.log(`🖼️ Mapped i2i image: ${imageKey} = ${typeof imageValue === 'string' ? imageValue.slice(0, 50) + '...' : imageValue}`);
        } else {
          console.error('❌ i2i request missing image data');
          return new Response(
            JSON.stringify({ error: "i2i request requires image data in input.image or metadata.reference_image_url" }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          );
        }
        
        // Map strength field
        let strengthValue = body.input[strengthKey] || body.input.prompt_strength;
        if (strengthValue === undefined && body.metadata) {
          strengthValue = body.metadata.reference_strength || body.metadata.denoise_strength;
        }
        
        if (strengthValue !== undefined) {
          modelInput[strengthKey] = Math.min(Math.max(parseFloat(strengthValue), 0.1), 1.0);
          console.log(`💪 Mapped i2i strength: ${strengthKey} = ${modelInput[strengthKey]}`);
        } else {
          // Default strength for i2i
          modelInput[strengthKey] = 0.7;
          console.log(`💪 Using default i2i strength: ${strengthKey} = ${modelInput[strengthKey]}`);
        }
      }
      
      // Map dimensions (UI uses 'width'/'height', model uses 'width'/'height')
      if (body.input.width !== undefined) {
        modelInput.width = Math.min(Math.max(body.input.width, 64), 1920);
      }
      if (body.input.height !== undefined) {
        modelInput.height = Math.min(Math.max(body.input.height, 64), 1920);
      }
      
      // Skip individual negative_prompt mapping - we compose it separately
      
      // Map seed (always applies)
      if (body.input.seed !== undefined) {
        modelInput.seed = Math.min(Math.max(body.input.seed, 0), 2147483647);
      }
      
        // Map scheduler strictly using database capabilities
        if (body.input.scheduler !== undefined) {
          const allowed = Array.isArray(allowedSchedulers) ? allowedSchedulers : [];
          let desired = body.input.scheduler;

          // Apply optional alias mapping from DB
          if (schedulerAliases && schedulerAliases[desired]) {
            desired = schedulerAliases[desired];
          }

          if (allowed.length > 0) {
            if (desired && allowed.includes(desired)) {
              modelInput.scheduler = desired;
            } else if (apiModel.input_defaults?.scheduler && allowed.includes(apiModel.input_defaults.scheduler)) {
              modelInput.scheduler = apiModel.input_defaults.scheduler;
              console.log(`⚠️ Scheduler "${body.input.scheduler}" not allowed. Using default from DB: ${modelInput.scheduler}`);
            } else {
              delete (modelInput as any).scheduler;
              console.log(`⚠️ Scheduler "${body.input.scheduler}" not allowed and no valid default; omitting scheduler.`);
            }
          } else {
            // No allowed list defined; pass through as-is
            modelInput.scheduler = desired;
          }

          console.log(`🔧 Scheduler set to: ${modelInput.scheduler}`);
        }

      // Generic pass-through for any remaining allowed input keys not handled by specific mappings
      const specificlyMappedKeys = new Set([
        'steps', 'num_inference_steps', 'guidance_scale', 'image', 'strength', 'prompt_strength',
        'width', 'height', 'negative_prompt', 'seed', 'scheduler'
      ]);
      
      Object.keys(body.input).forEach(inputKey => {
        if (!specificlyMappedKeys.has(inputKey) && allowedInputKeys.includes(inputKey)) {
          modelInput[inputKey] = body.input[inputKey];
          console.log(`🔧 Generic pass-through: ${inputKey} = ${body.input[inputKey]}`);
        }
      });
    }
    
    // Map aspect ratio to dimensions if not explicitly provided
    if (!body.input?.width && !body.input?.height && body.metadata?.aspectRatio) {
      const aspectRatio = body.metadata.aspectRatio;
      const aspectRatioMap: Record<string, { width: number; height: number }> = {
        '1:1': { width: 1024, height: 1024 },
        '16:9': { width: 1344, height: 768 },
        '9:16': { width: 768, height: 1344 }
      };
      
      if (aspectRatioMap[aspectRatio]) {
        modelInput.width = aspectRatioMap[aspectRatio].width;
        modelInput.height = aspectRatioMap[aspectRatio].height;
        console.log(`📐 Mapped aspect ratio ${aspectRatio} to ${modelInput.width}x${modelInput.height}`);
      }
    }
    
    // Apply composed negative prompt (base + user additions)
    if (finalNegativePrompt) {
      modelInput.negative_prompt = finalNegativePrompt;
    }
    
    // Filter input to only allowed keys for this model to prevent 422 errors
    if (allowedInputKeys.length > 0) {
      const filteredInput: Record<string, any> = {};
      Object.keys(modelInput).forEach(key => {
        if (allowedInputKeys.includes(key) || ['prompt', 'num_outputs'].includes(key)) {
          filteredInput[key] = (modelInput as any)[key];
        } else {
          console.log(`🚮 Filtered out unsupported input key: ${key}`);
        }
      });
      Object.assign(modelInput as any, filteredInput);
    }

    // Remove null/undefined keys to satisfy Replicate schema
    Object.keys(modelInput as any).forEach((key) => {
      const val = (modelInput as any)[key];
      if (val === null || val === undefined) {
        delete (modelInput as any)[key];
      }
    });

    // Ensure seed is a valid integer; otherwise omit
    if ('seed' in (modelInput as any)) {
      const seed = (modelInput as any).seed;
      if (seed === null || seed === undefined || typeof seed !== 'number' || Number.isNaN(seed)) {
        delete (modelInput as any).seed;
        console.log('🚮 Removed invalid seed value:', seed);
      }
    }
    
    // Build model identifier from database fields
    const modelIdentifier = `${apiModel.model_key}:${apiModel.version}`;

    console.log('🔧 Model input configuration:', modelInput);
    
    // Enhanced logging for negative prompt debugging
    console.log('🎯 Negative prompt configuration:', {
      base_negative_length: baseNegativePrompt.length,
      user_provided_length: userProvidedNegative.length,
      composed_final_length: finalNegativePrompt.length,
      content_mode_from_toggle: body.metadata?.contentType || 'not_provided',
      model_type: normalizedModelType,
      final_negative_prompt: modelInput.negative_prompt ? modelInput.negative_prompt.substring(0, 100) + '...' : 'none'
    });

    // Create prediction with webhook
    const webhookUrl = `${supabaseUrl}/functions/v1/replicate-webhook`;
    
    console.log('🔧 Creating prediction with version:', versionId, 'for model_key:', apiModel.model_key);
    console.log('🔧 Model input:', JSON.stringify(modelInput, null, 2));

    try {
      const prediction = await replicate.predictions.create({
        version: versionId,
        input: modelInput,
        webhook: webhookUrl,
        webhook_events_filter: ["start", "completed"]
      });

      console.log("🚀 Prediction created successfully:", { 
        id: prediction.id, 
        status: prediction.status,
        webhook: webhookUrl
      });

      // Update job with prediction info
      await supabase
        .from('jobs')
        .update({
          status: 'processing',
          started_at: new Date().toISOString(),
          metadata: {
            ...jobData.metadata,
            prediction_id: prediction.id,
            model_identifier: modelIdentifier,
            version_id: versionId,
            input_used: modelInput,
            webhook_url: webhookUrl
          }
        })
        .eq('id', jobData.id);

      return new Response(JSON.stringify({ 
        jobId: jobData.id,
        predictionId: prediction.id,
        status: 'queued'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
      
    } catch (predictionError) {
      const err: any = predictionError;
      const status = err?.response?.status;
      const url = err?.request?.url;
      console.error("❌ Failed to create Replicate prediction:", {
        message: err?.message,
        status,
        url,
      });

      // Mark job as failed with richer error info
      const errorPayload: Record<string, unknown> = {
        error: 'Prediction creation failed',
        message: err?.message,
        status,
        url,
        model_key: apiModel.model_key,
        version_id: versionId,
        hint: status === 404 ? 'Verify the version_id exists and is accessible to your API token' : undefined,
        code: status === 404 ? 'MODEL_VERSION_NOT_FOUND' : 'PREDICTION_CREATE_ERROR',
      };

      await supabase
        .from('jobs')
        .update({
          status: 'failed',
          error_message: JSON.stringify(errorPayload).slice(0, 1000),
        })
        .eq('id', jobData.id);

      return new Response(JSON.stringify(errorPayload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: status && Number.isInteger(status) ? status : 500,
      });
    }

  } catch (error) {
    console.error("❌ Error in replicate function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
