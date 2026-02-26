import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Replicate polling helper ──────────────────────────────────────────────
async function pollReplicatePrediction(
  predictionUrl: string,
  apiKey: string,
  timeoutMs = 120_000,
  intervalMs = 2_000
): Promise<any> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(predictionUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Replicate poll error ${res.status}: ${text}`);
    }
    const prediction = await res.json();
    if (prediction.status === 'succeeded') return prediction;
    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      throw new Error(`Replicate prediction ${prediction.status}: ${prediction.error || 'unknown'}`);
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error(`Replicate prediction timed out after ${timeoutMs}ms`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { 
      characterId, 
      presets, 
      referenceImageUrl, 
      contentRating,
      apiModelId,
      characterData,
      promptOverride,
      referenceStrength, // 0.1–1.0, controls how much the reference image influences output
      numImages, // 1-4, batch generation count (default 1)
      canonPoseKey // e.g. "front_neutral" — triggers canon position generation
    } = body;
    
    console.log('📥 character-portrait request:', {
      characterId,
      hasPresets: !!presets,
      hasReferenceImage: !!referenceImageUrl,
      apiModelId,
      hasCharacterData: !!characterData,
      promptOverrideLength: promptOverride?.length || 0,
      numImages: numImages || 1,
      canonPoseKey: canonPoseKey || null
    });

    // Get authenticated user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('👤 User authenticated:', user.id);

    // Load character if ID provided, otherwise use characterData
    let character: any = null;
    if (characterId) {
      const { data: charData, error: charError } = await supabase
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .single();

      if (charError || !charData) {
        return new Response(JSON.stringify({ error: 'Character not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      character = charData;
    } else if (characterData) {
      character = characterData;
    } else {
      return new Response(JSON.stringify({ error: 'characterId or characterData required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // I2I mode detection
    const isI2I = !!referenceImageUrl;
    const effectiveContentRating = contentRating || character.content_rating || 'nsfw';

    // ── Resolve API model dynamically (table-driven, any provider) ──
    let apiModel: any = null;

    if (apiModelId) {
      // Use specific model by ID (UI override)
      const { data: model, error: modelError } = await supabase
        .from('api_models')
        .select(`*, api_providers!inner(*)`)
        .eq('id', apiModelId)
        .eq('is_active', true)
        .single();

      if (modelError || !model) {
        console.error('❌ Specified API model not found:', modelError);
        return new Response(
          JSON.stringify({ error: 'Specified API model not found or inactive' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      apiModel = model;
    } else {
      // Auto-select: find default model for the task, any provider
      const task = isI2I ? 'i2i' : 't2i';
      const { data: defaultModel } = await supabase
        .from('api_models')
        .select(`*, api_providers!inner(*)`)
        .eq('modality', 'image')
        .eq('is_active', true)
        .contains('default_for_tasks', [task])
        .order('priority', { ascending: true })
        .limit(1)
        .single();

      if (defaultModel) {
        apiModel = defaultModel;
      } else {
        // Fallback: any active image model by priority
        console.log('⚠️ No default model for task', task, '— falling back to any active image model');
        const { data: fallbackModels, error: fallbackError } = await supabase
          .from('api_models')
          .select(`*, api_providers!inner(*)`)
          .eq('modality', 'image')
          .eq('is_active', true)
          .order('priority', { ascending: true })
          .limit(1);

        if (fallbackError || !fallbackModels || fallbackModels.length === 0) {
          console.error('❌ No suitable image models found:', fallbackError);
          return new Response(
            JSON.stringify({ error: 'No suitable image models configured' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        apiModel = fallbackModels[0];
      }
    }

    const providerName: string = apiModel.api_providers.name;
    console.log('✅ Using model:', apiModel.display_name, '| Provider:', providerName, '| I2I:', isI2I);

    // Get API key from provider's secret_name
    const apiKey = Deno.env.get(apiModel.api_providers.secret_name);
    if (!apiKey) {
      console.error(`❌ API key not found for provider ${providerName} (secret: ${apiModel.api_providers.secret_name})`);
      return new Response(
        JSON.stringify({ error: `API key not configured for provider: ${apiModel.api_providers.display_name}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine generation intent based on reference image presence
    const generationIntent = canonPoseKey ? 'canon_position' : isI2I ? 'direct' : 'explore';
    console.log(`🎯 Generation intent: ${generationIntent}`);

    // === Canon Position Generation ===
    let canonPosePreset: any = null;
    let canonPromptOverride: string | null = null;
    let canonReferenceStrength: number | null = null;

    if (canonPoseKey) {
      console.log(`📐 Canon position generation: ${canonPoseKey}`);

      const { data: canonTemplate, error: canonTemplateError } = await supabase
        .from('prompt_templates')
        .select('*')
        .eq('use_case', 'canon_position')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (canonTemplateError || !canonTemplate) {
        console.error('❌ Canon position template not found:', canonTemplateError);
        return new Response(
          JSON.stringify({ error: 'Canon position template not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const metadata = canonTemplate.metadata as Record<string, any> || {};
      const posePresets = metadata.pose_presets || {};
      canonPosePreset = posePresets[canonPoseKey];

      if (!canonPosePreset) {
        console.error('❌ Unknown canon pose key:', canonPoseKey, 'Available:', Object.keys(posePresets));
        return new Response(
          JSON.stringify({ error: `Unknown canon pose key: ${canonPoseKey}`, available: Object.keys(posePresets) }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const appearanceTags = (character.appearance_tags || []).join(', ');
      const clothingTags = (character.clothing_tags || []).join(', ');
      const preserveBlock = `same character identity, face${appearanceTags ? `, ${appearanceTags}` : ''}${clothingTags ? `, clothing: ${clothingTags}` : ''}`;
      canonPromptOverride = `[PRESERVE] ${preserveBlock} [CHANGE] ${canonPosePreset.prompt_fragment}`;
      canonReferenceStrength = canonPosePreset.reference_strength || 0.8;

      console.log('📐 Canon prompt:', canonPromptOverride);
      console.log('📐 Canon ref strength:', canonReferenceStrength);
    }

    // Build portrait prompt — conditional on T2I vs I2I
    const promptParts: string[] = [];
    const gender = character.gender?.toLowerCase() || 'unspecified';

    if (canonPoseKey && canonPromptOverride) {
      promptParts.push(canonPromptOverride);
    } else if (isI2I) {
      // === I2I (Directing Mode) ===
      if (gender === 'male') promptParts.push('1boy');
      else if (gender === 'female') promptParts.push('1girl');
      else promptParts.push('1person');

      if (character.appearance_tags?.length) {
        promptParts.push(...character.appearance_tags.slice(0, 8));
      }

      if (promptOverride && typeof promptOverride === 'string' && promptOverride.trim()) {
        const cleanedOverride = promptOverride.trim().slice(0, 200);
        promptParts.push(cleanedOverride);
        console.log('📝 I2I promptOverride (directorial):', cleanedOverride.substring(0, 50) + '...');
      }

      if (presets?.pose) promptParts.push(presets.pose);
      if (presets?.expression) promptParts.push(presets.expression);
      if (presets?.outfit) promptParts.push(presets.outfit);
      if (presets?.camera) promptParts.push(presets.camera);

    } else {
      // === T2I (Exploration Mode) ===
      promptParts.push('masterpiece', 'best quality', 'photorealistic');

      if (gender === 'male') {
        promptParts.push('1boy', 'handsome man', 'portrait');
      } else if (gender === 'female') {
        promptParts.push('1girl', 'beautiful woman', 'portrait');
      } else {
        promptParts.push('1person', 'portrait');
      }

      if (presets?.pose) promptParts.push(presets.pose);
      if (presets?.expression) promptParts.push(presets.expression);
      if (presets?.outfit) promptParts.push(presets.outfit);
      if (presets?.camera) promptParts.push(presets.camera);

      if (character.appearance_tags?.length) {
        promptParts.push(...character.appearance_tags.slice(0, 8));
      }

      if (promptOverride && typeof promptOverride === 'string' && promptOverride.trim()) {
        const cleanedOverride = promptOverride.trim().slice(0, 200);
        promptParts.push(cleanedOverride);
        console.log('📝 T2I promptOverride:', cleanedOverride.substring(0, 50) + '...');
      }

      promptParts.push('studio photography', 'professional lighting', 'sharp focus', 'detailed face');
    }

    const prompt = promptParts.join(', ');

    console.log('🎨 Character portrait generation:', {
      characterId: characterId || 'new',
      prompt: prompt.substring(0, 150) + '...',
      isI2I,
      model: apiModel.model_key,
      provider: providerName
    });

    // Create job record
    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        job_type: isI2I ? 'image_high' : 'image_high',
        original_prompt: prompt,
        status: 'queued',
        quality: 'high',
        api_model_id: apiModel.id,
        model_type: apiModel.model_family?.toLowerCase() || providerName,
        format: 'image',
        metadata: {
          type: 'character_portrait',
          destination: 'character_portrait',
          character_id: characterId,
          character_name: character.name,
          generation_mode: isI2I ? 'i2i' : 'txt2img',
          generation_intent: generationIntent,
          content_rating: effectiveContentRating,
          provider_name: providerName,
          presets,
          prompt_override: promptOverride || null
        }
      })
      .select()
      .single();

    if (jobError || !jobData) {
      console.error('❌ Failed to create job:', jobError);
      return new Response(
        JSON.stringify({ error: 'Failed to create job' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Job created:', jobData.id);

    // ── Sign reference image if needed ──
    let signedReferenceUrl: string | null = null;
    if (isI2I && referenceImageUrl) {
      signedReferenceUrl = referenceImageUrl;
      if (!referenceImageUrl.startsWith('http') && !referenceImageUrl.startsWith('data:')) {
        const knownBuckets = ['user-library', 'workspace-temp', 'reference_images'];
        const parts = referenceImageUrl.split('/');
        let bucket = 'reference_images';
        let path = referenceImageUrl;

        if (knownBuckets.includes(parts[0])) {
          bucket = parts[0];
          path = parts.slice(1).join('/');
        }

        const { data: signed } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 3600);

        if (signed?.signedUrl) {
          signedReferenceUrl = signed.signedUrl;
          console.log('🔏 Signed reference image URL');
        }
      }
    }

    // ── Provider-specific input building ──
    const capabilities = apiModel.capabilities as Record<string, any> || {};
    const inputSchema = capabilities.input_schema || {};
    const modelMaxImages = inputSchema?.num_images?.max || 1;
    const requestedImages = Math.min(Math.max(1, numImages || 1), 4, modelMaxImages);

    let modelInput: Record<string, any> = {};

    if (providerName === 'fal') {
      // ── Fal input ──
      modelInput = {
        prompt,
        ...(apiModel.input_defaults || {}),
        image_size: 'portrait_4_3',
        enable_safety_checker: effectiveContentRating !== 'nsfw',
      };

      if (requestedImages > 1 && modelMaxImages > 1) {
        modelInput.num_images = requestedImages;
        console.log(`📸 Batch generation: ${requestedImages} images (model max: ${modelMaxImages})`);
      }

      if (isI2I && signedReferenceUrl) {
        const effectiveRefStrength = canonReferenceStrength ?? (typeof referenceStrength === 'number' ? referenceStrength : 0.75);
        const promptStrength = Math.round((1 - effectiveRefStrength) * 100) / 100;
        modelInput.prompt_strength = promptStrength;
        console.log(`🎛️ Reference strength: ${effectiveRefStrength} → prompt_strength: ${promptStrength}`);

        const requiresArray = capabilities.requires_image_urls_array === true;
        if (requiresArray || inputSchema?.image_urls) {
          modelInput.image_urls = [signedReferenceUrl];
        } else {
          modelInput.image_url = signedReferenceUrl;
        }
      }

    } else if (providerName === 'replicate') {
      // ── Replicate input ──
      modelInput = {
        prompt,
        width: 768,
        height: 1024,
        ...(apiModel.input_defaults || {}),
        prompt: prompt, // Ensure prompt overrides input_defaults
      };

      if (requestedImages > 1) {
        modelInput.num_outputs = requestedImages;
        console.log(`📸 Batch generation: ${requestedImages} images`);
      }

      // Replicate models are generally uncensored; some support disable_safety_checker
      if (effectiveContentRating === 'nsfw') {
        modelInput.disable_safety_checker = true;
      }

      if (isI2I && signedReferenceUrl) {
        const inputKeyMappings = (typeof capabilities.input_key_mappings === 'object' && capabilities.input_key_mappings) || {};
        const imageKey = inputKeyMappings.i2i_image_key || 'image';
        const strengthKey = inputKeyMappings.i2i_strength_key || 'strength';

        modelInput[imageKey] = signedReferenceUrl;

        const effectiveRefStrength = canonReferenceStrength ?? (typeof referenceStrength === 'number' ? referenceStrength : 0.75);
        // Replicate strength = how much to change (inverse of reference strength)
        modelInput[strengthKey] = Math.round((1 - effectiveRefStrength) * 100) / 100;
        console.log(`🎛️ Reference strength: ${effectiveRefStrength} → ${strengthKey}: ${modelInput[strengthKey]}`);
      }

    } else {
      // Unknown provider — try generic approach with input_defaults
      console.warn(`⚠️ Unknown provider "${providerName}", using generic input with input_defaults`);
      modelInput = {
        prompt,
        ...(apiModel.input_defaults || {}),
      };
    }

    // ── Provider-specific API call ──
    const startTime = Date.now();
    let allImages: string[] = [];

    // Update job as processing
    await supabase
      .from('jobs')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', jobData.id);

    if (providerName === 'fal') {
      // ── Fal: synchronous call ──
      const falEndpoint = `https://fal.run/${apiModel.model_key}`;
      console.log('📤 Calling fal.ai (sync):', falEndpoint);

      const falResponse = await fetch(falEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(modelInput)
      });

      if (!falResponse.ok) {
        const errorText = await falResponse.text();
        console.error('❌ fal.ai error:', falResponse.status, errorText);
        await supabase.from('jobs').update({
          status: 'failed',
          error_message: `fal.ai error: ${falResponse.status} - ${errorText.substring(0, 200)}`,
          completed_at: new Date().toISOString()
        }).eq('id', jobData.id);

        return new Response(
          JSON.stringify({ error: 'Image generation failed', details: errorText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await falResponse.json();
      console.log('📥 Fal result received:', JSON.stringify(result).substring(0, 300));

      // Parse fal response
      if (result.images && Array.isArray(result.images)) {
        for (const img of result.images) {
          if (img?.url) allImages.push(img.url);
        }
      } else if (result.image?.url) {
        allImages.push(result.image.url);
      } else if (result.output?.url) {
        allImages.push(result.output.url);
      }

    } else if (providerName === 'replicate') {
      // ── Replicate: create prediction + poll ──
      if (!apiModel.version) {
        console.error('❌ Replicate model missing version:', apiModel.model_key);
        await supabase.from('jobs').update({
          status: 'failed',
          error_message: 'Replicate model requires version in api_models table',
          completed_at: new Date().toISOString()
        }).eq('id', jobData.id);
        return new Response(
          JSON.stringify({ error: 'Replicate model requires version in api_models table' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('📤 Calling Replicate:', apiModel.model_key, 'version:', apiModel.version);

      // Clean null/undefined from input
      Object.keys(modelInput).forEach(k => {
        if (modelInput[k] === null || modelInput[k] === undefined) delete modelInput[k];
      });

      const createRes = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'wait',
        },
        body: JSON.stringify({
          version: apiModel.version,
          input: modelInput,
        })
      });

      if (!createRes.ok) {
        const errorText = await createRes.text();
        console.error('❌ Replicate create error:', createRes.status, errorText);
        await supabase.from('jobs').update({
          status: 'failed',
          error_message: `Replicate error: ${createRes.status} - ${errorText.substring(0, 200)}`,
          completed_at: new Date().toISOString()
        }).eq('id', jobData.id);
        return new Response(
          JSON.stringify({ error: 'Image generation failed', details: errorText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let prediction = await createRes.json();
      console.log('📥 Replicate prediction created:', prediction.id, 'status:', prediction.status);

      // If not immediately succeeded, poll
      if (prediction.status !== 'succeeded') {
        const pollUrl = prediction.urls?.get || `https://api.replicate.com/v1/predictions/${prediction.id}`;
        console.log('⏳ Polling Replicate prediction:', pollUrl);
        prediction = await pollReplicatePrediction(pollUrl, apiKey);
      }

      console.log('📥 Replicate result:', JSON.stringify(prediction.output).substring(0, 300));

      // Parse replicate output — typically an array of URL strings
      if (Array.isArray(prediction.output)) {
        for (const item of prediction.output) {
          if (typeof item === 'string') allImages.push(item);
          else if (item?.url) allImages.push(item.url);
        }
      } else if (typeof prediction.output === 'string') {
        allImages.push(prediction.output);
      }

    } else {
      // Unknown provider — fail gracefully
      await supabase.from('jobs').update({
        status: 'failed',
        error_message: `Unsupported provider: ${providerName}`,
        completed_at: new Date().toISOString()
      }).eq('id', jobData.id);
      return new Response(
        JSON.stringify({ error: `Unsupported provider: ${providerName}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const generationTime = Date.now() - startTime;
    console.log(`⏱️ Generation completed in ${generationTime}ms`);

    if (allImages.length === 0) {
      console.error('❌ No image URL in response');
      await supabase.from('jobs').update({
        status: 'failed',
        error_message: 'No image URL in generation response',
        completed_at: new Date().toISOString()
      }).eq('id', jobData.id);

      return new Response(
        JSON.stringify({ error: 'No image returned from generation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🖼️ ${allImages.length} image(s) extracted from response`);

    // Process each image: upload to storage + insert records
    const processedImages: Array<{ imageUrl: string; storagePath: string | null; portraitId: string | null; batchIndex: number }> = [];

    for (let batchIndex = 0; batchIndex < allImages.length; batchIndex++) {
      const imageUrl = allImages[batchIndex];
      let storagePath: string | null = null;
      let libraryImageUrl: string | null = null;

      // ========== UPLOAD TO USER-LIBRARY BUCKET ==========
      try {
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) throw new Error(`Failed to download image: ${imageResponse.status}`);
        
        const imageBlob = await imageResponse.blob();
        const imageBuffer = await imageBlob.arrayBuffer();
        const imageBytes = new Uint8Array(imageBuffer);
        
        const timestamp = Date.now();
        const charIdPart = characterId || 'new';
        storagePath = `${user.id}/portraits/${charIdPart}_${timestamp}_${batchIndex}.png`;
        
        const { error: uploadError } = await supabase.storage
          .from('user-library')
          .upload(storagePath, imageBytes, {
            contentType: 'image/png',
            upsert: false
          });
        
        if (uploadError) {
          console.error(`⚠️ Storage upload failed for batch ${batchIndex}:`, uploadError);
        } else {
          const { data: signedData } = await supabase.storage
            .from('user-library')
            .createSignedUrl(storagePath, 60 * 60 * 24 * 365);
          
          if (signedData?.signedUrl) {
            libraryImageUrl = signedData.signedUrl;
          }
        }
      } catch (downloadError) {
        console.error(`⚠️ Image download/upload failed for batch ${batchIndex}:`, downloadError);
      }

      const finalImageUrl = libraryImageUrl || imageUrl;

      // ========== INSERT INTO USER_LIBRARY TABLE ==========
      if (storagePath) {
        const { error: libraryError } = await supabase
          .from('user_library')
          .insert({
            user_id: user.id,
            asset_type: 'image',
            storage_path: storagePath,
            original_prompt: prompt,
            model_used: apiModel.display_name,
            file_size_bytes: 0,
            mime_type: 'image/png',
            tags: ['character', 'portrait', character.name].filter(Boolean),
            content_category: 'character',
            roleplay_metadata: {
              character_id: characterId,
              character_name: character.name,
              type: 'character_portrait',
              generation_mode: isI2I ? 'i2i' : 'txt2img',
              job_id: jobData.id,
              batch_index: batchIndex
            }
          });
        
        if (libraryError) {
          console.error(`⚠️ user_library insert failed for batch ${batchIndex}:`, libraryError);
        }
      }

      // ========== INSERT INTO CHARACTER_PORTRAITS TABLE ==========
      let portraitId: string | null = null;
      if (characterId) {
        const { count } = await supabase
          .from('character_portraits')
          .select('*', { count: 'exact', head: true })
          .eq('character_id', characterId);

        const isFirstPortrait = (count || 0) === 0 && batchIndex === 0;

        const { data: portraitData, error: portraitError } = await supabase
          .from('character_portraits')
          .insert({
            character_id: characterId,
            image_url: finalImageUrl,
            prompt: prompt,
            enhanced_prompt: prompt,
            is_primary: isFirstPortrait,
            sort_order: (count || 0) + batchIndex,
            generation_metadata: {
              model: apiModel.display_name,
              model_key: apiModel.model_key,
              provider: providerName,
              generation_mode: isI2I ? 'i2i' : 'txt2img',
              generation_time_ms: generationTime,
              presets,
              job_id: jobData.id,
              storage_path: storagePath,
              batch_index: batchIndex,
              batch_total: allImages.length
            }
          })
          .select()
          .single();

        if (portraitError) {
          console.error(`❌ Failed to insert portrait batch ${batchIndex}:`, JSON.stringify(portraitError));
        } else {
          portraitId = portraitData.id;
        }
      }

      processedImages.push({ imageUrl: finalImageUrl, storagePath, portraitId, batchIndex });
    }

    // Update character image_url to the first generated image
    if (characterId && processedImages.length > 0) {
      await supabase
        .from('characters')
        .update({
          image_url: processedImages[0].imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', characterId);
    }

    // === Auto-save to character_canon for canon position generation ===
    let canonId: string | null = null;
    if (canonPoseKey && canonPosePreset && characterId && processedImages.length > 0) {
      try {
        const { data: canonData, error: canonError } = await supabase
          .from('character_canon')
          .insert({
            character_id: characterId,
            output_type: 'position',
            output_url: processedImages[0].storagePath || processedImages[0].imageUrl,
            tags: canonPosePreset.tags || [],
            label: canonPosePreset.label || canonPoseKey,
            is_pinned: false,
            is_primary: false,
            metadata: {
              pose_key: canonPoseKey,
              job_id: jobData.id,
              generation_time_ms: generationTime,
              model_key: apiModel.model_key,
              provider: providerName,
            }
          })
          .select('id')
          .single();

        if (canonError) {
          console.error('⚠️ Failed to auto-save canon position:', canonError);
        } else {
          canonId = canonData.id;
          console.log('📐 Canon position auto-saved:', canonId);
        }
      } catch (canonErr) {
        console.error('⚠️ Canon auto-save error:', canonErr);
      }
    }

    // Update job as completed
    await supabase
      .from('jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: {
          ...jobData.metadata,
          generation_time_ms: generationTime,
          generation_intent: generationIntent,
          result_url: processedImages[0]?.imageUrl,
          storage_path: processedImages[0]?.storagePath,
          batch_count: processedImages.length,
          provider: providerName,
        }
      })
      .eq('id', jobData.id);

    console.log(`🎉 Character portrait generation complete! ${processedImages.length} image(s)`);

    return new Response(JSON.stringify({
      success: true,
      imageUrl: processedImages[0]?.imageUrl,
      imageUrls: processedImages.map(p => p.imageUrl),
      jobId: jobData.id,
      portraitId: processedImages[0]?.portraitId,
      portraitIds: processedImages.map(p => p.portraitId).filter(Boolean),
      generationTimeMs: generationTime,
      storagePath: processedImages[0]?.storagePath,
      batchCount: processedImages.length,
      canonId: canonId || null,
      canonPoseKey: canonPoseKey || null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Character portrait error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
