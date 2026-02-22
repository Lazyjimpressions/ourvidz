import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      numImages // 1-4, batch generation count (default 1)
    } = body;
    
    console.log('📥 character-portrait request:', {
      characterId,
      hasPresets: !!presets,
      hasReferenceImage: !!referenceImageUrl,
      apiModelId,
      hasCharacterData: !!characterData,
      promptOverrideLength: promptOverride?.length || 0,
      numImages: numImages || 1
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

    // Resolve API model dynamically
    let apiModel: any = null;

    if (apiModelId) {
      // Use specific model by ID
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
      // Auto-select based on I2I mode
      const modelQuery = supabase
        .from('api_models')
        .select(`*, api_providers!inner(*)`)
        .eq('modality', 'image')
        .eq('is_active', true)
        .eq('api_providers.name', 'fal');

      if (isI2I) {
        // Get I2I-capable model (Seedream v4.5 Edit)
        modelQuery.eq('capabilities->supports_i2i', true);
      }

      const { data: models, error: modelsError } = await modelQuery
        .order('priority', { ascending: true })
        .limit(1);

      if (modelsError || !models || models.length === 0) {
        console.error('❌ No suitable fal.ai models found:', modelsError);
        return new Response(
          JSON.stringify({ error: 'No suitable image models configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      apiModel = models[0];
    }

    console.log('✅ Using model:', apiModel.display_name, 'I2I:', isI2I);

    // Get fal.ai API key
    const falApiKey = Deno.env.get(apiModel.api_providers.secret_name);
    if (!falApiKey) {
      console.error('❌ fal.ai API key not found');
      return new Response(
        JSON.stringify({ error: 'fal.ai API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine generation intent based on reference image presence
    const generationIntent = isI2I ? 'direct' : 'explore';
    console.log(`🎯 Generation intent: ${generationIntent}`);

    // Build portrait prompt — conditional on T2I vs I2I
    const promptParts: string[] = [];
    const gender = character.gender?.toLowerCase() || 'unspecified';

    if (isI2I) {
      // === I2I (Directing Mode) ===
      // Reference image handles identity and style. Prompt describes ONLY what changes.
      // No style boilerplate — it fights the reference image.

      // Gender tag for model routing only
      if (gender === 'male') promptParts.push('1boy');
      else if (gender === 'female') promptParts.push('1girl');
      else promptParts.push('1person');

      // Appearance tags (identity descriptors the model needs to maintain)
      if (character.appearance_tags?.length) {
        promptParts.push(...character.appearance_tags.slice(0, 8));
      }

      // User's directorial instruction (outfit, scene, pose, companions)
      if (promptOverride && typeof promptOverride === 'string' && promptOverride.trim()) {
        const cleanedOverride = promptOverride.trim().slice(0, 200);
        promptParts.push(cleanedOverride);
        console.log('📝 I2I promptOverride (directorial):', cleanedOverride.substring(0, 50) + '...');
      }

      // Add preset tags (these are user-chosen directives, not style boilerplate)
      if (presets?.pose) promptParts.push(presets.pose);
      if (presets?.expression) promptParts.push(presets.expression);
      if (presets?.outfit) promptParts.push(presets.outfit);
      if (presets?.camera) promptParts.push(presets.camera);

    } else {
      // === T2I (Exploration Mode) ===
      // No visual anchor — style tags establish quality.
      promptParts.push('masterpiece', 'best quality', 'photorealistic');

      if (gender === 'male') {
        promptParts.push('1boy', 'handsome man', 'portrait');
      } else if (gender === 'female') {
        promptParts.push('1girl', 'beautiful woman', 'portrait');
      } else {
        promptParts.push('1person', 'portrait');
      }

      // Add preset tags
      if (presets?.pose) promptParts.push(presets.pose);
      if (presets?.expression) promptParts.push(presets.expression);
      if (presets?.outfit) promptParts.push(presets.outfit);
      if (presets?.camera) promptParts.push(presets.camera);

      // Appearance tags
      if (character.appearance_tags?.length) {
        promptParts.push(...character.appearance_tags.slice(0, 8));
      }

      // User prompt override
      if (promptOverride && typeof promptOverride === 'string' && promptOverride.trim()) {
        const cleanedOverride = promptOverride.trim().slice(0, 200);
        promptParts.push(cleanedOverride);
        console.log('📝 T2I promptOverride:', cleanedOverride.substring(0, 50) + '...');
      }

      // Quality enhancers (T2I only)
      promptParts.push('studio photography', 'professional lighting', 'sharp focus', 'detailed face');
    }

    const prompt = promptParts.join(', ');

    console.log('🎨 Character portrait generation:', {
      characterId: characterId || 'new',
      prompt: prompt.substring(0, 150) + '...',
      isI2I,
      model: apiModel.model_key
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
        model_type: 'sdxl',
        format: 'image',
        metadata: {
          type: 'character_portrait',
          destination: 'character_portrait',
          character_id: characterId,
          character_name: character.name,
          generation_mode: isI2I ? 'i2i' : 'txt2img',
          generation_intent: generationIntent,
          content_rating: effectiveContentRating,
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

    // Build fal.ai input
    const modelInput: Record<string, any> = {
      prompt,
      ...(apiModel.input_defaults || {})
    };

    // Determine batch count: cap against model's max from input_schema
    const capabilities = apiModel.capabilities as Record<string, any> || {};
    const inputSchema = capabilities.input_schema || {};
    const modelMaxImages = inputSchema?.num_images?.max || 1;
    const requestedImages = Math.min(Math.max(1, numImages || 1), 4, modelMaxImages);
    if (requestedImages > 1 && modelMaxImages > 1) {
      modelInput.num_images = requestedImages;
      console.log(`📸 Batch generation: ${requestedImages} images (model max: ${modelMaxImages})`);
    }

    // Force 3:4 portrait aspect ratio to match frontend display containers
    // Seedream v4.5 requires preset strings for sizes under 2560x1440 pixels
    // "portrait_4_3" generates 4:3 portrait orientation (closest to 3:4 UI tiles)
    modelInput.image_size = 'portrait_4_3';

    // Safety checker based on content
    modelInput.enable_safety_checker = effectiveContentRating !== 'nsfw';

    // I2I: Add reference image and strength
    if (isI2I && referenceImageUrl) {
      // Map user-facing referenceStrength to fal.ai prompt_strength (inverse)
      // referenceStrength 0.8 = strong ref = low prompt influence = prompt_strength 0.2
      // Default to 0.75 for I2I directing mode (was 0.65) — reference should dominate
      const effectiveRefStrength = typeof referenceStrength === 'number' ? referenceStrength : 0.75;
      const promptStrength = Math.round((1 - effectiveRefStrength) * 100) / 100;
      modelInput.prompt_strength = promptStrength;
      console.log(`🎛️ Reference strength: ${effectiveRefStrength} → prompt_strength: ${promptStrength}`);
      let finalImageUrl = referenceImageUrl;

      // Sign if it's a storage path
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
          finalImageUrl = signed.signedUrl;
          console.log('🔏 Signed reference image URL');
        }
      }

      // Check model's input_schema to determine image field name
      const caps = apiModel.capabilities as Record<string, any> || {};
      const inputSchema = caps.input_schema || {};
      const requiresArray = caps.requires_image_urls_array === true;

      if (requiresArray || inputSchema?.image_urls) {
        modelInput.image_urls = [finalImageUrl];
      } else {
        modelInput.image_url = finalImageUrl;
      }
    }

    // Call fal.ai using synchronous endpoint (no polling needed)
    const modelKey = apiModel.model_key;
    const startTime = Date.now();
    const falEndpoint = `https://fal.run/${modelKey}`;

    console.log('📤 Calling fal.ai (sync):', falEndpoint);

    // Update job as processing
    await supabase
      .from('jobs')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', jobData.id);

    const falResponse = await fetch(falEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(modelInput)
    });

    const generationTime = Date.now() - startTime;
    console.log(`⏱️ Generation completed in ${generationTime}ms`);

    if (!falResponse.ok) {
      const errorText = await falResponse.text();
      console.error('❌ fal.ai error:', falResponse.status, errorText);

      await supabase
        .from('jobs')
        .update({
          status: 'failed',
          error_message: `fal.ai error: ${falResponse.status} - ${errorText.substring(0, 200)}`,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobData.id);

      return new Response(
        JSON.stringify({ error: 'Image generation failed', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await falResponse.json();
    console.log('📥 Result received:', JSON.stringify(result).substring(0, 300));

    // Extract all image URLs from response
    const allImages: string[] = [];
    if (result.images && Array.isArray(result.images)) {
      for (const img of result.images) {
        if (img?.url) allImages.push(img.url);
      }
    } else if (result.image?.url) {
      allImages.push(result.image.url);
    } else if (result.output?.url) {
      allImages.push(result.output.url);
    }

    if (allImages.length === 0) {
      console.error('❌ No image URL in response. Keys:', Object.keys(result));

      await supabase
        .from('jobs')
        .update({
          status: 'failed',
          error_message: `No image URL in response: ${JSON.stringify(result).substring(0, 200)}`,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobData.id);

      return new Response(
        JSON.stringify({ error: 'No image returned from generation', resultKeys: Object.keys(result) }),
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
          batch_count: processedImages.length
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
      batchCount: processedImages.length
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
