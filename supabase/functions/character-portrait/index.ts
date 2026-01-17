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
      characterData, // For new characters not yet saved
      promptOverride // User-typed prompt from Character Studio prompt bar
    } = body;
    
    console.log('📥 character-portrait request:', {
      characterId,
      hasPresets: !!presets,
      hasReferenceImage: !!referenceImageUrl,
      apiModelId,
      hasCharacterData: !!characterData,
      promptOverrideLength: promptOverride?.length || 0
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

    // Build portrait prompt
    const promptParts: string[] = ['masterpiece', 'best quality', 'photorealistic'];
    
    // Gender-aware base
    const gender = character.gender?.toLowerCase() || 'unspecified';
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

    // Add appearance tags (limit to avoid token overflow)
    if (character.appearance_tags?.length) {
      promptParts.push(...character.appearance_tags.slice(0, 8));
    }

    // ===== PROMPT OVERRIDE: User-typed prompt from Character Studio =====
    // This allows users to influence generation with their own descriptions
    if (promptOverride && typeof promptOverride === 'string' && promptOverride.trim()) {
      // Cap at 200 chars to avoid overwhelming the base prompt
      const cleanedOverride = promptOverride.trim().slice(0, 200);
      promptParts.push(cleanedOverride);
      console.log('📝 Added promptOverride:', cleanedOverride.substring(0, 50) + '...');
    }

    // I2I identity preservation
    if (isI2I) {
      promptParts.push('maintain same character identity', 'consistent features');
    }

    // Quality enhancers
    promptParts.push('studio photography', 'professional lighting', 'sharp focus', 'detailed face');

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

    // Safety checker based on content
    modelInput.enable_safety_checker = effectiveContentRating !== 'nsfw';

    // I2I: Add reference image
    if (isI2I && referenceImageUrl) {
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

      // Check model capabilities for array vs string
      const capabilities = apiModel.capabilities as Record<string, any> || {};
      const requiresArray = capabilities?.requires_image_urls_array === true ||
        apiModel.model_key.includes('edit');

      if (requiresArray) {
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

    // Extract image URL (handle both array and object formats)
    // fal.ai returns: { images: [{ url, content_type, ... }], seed }
    const imageUrl = result.images?.[0]?.url || result.image?.url || result.output?.url;

    if (!imageUrl) {
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

    console.log('🖼️ Image URL extracted:', imageUrl.substring(0, 80) + '...');

    // ========== PHASE 1: UPLOAD TO USER-LIBRARY BUCKET ==========
    console.log('📦 Downloading image from fal.ai for storage...');
    
    let storagePath: string | null = null;
    let libraryImageUrl: string | null = null;
    
    try {
      // Download image from fal.ai
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.status}`);
      }
      
      const imageBlob = await imageResponse.blob();
      const imageBuffer = await imageBlob.arrayBuffer();
      const imageBytes = new Uint8Array(imageBuffer);
      
      console.log(`📥 Downloaded image: ${imageBytes.length} bytes`);
      
      // Generate storage path
      const timestamp = Date.now();
      const charIdPart = characterId || 'new';
      storagePath = `${user.id}/portraits/${charIdPart}_${timestamp}.png`;
      
      // Upload to user-library bucket
      const { error: uploadError } = await supabase.storage
        .from('user-library')
        .upload(storagePath, imageBytes, {
          contentType: 'image/png',
          upsert: false
        });
      
      if (uploadError) {
        console.error('⚠️ Storage upload failed:', uploadError);
        // Continue with fal.ai URL if upload fails
      } else {
        console.log('✅ Uploaded to user-library:', storagePath);
        
        // Generate signed URL for the stored image
        const { data: signedData } = await supabase.storage
          .from('user-library')
          .createSignedUrl(storagePath, 60 * 60 * 24 * 365); // 1 year
        
        if (signedData?.signedUrl) {
          libraryImageUrl = signedData.signedUrl;
          console.log('🔗 Signed URL generated');
        }
      }
    } catch (downloadError) {
      console.error('⚠️ Image download/upload failed:', downloadError);
      // Continue with fal.ai URL
    }
    
    // Use library URL if available, otherwise fall back to fal.ai URL
    const finalImageUrl = libraryImageUrl || imageUrl;

    // ========== PHASE 2: INSERT INTO USER_LIBRARY TABLE ==========
    if (storagePath) {
      console.log('💾 Inserting into user_library table...');
      
      const { error: libraryError } = await supabase
        .from('user_library')
        .insert({
          user_id: user.id,
          asset_type: 'image',
          storage_path: storagePath,
          original_prompt: prompt,
          model_used: apiModel.display_name,
          file_size_bytes: 0, // Will be updated if we know the size
          mime_type: 'image/png',
          tags: ['character', 'portrait', character.name].filter(Boolean),
          content_category: 'character',
          roleplay_metadata: {
            character_id: characterId,
            character_name: character.name,
            type: 'character_portrait',
            generation_mode: isI2I ? 'i2i' : 'txt2img',
            job_id: jobData.id
          }
        });
      
      if (libraryError) {
        console.error('⚠️ user_library insert failed:', libraryError);
      } else {
        console.log('✅ Inserted into user_library');
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
          result_url: finalImageUrl,
          storage_path: storagePath
        }
      })
      .eq('id', jobData.id);

    console.log('✅ Job updated to completed');

    // Insert into character_portraits table
    let portraitId: string | null = null;
    if (characterId) {
      console.log('💾 Inserting into character_portraits...');
      
      // Check if this is the first portrait for this character
      const { count } = await supabase
        .from('character_portraits')
        .select('*', { count: 'exact', head: true })
        .eq('character_id', characterId);

      const isFirstPortrait = (count || 0) === 0;

      const { data: portraitData, error: portraitError } = await supabase
        .from('character_portraits')
        .insert({
          character_id: characterId,
          image_url: finalImageUrl,
          prompt: prompt,
          enhanced_prompt: prompt,
          is_primary: isFirstPortrait, // First portrait becomes primary
          sort_order: count || 0,
          generation_metadata: {
            model: apiModel.display_name,
            model_key: apiModel.model_key,
            generation_mode: isI2I ? 'i2i' : 'txt2img',
            generation_time_ms: generationTime,
            presets,
            job_id: jobData.id,
            storage_path: storagePath
          }
        })
        .select()
        .single();

      if (portraitError) {
        console.error('❌ Failed to insert portrait:', JSON.stringify(portraitError));
      } else {
        portraitId = portraitData.id;
        console.log('✅ Portrait inserted:', portraitId, 'isPrimary:', isFirstPortrait);
      }

      // Update character image_url if this is the first portrait
      if (isFirstPortrait) {
        const { error: updateError } = await supabase
          .from('characters')
          .update({
            image_url: finalImageUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', characterId);

        if (updateError) {
          console.error('⚠️ Failed to update character image:', updateError);
        } else {
          console.log('✅ Character image updated');
        }
      }
    }

    console.log('🎉 Character portrait generation complete!');

    return new Response(JSON.stringify({
      success: true,
      imageUrl: finalImageUrl,
      jobId: jobData.id,
      portraitId,
      generationTimeMs: generationTime,
      storagePath
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
