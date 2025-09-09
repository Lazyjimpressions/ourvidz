
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
    
    // Normalize model_type for database constraint compatibility
    const normalizeModelType = (modelFamily: string | null, modelKey: string): string => {
      if (!modelFamily) return 'rv51'; // Default fallback
      
      const family = modelFamily.toLowerCase();
      const key = modelKey.toLowerCase();
      
      // Map model families to valid database enum values
      if (family.includes('rv') || key.includes('realistic')) return 'rv51';
      if (family.includes('flux') || key.includes('flux')) return 'flux';
      if (family.includes('sdxl') || key.includes('sdxl')) return 'sdxl';
      if (jobType.includes('rv51')) return 'rv51'; // Fallback from job_type
      
      // Final fallback
      return 'rv51';
    };
    
    const normalizedModelType = normalizeModelType(apiModel.model_family, apiModel.model_key);
    
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
          // Use shared utility function to get ALL negative prompts for the model/content mode
          negativePrompt = await getDatabaseNegativePrompts(normalizedModelType, contentMode);
          
          if (negativePrompt) {
            console.log(`📝 Auto-populated combined negative prompts for ${normalizedModelType}_${contentMode}`);
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
    
    // Apply user input overrides with validation
    if (body.input) {
      // Map steps to num_inference_steps (Replicate schema)
      if (body.input.steps !== undefined) {
        modelInput.num_inference_steps = Math.min(Math.max(body.input.steps, 1), 100);
      }
      
      // Map guidance_scale (keep same name for Replicate schema)
      if (body.input.guidance_scale !== undefined) {
        modelInput.guidance_scale = Math.min(Math.max(body.input.guidance_scale, 3.5), 15);
      }
      
      // Map dimensions (UI uses 'width'/'height', model uses 'width'/'height')
      if (body.input.width !== undefined) {
        modelInput.width = Math.min(Math.max(body.input.width, 64), 1920);
      }
      if (body.input.height !== undefined) {
        modelInput.height = Math.min(Math.max(body.input.height, 64), 1920);
      }
      
      // Map i2i parameters (image and prompt_strength)
      if (body.input.image !== undefined) {
        modelInput.image = body.input.image;
        console.log('🖼️ I2I image set from input:', body.input.image);
      } else if (body.metadata?.reference_image_url) {
        modelInput.image = body.metadata.reference_image_url;
        console.log('🖼️ I2I image set from metadata:', body.metadata.reference_image_url);
      }
      
      if (body.input.prompt_strength !== undefined) {
        modelInput.prompt_strength = Math.min(Math.max(body.input.prompt_strength, 0), 1);
        console.log('🎚️ I2I prompt_strength set:', modelInput.prompt_strength);
      } else if (body.metadata?.reference_strength) {
        modelInput.prompt_strength = Math.min(Math.max(1 - body.metadata.reference_strength, 0), 1);
        console.log('🎚️ I2I prompt_strength derived from reference_strength:', modelInput.prompt_strength);
      } else if (body.metadata?.denoise_strength) {
        modelInput.prompt_strength = Math.min(Math.max(body.metadata.denoise_strength, 0), 1);
        console.log('🎚️ I2I prompt_strength derived from denoise_strength:', modelInput.prompt_strength);
      }
    }
    
    // Map negative prompt (UI uses 'negative_prompt', model uses 'negative_prompt')
    if (body.input?.negative_prompt !== undefined) {
      modelInput.negative_prompt = body.input.negative_prompt;
    }
    
    // Map seed (UI uses 'seed', model uses 'seed') - unconditional mapping
    if (body.input?.seed !== undefined) {
      modelInput.seed = Math.min(Math.max(body.input.seed, 0), 2147483647);
    }
    
    // Map and validate scheduler - convert UI values to Replicate canonical values - unconditional mapping
    if (body.input?.scheduler !== undefined) {
      const schedulerMap: Record<string, string> = {
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
        
      const allowedSchedulers = ['DDIM', 'DPMSolverMultistep', 'HeunDiscrete', 'KarrasDPM', 'K_EULER_ANCESTRAL', 'K_EULER', 'PNDM'];
      const mappedScheduler = schedulerMap[body.input.scheduler];
      
      if (mappedScheduler && allowedSchedulers.includes(mappedScheduler)) {
        modelInput.scheduler = mappedScheduler;
        console.log(`📋 Scheduler mapped: ${body.input.scheduler} -> ${mappedScheduler}`);
      } else {
        console.log(`⚠️ Invalid scheduler "${body.input.scheduler}" - omitting scheduler parameter, letting Replicate use default`);
        // Don't set scheduler - let Replicate use its default
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
    
    // Build model identifier from database fields
    const modelIdentifier = `${apiModel.model_key}:${apiModel.version}`;

    console.log('🔧 Model input configuration:', modelInput);
    
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
      content_mode: body.metadata?.contentType || 'not_provided'
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
