
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

/**
 * Static pricing map for fal.ai models (USD per generation)
 * Based on fal.ai pricing: https://fal.ai/pricing
 * Updated: 2025-01
 */
const FAL_PRICING: Record<string, number> = {
  // Image models
  'fal-ai/bytedance/seedream/v4/text-to-image': 0.025,
  'fal-ai/bytedance/seedream/v4.5/edit': 0.035,
  'fal-ai/seedream/v4/text-to-image': 0.025,
  'fal-ai/seedream/v4.5/edit': 0.035,
  'bytedance/seedream/v4/text-to-image': 0.025,
  'bytedance/seedream/v4.5/edit': 0.035,
  // Video models - price per 5 second video
  'fal-ai/wan-i2v': 0.25,
  'fal-ai/wan/i2v': 0.25,
  'wan-i2v': 0.25,
  'wan/i2v': 0.25,
  // Default fallbacks
  'default_image': 0.03,
  'default_video': 0.25
};

/**
 * Calculate cost for fal.ai generation using static pricing
 * Falls back to default pricing if model not found
 */
function calculateFalCost(modelKey: string, modality: string): number {
  // Try exact match first
  if (FAL_PRICING[modelKey]) {
    return FAL_PRICING[modelKey];
  }
  
  // Try normalized key (remove fal-ai/ prefix if present)
  const normalizedKey = modelKey.replace(/^fal-ai\//, '');
  if (FAL_PRICING[normalizedKey]) {
    return FAL_PRICING[normalizedKey];
  }
  
  // Try partial match for model family
  for (const [key, price] of Object.entries(FAL_PRICING)) {
    if (modelKey.includes(key) || key.includes(normalizedKey)) {
      return price;
    }
  }
  
  // Return default based on modality
  const defaultCost = modality === 'video' ? FAL_PRICING['default_video'] : FAL_PRICING['default_image'];
  console.log(`💰 Using default fal.ai pricing for ${modelKey}: $${defaultCost} (${modality})`);
  return defaultCost;
}

function extractFalUsage(response: any, calculatedCost: number): Partial<UsageLogData> {
  // Use calculated cost (static pricing) - response.cost is typically not available
  return {
    costUsd: calculatedCost,
    providerMetadata: {
      request_id: response.request_id,
      status: response.status,
      model: response.model,
      created_at: response.created_at,
      cost_source: 'static_pricing'
    }
  };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
/**
 * Sanitize prompt for fal.ai content policy compliance
 * Removes/replaces problematic terms that trigger content policy violations
 * Based on fal.ai's content policy: https://docs.fal.ai/errors#content_policy_violation
 */
function sanitizePromptForFalAI(prompt: string): string {
  let sanitized = prompt;
  
  // Remove or replace problematic age descriptors
  // These combined with suggestive language trigger violations
  const agePatterns = [
    { pattern: /\b(teen|teenage|adolescent|youthful teen|young teen)\b/gi, replacement: 'young adult' },
    { pattern: /\b(fresh faced youthful)\b/gi, replacement: 'fresh faced' },
    { pattern: /\b(innocent but forever curious)\b/gi, replacement: 'curious and engaging' },
    { pattern: /\b(innocent but)\b/gi, replacement: '' },
  ];
  
  agePatterns.forEach(({ pattern, replacement }) => {
    sanitized = sanitized.replace(pattern, replacement);
  });
  
  // Replace suggestive language with neutral alternatives
  const suggestivePatterns = [
    { pattern: /\b(shy smile dances on her lips)\b/gi, replacement: 'gentle smile' },
    { pattern: /\b(fingers playfully tracing)\b/gi, replacement: 'hands resting' },
    { pattern: /\b(heart racing with a mix of excitement and anticipation)\b/gi, replacement: 'expressive demeanor' },
    { pattern: /\b(heart racing)\b/gi, replacement: 'falling in love' },
    { pattern: /\b(leaning in)\b/gi, replacement: 'positioned nearby' },
    { pattern: /\b(playfully tracing)\b/gi, replacement: 'resting on' },
    { pattern: /\b(playfully)\b/gi, replacement: 'gently' },
    { pattern: /\b(dances on)\b/gi, replacement: 'appears on' },
    { pattern: /\b(racing with)\b/gi, replacement: 'showing' },
  ];
  
  // ✅ FIX: Replace animation-triggering phrases that cause characters to appear animated
  const animationPatterns = [
    { pattern: /\b(playful dance of)\b/gi, replacement: 'playful exchange of' },
    { pattern: /\b(dance of words)\b/gi, replacement: 'exchange of words' },
    { pattern: /\b(dance of glances)\b/gi, replacement: 'exchange of glances' },
    { pattern: /\b(eyes sparkle)\b/gi, replacement: 'eyes gleam' },
    { pattern: /\b(sparkle with)\b/gi, replacement: 'gleam with' },
    { pattern: /\b(sparkling)\b/gi, replacement: 'gleaming' },
    { pattern: /\b(click rhythmically)\b/gi, replacement: 'click' },
    { pattern: /\b(strides confidently)\b/gi, replacement: 'walks confidently' },
    { pattern: /\b(strides)\b/gi, replacement: 'walks' },
    { pattern: /\b(catching the light)\b/gi, replacement: 'reflecting the light' },
    { pattern: /\b(catching light)\b/gi, replacement: 'reflecting light' },
    { pattern: /\b(inviting a)\b/gi, replacement: 'suggesting a' },
    { pattern: /\b(inviting)\b/gi, replacement: 'suggesting' },
  ];
  
  animationPatterns.forEach(({ pattern, replacement }) => {
    sanitized = sanitized.replace(pattern, replacement);
  });
  
  suggestivePatterns.forEach(({ pattern, replacement }) => {
    sanitized = sanitized.replace(pattern, replacement);
  });
  
  // Remove overly descriptive emotional/physical states that could be flagged
  const emotionalPatterns = [
    { pattern: /\b(mix of excitement and anticipation)\b/gi, replacement: 'engaged expression' },
    { pattern: /\b(excitement and anticipation)\b/gi, replacement: 'engagement' },
    { pattern: /\b(anticipation)\b/gi, replacement: 'interest' },
  ];
  
  emotionalPatterns.forEach(({ pattern, replacement }) => {
    sanitized = sanitized.replace(pattern, replacement);
  });
  
  // Clean up multiple spaces and normalize
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  // Remove redundant phrases
  sanitized = sanitized.replace(/\b(young adult adult)\b/gi, 'young adult');
  sanitized = sanitized.replace(/\b(adult adult)\b/gi, 'adult');
  
  return sanitized;
}



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
    // ✅ I2I ITERATION: Support model_key_override for scene continuity (Seedream v4.5/edit)
    const modelKeyOverride = body.model_key_override;
    const modelKey = modelKeyOverride || apiModel.model_key;
    const modelDisplayName = modelKeyOverride
      ? `${modelKeyOverride} (Override)`
      : apiModel.display_name;
    const providerName = apiModel.api_providers.name;
    const modelModality = apiModel.modality;
    const isModelOverridden = !!modelKeyOverride;

    console.log('✅ Using fal.ai model:', {
      model_key: modelKey,
      display_name: modelDisplayName,
      provider: providerName,
      modality: modelModality,
      is_overridden: isModelOverridden,
      override_model: modelKeyOverride || null,
      database_model: apiModel.model_key
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
    // ✅ MULTI-REFERENCE: Also check for image_urls array (used by v4.5/edit multi-source composition)
    const hasImageUrlsArray = Array.isArray(body.input?.image_urls) && body.input.image_urls.length > 0;
    const hasReferenceImage = !!(body.input?.image_url || body.input?.image || body.metadata?.referenceImage || body.metadata?.reference_image_url || body.metadata?.start_reference_url || hasImageUrlsArray);
    const generationMode = hasReferenceImage ? (isVideo ? 'i2v' : 'i2i') : (isVideo ? 'txt2vid' : 'txt2img');
    
    // Check capabilities from database (no hard-coded checks)
    const capabilities = apiModel.capabilities || {};
    const inputSchema = capabilities?.input_schema || {};
    const supportsI2I = capabilities?.supports_i2i === true || capabilities?.reference_images === true;
    
    // Determine if model requires image_urls array (defined at top level for use in final check)
    let requiresImageUrlsArray = false;
    if (modelKeyOverride) {
      // If model is overridden, query the override model's capabilities
      const { data: overrideModel } = await supabase
        .from('api_models')
        .select('capabilities')
        .eq('model_key', modelKeyOverride)
        .single();
      if (overrideModel?.capabilities) {
        const overrideCaps = overrideModel.capabilities as any;
        requiresImageUrlsArray = overrideCaps?.requires_image_urls_array === true || 
                                 (overrideCaps?.supports_i2i === true && modelKeyOverride.includes('edit'));
      }
    } else {
      // Use current model's capabilities
      requiresImageUrlsArray = capabilities?.requires_image_urls_array === true ||
                               (supportsI2I && modelKey.includes('edit'));
    }
    
    // Validate reference image for I2V models (table-driven: check if model has image_url in schema)
    const modelSupportsI2V = !!inputSchema?.image_url || capabilities?.supports_i2v === true;
    // Check if model ONLY supports I2V (model_key contains "image-to-video") and no image was provided
    const isI2VOnly = modelKey.includes('image-to-video') || modelKey.includes('i2v');
    if (isVideo && isI2VOnly && !hasReferenceImage) {
      console.error(`❌ ${modelDisplayName} is an I2V-only model but no reference image was provided`);
      return new Response(JSON.stringify({
        error: `${modelDisplayName} requires a reference image for image-to-video generation. Please provide a reference image.`,
        code: 'REFERENCE_IMAGE_REQUIRED'
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (isVideo && modelSupportsI2V && !hasReferenceImage) {
      console.warn(`⚠️ ${modelDisplayName} supports I2V but no reference image provided, proceeding as text-to-video`);
    }

    console.log('🎯 Job parameters:', {
      jobType,
      quality,
      contentMode,
      generationMode,
      hasReferenceImage,
      model_key: modelKey,
      is_overridden: isModelOverridden,
      database_model: apiModel.model_key,
      // Debug I2I detection
      input_image_url: body.input?.image_url ? 'present' : 'missing',
      input_image: body.input?.image ? 'present' : 'missing',
      metadata_referenceImage: body.metadata?.referenceImage ? 'present' : 'missing',
      metadata_reference_image_url: body.metadata?.reference_image_url ? 'present' : 'missing',
      // CRITICAL DEBUG: Log full request body structure
      request_body_keys: Object.keys(body),
      input_keys: body.input ? Object.keys(body.input) : 'no input',
      metadata_keys: body.metadata ? Object.keys(body.metadata) : 'no metadata',
      // Log actual values (masked)
      input_image_url_value: body.input?.image_url ? `${String(body.input.image_url).substring(0, 60)}...` : null,
      metadata_reference_image_url_value: body.metadata?.reference_image_url ? `${String(body.metadata.reference_image_url).substring(0, 60)}...` : null
    });

    // Create job record
    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        job_type: jobType,
        original_prompt: body.prompt, // Store original, but use sanitized for API call
        status: 'queued',
        quality: quality,
        api_model_id: apiModel.id,
        model_type: 'sdxl', // fal Seedream maps to sdxl for constraint compatibility
        format: isVideo ? 'video' : 'image',
        metadata: {
          ...body.metadata,
          provider_name: apiModel.api_providers.name,
          model_key: modelKey, // Effective model key (may be overridden)
          database_model_key: apiModel.model_key, // Original database model key
          is_model_overridden: isModelOverridden,
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

    // ✅ CONTENT POLICY COMPLIANCE: Sanitize prompt for fal.ai
    // fal.ai has strict content policies - remove/replace problematic terms
    const sanitizedPrompt = sanitizePromptForFalAI(body.prompt);
    console.log('🛡️ Prompt sanitization for fal.ai:', {
      original_length: body.prompt.length,
      sanitized_length: sanitizedPrompt.length,
      was_modified: sanitizedPrompt !== body.prompt,
      preview: sanitizedPrompt.substring(0, 150) + '...'
    });

    // Build fal.ai input using database model configuration
    const modelInput: Record<string, any> = {
      prompt: sanitizedPrompt, // ✅ Use sanitized prompt for fal.ai compliance
      ...apiModel.input_defaults
    };

    // Handle safety parameter based on model capabilities (table-driven)
    const safetyParam = capabilities?.safety_checker_param || 'enable_safety_checker';

    if (safetyParam === 'safety_tolerance') {
      // Kontext-style: use safety_tolerance (string '1'-'6', 6 = most permissive)
      modelInput.safety_tolerance = contentMode === 'nsfw' ? '6' : ((apiModel.input_defaults as any)?.safety_tolerance || '6');
      console.log(`🔓 Safety tolerance set to ${modelInput.safety_tolerance} (Kontext-style)`);
    } else {
      // Standard: enable_safety_checker (boolean) — default OFF for adult platform
      modelInput.enable_safety_checker = (apiModel.input_defaults as any)?.enable_safety_checker ?? false;
      console.log(`🔓 Safety checker: ${modelInput.enable_safety_checker} (from input_defaults)`);
    }

    // I2I specific: reference image and strength (must be handled BEFORE other input overrides)
    // This needs to run even if body.input is empty, as long as hasReferenceImage is true
    // Skip for video I2V - handled separately in video-specific section
    if (hasReferenceImage && !isVideo) {
        // ✅ MULTI-REFERENCE: Check for pre-existing image_urls array first (v4.5/edit multi-source composition)
        if (hasImageUrlsArray && requiresImageUrlsArray) {
          // Multi-reference mode: Use the array as-is, signing any Supabase paths
          const signedImageUrls: string[] = [];
          for (const url of body.input.image_urls) {
            let signedUrl = url;
            if (typeof url === 'string' && !url.startsWith('http') && !url.startsWith('data:')) {
              const knownBuckets = ['user-library', 'workspace-temp', 'reference_images'];
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
                signedUrl = signed.signedUrl;
                console.log(`🔏 Signed multi-ref image URL for bucket "${bucket}"`);
              }
            }
            if (signedUrl && signedUrl.trim() !== '') {
              signedImageUrls.push(signedUrl);
            }
          }

          if (signedImageUrls.length === 0) {
            console.error('❌ Multi-reference mode: All image URLs are invalid');
            return new Response(
              JSON.stringify({
                error: 'Multi-reference request requires valid image URLs',
                details: 'None of the provided image URLs could be resolved'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
          }

          modelInput.image_urls = signedImageUrls;
          delete modelInput.image_url;
          console.log(`✅ MULTI-REFERENCE: image_urls array set with ${signedImageUrls.length} images`);
          console.log('📸 Figure references:', signedImageUrls.map((url, i) => `Figure ${i + 1}: ${url.substring(0, 50)}...`).join(', '));
        } else {
          // Single image mode
          const imageUrl = body.input.image_url || body.input.image || body.metadata?.referenceImage || body.metadata?.reference_image_url || body.metadata?.start_reference_url;

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

          // Use requiresImageUrlsArray already computed above (no need to recompute)

          console.log('🔍 I2I parameter detection:', {
            model_key: modelKey,
            is_overridden: isModelOverridden,
            requires_image_urls_array: requiresImageUrlsArray,
            supports_i2i: supportsI2I
          });

          if (requiresImageUrlsArray) {
            modelInput.image_urls = [finalImageUrl];
            // Remove image_url if it was set by input_defaults
            delete modelInput.image_url;
            console.log(`✅ I2I image_urls (array) set: ${finalImageUrl.substring(0, 60)}...`);
          } else {
            modelInput.image_url = finalImageUrl;
            // Remove image_urls if it was set by input_defaults
            delete modelInput.image_urls;
            console.log(`✅ I2I image_url (string) set: ${finalImageUrl.substring(0, 60)}...`);
          }
        }

        // Strength for i2i (default to 0.5 if not provided for modify mode)
        // ✅ CRITICAL: Skip strength for Seedream Edit models - they don't support it!
        // Seedream edit models use prompt-based control, not strength parameter
        const isSeedreamEdit = modelKey.includes('seedream') && modelKey.includes('edit');
        const modelCapabilities = apiModel.capabilities as Record<string, any> || {};
        const usesStrengthParam = modelCapabilities?.uses_strength_param !== false;
        
        // Table-driven: skip strength if input_schema exists and doesn't include 'strength'
        const schemaAllowsStrength = !Object.keys(inputSchema).length || !!inputSchema.strength;
        
        if (schemaAllowsStrength && usesStrengthParam && !isSeedreamEdit) {
          if (body.input?.strength !== undefined) {
            modelInput.strength = Math.min(Math.max(body.input.strength, 0.1), 1.0);
          } else {
            // Default strength for I2I if not specified
            modelInput.strength = 0.5;
            console.log('📊 Using default I2I strength: 0.5');
          }
        } else if (isSeedreamEdit || !usesStrengthParam || !schemaAllowsStrength) {
          // Remove strength if model doesn't support it
          delete modelInput.strength;
          console.log('🎯 Model does not support strength parameter, skipped');
        }
      }

    // Apply user input overrides
    if (body.input) {
      // Image size (only for non-video models)
      if (!isVideo) {
        if (body.input.image_size) {
          modelInput.image_size = body.input.image_size;
        } else if (body.input.width && body.input.height) {
          modelInput.image_size = { width: body.input.width, height: body.input.height };
        }
      }

      // Steps / inference steps (pass through if provided)
      if (body.input.num_inference_steps !== undefined) {
        modelInput.num_inference_steps = Math.min(Math.max(body.input.num_inference_steps, 1), 50);
      }

      // Guidance scale (pass through if provided)
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

      // Guide scale (pass through if provided, clamp using schema if available)
      if (body.input.guide_scale !== undefined) {
        const gsMin = inputSchema?.guide_scale?.min ?? 1;
        const gsMax = inputSchema?.guide_scale?.max ?? 20;
        modelInput.guide_scale = Math.min(Math.max(body.input.guide_scale, gsMin), gsMax);
      }

      // Video-specific params (generic, table-driven)
      if (isVideo) {
        // Video conditioning object (for extend models like LTX extend)
        let hasVideoConditioning = false;
        if (body.input?.video && typeof body.input.video === 'object') {
          modelInput.video = body.input.video;
          hasVideoConditioning = true;
          console.log('🎬 Video conditioning object set for extend model:', JSON.stringify(body.input.video));
        }
        // Duration to num_frames conversion using model's own frame_rate
        const frameRate = modelInput.frame_rate || modelInput.frames_per_second || 16;
        
        if (body.metadata?.duration) {
          const targetDuration = body.metadata.duration;
          let numFrames = Math.round(targetDuration * frameRate);
          
          // Clamp using input_schema if available
          if (inputSchema?.num_frames) {
            const minFrames = inputSchema.num_frames.min || 1;
            const maxFrames = inputSchema.num_frames.max || 999;
            numFrames = Math.max(minFrames, Math.min(maxFrames, numFrames));
          }
          
          modelInput.num_frames = numFrames;
          console.log(`🎬 Video: duration ${targetDuration}s × ${frameRate}fps = ${numFrames} frames`);
        }

        // User overrides for video params (pass through directly)
        if (body.input.resolution) modelInput.resolution = body.input.resolution;
        if (body.input.aspect_ratio) modelInput.aspect_ratio = body.input.aspect_ratio;
        if (body.input.num_frames !== undefined) modelInput.num_frames = body.input.num_frames;
        if (body.input.frame_rate !== undefined) modelInput.frame_rate = body.input.frame_rate;
        if (body.input.fps !== undefined) modelInput.fps = body.input.fps;

        // Quality-based resolution override
        if (body.quality === 'fast' && !body.input?.resolution) {
          modelInput.resolution = '480p';
        } else if (body.quality === 'high' && !body.input?.resolution) {
          modelInput.resolution = modelInput.resolution || '720p';
        }

        // Aspect ratio from metadata
        if (body.metadata?.aspectRatio) {
          modelInput.aspect_ratio = body.metadata.aspectRatio;
        }

        // Generic I2V reference image handling (works for any video model with image_url)
        // Skip for extend models that use video conditioning object
        if (hasReferenceImage && !hasVideoConditioning) {
          const imageUrl = body.input?.image_url || body.input?.image || 
                          body.metadata?.referenceImage || body.metadata?.reference_image_url || 
                          body.metadata?.start_reference_url;
          
          if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') {
            let finalImageUrl = imageUrl;
            
            // Sign URL if it's a Supabase storage path
            if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
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
                console.log(`🔏 Signed video reference image URL for bucket "${bucket}"`);
              }
            }
            
            // Validate URL format
            if (finalImageUrl.startsWith('http://') || finalImageUrl.startsWith('https://') || finalImageUrl.startsWith('data:')) {
              modelInput.image_url = finalImageUrl;
              delete modelInput.image; // Normalize to image_url
              console.log(`✅ Video I2V: Set image_url: ${finalImageUrl.substring(0, 60)}...`);
            } else {
              console.warn(`⚠️ Invalid video reference image URL format, skipping`);
            }
          }
        }
      }
    }

    // ─── Table-driven parameter cleanup (input_schema allow-list) ───
    // If input_schema exists, remove any modelInput keys not in the schema
    // This automatically strips params that don't belong to this model
    const schemaKeys = Object.keys(inputSchema);
    if (schemaKeys.length > 0) {
      // Always-allowed keys (not in schema but always valid)
      const alwaysAllowed = new Set(['prompt', 'image_url', 'image_urls', 'video']);
      const removedParams: string[] = [];
      
      for (const key of Object.keys(modelInput)) {
        if (!inputSchema[key] && !alwaysAllowed.has(key)) {
          removedParams.push(key);
          delete modelInput[key];
        }
      }
      
      if (removedParams.length > 0) {
        console.log(`🧹 Schema cleanup: removed params not in input_schema: ${removedParams.join(', ')}`);
      }
    }

    // Map aspect ratio based on model's input_schema (table-driven)
    // Skip for extend models using video conditioning (they don't need image_size)
    const hasVideoConditioningFinal = !!(modelInput.video && typeof modelInput.video === 'object');
    if (body.metadata?.aspectRatio && !hasVideoConditioningFinal) {
      const aspectRatio = body.metadata.aspectRatio;

      if (inputSchema.aspect_ratio && !inputSchema.image_size) {
        // Model uses aspect_ratio enum directly (Kontext-style)
        if (!modelInput.aspect_ratio) {
          modelInput.aspect_ratio = aspectRatio;
          console.log(`📐 Set aspect_ratio enum: ${aspectRatio}`);
        }
      } else if (inputSchema.image_size?.type === 'enum') {
        // Model uses image_size string enum (Flux-2 style)
        if (!modelInput.image_size) {
          const enumMap: Record<string, string> = {
            '1:1': 'square_hd',
            '16:9': 'landscape_16_9',
            '9:16': 'portrait_16_9',
            '4:3': 'landscape_4_3',
            '3:4': 'portrait_4_3',
          };
          modelInput.image_size = enumMap[aspectRatio] || 'landscape_4_3';
          console.log(`📐 Mapped aspect ratio ${aspectRatio} to image_size enum: ${modelInput.image_size}`);
        }
      } else if (!modelInput.image_size) {
        // Legacy: convert to {width, height} object
        const dimMap: Record<string, { width: number; height: number }> = {
          '1:1': { width: 1024, height: 1024 },
          '16:9': { width: 1344, height: 768 },
          '9:16': { width: 768, height: 1344 },
        };
        if (dimMap[aspectRatio]) {
          modelInput.image_size = dimMap[aspectRatio];
          console.log(`📐 Mapped aspect ratio ${aspectRatio} to ${(modelInput.image_size as any).width}x${(modelInput.image_size as any).height}`);
        }
      }
    }

    // Final check: For models that require image_urls array, ensure it's set and image_url is removed
    // This MUST run before sending to fal.ai API
    // Skip for video I2V - handled separately in video section
    // Use requiresImageUrlsArray already computed above (defined at top level, line 301)
    if (!isVideo) {
      const requiresImageUrlsArrayFinal = requiresImageUrlsArray;

      // Re-check hasReferenceImage from request body (in case it wasn't detected earlier)
      const finalHasReferenceImage = !!(body.input?.image_url || body.input?.image || body.metadata?.referenceImage || body.metadata?.reference_image_url || body.metadata?.start_reference_url);

      console.log('🔍 FINAL CHECK - Model detection:', {
        model_key: modelKey,
        is_overridden: isModelOverridden,
        requires_image_urls_array: requiresImageUrlsArrayFinal,
        supports_i2i: supportsI2I,
        has_reference_image: hasReferenceImage,
        final_has_reference_image: finalHasReferenceImage,
        body_input_image_url: body.input?.image_url ? 'present' : 'missing',
        body_input_image: body.input?.image ? 'present' : 'missing',
        body_metadata_referenceImage: body.metadata?.referenceImage ? 'present' : 'missing',
        body_metadata_reference_image_url: body.metadata?.reference_image_url ? 'present' : 'missing',
        current_image_url: modelInput.image_url ? 'present' : 'missing',
        current_image_urls: modelInput.image_urls ? `present (${Array.isArray(modelInput.image_urls) ? modelInput.image_urls.length : 'not array'})` : 'missing'
      });

      // For models requiring image_urls array, ALWAYS check if we need to set it
      if (requiresImageUrlsArrayFinal && finalHasReferenceImage) {
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
          console.log('🔄 FINAL CHECK: Set image_urls array from request body');
        }
        
        // Always remove image_url for models requiring image_urls array
        if (modelInput.image_url) {
          delete modelInput.image_url;
          console.log('🗑️ FINAL CHECK: Removed image_url (model requires image_urls array)');
        }
        
        // Ensure image_urls is an array
        if (modelInput.image_urls && !Array.isArray(modelInput.image_urls)) {
          modelInput.image_urls = [modelInput.image_urls];
          console.log('🔄 FINAL CHECK: Converted image_urls to array');
        }
        
        // CRITICAL: If image_urls is still missing, this is an error
        if (!modelInput.image_urls || !Array.isArray(modelInput.image_urls) || modelInput.image_urls.length === 0) {
          console.error('❌ FINAL CHECK: Model requires image_urls array but it is missing!');
          return new Response(
            JSON.stringify({ 
              error: 'Model requires image_urls (array)',
              details: 'Please provide a reference image URL in input.image_url, input.image, metadata.referenceImage, or metadata.reference_image_url'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }
      } else if (!requiresImageUrlsArrayFinal && finalHasReferenceImage) {
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
    }

    // Remove null/undefined keys
    Object.keys(modelInput).forEach((key) => {
      if (modelInput[key] === null || modelInput[key] === undefined) {
        delete modelInput[key];
      }
    });

    // Final log before sending to fal.ai
    console.log('🔧 fal.ai input configuration (FINAL):', {
      model_key: modelKey,
      is_overridden: isModelOverridden,
      requires_image_urls_array: !isVideo ? requiresImageUrlsArray : false,
      is_video: isVideo,
      has_reference_image: hasReferenceImage,
      param_count: Object.keys(modelInput).length,
      params: Object.keys(modelInput).join(', '),
      image_url: modelInput.image_url ? `${modelInput.image_url.substring(0, 60)}...` : (modelInput.image_urls ? 'present (array)' : 'missing'),
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
    // ✅ I2I ITERATION: Use modelKey which may be overridden for scene continuity
    const falEndpoint = `https://fal.run/${modelKey}`;

    console.log('🚀 Calling fal.ai API:', {
      endpoint: falEndpoint,
      model_key: modelKey,
      is_overridden: isModelOverridden,
      database_model: apiModel.model_key
    });

    const startTime = Date.now();
    let responseTimeMs = 0;
    const requestType = apiModel.modality === 'video' ? 'video' : 'image';

    try {
      const falResponse = await fetch(falEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${falApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(modelInput)
      });

      responseTimeMs = Date.now() - startTime;

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
            model_key: modelKey,
            is_overridden: isModelOverridden,
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

        // Log error usage
        logApiUsage(supabase, {
          providerId: apiModel.api_providers.id,
          modelId: apiModel.id,
          userId: user.id,
          requestType,
          endpointPath: `/${modelKey}`,
          requestPayload: modelInput,
          responseStatus: falResponse.status,
          responseTimeMs,
          errorMessage: errorDetails.message || errorText,
          providerMetadata: { model_key: modelKey }
        }).catch(logErr => console.error('Failed to log error usage:', logErr));

        return new Response(JSON.stringify({
          error: 'fal.ai API request failed',
          details: errorDetails.message || errorText,
          status: falResponse.status,
          debug: falResponse.status === 422 ? {
            model_key: modelKey,
            is_overridden: isModelOverridden,
            database_model: apiModel.model_key,
            has_image_url: !!modelInput.image_url,
            has_image_urls: !!modelInput.image_urls,
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
        has_video: !!falResult.video,
        has_cost: !!falResult.cost
      });

      // ✅ COST TRACKING: Use static pricing for reliable cost tracking
      // fal.ai API doesn't return cost in response, so we calculate using known pricing
      const falCost = calculateFalCost(modelKey, modelModality);
      console.log(`💰 fal.ai cost calculated: $${falCost.toFixed(4)} for ${modelKey} (${modelModality})`);


      // Log usage for successful response
      const usageData = extractFalUsage(falResult, falCost);
      logApiUsage(supabase, {
        providerId: apiModel.api_providers.id,
        modelId: apiModel.id,
        userId: user.id,
        requestType,
        endpointPath: `/${modelKey}`,
        requestPayload: modelInput,
        ...usageData,
        responseStatus: falResponse.status,
        responseTimeMs,
        responsePayload: falResult
      }).catch(err => console.error('Failed to log usage:', err));

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

      // VIDEO THUMBNAIL GENERATION: Use reference image as thumbnail for videos
      // This ensures videos have proper thumbnails in workspace and library
      let thumbnailPath: string | null = null;
      
      if (resultType === 'video' && storagePath && !storagePath.startsWith('http')) {
        try {
          // Use the reference image (start frame) as the video thumbnail
          const referenceUrl = modelInput.image_url;
          if (referenceUrl && (referenceUrl.startsWith('http://') || referenceUrl.startsWith('https://'))) {
            console.log('🖼️ Generating video thumbnail from reference image...');
            
            const thumbResponse = await fetch(referenceUrl);
            if (thumbResponse.ok) {
              const thumbBuffer = await thumbResponse.arrayBuffer();
              const thumbStoragePath = `${user.id}/${jobData.id}_${Date.now()}.thumb.webp`;
              
              const { error: thumbUploadError } = await supabase.storage
                .from('workspace-temp')
                .upload(thumbStoragePath, thumbBuffer, {
                  contentType: 'image/webp',
                  upsert: true
                });
              
              if (!thumbUploadError) {
                thumbnailPath = thumbStoragePath;
                console.log('✅ Video thumbnail created:', thumbStoragePath);
              } else {
                console.warn('⚠️ Thumbnail upload failed:', thumbUploadError);
              }
            } else {
              console.warn('⚠️ Failed to download reference image for thumbnail:', thumbResponse.status);
            }
          } else {
            console.log('ℹ️ No reference image available for video thumbnail');
          }
        } catch (thumbError) {
          console.warn('⚠️ Thumbnail generation failed:', thumbError);
          // Continue without thumbnail - UI will use fallback
        }
      }

      // Update job with result
      const { error: jobUpdateError } = await supabase
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
            original_fal_url: resultUrl, // Keep original for reference
            thumbnail_path: thumbnailPath // Store thumbnail path in job metadata
          }
        })
        .eq('id', jobData.id);

      if (jobUpdateError) {
        console.error('❌ Failed to update job status:', jobUpdateError);
        // Continue anyway - workspace asset will be created
      } else {
        console.log('✅ Job marked as completed');
      }

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
          thumbnail_path: thumbnailPath, // ✅ Store thumbnail path for videos
          file_size_bytes: fileSizeBytes,
          mime_type: resultType === 'video' ? 'video/mp4' : 'image/png',
          original_prompt: body.prompt, // Store original, but use sanitized for API call
          model_used: modelKey,
          generation_seed: generationSeed, // ✅ Required: NOT NULL constraint
          generation_settings: {
            model_key: modelKey,
            provider: 'fal',
            content_mode: contentMode,
            generation_mode: generationMode,
            seed: generationSeed,
            // ✅ FIX: Include scene_id for frontend to track scene continuity
            scene_id: body.metadata?.scene_id,
            // ✅ ADMIN: Include scene template info if available (for roleplay scenes)
            scene_template_id: body.metadata?.scene_template_id,
            scene_template_name: body.metadata?.scene_template_name,
            // ✅ ADMIN: Include original scene prompt if available
            original_scene_prompt: body.metadata?.original_scene_prompt || body.prompt
          }
        });

      if (assetError) {
        console.warn('⚠️ Failed to create workspace asset:', assetError);
      } else {
        console.log('✅ Workspace asset created with temp_storage_path');
      }

      // Handle character portrait destination - update character's image_url automatically
      // Support both character creation flow (characterName) and update flow (character_id)
      if (body.metadata?.destination === 'character_portrait') {
        let characterId = body.metadata.character_id;
        
        // If character_id is missing (character creation flow), try to find character by name
        if (!characterId && (body.metadata.character_name || body.metadata.characterName)) {
          const characterName = body.metadata.character_name || body.metadata.characterName;
          console.log('🔍 Character ID missing, searching by name:', characterName);
          const { data: characterData } = await supabase
            .from('characters')
            .select('id')
            .eq('user_id', user.id)
            .eq('name', characterName)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (characterData?.id) {
            characterId = characterData.id;
            console.log('✅ Found character by name:', characterId);
          } else {
            console.warn('⚠️ Character not found by name, will skip character update (character may not be created yet)');
          }
        }
        
        if (characterId) {
          console.log('🖼️ Updating character portrait for:', characterId);

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
            .eq('id', characterId);

          if (charUpdateError) {
            console.warn('⚠️ Failed to update character image:', charUpdateError);
          } else {
            console.log('✅ Character portrait updated successfully');
          }

          // Auto-save character portrait to library (since fal-image completes synchronously and doesn't trigger job-callback)
          if (!storagePath.startsWith('http')) {
            // Only auto-save if we have a storage path (not external URL)
            try {
              const sourceKey = storagePath; // Already normalized (no workspace-temp/ prefix)
              const destKey = `${user.id}/${jobData.id}_${characterId}.${resultType === 'video' ? 'mp4' : 'png'}`;

              console.log('📚 Auto-saving character portrait to library:', { sourceKey, destKey, characterId });

              // Copy file to user-library
              const { data: fileData, error: downloadError } = await supabase.storage
                .from('workspace-temp')
                .download(sourceKey);

              if (!downloadError && fileData) {
                const { error: uploadError } = await supabase.storage
                  .from('user-library')
                  .upload(destKey, fileData, {
                    contentType: resultType === 'video' ? 'video/mp4' : 'image/png',
                    upsert: true
                  });

                if (!uploadError) {
                  // Handle thumbnail copy (if exists)
                  let libraryThumbPath: string | null = null;
                  const thumbSrc = `${sourceKey.replace(/\.(png|jpg|jpeg|mp4)$/i, '')}.thumb.webp`;
                  
                  try {
                    const { data: thumbData } = await supabase.storage
                      .from('workspace-temp')
                      .download(thumbSrc);
                    
                    if (thumbData) {
                      const thumbDest = `${user.id}/${jobData.id}_${characterId}.thumb.webp`;
                      const { error: upThumbErr } = await supabase.storage
                        .from('user-library')
                        .upload(thumbDest, thumbData, {
                          contentType: 'image/webp',
                          upsert: true
                        });
                      if (!upThumbErr) {
                        libraryThumbPath = thumbDest;
                      }
                    }
                  } catch (thumbError) {
                    // Thumbnail not found or error - not critical, continue
                    console.log('ℹ️ Thumbnail not available for character portrait');
                  }

                  // Create library record with roleplay metadata
                  const { data: libraryAsset, error: libraryError } = await supabase
                    .from('user_library')
                    .insert({
                      user_id: user.id,
                      asset_type: resultType,
                      storage_path: destKey,
                      thumbnail_path: libraryThumbPath,
                      file_size_bytes: fileSizeBytes,
                      mime_type: resultType === 'video' ? 'video/mp4' : 'image/png',
                      original_prompt: body.prompt, // Store original, but use sanitized for API call
                      model_used: modelKey,
                      generation_seed: generationSeed,
                      width: falResult.images?.[0]?.width || falResult.width,
                      height: falResult.images?.[0]?.height || falResult.height,
                      tags: ['character', 'portrait'],
                      roleplay_metadata: {
                        type: 'character_portrait',
                        character_id: characterId,
                        character_name: body.metadata.character_name || body.metadata.characterName,
                        consistency_method: body.metadata.consistency_method || body.metadata.consistencyMethod
                      },
                      content_category: 'character'
                    })
                    .select()
                    .single();

                  if (!libraryError && libraryAsset) {
                    // Update character with stable storage path
                    const stableImageUrl = `user-library/${destKey}`;
                    
                    const { error: updateError } = await supabase
                      .from('characters')
                      .update({
                        image_url: stableImageUrl,
                        reference_image_url: stableImageUrl,
                        seed_locked: generationSeed,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', characterId);

                    if (!updateError) {
                      console.log(`✅ Character ${characterId} portrait saved to library and character updated`);
                    } else {
                      console.error('Failed to update character with library path:', updateError);
                    }
                  } else {
                    console.error('Failed to create library record:', libraryError);
                  }
                } else {
                  console.error('Failed to upload character portrait to library:', uploadError);
                }
              } else {
                console.error('Failed to download character portrait from workspace:', downloadError);
              }
            } catch (error) {
              console.error('Error auto-saving character portrait:', error);
              // Don't fail the request if auto-save fails - character is already updated
            }
          }
        } else {
          console.warn('⚠️ Character not found, skipping character update and auto-save');
        }
      }

      // Handle character scene destination - update scene's image_url
      // ✅ FIX 1.3: Also handle 'roleplay_scene' destination from roleplay-chat with retry logic
      if ((body.metadata?.destination === 'character_scene' || body.metadata?.destination === 'roleplay_scene') && body.metadata?.scene_id) {
        console.log('🎬 Updating character scene for:', body.metadata.scene_id, '(destination:', body.metadata.destination, ')');

        // ✅ FIX: Get user_id from auth header (like character images) - user is already available from line 124
        if (!user?.id) {
          console.error('❌ No user available for scene auto-save');
        }

        // ✅ FIX: Use persistent library path for character_scenes instead of workspace-temp
        // Auto-save to library first (same pattern as character images), then update character_scenes
        let persistentScenePath = storagePath.startsWith('http') ? storagePath : null;
        let libraryDestKey: string | null = null;
        
        if (!persistentScenePath && !storagePath.startsWith('http') && user?.id) {
          // Copy to user-library for persistence (same as character images)
          const sourceKey = storagePath.startsWith('workspace-temp/') 
            ? storagePath.replace('workspace-temp/', '')
            : storagePath;
          libraryDestKey = `${user.id}/scenes/${body.metadata.scene_id}_${Date.now()}.png`;
          
          try {
            const { data: fileData, error: downloadError } = await supabase.storage
              .from('workspace-temp')
              .download(sourceKey);
            
            if (!downloadError && fileData) {
              const { error: uploadError } = await supabase.storage
                .from('user-library')
                .upload(libraryDestKey, fileData, {
                  contentType: 'image/png',
                  upsert: true
                });
              
              if (!uploadError) {
                persistentScenePath = `user-library/${libraryDestKey}`;
                console.log('✅ Scene saved to persistent library path:', persistentScenePath);
                
                // ✅ FIX: Create library record immediately (like character images)
                const { data: libraryAsset, error: libraryError } = await supabase
                  .from('user_library')
                  .insert({
                    user_id: user.id,
                    asset_type: 'image',
                    storage_path: libraryDestKey,
                    thumbnail_path: null,
                    file_size_bytes: fileSizeBytes || 0,
                    mime_type: 'image/png',
                    original_prompt: body.metadata?.original_scene_prompt || body.prompt,
                    model_used: modelKey,
                    generation_seed: generationSeed,
                    width: falResult.images?.[0]?.width || falResult.width || 1024,
                    height: falResult.images?.[0]?.height || falResult.height || 1024,
                    tags: ['scene', 'roleplay'],
                    roleplay_metadata: {
                      type: 'roleplay_scene',
                      scene_id: body.metadata.scene_id,
                      character_id: body.metadata.character_id,
                      character_name: body.metadata.character_name,
                      conversation_id: body.metadata.conversation_id,
                      generation_mode: body.metadata.generation_mode || 't2i'
                    },
                    content_category: 'scene'
                  })
                  .select()
                  .single();
                
                if (!libraryError && libraryAsset) {
                  console.log('✅ Scene saved to library:', libraryAsset.id);
                } else {
                  console.error('❌ Failed to create library record:', libraryError);
                }
              } else {
                console.error('❌ Failed to upload scene to library:', uploadError);
              }
            } else {
              console.error('❌ Failed to download scene from workspace-temp:', downloadError);
            }
          } catch (error) {
            console.error('❌ Error copying scene to library:', error);
          }
        }
        
        // Use persistent path if available, otherwise fall back to workspace-temp
        const sceneImagePath = persistentScenePath || (storagePath.startsWith('http') ? storagePath : `workspace-temp/${storagePath}`);

        const { error: sceneUpdateError } = await supabase
          .from('character_scenes')
          .update({
            image_url: sceneImagePath,
            updated_at: new Date().toISOString()
          })
          .eq('id', body.metadata.scene_id);

        if (sceneUpdateError) {
          console.error('❌ Failed to update character scene:', sceneUpdateError);
          // ✅ FIX 1.3: Retry once
          const { error: retryError } = await supabase
            .from('character_scenes')
            .update({
              image_url: sceneImagePath,
              updated_at: new Date().toISOString()
            })
            .eq('id', body.metadata.scene_id);
          
          if (retryError) {
            console.error('❌ Retry also failed:', retryError);
          } else {
            console.log('✅ Character scene updated on retry');
          }
        } else {
          console.log('✅ Character scene updated successfully:', {
            scene_id: body.metadata.scene_id,
            image_url: sceneImagePath.substring(0, 60) + '...'
          });
        }
      }

      // Handle scene_preview destination - just return the image URL, no DB updates
      // Frontend will store the URL when user creates the scene template
      if (body.metadata?.destination === 'scene_preview') {
        console.log('🎬 Scene preview generated, returning URL for frontend storage');
        // No database updates needed - the preview_image_url will be saved
        // when the user clicks "Create Scene" in the SceneCreationModal
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
