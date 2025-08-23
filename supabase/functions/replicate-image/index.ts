
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

    // Get API model configuration or use fallback
    let apiModel = null;
    let replicateApiKey = null;
    
    if (body.apiModelId) {
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
        console.error('❌ API model not found, using fallback:', modelError);
      } else if (model.api_providers.name !== 'replicate') {
        console.error('❌ Invalid provider for replicate-image function:', model.api_providers.name);
        return new Response(
          JSON.stringify({ error: 'Invalid provider for this function' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      } else {
        apiModel = model;
        replicateApiKey = Deno.env.get(model.api_providers.secret_name);
      }
    }
    
    // Fallback to environment variables if no model configuration
    if (!replicateApiKey) {
      console.log('🔄 Using fallback Replicate configuration from environment');
      replicateApiKey = Deno.env.get('REPLICATE_API_TOKEN');
      if (!replicateApiKey) {
        console.error('❌ No Replicate API key available');
        return new Response(
          JSON.stringify({ error: 'API provider not configured' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
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

    // Create job first
    const jobType = body.jobType || body.job_type || 'rv51_fast';
    const quality = body.quality || 'fast';
    
    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        job_type: jobType,
        original_prompt: body.prompt,
        status: 'queued',
        quality: quality,
        api_model_id: apiModel?.id || null,
        model_type: apiModel?.model_family || 'rv51',
        format: 'image',
        metadata: {
          ...body.metadata,
          api_model_configured: !!apiModel,
          model_display_name: apiModel?.display_name || 'RV5.1 (fallback)'
        }
      })
      .select()
      .single();

    if (jobError || !jobData) {
      console.error('❌ Failed to create job:', jobError);
      return new Response(
        JSON.stringify({ error: 'Failed to create job' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('✅ Job created:', jobData.id);

    // Prepare model input
    let modelInput;
    let modelIdentifier;
    
    if (apiModel) {
      console.log(`🎨 Generating with configured model: ${apiModel.display_name} (${apiModel.model_key})`);
      modelInput = {
        prompt: body.prompt,
        ...apiModel.input_defaults,
        ...body.input
      };
      modelIdentifier = apiModel.model_key;
      if (apiModel.version) {
        modelIdentifier = `${apiModel.model_key}:${apiModel.version}`;
      }
    } else {
      console.log('🎨 Generating with fallback RV5.1 model');
      const fallbackModel = Deno.env.get('REPLICATE_MODEL_SLUG') || 'lucataco/realistic-vision-v5.1';
      const fallbackVersion = Deno.env.get('REPLICATE_MODEL_VERSION');
      modelIdentifier = fallbackVersion ? `${fallbackModel}:${fallbackVersion}` : fallbackModel;
      modelInput = {
        prompt: body.prompt,
        negative_prompt: "worst quality, low quality, blurry, nsfw",
        num_outputs: 1,
        num_inference_steps: 20,
        guidance_scale: 7.5,
        ...body.input
      };
    }

    console.log('🔧 Model input configuration:', modelInput);

    // Create prediction with webhook
    const webhookUrl = `${supabaseUrl}/functions/v1/replicate-webhook`;
    
    const prediction = await replicate.predictions.create({
      model: modelIdentifier,
      input: modelInput,
      webhook: webhookUrl,
      webhook_events_filter: ["start", "completed"]
    });

    console.log("🚀 Prediction created:", { 
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
          actual_model: modelIdentifier,
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

  } catch (error) {
    console.error("❌ Error in replicate function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
