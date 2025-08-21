
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
      jobId: body.jobId
    });

    // Get API model configuration
    const { data: apiModel, error: modelError } = await supabase
      .from('api_models')
      .select(`
        *,
        api_providers!inner(*)
      `)
      .eq('id', body.apiModelId)
      .eq('is_active', true)
      .single();

    if (modelError || !apiModel) {
      console.error('❌ API model not found:', modelError);
      return new Response(
        JSON.stringify({ error: 'API model not found or inactive' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Verify it's a Replicate provider
    if (apiModel.api_providers.name !== 'replicate') {
      console.error('❌ Invalid provider for replicate-image function:', apiModel.api_providers.name);
      return new Response(
        JSON.stringify({ error: 'Invalid provider for this function' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get Replicate API key from provider secret configuration
    const replicateApiKey = Deno.env.get(apiModel.api_providers.secret_name);
    if (!replicateApiKey) {
      console.error('❌ Replicate API key not configured:', apiModel.api_providers.secret_name);
      return new Response(
        JSON.stringify({ error: 'API provider not configured' }),
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

    // Generate image with model configuration
    if (!body.prompt) {
      return new Response(
        JSON.stringify({ error: "Missing required field: prompt" }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log(`🎨 Generating with model: ${apiModel.display_name} (${apiModel.model_key})`);

    // Prepare input with defaults from api_model configuration
    const modelInput = {
      prompt: body.prompt,
      ...apiModel.input_defaults,
      // Allow request to override defaults
      ...body.input
    };

    console.log('🔧 Model input configuration:', modelInput);

    // Run prediction with configured model
    let modelIdentifier = apiModel.model_key;
    if (apiModel.version) {
      modelIdentifier = `${apiModel.model_key}:${apiModel.version}`;
    }

    const output = await replicate.run(modelIdentifier, { input: modelInput });

    console.log("✅ Generation response:", { 
      modelUsed: modelIdentifier,
      outputType: typeof output,
      hasOutput: !!output 
    });

    // Update job with model information
    if (body.jobId) {
      await supabase
        .from('jobs')
        .update({
          api_model_id: apiModel.id,
          model_type: apiModel.model_family || apiModel.display_name.toLowerCase(),
          metadata: {
            actual_model: modelIdentifier,
            model_display_name: apiModel.display_name,
            provider: apiModel.api_providers.display_name,
            input_used: modelInput
          }
        })
        .eq('id', body.jobId);
    }

    return new Response(JSON.stringify({ output }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("❌ Error in replicate function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
