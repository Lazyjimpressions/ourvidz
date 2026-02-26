
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Replicate from "https://esm.sh/replicate@0.25.2";
import { getDatabaseNegativePrompts } from '../_shared/cache-utils.ts';

// Inline API usage tracking functions to avoid shared module dependency issues
interface UsageLogData {
  providerId: string;
  modelId?: string;
  userId?: string;
  requestType: 'chat' | 'image' | 'video';
  endpointPath?: string;
  requestPayload?: any;
  tokensInput?: number;
  tokensOutput?: number;
  tokensTotal?: number;
  tokensCached?: number;
  costUsd?: number;
  costCredits?: number;
  responseStatus?: number;
  responseTimeMs: number;
  responsePayload?: any;
  errorMessage?: string;
  providerMetadata?: Record<string, any>;
}

async function logApiUsage(supabase: any, data: UsageLogData): Promise<void> {
  try {
    const { error: logError } = await supabase
      .from('api_usage_logs')
      .insert([{
        provider_id: data.providerId,
        model_id: data.modelId || null,
        user_id: data.userId || null,
        request_type: data.requestType,
        endpoint_path: data.endpointPath || null,
        request_payload: data.requestPayload || null,
        tokens_input: data.tokensInput || null,
        tokens_output: data.tokensOutput || null,
        tokens_total: data.tokensTotal || null,
        tokens_cached: data.tokensCached || null,
        cost_usd: data.costUsd || null,
        cost_credits: data.costCredits || null,
        response_status: data.responseStatus || null,
        response_time_ms: data.responseTimeMs,
        response_payload: data.responsePayload || null,
        error_message: data.errorMessage || null,
        provider_metadata: data.providerMetadata || {}
      }]);

    if (logError) {
      console.error('❌ Failed to log API usage:', logError);
      return;
    }

    // Update aggregates (async, don't await)
    updateAggregates(supabase, data).catch(err => {
      console.error('❌ Failed to update aggregates:', err);
    });
  } catch (error) {
    console.error('❌ Error in logApiUsage:', error);
  }
}

async function updateAggregates(supabase: any, data: UsageLogData): Promise<void> {
  try {
    const now = new Date();
    const dateBucket = now.toISOString().split('T')[0];
    const hourBucket = now.getHours();

    const { error } = await supabase.rpc('upsert_usage_aggregate', {
      p_provider_id: data.providerId,
      p_model_id: data.modelId || null,
      p_date_bucket: dateBucket,
      p_hour_bucket: hourBucket,
      p_request_count: 1,
      p_success_count: (data.responseStatus && data.responseStatus < 400) ? 1 : 0,
      p_error_count: (data.responseStatus && data.responseStatus >= 400) ? 1 : 0,
      p_tokens_input: data.tokensInput || 0,
      p_tokens_output: data.tokensOutput || 0,
      p_tokens_cached: data.tokensCached || 0,
      p_cost_usd: data.costUsd || 0,
      p_cost_credits: data.costCredits || 0,
      p_response_time_ms: data.responseTimeMs
    });

    if (error) {
      console.error('❌ Failed to update aggregate:', error);
    }
  } catch (error) {
    console.error('❌ Error updating aggregates:', error);
  }
}

