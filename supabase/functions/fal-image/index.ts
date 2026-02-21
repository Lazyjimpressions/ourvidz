
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: Types & Constants
// ═══════════════════════════════════════════════════════════════════════════════

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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Static pricing map for fal.ai models (USD per generation)
 */
const FAL_PRICING: Record<string, number> = {
  'fal-ai/bytedance/seedream/v4/text-to-image': 0.025,
  'fal-ai/bytedance/seedream/v4.5/edit': 0.035,
  'fal-ai/seedream/v4/text-to-image': 0.025,
  'fal-ai/seedream/v4.5/edit': 0.035,
  'bytedance/seedream/v4/text-to-image': 0.025,
  'bytedance/seedream/v4.5/edit': 0.035,
  'fal-ai/wan-i2v': 0.25,
  'fal-ai/wan/i2v': 0.25,
  'wan-i2v': 0.25,
  'wan/i2v': 0.25,
  'default_image': 0.03,
  'default_video': 0.25
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: Pure Utility Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sign a Supabase storage path into a full URL.
 * If already an HTTP/data URL, returns as-is.
 * Single implementation replaces 5 copy-pasted blocks.
 */
async function signIfStoragePath(
  supabase: any,
  url: string | null | undefined,
  defaultBucket = 'reference_images'
): Promise<string | null> {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  if (url.trim() === '') return null;

  const knownBuckets = ['user-library', 'workspace-temp', 'reference_images'];
  const parts = url.split('/');
  const bucket = knownBuckets.includes(parts[0]) ? parts[0] : defaultBucket;
  const path = knownBuckets.includes(parts[0]) ? parts.slice(1).join('/') : url;

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (!error && data?.signedUrl) {
    console.log(`🔏 Signed URL for bucket "${bucket}": ${path.substring(0, 40)}...`);
    return data.signedUrl;
  }
  console.warn(`⚠️ Failed to sign URL for bucket "${bucket}":`, error?.message);
  return url; // Return original — might already be signed or external
}

function calculateFalCost(modelKey: string, modality: string): number {
  if (FAL_PRICING[modelKey]) return FAL_PRICING[modelKey];
  const normalizedKey = modelKey.replace(/^fal-ai\//, '');
  if (FAL_PRICING[normalizedKey]) return FAL_PRICING[normalizedKey];
  for (const [key, price] of Object.entries(FAL_PRICING)) {
    if (modelKey.includes(key) || key.includes(normalizedKey)) return price;
  }
  const defaultCost = modality === 'video' ? FAL_PRICING['default_video'] : FAL_PRICING['default_image'];
  console.log(`💰 Using default fal.ai pricing for ${modelKey}: $${defaultCost} (${modality})`);
  return defaultCost;
}

function extractFalUsage(response: any, calculatedCost: number): Partial<UsageLogData> {
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

/**
 * Sanitize prompt for fal.ai content policy compliance
 */
function sanitizePromptForFalAI(prompt: string): string {
  let sanitized = prompt;

  const patterns: { pattern: RegExp; replacement: string }[] = [
    // Age descriptors
    { pattern: /\b(teen|teenage|adolescent|youthful teen|young teen)\b/gi, replacement: 'young adult' },
    { pattern: /\b(fresh faced youthful)\b/gi, replacement: 'fresh faced' },
    { pattern: /\b(innocent but forever curious)\b/gi, replacement: 'curious and engaging' },
    { pattern: /\b(innocent but)\b/gi, replacement: '' },
    // Animation triggers
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
    // Suggestive language
    { pattern: /\b(shy smile dances on her lips)\b/gi, replacement: 'gentle smile' },
    { pattern: /\b(fingers playfully tracing)\b/gi, replacement: 'hands resting' },
    { pattern: /\b(heart racing with a mix of excitement and anticipation)\b/gi, replacement: 'expressive demeanor' },
    { pattern: /\b(heart racing)\b/gi, replacement: 'falling in love' },
    { pattern: /\b(leaning in)\b/gi, replacement: 'positioned nearby' },
    { pattern: /\b(playfully tracing)\b/gi, replacement: 'resting on' },
    { pattern: /\b(playfully)\b/gi, replacement: 'gently' },
    { pattern: /\b(dances on)\b/gi, replacement: 'appears on' },
    { pattern: /\b(racing with)\b/gi, replacement: 'showing' },
    // Emotional patterns
    { pattern: /\b(mix of excitement and anticipation)\b/gi, replacement: 'engaged expression' },
    { pattern: /\b(excitement and anticipation)\b/gi, replacement: 'engagement' },
    { pattern: /\b(anticipation)\b/gi, replacement: 'interest' },
  ];

  patterns.forEach(({ pattern, replacement }) => {
    sanitized = sanitized.replace(pattern, replacement);
  });

  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  sanitized = sanitized.replace(/\b(young adult adult)\b/gi, 'young adult');
  sanitized = sanitized.replace(/\b(adult adult)\b/gi, 'adult');
  return sanitized;
}

function normalizeJobType(jobType: string | undefined, isVideo: boolean, quality: string): string {
  if (jobType) {
    if (['image_high', 'image_fast', 'video_high', 'video_fast', 'wan_standard', 'wan_enhanced'].includes(jobType)) {
      return jobType;
    }
    if (jobType === 'fal_image') return quality === 'fast' ? 'image_fast' : 'image_high';
    if (jobType === 'fal_video') return quality === 'fast' ? 'video_fast' : 'video_high';
  }
  if (isVideo) return quality === 'fast' ? 'video_fast' : 'video_high';
  return quality === 'fast' ? 'image_fast' : 'image_high';
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: API Usage Logging
// ═══════════════════════════════════════════════════════════════════════════════

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
    updateAggregates(supabase, data).catch(err => console.error('❌ Failed to update aggregates:', err));
  } catch (error) {
    console.error('❌ Error in logApiUsage:', error);
  }
}

async function updateAggregates(supabase: any, data: UsageLogData): Promise<void> {
  try {
    const now = new Date();
    const { error } = await supabase.rpc('upsert_usage_aggregate', {
      p_provider_id: data.providerId,
      p_model_id: data.modelId || null,
      p_date_bucket: now.toISOString().split('T')[0],
      p_hour_bucket: now.getHours(),
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
    if (error) console.error('❌ Failed to update aggregate:', error);
  } catch (error) {
    console.error('❌ Error updating aggregates:', error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: buildModelInput — Input Mapper
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build the fal.ai API input from the request body and model configuration.
 * Handles: prompt sanitization, safety params, reference images (single/multi/video),
 * aspect ratio mapping, schema allow-list filtering, required field validation.
 *
 * Returns { modelInput, generationMode } or throws an error Response.
 */
async function buildModelInput(
  body: any,
  apiModel: any,
  modelKey: string,
  isVideo: boolean,
  supabase: any
): Promise<{ modelInput: Record<string, any>; generationMode: string }> {
  const capabilities = apiModel.capabilities || {};
  const inputSchema = capabilities?.input_schema || {};
  const contentMode = body.metadata?.contentType || 'nsfw';

  // --- Sanitize prompt ---
  const sanitizedPrompt = sanitizePromptForFalAI(body.prompt);
  console.log('🛡️ Prompt sanitization:', {
    original_length: body.prompt.length,
    sanitized_length: sanitizedPrompt.length,
    was_modified: sanitizedPrompt !== body.prompt
  });

  // --- Base input from defaults ---
  const modelInput: Record<string, any> = {
    prompt: sanitizedPrompt,
    ...apiModel.input_defaults
  };

  // --- Safety parameter (table-driven) ---
  const safetyParam = capabilities?.safety_checker_param || 'enable_safety_checker';
  if (safetyParam === 'safety_tolerance') {
    modelInput.safety_tolerance = contentMode === 'nsfw' ? '6' : ((apiModel.input_defaults as any)?.safety_tolerance || '6');
  } else {
    modelInput.enable_safety_checker = (apiModel.input_defaults as any)?.enable_safety_checker ?? false;
  }

  // --- Detect references from canonical client fields (NO fallback chains) ---
  const hasImageUrl = !!(body.input?.image_url);
  const hasImageUrls = Array.isArray(body.input?.image_urls) && body.input.image_urls.length > 0;
  const hasVideoInput = !!(body.input?.video);
  const hasReference = hasImageUrl || hasImageUrls || hasVideoInput;

  const generationMode = hasReference
    ? (isVideo ? (hasVideoInput ? 'v2v_extend' : 'i2v') : 'i2i')
    : (isVideo ? 'txt2vid' : 'txt2img');

  console.log('🎯 Generation mode:', generationMode, {
    hasImageUrl, hasImageUrls, hasVideoInput, isVideo
  });

  // --- Determine if model requires image_urls array (schema-driven) ---
  // Derive from input_schema: if schema defines image_urls, model expects array format
  let requiresImageUrlsArray = !!inputSchema.image_urls;

  // Check override model capabilities if model_key_override is used
  const modelKeyOverride = body.model_key_override;
  if (modelKeyOverride) {
    const { data: overrideModel } = await supabase
      .from('api_models')
      .select('capabilities')
      .eq('model_key', modelKeyOverride)
      .single();
    if (overrideModel?.capabilities) {
      const overrideSchema = (overrideModel.capabilities as any)?.input_schema || {};
      requiresImageUrlsArray = !!overrideSchema.image_urls;
    }
  }

  // ─── I2I: Image reference (non-video) ───
  if (!isVideo && (hasImageUrl || hasImageUrls)) {
    if (hasImageUrls && requiresImageUrlsArray) {
      // Multi-reference mode
      const signedUrls: string[] = [];
      for (const url of body.input.image_urls) {
        const signed = await signIfStoragePath(supabase, url, 'user-library');
        if (signed && signed.trim() !== '') signedUrls.push(signed);
      }
      if (signedUrls.length === 0) {
        throw new Response(JSON.stringify({
          error: 'Multi-reference request requires valid image URLs',
          details: 'None of the provided image URLs could be resolved'
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      modelInput.image_urls = signedUrls;
      delete modelInput.image_url;
      console.log(`✅ MULTI-REF: image_urls set with ${signedUrls.length} images`);
    } else if (hasImageUrl) {
      // Single image mode
      const signed = await signIfStoragePath(supabase, body.input.image_url, 'user-library');
      if (!signed || signed.trim() === '') {
        throw new Response(JSON.stringify({
          error: 'I2I request requires a valid reference image URL',
          details: 'The provided image_url could not be resolved'
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      // Validate URL format
      if (!signed.startsWith('http://') && !signed.startsWith('https://') && !signed.startsWith('data:')) {
        throw new Response(JSON.stringify({
          error: 'Invalid reference image URL format',
          details: 'Image URL must be a valid HTTP/HTTPS URL or data URI'
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (requiresImageUrlsArray) {
        modelInput.image_urls = [signed];
        delete modelInput.image_url;
        console.log(`✅ I2I image_urls (array): ${signed.substring(0, 60)}...`);
      } else {
        modelInput.image_url = signed;
        delete modelInput.image_urls;
        console.log(`✅ I2I image_url (string): ${signed.substring(0, 60)}...`);
      }
    }

    // Strength parameter — purely schema-driven: if the schema has a 'strength' field, include it
    if (inputSchema.strength && body.input?.strength !== undefined) {
      const range = inputSchema.strength;
      modelInput.strength = Math.min(Math.max(body.input.strength, range.min || 0.1), range.max || 1.0);
    } else if (inputSchema.strength) {
      // Schema allows strength but client didn't send it — use a sensible default
      modelInput.strength = inputSchema.strength.default || 0.5;
    } else {
      // Schema doesn't have strength — remove it
      delete modelInput.strength;
    }
  }

  // ─── User input overrides (non-reference) ───
  if (body.input) {
    if (!isVideo) {
      if (body.input.image_size) modelInput.image_size = body.input.image_size;
      else if (body.input.width && body.input.height) modelInput.image_size = { width: body.input.width, height: body.input.height };
    }
    if (body.input.num_inference_steps !== undefined) modelInput.num_inference_steps = Math.min(Math.max(body.input.num_inference_steps, 1), 50);
    if (body.input.guidance_scale !== undefined) modelInput.guidance_scale = Math.min(Math.max(body.input.guidance_scale, 1), 20);
    if (body.input.negative_prompt) modelInput.negative_prompt = body.input.negative_prompt;
    if (body.input.seed !== undefined) modelInput.seed = body.input.seed;
    if (body.input.guide_scale !== undefined) {
      const gsMin = inputSchema?.guide_scale?.min ?? 1;
      const gsMax = inputSchema?.guide_scale?.max ?? 20;
      modelInput.guide_scale = Math.min(Math.max(body.input.guide_scale, gsMin), gsMax);
    }

    // ─── Video-specific parameters ───
    if (isVideo) {
      // V2V extend: client sends input.video as a URL string
      if (hasVideoInput) {
        let videoUrl = typeof body.input.video === 'object'
          ? (body.input.video as any).video_url || (body.input.video as any).url
          : body.input.video;

        videoUrl = await signIfStoragePath(supabase, videoUrl, 'reference_images');

        if (videoUrl && typeof videoUrl === 'string' && (videoUrl.startsWith('http') || videoUrl.startsWith('data:'))) {
          modelInput.video = { video_url: videoUrl };
          delete modelInput.image_url;
          delete modelInput.image;
          console.log('🎬 Video URL set for extend:', videoUrl.substring(0, 80) + '...');
        } else {
          console.warn('⚠️ Video input could not resolve to valid URL');
        }
      }

      // Duration → num_frames conversion
      const frameRate = modelInput.frame_rate || modelInput.frames_per_second || 16;
      if (body.metadata?.duration) {
        let numFrames = Math.round(body.metadata.duration * frameRate);
        if (inputSchema?.num_frames) {
          numFrames = Math.max(inputSchema.num_frames.min || 1, Math.min(inputSchema.num_frames.max || 999, numFrames));
        }
        modelInput.num_frames = numFrames;
        console.log(`🎬 Video: ${body.metadata.duration}s × ${frameRate}fps = ${numFrames} frames`);
      }

      // Pass-through video params
      if (body.input.resolution) modelInput.resolution = body.input.resolution;
      if (body.input.aspect_ratio) modelInput.aspect_ratio = body.input.aspect_ratio;
      if (body.input.num_frames !== undefined) modelInput.num_frames = body.input.num_frames;
      if (body.input.frame_rate !== undefined) modelInput.frame_rate = body.input.frame_rate;
      if (body.input.fps !== undefined) modelInput.fps = body.input.fps;

      // Quality-based resolution
      if (body.quality === 'fast' && !body.input?.resolution) modelInput.resolution = '480p';
      else if (body.quality === 'high' && !body.input?.resolution) modelInput.resolution = modelInput.resolution || '720p';

      // Aspect ratio from metadata
      if (body.metadata?.aspectRatio) modelInput.aspect_ratio = body.metadata.aspectRatio;

      // I2V reference image (non-extend)
      if (hasImageUrl && !hasVideoInput) {
        const signed = await signIfStoragePath(supabase, body.input.image_url, 'user-library');
        if (signed && (signed.startsWith('http://') || signed.startsWith('https://') || signed.startsWith('data:'))) {
          modelInput.image_url = signed;
          delete modelInput.image;
          console.log(`✅ I2V image_url set: ${signed.substring(0, 60)}...`);
        }
      }
    }
  }

  // ─── Aspect ratio mapping (non-video without video conditioning) ───
  if (body.metadata?.aspectRatio && !modelInput.video) {
    const ar = body.metadata.aspectRatio;
    if (inputSchema.aspect_ratio && !inputSchema.image_size) {
      if (!modelInput.aspect_ratio) modelInput.aspect_ratio = ar;
    } else if (inputSchema.image_size?.type === 'enum') {
      if (!modelInput.image_size) {
        const enumMap: Record<string, string> = {
          '1:1': 'square_hd', '16:9': 'landscape_16_9', '9:16': 'portrait_16_9',
          '4:3': 'landscape_4_3', '3:4': 'portrait_4_3',
        };
        modelInput.image_size = enumMap[ar] || 'landscape_4_3';
      }
    } else if (!modelInput.image_size) {
      const dimMap: Record<string, { width: number; height: number }> = {
        '1:1': { width: 1024, height: 1024 },
        '16:9': { width: 1344, height: 768 },
        '9:16': { width: 768, height: 1344 },
      };
      if (dimMap[ar]) modelInput.image_size = dimMap[ar];
    }
  }

  // ─── Schema allow-list filtering ───
  const schemaKeys = Object.keys(inputSchema);
  if (schemaKeys.length > 0) {
    const alwaysAllowed = new Set(['prompt', 'image_url', 'image_urls', 'video']);
    const removedParams: string[] = [];
    for (const key of Object.keys(modelInput)) {
      if (!inputSchema[key] && !alwaysAllowed.has(key)) {
        removedParams.push(key);
        delete modelInput[key];
      }
    }
    if (removedParams.length > 0) {
      console.log(`🧹 Schema cleanup: removed ${removedParams.join(', ')}`);
    }
  }

  // ─── Remove null/undefined ───
  for (const key of Object.keys(modelInput)) {
    if (modelInput[key] === null || modelInput[key] === undefined) delete modelInput[key];
  }

  // ─── Required field validation (pre-flight) ───
  if (inputSchema) {
    const missing: string[] = [];
    for (const [key, schemaDef] of Object.entries(inputSchema)) {
      if ((schemaDef as any)?.required === true && modelInput[key] === undefined) {
        missing.push(key);
      }
    }
    if (missing.length > 0) {
      console.error('❌ Missing required fields:', missing);
      throw new Response(JSON.stringify({
        error: `This model requires: ${missing.join(', ')}`,
        details: missing.includes('image_url')
          ? 'This is an image-to-image (edit) model. Please attach a reference image before generating.'
          : missing.includes('video')
          ? 'This is a video extend model. Please attach a video file (MP4/WebM) in the REF box before generating.'
          : `Missing required input fields: ${missing.join(', ')}`,
        missing_fields: missing
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  console.log('🔧 Final input:', {
    model_key: modelKey,
    param_count: Object.keys(modelInput).length,
    params: Object.keys(modelInput).join(', '),
    has_image_url: !!modelInput.image_url,
    has_image_urls: !!modelInput.image_urls,
    has_video: !!modelInput.video
  });

  return { modelInput, generationMode };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: handlePostProcessing — Destination Logic
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handle post-generation destinations (character portrait, scene, preview).
 * Runs AFTER generation succeeds. Independent of the API call.
 */
async function handlePostProcessing(
  supabase: any,
  body: any,
  user: any,
  storagePath: string,
  jobData: any,
  resultType: string,
  fileSizeBytes: number,
  falResult: any,
  generationSeed: number,
  modelKey: string
): Promise<void> {
  const destination = body.metadata?.destination;
  if (!destination) return;

  // ─── Character Portrait ───
  if (destination === 'character_portrait') {
    let characterId = body.metadata.character_id;

    // Find by name if ID missing (character creation flow)
    if (!characterId && (body.metadata.character_name || body.metadata.characterName)) {
      const charName = body.metadata.character_name || body.metadata.characterName;
      const { data: charData } = await supabase
        .from('characters').select('id').eq('user_id', user.id).eq('name', charName)
        .order('created_at', { ascending: false }).limit(1).single();
      if (charData?.id) characterId = charData.id;
      else { console.warn('⚠️ Character not found by name, skipping'); return; }
    }

    if (!characterId) { console.warn('⚠️ No character ID, skipping portrait update'); return; }

    console.log('🖼️ Updating character portrait:', characterId);
    const fullImagePath = storagePath.startsWith('http') ? storagePath : `workspace-temp/${storagePath}`;

    await supabase.from('characters').update({
      image_url: fullImagePath,
      reference_image_url: fullImagePath,
      seed_locked: generationSeed,
      updated_at: new Date().toISOString()
    }).eq('id', characterId);

    // Auto-save to library
    if (!storagePath.startsWith('http')) {
      try {
        const destKey = `${user.id}/${jobData.id}_${characterId}.${resultType === 'video' ? 'mp4' : 'png'}`;
        const { data: fileData, error: dlErr } = await supabase.storage.from('workspace-temp').download(storagePath);
        if (dlErr || !fileData) { console.error('❌ Download failed:', dlErr); return; }

        const { error: ulErr } = await supabase.storage.from('user-library').upload(destKey, fileData, {
          contentType: resultType === 'video' ? 'video/mp4' : 'image/png', upsert: true
        });
        if (ulErr) { console.error('❌ Upload to library failed:', ulErr); return; }

        // Copy thumbnail if exists
        let libraryThumbPath: string | null = null;
        try {
          const thumbSrc = storagePath.replace(/\.(png|jpg|jpeg|mp4)$/i, '.thumb.webp');
          const { data: thumbData } = await supabase.storage.from('workspace-temp').download(thumbSrc);
          if (thumbData) {
            const thumbDest = `${user.id}/${jobData.id}_${characterId}.thumb.webp`;
            const { error: upErr } = await supabase.storage.from('user-library').upload(thumbDest, thumbData, { contentType: 'image/webp', upsert: true });
            if (!upErr) libraryThumbPath = thumbDest;
          }
        } catch { /* thumbnail not critical */ }

        // Create library record
        const { data: libAsset, error: libErr } = await supabase.from('user_library').insert({
          user_id: user.id, asset_type: resultType, storage_path: destKey,
          thumbnail_path: libraryThumbPath, file_size_bytes: fileSizeBytes,
          mime_type: resultType === 'video' ? 'video/mp4' : 'image/png',
          original_prompt: body.prompt, model_used: modelKey,
          generation_seed: generationSeed,
          width: falResult.images?.[0]?.width || falResult.width,
          height: falResult.images?.[0]?.height || falResult.height,
          tags: ['character', 'portrait'],
          roleplay_metadata: {
            type: 'character_portrait', character_id: characterId,
            character_name: body.metadata.character_name || body.metadata.characterName,
            consistency_method: body.metadata.consistency_method || body.metadata.consistencyMethod
          },
          content_category: 'character'
        }).select().single();

        if (!libErr && libAsset) {
          const stableUrl = `user-library/${destKey}`;
          await supabase.from('characters').update({
            image_url: stableUrl, reference_image_url: stableUrl,
            seed_locked: generationSeed, updated_at: new Date().toISOString()
          }).eq('id', characterId);
          console.log(`✅ Character ${characterId} portrait saved to library`);
        }
      } catch (error) {
        console.error('❌ Error auto-saving character portrait:', error);
      }
    }
    return;
  }

  // ─── Character Scene / Roleplay Scene ───
  if ((destination === 'character_scene' || destination === 'roleplay_scene') && body.metadata?.scene_id) {
    console.log('🎬 Updating scene:', body.metadata.scene_id);

    let persistentPath = storagePath.startsWith('http') ? storagePath : null;

    if (!persistentPath && !storagePath.startsWith('http') && user?.id) {
      const sourceKey = storagePath.startsWith('workspace-temp/') ? storagePath.replace('workspace-temp/', '') : storagePath;
      const libDestKey = `${user.id}/scenes/${body.metadata.scene_id}_${Date.now()}.png`;

      try {
        const { data: fileData, error: dlErr } = await supabase.storage.from('workspace-temp').download(sourceKey);
        if (!dlErr && fileData) {
          const { error: ulErr } = await supabase.storage.from('user-library').upload(libDestKey, fileData, { contentType: 'image/png', upsert: true });
          if (!ulErr) {
            persistentPath = `user-library/${libDestKey}`;
            // Create library record
            await supabase.from('user_library').insert({
              user_id: user.id, asset_type: 'image', storage_path: libDestKey,
              file_size_bytes: fileSizeBytes || 0, mime_type: 'image/png',
              original_prompt: body.metadata?.original_scene_prompt || body.prompt,
              model_used: modelKey, generation_seed: generationSeed,
              width: falResult.images?.[0]?.width || 1024, height: falResult.images?.[0]?.height || 1024,
              tags: ['scene', 'roleplay'],
              roleplay_metadata: {
                type: 'roleplay_scene', scene_id: body.metadata.scene_id,
                character_id: body.metadata.character_id, character_name: body.metadata.character_name,
                conversation_id: body.metadata.conversation_id,
                generation_mode: body.metadata.generation_mode || 't2i'
              },
              content_category: 'scene'
            });
            console.log('✅ Scene saved to library');
          }
        }
      } catch (error) {
        console.error('❌ Error copying scene to library:', error);
      }
    }

    const sceneImagePath = persistentPath || (storagePath.startsWith('http') ? storagePath : `workspace-temp/${storagePath}`);
    const { error: sceneErr } = await supabase.from('character_scenes')
      .update({ image_url: sceneImagePath, updated_at: new Date().toISOString() })
      .eq('id', body.metadata.scene_id);

    if (sceneErr) {
      console.error('❌ Scene update failed, retrying:', sceneErr);
      const { error: retryErr } = await supabase.from('character_scenes')
        .update({ image_url: sceneImagePath, updated_at: new Date().toISOString() })
        .eq('id', body.metadata.scene_id);
      if (retryErr) console.error('❌ Retry also failed:', retryErr);
      else console.log('✅ Scene updated on retry');
    } else {
      console.log('✅ Scene updated:', body.metadata.scene_id);
    }
    return;
  }

  // ─── Scene Preview — no DB updates needed ───
  if (destination === 'scene_preview') {
    console.log('🎬 Scene preview generated, returning URL for frontend');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: Main Orchestrator
// ═══════════════════════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Init Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const isVideo = body.modality === 'video' || body.metadata?.modality === 'video';

    console.log('🎨 fal.ai request:', {
      prompt: body.prompt?.slice(0, 100),
      apiModelId: body.apiModelId,
      modality: isVideo ? 'video' : 'image'
    });

    // 2. Auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
    }
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Authentication failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
    }

    // 3. Resolve model from api_models
    let apiModel: any = null;
    if (body.apiModelId) {
      const { data: model, error: modelError } = await supabase
        .from('api_models').select('*, api_providers!inner(*)').eq('id', body.apiModelId).eq('is_active', true).single();
      if (modelError || !model) {
        return new Response(JSON.stringify({ error: 'Specified API model not found or inactive' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }
      apiModel = model;
    } else {
      const { data: defaultModel } = await supabase
        .from('api_models').select('*, api_providers!inner(*)')
        .eq('modality', isVideo ? 'video' : 'image').eq('is_active', true)
        .contains('default_for_tasks', ['generation']).eq('api_providers.name', 'fal').single();

      if (defaultModel) {
        apiModel = defaultModel;
      } else {
        const { data: fallback } = await supabase
          .from('api_models').select('*, api_providers!inner(*)')
          .eq('modality', isVideo ? 'video' : 'image').eq('is_active', true)
          .eq('api_providers.name', 'fal').order('priority', { ascending: true }).limit(1).single();
        apiModel = fallback;
      }
    }

    if (!apiModel) {
      return new Response(JSON.stringify({ error: 'No fal.ai models configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
    }
    if (apiModel.api_providers.name !== 'fal') {
      return new Response(JSON.stringify({ error: 'Model provider must be fal' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    const falApiKey = Deno.env.get(apiModel.api_providers.secret_name);
    if (!falApiKey) {
      return new Response(JSON.stringify({ error: 'fal.ai API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
    }

    // Effective model key (supports model_key_override for scene continuity)
    const modelKeyOverride = body.model_key_override;
    const modelKey = modelKeyOverride || apiModel.model_key;
    const modelDisplayName = modelKeyOverride ? `${modelKeyOverride} (Override)` : apiModel.display_name;
    const modelModality = apiModel.modality;

    console.log('✅ Model:', { model_key: modelKey, display_name: modelDisplayName, modality: modelModality });

    // Require prompt
    if (!body.prompt) {
      return new Response(JSON.stringify({ error: 'Missing required field: prompt' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    // 4. Build input (helper)
    let modelInput: Record<string, any>;
    let generationMode: string;
    try {
      const result = await buildModelInput(body, apiModel, modelKey, isVideo, supabase);
      modelInput = result.modelInput;
      generationMode = result.generationMode;
    } catch (errorResponse) {
      // buildModelInput throws Response objects for validation errors
      if (errorResponse instanceof Response) return errorResponse;
      throw errorResponse;
    }

    // 5. Determine async vs sync from endpoint_path (table-driven)
    const webhookFunction = apiModel.endpoint_path; // e.g. 'fal-webhook' or null
    const isAsync = !!webhookFunction;
    const quality = body.quality || 'high';
    const jobType = normalizeJobType(body.job_type || body.jobType, isVideo, quality);
    const contentMode = body.metadata?.contentType || 'nsfw';

    // Build provider URL from table (no hardcoded URLs)
    const providerBaseUrl = apiModel.api_providers.base_url;
    const falEndpoint = `${providerBaseUrl}/${modelKey}`;

    // For async: store the signed reference URL so webhook can use it for thumbnails
    let signedRefUrl: string | null = null;
    if (isAsync && modelInput.image_url) {
      signedRefUrl = modelInput.image_url;
    }

    // Estimated cost for usage tracking
    const estimatedCost = calculateFalCost(modelKey, modelModality);

    // Merged job insert — single DB call instead of insert + update
    const { data: jobData, error: jobError } = await supabase
      .from('jobs').insert({
        user_id: user.id, job_type: jobType,
        original_prompt: body.prompt,
        status: isAsync ? 'queued' : 'processing',
        started_at: new Date().toISOString(),
        quality,
        api_model_id: apiModel.id, model_type: 'sdxl', format: isVideo ? 'video' : 'image',
        metadata: {
          ...body.metadata,
          provider_name: apiModel.api_providers.name,
          model_key: modelKey,
          database_model_key: apiModel.model_key,
          is_model_overridden: !!modelKeyOverride,
          content_mode: contentMode,
          generation_mode: generationMode,
          input_used: modelInput,
          estimated_cost: estimatedCost,
          ...(signedRefUrl ? { reference_image_signed_url: signedRefUrl } : {})
        }
      }).select().single();

    if (jobError || !jobData) {
      console.error('❌ Job creation failed:', jobError);
      return new Response(JSON.stringify({ error: 'Failed to create job', details: jobError?.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
    }
    console.log('✅ Job created:', jobData.id, isAsync ? '(async/queued)' : '(sync/processing)');

    // ── 6a. ASYNC PATH: Submit to queue with webhook, return immediately ──
    if (isAsync) {
      const webhookSecret = Deno.env.get('FAL_WEBHOOK_SECRET');
      if (!webhookSecret) {
        console.error('❌ FAL_WEBHOOK_SECRET not configured for async model');
        // Fall through to synchronous as fallback
      } else {
        const webhookUrl = `${supabaseUrl}/functions/v1/${webhookFunction}?secret=${webhookSecret}`;
        console.log('🚀 Async submit to:', falEndpoint, '→ webhook:', webhookFunction);

        try {
          const falResponse = await fetch(`${falEndpoint}?fal_webhook=${encodeURIComponent(webhookUrl)}`, {
            method: 'POST',
            headers: { 'Authorization': `Key ${falApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(modelInput)
          });

          if (!falResponse.ok) {
            const errorText = await falResponse.text();
            console.error('❌ Async submission failed:', falResponse.status, errorText);

            await supabase.from('jobs').update({
              status: 'failed',
              error_message: `Async submission failed: ${falResponse.status} - ${errorText.slice(0, 500)}`
            }).eq('id', jobData.id);

            return new Response(JSON.stringify({
              error: 'Failed to submit async generation',
              details: errorText.slice(0, 500),
              status: falResponse.status
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: falResponse.status >= 400 && falResponse.status < 500 ? falResponse.status : 500,
            });
          }

          const queueResult = await falResponse.json();
          console.log('✅ Async queued:', {
            request_id: queueResult.request_id,
            status: queueResult.status
          });

          // Store request_id for webhook lookup
          await supabase.from('jobs').update({
            metadata: { ...jobData.metadata, fal_request_id: queueResult.request_id, input_used: modelInput }
          }).eq('id', jobData.id);

          // Log usage (submission only, actual cost tracked by webhook)
          logApiUsage(supabase, {
            providerId: apiModel.api_providers.id, modelId: apiModel.id, userId: user.id,
            requestType: modelModality === 'video' ? 'video' : 'image',
            endpointPath: `/${modelKey}`,
            requestPayload: modelInput,
            responseStatus: 202, responseTimeMs: Date.now() - Date.now(),
            costUsd: estimatedCost,
            providerMetadata: { request_id: queueResult.request_id, async: true, model_key: modelKey }
          }).catch(() => {});

          return new Response(JSON.stringify({
            jobId: jobData.id,
            requestId: queueResult.request_id,
            status: 'queued',
            message: 'Generation queued — results delivered via webhook'
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

        } catch (asyncError) {
          console.error('❌ Async fetch error:', asyncError);
          // Fall through to sync as fallback
          console.log('⚠️ Falling back to synchronous call');
          await supabase.from('jobs').update({ status: 'processing' }).eq('id', jobData.id);
        }
      }
    }

    // ── 6b. SYNCHRONOUS PATH (images, or async fallback) ──
    console.log('🚀 Calling fal.ai (sync):', falEndpoint);

    const startTime = Date.now();
    const requestType = modelModality === 'video' ? 'video' : 'image';

    try {
      const falResponse = await fetch(falEndpoint, {
        method: 'POST',
        headers: { 'Authorization': `Key ${falApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(modelInput)
      });

      const responseTimeMs = Date.now() - startTime;

      if (!falResponse.ok) {
        const errorText = await falResponse.text();
        let errorDetails;
        try { errorDetails = JSON.parse(errorText); } catch { errorDetails = { message: errorText }; }

        console.error('❌ fal.ai error:', { status: falResponse.status, error: errorDetails });

        await supabase.from('jobs').update({
          status: 'failed',
          error_message: `fal.ai API error: ${falResponse.status} - ${errorDetails.message || errorText.slice(0, 500)}`
        }).eq('id', jobData.id);

        logApiUsage(supabase, {
          providerId: apiModel.api_providers.id, modelId: apiModel.id, userId: user.id,
          requestType, endpointPath: `/${modelKey}`, requestPayload: modelInput,
          responseStatus: falResponse.status, responseTimeMs,
          errorMessage: errorDetails.message || errorText, providerMetadata: { model_key: modelKey }
        }).catch(() => {});

        const isDownstream = falResponse.status === 500 &&
          (errorText.includes('downstream_service_error') || errorText.includes('Downstream service error'));

        return new Response(JSON.stringify({
          error: isDownstream ? 'Model temporarily unavailable' : 'fal.ai API request failed',
          details: isDownstream
            ? `The model "${modelDisplayName}" is temporarily unavailable. Please try again or use a different model.`
            : (errorDetails.message || errorText),
          status: falResponse.status,
          retryable: isDownstream,
          debug: falResponse.status === 422 ? {
            model_key: modelKey, has_image_url: !!modelInput.image_url,
            has_image_urls: !!modelInput.image_urls, has_video: !!modelInput.video,
            input_keys: Object.keys(modelInput)
          } : undefined
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: isDownstream ? 503 : falResponse.status,
        });
      }

      const falResult = await falResponse.json();
      console.log('✅ fal.ai response:', { request_id: falResult.request_id, has_images: !!falResult.images, has_video: !!falResult.video });

      // Cost tracking
      const falCost = calculateFalCost(modelKey, modelModality);
      const usageData = extractFalUsage(falResult, falCost);
      logApiUsage(supabase, {
        providerId: apiModel.api_providers.id, modelId: apiModel.id, userId: user.id,
        requestType, endpointPath: `/${modelKey}`, requestPayload: modelInput,
        ...usageData, responseStatus: falResponse.status, responseTimeMs, responsePayload: falResult
      }).catch(() => {});

      // Note: IN_QUEUE/IN_PROGRESS statuses won't occur on sync fal.run calls.
      // Async models use the webhook path above. This is a safety net only.
      if (falResult.status === 'IN_QUEUE' || falResult.status === 'IN_PROGRESS') {
        console.warn('⚠️ Unexpected queue status on sync call — model may need endpoint_path set for async');
        await supabase.from('jobs').update({
          metadata: { ...jobData.metadata, fal_request_id: falResult.request_id, input_used: modelInput }
        }).eq('id', jobData.id);

        return new Response(JSON.stringify({
          jobId: jobData.id, requestId: falResult.request_id, status: 'queued', message: 'Request queued with fal.ai'
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      }

      // 7. Extract result URL
      let resultUrl: string | null = null;
      let resultType = 'image';
      if (falResult.images && falResult.images.length > 0) { resultUrl = falResult.images[0].url; resultType = 'image'; }
      else if (falResult.video?.url) { resultUrl = falResult.video.url; resultType = 'video'; }
      else if (falResult.output?.url) { resultUrl = falResult.output.url; resultType = isVideo ? 'video' : 'image'; }

      if (!resultUrl) {
        await supabase.from('jobs').update({ status: 'failed', error_message: 'No result URL in fal.ai response' }).eq('id', jobData.id);
        return new Response(JSON.stringify({ error: 'No result URL in response' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
      }

      // 8. Download + upload to storage
      let storagePath = '';
      let fileSizeBytes = 0;

      try {
        const imageResponse = await fetch(resultUrl);
        if (!imageResponse.ok) throw new Error(`Download failed: ${imageResponse.status}`);
        const imageBuffer = await imageResponse.arrayBuffer();
        fileSizeBytes = imageBuffer.byteLength;

        const ext = resultType === 'video' ? 'mp4' : 'png';
        storagePath = `${user.id}/${jobData.id}_${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage.from('workspace-temp').upload(storagePath, imageBuffer, {
          contentType: resultType === 'video' ? 'video/mp4' : 'image/png', upsert: true
        });
        if (uploadError) {
          console.error('❌ Upload error:', uploadError);
          storagePath = '';
        } else {
          console.log('✅ Uploaded to workspace-temp:', storagePath);
        }
      } catch (downloadError) {
        console.error('❌ Download/upload error:', downloadError);
        storagePath = '';
      }

      // Video thumbnail from reference image — reuse already-signed URL from modelInput
      let thumbnailPath: string | null = null;
      if (resultType === 'video' && modelInput.image_url) {
        try {
          // modelInput.image_url is already signed by buildModelInput, no need to re-sign
          const thumbResponse = await fetch(modelInput.image_url);
          if (thumbResponse.ok) {
            const thumbBuffer = await thumbResponse.arrayBuffer();
            const thumbStoragePath = `${user.id}/${jobData.id}_${Date.now()}.thumb.webp`;
            const { error: thumbUploadError } = await supabase.storage.from('workspace-temp').upload(thumbStoragePath, thumbBuffer, { contentType: 'image/webp', upsert: true });
            if (!thumbUploadError) { thumbnailPath = thumbStoragePath; console.log('✅ Thumbnail created'); }
          }
        } catch (thumbError) {
          console.warn('⚠️ Thumbnail generation failed:', thumbError);
        }
      }

      // Update job
      await supabase.from('jobs').update({
        status: 'completed', completed_at: new Date().toISOString(),
        metadata: {
          ...jobData.metadata, result_type: resultType, fal_response: falResult,
          input_used: modelInput, original_fal_url: resultUrl,
          storage_path: storagePath, thumbnail_path: thumbnailPath
        }
      }).eq('id', jobData.id);

      // 9. Create workspace_assets record
      const generationSeed = falResult.seed || Math.floor(Math.random() * 1000000000);
      const { error: assetError } = await supabase.from('workspace_assets').insert({
        user_id: user.id, job_id: jobData.id, asset_type: resultType,
        temp_storage_path: storagePath, thumbnail_path: thumbnailPath,
        file_size_bytes: fileSizeBytes, mime_type: resultType === 'video' ? 'video/mp4' : 'image/png',
        original_prompt: body.prompt, model_used: modelKey,
        generation_seed: generationSeed,
        generation_settings: {
          model_key: modelKey, provider: 'fal', content_mode: contentMode,
          generation_mode: generationMode, seed: generationSeed,
          scene_id: body.metadata?.scene_id,
          scene_template_id: body.metadata?.scene_template_id,
          scene_template_name: body.metadata?.scene_template_name,
          original_scene_prompt: body.metadata?.original_scene_prompt || body.prompt
        }
      });
      if (assetError) console.warn('⚠️ Failed to create workspace asset:', assetError);
      else console.log('✅ Workspace asset created');

      // 10. Post-process destinations (fire-and-forget — don't block response)
      handlePostProcessing(supabase, body, user, storagePath, jobData, resultType, fileSizeBytes, falResult, generationSeed, modelKey)
        .catch(err => console.error('❌ Post-processing error:', err));

      return new Response(JSON.stringify({
        jobId: jobData.id, status: 'completed', resultUrl, resultType
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } catch (fetchError) {
      console.error('❌ fal.ai fetch error:', fetchError);
      await supabase.from('jobs').update({
        status: 'failed', error_message: `fal.ai fetch error: ${(fetchError as Error).message}`
      }).eq('id', jobData.id);
      return new Response(JSON.stringify({ error: 'Failed to call fal.ai API', details: (fetchError as Error).message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
    }

  } catch (error) {
    console.error("❌ Error in fal-image function:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
