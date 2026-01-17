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
      characterData // For new characters not yet saved
    } = body;

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
          character_id: characterId,
          generation_mode: isI2I ? 'i2i' : 'txt2img',
          content_rating: effectiveContentRating,
          presets
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

    // Call fal.ai
    const modelKey = apiModel.model_key;
    const startTime = Date.now();

    const falResponse = await fetch(`https://queue.fal.run/${modelKey}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(modelInput)
    });

    if (!falResponse.ok) {
      const errorText = await falResponse.text();
      console.error('❌ fal.ai queue error:', falResponse.status, errorText);

      await supabase
        .from('jobs')
        .update({
          status: 'failed',
          error_message: `fal.ai error: ${falResponse.status}`,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobData.id);

      return new Response(
        JSON.stringify({ error: 'Image generation failed', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const queueResult = await falResponse.json();
    const requestId = queueResult.request_id;
    console.log('📋 fal.ai request queued:', requestId);

    // Poll for result (with timeout)
    let imageUrl: string | null = null;
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds max

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;

      const statusResponse = await fetch(
        `https://queue.fal.run/${modelKey}/requests/${requestId}/status`,
        {
          headers: { 'Authorization': `Key ${falApiKey}` }
        }
      );

      if (!statusResponse.ok) continue;

      const status = await statusResponse.json();

      if (status.status === 'COMPLETED') {
        // Get result
        const resultResponse = await fetch(
          `https://queue.fal.run/${modelKey}/requests/${requestId}`,
          {
            headers: { 'Authorization': `Key ${falApiKey}` }
          }
        );

        if (resultResponse.ok) {
          const result = await resultResponse.json();
          imageUrl = result.images?.[0]?.url || result.image?.url;
          console.log('✅ Generation completed:', imageUrl?.substring(0, 60));
          break;
        }
      } else if (status.status === 'FAILED') {
        console.error('❌ Generation failed:', status.error);
        break;
      }
    }

    const generationTime = Date.now() - startTime;

    if (!imageUrl) {
      await supabase
        .from('jobs')
        .update({
          status: 'failed',
          error_message: 'Generation timed out or failed',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobData.id);

      return new Response(
        JSON.stringify({ error: 'Image generation timed out' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
          result_url: imageUrl
        }
      })
      .eq('id', jobData.id);

    // Insert into character_portraits table
    let portraitId: string | null = null;
    if (characterId) {
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
          image_url: imageUrl,
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
            job_id: jobData.id
          }
        })
        .select()
        .single();

      if (portraitError) {
        console.error('⚠️ Failed to insert portrait:', portraitError);
      } else {
        portraitId = portraitData.id;
        console.log('✅ Portrait inserted:', portraitId, 'isPrimary:', isFirstPortrait);
      }

      // Update character image_url if this is the first portrait
      if (isFirstPortrait) {
        const { error: updateError } = await supabase
          .from('characters')
          .update({
            image_url: imageUrl,
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

    return new Response(JSON.stringify({
      success: true,
      imageUrl,
      jobId: jobData.id,
      generationTimeMs: generationTime
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
