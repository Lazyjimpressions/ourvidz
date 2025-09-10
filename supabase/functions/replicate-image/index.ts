
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
    const hasReferenceImage = !!(body.input?.image || body.metadata?.referenceImage);
    
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

    // Auto-populate negative prompt based on content mode from toggle
    let negativePrompt = body.input?.negative_prompt || body.metadata?.negative_prompt;
    
    if (!negativePrompt) {
      try {
        // Use content mode directly from toggle - no detection or fallback
        const contentMode = body.metadata?.contentType; // Direct from UI toggle
        
        if (contentMode && (contentMode === 'sfw' || contentMode === 'nsfw')) {
          // Determine generation mode for targeted negative prompts
          const generationMode = hasReferenceImage ? 'i2i' : 'txt2img';
          
          // Use shared utility function to get ALL negative prompts for the model/content mode/generation mode
          const { data: negativePrompts, error: negError } = await supabase
            .from('negative_prompts')
            .select('negative_prompt')
            .eq('model_type', normalizedModelType.replace('-i2i', '')) // Remove i2i suffix for lookup
            .eq('content_mode', contentMode)
            .eq('generation_mode', generationMode)
            .eq('is_active', true)
            .order('priority', { ascending: false });
          
          if (!negError && negativePrompts?.length > 0) {
            negativePrompt = negativePrompts.map(np => np.negative_prompt).join(', ');
            console.log(`📝 Auto-populated ${generationMode} negative prompts for ${normalizedModelType}_${contentMode}: ${negativePrompts.length} prompts`);
          } else {
            console.log(`⚠️ No ${generationMode} negative prompts found for ${normalizedModelType}_${contentMode}`);
          }
        } else {
          console.log('⚠️ No valid content mode provided from toggle, skipping negative prompt auto-population');
        }
      } catch (error) {
        console.warn('⚠️ Failed to auto-populate negative prompt:', error);
      }
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
          negative_prompt_auto_populated: !!negativePrompt,
          negative_prompt_source: negativePrompt ? 'database' : (body.input?.negative_prompt ? 'user' : 'none')
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
      prompt: body.prompt,
      num_outputs: 1, // Explicitly request single image to avoid grid composites
      ...apiModel.input_defaults
    };
    
    // Disable safety checker for NSFW content
    const contentMode = body.metadata?.contentType;
    if (contentMode === 'nsfw') {
      modelInput.disable_safety_checker = true;
      console.log('🔓 Safety checker disabled for NSFW content');
    }
    
    // Get model capabilities for input validation
    const capabilities = apiModel.capabilities || {};
    const allowedInputKeys = capabilities.allowed_input_keys || [];
    const schedulerAliases = capabilities.scheduler_aliases || {};
    const inputKeyMappings = capabilities.input_key_mappings || {};
    
    console.log('🔧 Model capabilities:', {
      allowed_input_keys: allowedInputKeys,
      scheduler_aliases: Object.keys(schedulerAliases),
      input_key_mappings: Object.keys(inputKeyMappings)
    });
    
    // Apply user input overrides with model-specific validation
    if (body.input) {
      // Map steps with model-specific key names
      if (body.input.steps !== undefined) {
        const stepsKey = inputKeyMappings.steps || 'steps';
        modelInput[stepsKey] = Math.min(Math.max(body.input.steps, 1), 100);
        console.log(`🔧 Mapped steps: ${body.input.steps} -> ${stepsKey}:${modelInput[stepsKey]}`);
      }
      
      // Map guidance_scale with model-specific key names
      if (body.input.guidance_scale !== undefined) {
        const guidanceKey = inputKeyMappings.guidance_scale || 'guidance_scale';
        modelInput[guidanceKey] = Math.min(Math.max(body.input.guidance_scale, 3.5), 7);
        console.log(`🔧 Mapped guidance_scale: ${body.input.guidance_scale} -> ${guidanceKey}:${modelInput[guidanceKey]}`);
      }
      
      // Map dimensions (UI uses 'width'/'height', model uses 'width'/'height')
      if (body.input.width !== undefined) {
        modelInput.width = Math.min(Math.max(body.input.width, 64), 1920);
      }
      if (body.input.height !== undefined) {
        modelInput.height = Math.min(Math.max(body.input.height, 64), 1920);
      }
      
      // Map negative prompt (always applies)
      if (body.input.negative_prompt !== undefined) {
        modelInput.negative_prompt = body.input.negative_prompt;
      }
      
      // Map seed (always applies)
      if (body.input.seed !== undefined) {
        modelInput.seed = Math.min(Math.max(body.input.seed, 0), 2147483647);
      }
      
      // Map scheduler with model-specific aliases (always applies)
      if (body.input.scheduler !== undefined) {
        // Use model-specific scheduler mapping if available
        const modelSchedulerMap = schedulerAliases || {
          'EulerA': 'K_EULER_ANCESTRAL',
          'MultistepDPM-Solver': 'DPMSolverMultistep', 
          'MultistepDPM': 'DPMSolverMultistep',
          'K_EULER_ANCESTRAL': 'K_EULER_ANCESTRAL',
          'DPMSolverMultistep': 'DPMSolverMultistep',
          'K_EULER': 'K_EULER',
          'DDIM': 'DDIM',
          'HeunDiscrete': 'HeunDiscrete', 
          'KarrasDPM': 'KarrasDPM',
          'PNDM': 'PNDM'
        };
        
        const mappedScheduler = modelSchedulerMap[body.input.scheduler] || body.input.scheduler;
        modelInput.scheduler = mappedScheduler;
        console.log(`🔧 Scheduler mapped: ${body.input.scheduler} -> ${mappedScheduler}`);
      }
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
    
    // Apply auto-populated negative prompt if no user override
    if (!modelInput.negative_prompt && negativePrompt) {
      modelInput.negative_prompt = negativePrompt;
    }
    
    // Filter input to only allowed keys for this model to prevent 422 errors
    if (allowedInputKeys.length > 0) {
      const filteredInput = {};
      Object.keys(modelInput).forEach(key => {
        if (allowedInputKeys.includes(key) || ['prompt', 'num_outputs'].includes(key)) {
          filteredInput[key] = modelInput[key];
        } else {
          console.log(`🚮 Filtered out unsupported input key: ${key}`);
        }
      });
      Object.assign(modelInput, filteredInput);
    }
    
    // Build model identifier from database fields
    const modelIdentifier = `${apiModel.model_key}:${apiModel.version}`;

    console.log('🔧 Model input configuration:', modelInput);
    
    // Enhanced logging for negative prompt debugging
    console.log('🎯 Negative prompt configuration:', {
      user_provided: !!body.input?.negative_prompt,
      auto_populated: !!negativePrompt,
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
