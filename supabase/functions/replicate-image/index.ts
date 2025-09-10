import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Replicate from "https://esm.sh/replicate@0.25.2";

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

    // Get model configuration using the new plug-and-play system
    const { data: modelConfig, error: modelError } = await supabase
      .rpc('get_model_configuration', { model_id: body.apiModelId })
      .single();

    if (modelError || !modelConfig) {
      console.error('❌ Model configuration not found:', modelError);
      return new Response(
        JSON.stringify({ error: 'Model configuration not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('✅ Using model configuration:', {
      model_key: modelConfig.model_key,
      version: modelConfig.version,
      display_name: modelConfig.display_name,
      provider_name: modelConfig.provider_name
    });

    // Validate required parameters
    if (!body.prompt) {
      return new Response(
        JSON.stringify({ error: "Missing required field: prompt" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const jobType = body.job_type || body.jobType;
    if (!jobType) {
      console.error('❌ Missing job type for replicate-image function');
      return new Response(
        JSON.stringify({ error: 'Job type is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const quality = body.quality || (jobType.includes('_high') ? 'high' : 'fast');

    // Get API key from provider configuration
    const replicateApiKey = Deno.env.get(modelConfig.provider_secret_name);
    if (!replicateApiKey) {
      console.error('❌ API key not found for provider:', modelConfig.provider_secret_name);
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

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

    // Build UI parameters from request
    const uiParams = {
      prompt: body.prompt,
      steps: body.input?.steps,
      guidance_scale: body.input?.guidance_scale,
      width: body.input?.width,
      height: body.input?.height,
      seed: body.input?.seed,
      negative_prompt: body.input?.negative_prompt,
      scheduler: body.input?.scheduler,
      num_images: body.input?.num_outputs || 1,
      image: body.input?.image,
      prompt_strength: body.input?.prompt_strength
    };

    // Validate parameters using database-driven validation
    const { data: validationResult, error: validationError } = await supabase
      .rpc('validate_model_parameters', { 
        model_id_param: body.apiModelId, 
        input_params: uiParams 
      })
      .single();

    if (validationError || !validationResult.is_valid) {
      console.error('❌ Parameter validation failed:', validationResult.errors);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid parameters',
          details: validationResult.errors 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Map UI parameters to API parameters using database configuration
    const { data: apiParams, error: mappingError } = await supabase
      .rpc('map_ui_to_api_parameters', { 
        model_id_param: body.apiModelId, 
        ui_params: uiParams 
      })
      .single();

    if (mappingError) {
      console.error('❌ Parameter mapping failed:', mappingError);
      return new Response(
        JSON.stringify({ error: 'Parameter mapping failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Apply quality preset if specified
    if (quality && quality !== 'fast') {
      const { data: qualityPreset, error: qualityError } = await supabase
        .rpc('get_quality_preset', { 
          model_id_param: body.apiModelId, 
          quality: quality 
        })
        .single();

      if (!qualityError && qualityPreset) {
        // Merge quality preset parameters
        Object.keys(qualityPreset).forEach(key => {
          if (qualityPreset[key] !== null && qualityPreset[key] !== undefined) {
            apiParams[key] = qualityPreset[key];
          }
        });
        console.log(`🎯 Applied ${quality} quality preset:`, qualityPreset);
      }
    }

    // Handle I2I configuration if reference image is provided
    if (body.input?.image || body.metadata?.reference_image_url) {
      const { data: i2iConfig, error: i2iError } = await supabase
        .rpc('get_i2i_configuration', { 
          model_id_param: body.apiModelId,
          reference_strength: body.metadata?.reference_strength,
          exact_copy_mode: body.metadata?.exact_copy_mode || false
        })
        .single();

      if (!i2iError && i2iConfig.is_supported) {
        // Set I2I parameters
        if (i2iConfig.image_param) {
          apiParams[i2iConfig.image_param] = body.input?.image || body.metadata?.reference_image_url;
        }
        if (i2iConfig.strength_param) {
          apiParams[i2iConfig.strength_param] = i2iConfig.strength_value;
        }
        console.log('🖼️ I2I configuration applied:', {
          image_param: i2iConfig.image_param,
          strength_param: i2iConfig.strength_param,
          strength_value: i2iConfig.strength_value
        });
      }
    }

    // Handle aspect ratio mapping if dimensions not explicitly provided
    if (!body.input?.width && !body.input?.height && body.metadata?.aspectRatio) {
      const { data: dimensions, error: dimensionError } = await supabase
        .rpc('get_aspect_ratio_dimensions', { 
          model_id_param: body.apiModelId,
          aspect_ratio: body.metadata.aspectRatio
        })
        .single();

      if (!dimensionError && dimensions.width && dimensions.height) {
        apiParams.width = dimensions.width;
        apiParams.height = dimensions.height;
        console.log(`📐 Mapped aspect ratio ${body.metadata.aspectRatio} to ${dimensions.width}x${dimensions.height}`);
      }
    }

    // Handle scheduler mapping
    if (body.input?.scheduler) {
      const { data: mappedScheduler, error: schedulerError } = await supabase
        .rpc('map_scheduler', { 
          model_id_param: body.apiModelId,
          ui_scheduler: body.input.scheduler
        })
        .single();

      if (!schedulerError && mappedScheduler) {
        apiParams.scheduler = mappedScheduler;
        console.log(`📋 Scheduler mapped: ${body.input.scheduler} -> ${mappedScheduler}`);
      }
    }

    // Handle content mode configuration (NSFW/SFW)
    const contentMode = body.metadata?.contentType;
    if (contentMode && modelConfig.content_mode_config?.[contentMode]) {
      const modeConfig = modelConfig.content_mode_config[contentMode];
      if (modeConfig.disable_safety_checker !== undefined) {
        apiParams.disable_safety_checker = modeConfig.disable_safety_checker;
        console.log(`🔓 Safety checker ${modeConfig.disable_safety_checker ? 'disabled' : 'enabled'} for ${contentMode} content`);
      }
    }

    // Get and apply negative prompts using existing database system
    if (!apiParams.negative_prompt) {
      try {
        // Map Replicate SDXL models to 'replicate-sdxl' model_type
        let modelType = 'rv51'; // Default to RV51 for existing models
        
        if (modelConfig.model_family?.toLowerCase().includes('sdxl') && 
            modelConfig.provider_name === 'replicate') {
          modelType = 'replicate-sdxl';
        } else if (modelConfig.model_key?.includes('realistic-vision')) {
          modelType = 'rv51';
        }
        
        // Use existing getDatabaseNegativePrompts function
        const { getDatabaseNegativePrompts } = await import('../_shared/cache-utils.ts');
        const negativePrompt = await getDatabaseNegativePrompts(modelType, contentMode || 'nsfw');
        
        if (negativePrompt) {
          apiParams.negative_prompt = negativePrompt;
          console.log(`📝 Applied negative prompts for ${modelType}_${contentMode}`);
        }
      } catch (error) {
        console.warn('⚠️ Failed to get negative prompts:', error);
      }
    }

    // Start with model defaults and merge with API parameters
    const modelInput = {
      ...modelConfig.input_defaults,
      ...apiParams,
      prompt: body.prompt
    };

    // Create job record
    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        job_type: jobType,
        original_prompt: body.prompt,
        status: 'queued',
        quality: quality,
        api_model_id: body.apiModelId,
        model_type: modelConfig.model_family,
        format: 'image',
        metadata: {
          ...body.metadata,
          provider_name: modelConfig.provider_name,
          model_key: modelConfig.model_key,
          version: modelConfig.version,
          content_mode: contentMode,
          i2i_mode: body.metadata?.exact_copy_mode ? 'copy' : 'modify',
          parameter_mapping_used: true,
          configuration_source: 'database'
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

    // Enhanced logging for all input parameters sent to Replicate
    console.log('🎯 Complete Replicate input object:', {
      prompt: modelInput.prompt ? `${modelInput.prompt.substring(0, 50)}...` : 'none',
      negative_prompt: modelInput.negative_prompt ? `${modelInput.negative_prompt.substring(0, 50)}...` : 'none',
      width: modelInput.width,
      height: modelInput.height,
      num_inference_steps: modelInput.num_inference_steps,
      guidance_scale: modelInput.guidance_scale,
      scheduler: modelInput.scheduler,
      seed: modelInput.seed,
      num_outputs: modelInput.num_outputs,
      disable_safety_checker: modelInput.disable_safety_checker,
      image: modelInput.image ? 'present' : 'none',
      prompt_strength: modelInput.prompt_strength,
      content_mode: contentMode || 'not_provided',
      configuration_source: 'database_driven'
    });

    // Create prediction with webhook
    const webhookUrl = `${supabaseUrl}/functions/v1/replicate-webhook`;
    
    console.log('🔧 Creating prediction with version:', modelConfig.version, 'for model_key:', modelConfig.model_key);

    try {
      const prediction = await replicate.predictions.create({
        version: modelConfig.version,
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
            model_identifier: `${modelConfig.model_key}:${modelConfig.version}`,
            input_used: modelInput,
            webhook_url: webhookUrl,
            configuration_method: 'plug_and_play'
          }
        })
        .eq('id', jobData.id);

      return new Response(JSON.stringify({ 
        jobId: jobData.id,
        predictionId: prediction.id,
        status: 'queued',
        configuration_method: 'plug_and_play'
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

      // Get error handling configuration
      const errorHandling = modelConfig.error_handling || {};
      const errorMessages = errorHandling.error_messages || {};
      
      // Mark job as failed with richer error info
      const errorPayload: Record<string, unknown> = {
        error: 'Prediction creation failed',
        message: err?.message,
        status,
        url,
        model_key: modelConfig.model_key,
        version_id: modelConfig.version,
        hint: status === 404 ? 'Verify the version_id exists and is accessible to your API token' : undefined,
        code: status === 404 ? 'MODEL_VERSION_NOT_FOUND' : 'PREDICTION_CREATE_ERROR',
        user_message: errorMessages[status === 404 ? 'MODEL_VERSION_NOT_FOUND' : 'PREDICTION_CREATE_ERROR'] || err?.message
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