function extractReplicateUsage(response: any, modelPricing?: any): Partial<UsageLogData> {
  // At prediction creation, Replicate doesn't provide cost yet.
  // Use the model's pricing from api_models.pricing as the initial estimate.
  // The actual cost will be backfilled by replicate-webhook when the prediction completes.
  let estimatedCost: number | null = null;
  if (response.cost) {
    estimatedCost = response.cost;
  } else if (modelPricing) {
    // Use per-generation price from api_models.pricing JSONB
    const pricing = typeof modelPricing === 'object' ? modelPricing : {};
    estimatedCost = pricing.per_generation || pricing.cost_per_use || null;
  }
  
  return {
    costUsd: estimatedCost,
    providerMetadata: {
      prediction_id: response.id,
      status: response.status,
      metrics: response.metrics,
      version: response.version,
      created_at: response.created_at,
      completed_at: response.completed_at
    }
  };
}

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
    
    // ✅ VALIDATION: Check CLIP token limit (77 tokens hard limit)
    const promptLength = body.prompt?.length || 0;
    const estimatedTokens = Math.ceil(promptLength / 4.2); // CLIP tokenizer: ~4.2 chars per token
    const MAX_CLIP_TOKENS = 77; // CLIP hard limit - everything after is truncated
    const promptTooLong = estimatedTokens > MAX_CLIP_TOKENS;
    
    if (promptTooLong) {
      console.warn(`⚠️ VALIDATION: Prompt estimated at ${estimatedTokens} CLIP tokens, exceeds ${MAX_CLIP_TOKENS} token limit! Will be truncated.`);
      console.warn(`⚠️ VALIDATION: Prompt length: ${promptLength} chars`);
    } else {
      console.log(`✅ VALIDATION: Prompt estimated at ${estimatedTokens} CLIP tokens (within ${MAX_CLIP_TOKENS} limit)`);
    }
    
    console.log('🎬 Replicate request received:', {
      prompt: body.prompt?.slice(0, 100),
      prompt_length: promptLength,
      prompt_too_long: promptTooLong,
      apiModelId: body.apiModelId,
      jobType: body.jobType
    });
    
    // ✅ AUDIT: Log consistency settings received
    console.log('📥 AUDIT: Consistency settings received:', {
      consistency_method: body.metadata?.consistency_method,
      reference_strength: body.metadata?.reference_strength,
      denoise_strength: body.metadata?.denoise_strength,
      seed_locked: body.metadata?.seed_locked,
      seed_in_metadata: body.metadata?.seed,
      input_object: body.input,
      has_reference_image_url: !!body.reference_image_url,
      reference_image_url_preview: body.reference_image_url ? body.reference_image_url.substring(0, 50) + '...' : null
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

    // ⚡ Fast path: If polling for prediction status, skip all model resolution
    if (body.predictionId) {
      console.log("🔍 Checking status for prediction (fast path):", body.predictionId);
      const replicateKey = Deno.env.get('REPLICATE_API_TOKEN');
      if (!replicateKey) {
        return new Response(
          JSON.stringify({ error: 'Replicate API key not configured' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      const rep = new Replicate({ auth: replicateKey });
      const prediction = await rep.predictions.get(body.predictionId);
      console.log("📊 Status check response:", { 
        id: prediction.id, 
        status: prediction.status,
        progress: prediction.progress 
      });
      // Ensure output URLs are plain strings (not FileOutput objects)
      let output = prediction.output;
      if (Array.isArray(output)) {
        output = output.map((item: any) =>
          typeof item === 'string' ? item
            : item?.url ? (typeof item.url === 'function' ? item.url() : item.url)
            : String(item)
        );
      }
      return new Response(JSON.stringify({ ...prediction, output }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      // No apiModelId provided - get default Replicate image model
      console.log('📸 No apiModelId provided, fetching default Replicate image model...');

      const { data: defaultModel, error: defaultError } = await supabase
        .from('api_models')
        .select(`
          *,
          api_providers!inner(*)
        `)
        .eq('modality', 'image')
        .eq('is_active', true)
        .contains('default_for_tasks', ['t2i'])
        .eq('api_providers.name', 'replicate')
        .single();

      if (defaultError || !defaultModel) {
        // Fallback: get any active Replicate image model
        console.log('⚠️ No default model found, trying first active Replicate image model...');
        const { data: fallbackModel, error: fallbackError } = await supabase
          .from('api_models')
          .select(`
            *,
            api_providers!inner(*)
          `)
          .eq('modality', 'image')
          .eq('is_active', true)
          .eq('api_providers.name', 'replicate')
          .order('priority', { ascending: true })
          .limit(1)
          .single();

        if (fallbackError || !fallbackModel) {
          console.error('❌ No Replicate image models available:', fallbackError);
          return new Response(
            JSON.stringify({ error: 'No Replicate image models configured. Please add one in api_models table.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }
        apiModel = fallbackModel;
        console.log('✅ Using fallback Replicate model:', fallbackModel.display_name);
      } else {
        apiModel = defaultModel;
        console.log('✅ Using default Replicate model:', defaultModel.display_name);
      }
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

    // Note: predictionId polling is handled by the fast path above (before model resolution)

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
    const hasReferenceImage = !!(body.input?.image || body.metadata?.referenceImage || body.metadata?.reference_image_url || body.reference_image_url);
    
    // Normalize job_type for database constraint compatibility
    const normalizeJobType = (jobType: string): string => {
      // Sanitize invalid job types to valid database values
      if (jobType.includes('stability_sdxl')) return 'sdxl_image_high';
      if (jobType.includes('sdxl_api')) return 'sdxl_image_high';
      if (jobType.includes('sdxl') && jobType.includes('high')) return 'sdxl_image_high';
      if (jobType.includes('sdxl') && jobType.includes('fast')) return 'sdxl_image_fast';
      if (jobType.includes('rv51')) return jobType.includes('high') ? 'rv51_high' : 'rv51_fast';
      if (jobType.includes('flux')) return jobType.includes('high') ? 'flux_high' : 'flux_fast';
      
      // Default fallback for invalid job types
      return jobType.includes('high') ? 'image_high' : 'image_fast';
    };

    // Normalize model_type for database constraint compatibility
    const normalizeModelType = (modelFamily: string | null, modelKey: string, isI2I: boolean = false): string => {                                              
      if (!modelFamily) return 'sdxl'; // Default to sdxl for Replicate
      
      const family = modelFamily.toLowerCase();
      const key = modelKey.toLowerCase();
      
      // For Replicate SDXL models, use 'sdxl' (not replicate-sdxl variants)
      if (family.includes('sdxl') || key.includes('sdxl')) return 'sdxl';
      if (family.includes('rv') || key.includes('realistic')) return 'rv51';                                                            
      if (family.includes('flux') || key.includes('flux')) return 'flux';                                                               
      
      // Final fallback to sdxl for Replicate models
      return 'sdxl';
    };
    
    const normalizedJobType = normalizeJobType(jobType);
    const normalizedModelType = normalizeModelType(apiModel.model_family, apiModel.model_key, hasReferenceImage);
    
    console.log('🎯 Job parameters validated and sanitized:', {
      jobType_from_body: body.job_type,
      jobType_legacy: body.jobType,
      original_jobType: jobType,
      normalized_jobType: normalizedJobType,
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

    // Attempt to create job with sanitized values
    let { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        job_type: normalizedJobType, // ✅ Use sanitized job type
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
          negative_prompt_source: finalNegativePrompt ? 'database' : (body.input?.negative_prompt ? 'user' : 'none'),
          original_job_type: jobType, // Keep original for debugging
          sanitized_job_type: normalizedJobType
        }
      })
      .select()
      .single();

    // If job creation failed due to constraint, try with fallback values
    if (jobError && jobError.message?.includes('violates check constraint')) {
      console.warn('⚠️ Job constraint violation, retrying with fallback values:', jobError.message);
      
      const fallbackJobType = 'image_high';
      const fallbackModelType = 'sdxl';
      
      const { data: retryJobData, error: retryJobError } = await supabase
        .from('jobs')
        .insert({
          user_id: user.id,
          job_type: fallbackJobType,
          original_prompt: body.prompt,
          status: 'queued',
          quality: quality,
          api_model_id: apiModel.id,
          model_type: fallbackModelType,
          format: 'image',
          metadata: {
            ...body.metadata,
            provider_name: apiModel.api_providers.name,
            model_key: apiModel.model_key,
            version: apiModel.version,
            api_model_configured: true,
            content_mode: body.metadata?.contentType || null,
            negative_prompt_auto_populated: !!finalNegativePrompt,
            negative_prompt_source: finalNegativePrompt ? 'database' : (body.input?.negative_prompt ? 'user' : 'none'),
            original_job_type: jobType,
            attempted_job_type: normalizedJobType,
            fallback_job_type: fallbackJobType,
            fallback_model_type: fallbackModelType,
            constraint_retry: true
          }
        })
        .select()
        .single();
      
      jobData = retryJobData;
      jobError = retryJobError;
      
      if (!retryJobError) {
        console.log('✅ Job created with fallback values:', jobData.id);
      }
    }

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

        // Map image field - check all possible locations where reference image could be passed
        let imageValue = body.input.image || body.input[imageKey] || body.reference_image_url;
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
        
        // ✅ FIX: Map strength field - prioritize reference_strength from metadata when consistency method requires i2i
        const consistencyMethod = body.metadata?.consistency_method;
        const requiresI2I = consistencyMethod === 'i2i_reference' || consistencyMethod === 'hybrid';
        
        let strengthValue = body.input[strengthKey] || body.input.prompt_strength;
        if (strengthValue === undefined && body.metadata) {
          // Prioritize reference_strength from metadata when consistency method requires i2i
          if (requiresI2I && body.metadata.reference_strength !== undefined) {
            strengthValue = body.metadata.reference_strength;
            console.log(`💪 Using reference_strength from metadata for ${consistencyMethod}: ${strengthValue}`);
          } else {
            strengthValue = body.metadata.reference_strength || body.metadata.denoise_strength;
          }
        }
        
        if (strengthValue !== undefined) {
          modelInput[strengthKey] = Math.min(Math.max(parseFloat(strengthValue), 0.1), 1.0);
          console.log(`💪 Mapped i2i strength: ${strengthKey} = ${modelInput[strengthKey]} (method: ${consistencyMethod || 'unknown'})`);
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
      
      // ✅ FIX: Map seed only if consistency method requires it
      const consistencyMethod = body.metadata?.consistency_method;
      const requiresSeed = consistencyMethod === 'seed_locked' || consistencyMethod === 'hybrid';
      
      if (requiresSeed) {
        // Check multiple sources for seed, prioritize input.seed
        const seedValue = body.input?.seed ?? body.seed ?? body.metadata?.seed;
        if (seedValue !== undefined && seedValue !== null) {
          modelInput.seed = Math.min(Math.max(parseInt(seedValue), 0), 2147483647);
          console.log(`🔒 Consistency method "${consistencyMethod}" requires seed: ${modelInput.seed}`);
        } else {
          console.warn(`⚠️ Consistency method "${consistencyMethod}" requires seed but none provided`);
        }
      } else if (body.input.seed !== undefined) {
        // If seed provided but not required by method, still apply it (for backward compatibility)
        modelInput.seed = Math.min(Math.max(body.input.seed, 0), 2147483647);
        console.log(`🔧 Seed provided but not required by method "${consistencyMethod}", applying anyway: ${modelInput.seed}`);
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
    
    // ✅ FIX: Ensure seed mapping from top-level or metadata when consistency method requires it
    const consistencyMethod = body.metadata?.consistency_method;
    const requiresSeed = consistencyMethod === 'seed_locked' || consistencyMethod === 'hybrid';
    
    if (requiresSeed && (modelInput as any).seed === undefined) {
      // Check top-level seed, then metadata seed
      const seedValue = body.seed ?? body.metadata?.seed;
      if (seedValue !== undefined && seedValue !== null) {
        (modelInput as any).seed = Math.min(Math.max(parseInt(seedValue), 0), 2147483647);
        console.log(`🔒 Applied seed from top-level/metadata for ${consistencyMethod}: ${(modelInput as any).seed}`);
      }
    } else if (!requiresSeed && (modelInput as any).seed === undefined && body.seed !== undefined) {
      // Backward compatibility: apply seed even if not required
      (modelInput as any).seed = Math.min(Math.max(body.seed, 0), 2147483647);
      console.log(`🔧 Applied seed from top-level (not required by method): ${(modelInput as any).seed}`);
    }

    // Handle i2i mapping even if input block is missing
    if (hasReferenceImage) {
      const imageKey = inputKeyMappings.i2i_image_key || 'image';
      const strengthKey = inputKeyMappings.i2i_strength_key || 'strength';
      let imageValue = body.input?.image ?? body.input?.[imageKey] ?? body.metadata?.reference_image_url ?? body.metadata?.referenceImage ?? body.reference_image_url;
      if (!imageValue) {
        return new Response(
          JSON.stringify({ error: "i2i request requires image data in input.image, metadata.reference_image_url, or reference_image_url" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }
      if (typeof imageValue === 'string') {
        let url = imageValue as string;
        if (!/^https?:\/\//i.test(url) && !url.startsWith('data:')) {
          const knownBuckets = ['user-library','workspace-temp','reference_images','sdxl_image_high','sdxl_image_fast'];
          const parts = url.split('/');
          let bucket = '';
          let path = '';
          if (knownBuckets.includes(parts[0])) {
            bucket = parts[0];
            path = parts.slice(1).join('/');
          } else {
            bucket = 'user-library';
            path = url;
          }
          const { data: signed, error: signError } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
          if (!signError && signed?.signedUrl) {
            url = signed.signedUrl;
            console.log(`🔏 Signed i2i image URL for bucket "${bucket}": ${url.slice(0, 60)}...`);
          } else {
            console.warn('⚠️ Failed to sign i2i image URL, using raw path:', signError);
          }
        }
        (modelInput as any)[imageKey] = url;
      } else {
        (modelInput as any)[imageKey] = imageValue;
      }

      // ✅ FIX: Prioritize reference_strength from metadata when consistency method requires i2i
      const consistencyMethod = body.metadata?.consistency_method;
      const requiresI2I = consistencyMethod === 'i2i_reference' || consistencyMethod === 'hybrid';
      
      let strengthValue = body.input?.[strengthKey] ?? body.input?.prompt_strength;
      if (strengthValue === undefined && body.metadata) {
        // Prioritize reference_strength from metadata when consistency method requires i2i
        if (requiresI2I && body.metadata.reference_strength !== undefined) {
          strengthValue = body.metadata.reference_strength;
          console.log(`💪 Using reference_strength from metadata for ${consistencyMethod}: ${strengthValue}`);
        } else {
          strengthValue = body.metadata.reference_strength ?? body.metadata.denoise_strength;
        }
      }
      
      if (strengthValue !== undefined) {
        (modelInput as any)[strengthKey] = Math.min(Math.max(parseFloat(strengthValue), 0.1), 1.0);
        console.log(`💪 Mapped i2i strength (fallback): ${strengthKey} = ${(modelInput as any)[strengthKey]} (method: ${consistencyMethod || 'unknown'})`);
      } else if ((modelInput as any)[strengthKey] === undefined) {
        (modelInput as any)[strengthKey] = 0.7;
        console.log(`💪 Using default i2i strength (fallback): ${strengthKey} = ${(modelInput as any)[strengthKey]}`);
      }
    }

    // Normalize scheduler regardless of source
    if ((modelInput as any).scheduler !== undefined) {
      let desired = (modelInput as any).scheduler;
      if (schedulerAliases && schedulerAliases[desired]) {
        desired = schedulerAliases[desired];
      }
      if (Array.isArray(allowedSchedulers) && allowedSchedulers.length > 0) {
        // Try desired
        if (allowedSchedulers.includes(desired)) {
          (modelInput as any).scheduler = desired;
        } else {
          // Try DB default (after alias)
          let def = apiModel.input_defaults?.scheduler;
          if (def && schedulerAliases && schedulerAliases[def]) def = schedulerAliases[def];
          if (def && allowedSchedulers.includes(def)) {
            (modelInput as any).scheduler = def;
          } else {
            // Fallback to first allowed
            (modelInput as any).scheduler = allowedSchedulers[0];
          }
          console.log(`⚠️ Scheduler normalized from "${(modelInput as any).scheduler}" to allowed value.`);
        }
      }
      console.log(`🔧 Scheduler normalized to: ${(modelInput as any).scheduler}`);
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
    
    // ✅ AUDIT: Log final payload being sent to Replicate API
    console.log('📤 AUDIT: Final Replicate API payload:', JSON.stringify({
      version: versionId,
      model_key: apiModel.model_key,
      model_identifier: modelIdentifier,
      input: modelInput,
      consistency_method: body.metadata?.consistency_method,
      has_seed: 'seed' in modelInput,
      seed_value: (modelInput as any).seed,
      has_image: 'image' in modelInput,
      image_preview: (modelInput as any).image ? String((modelInput as any).image).substring(0, 50) + '...' : null,
      has_strength: 'strength' in modelInput || 'prompt_strength' in modelInput,
      strength_value: (modelInput as any).strength || (modelInput as any).prompt_strength,
      prompt_preview: modelInput.prompt?.substring(0, 100) + '...',
      negative_prompt_preview: modelInput.negative_prompt ? modelInput.negative_prompt.substring(0, 100) + '...' : null
    }, null, 2));

    // Create prediction with webhook
    const webhookUrl = `${supabaseUrl}/functions/v1/replicate-webhook`;
    
    console.log('🔧 Creating prediction with version:', versionId, 'for model_key:', apiModel.model_key);
    console.log('🔧 Model input:', JSON.stringify(modelInput, null, 2));

    const startTime = Date.now();
    let responseTimeMs = 0;

    try {
      const prediction = await replicate.predictions.create({
        version: versionId,
        input: modelInput,
        webhook: webhookUrl,
        webhook_events_filter: ["start", "completed"]
      });

      responseTimeMs = Date.now() - startTime;

      console.log("🚀 Prediction created successfully:", { 
        id: prediction.id, 
        status: prediction.status,
        webhook: webhookUrl
      });

      // Log usage for prediction creation
      const usageData = extractReplicateUsage(prediction, apiModel.pricing);
      logApiUsage(supabase, {
        providerId: apiModel.api_providers.id,
        modelId: apiModel.id,
        userId: user.id,
        requestType: 'image',
        endpointPath: '/v1/predictions',
        requestPayload: {
          version: versionId,
          input: modelInput,
          webhook: webhookUrl
        },
        ...usageData,
        responseStatus: 201, // Created
        responseTimeMs,
        responsePayload: prediction
      }).catch(err => console.error('Failed to log usage:', err));

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
      responseTimeMs = Date.now() - startTime;
      const err: any = predictionError;
      const status = err?.response?.status || 500;
      const url = err?.request?.url;
      console.error("❌ Failed to create Replicate prediction:", {
        message: err?.message,
        status,
        url,
      });

      // Log error usage
      logApiUsage(supabase, {
        providerId: apiModel.api_providers.id,
        modelId: apiModel.id,
        userId: user.id,
        requestType: 'image',
        endpointPath: '/v1/predictions',
        requestPayload: {
          version: versionId,
          input: modelInput,
          webhook: webhookUrl
        },
        responseStatus: status,
        responseTimeMs,
        errorMessage: err?.message || String(predictionError),
        providerMetadata: { url }
      }).catch(logErr => console.error('Failed to log error usage:', logErr));

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
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
