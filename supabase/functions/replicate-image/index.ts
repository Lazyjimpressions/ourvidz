
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

    // Get API model configuration
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
        console.error('❌ API model not found:', modelError);
        return new Response(
          JSON.stringify({ error: 'API model not found or inactive' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
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
        model_type: apiModel?.model_family || 'SDXL',
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

    // Prepare model input using API model configuration
    let modelInput;
    let modelIdentifier;
    
    if (apiModel) {
      console.log(`🎨 Generating with configured model: ${apiModel.display_name} (${apiModel.model_key})`);
      
      // Start with defaults from API model configuration
      modelInput = {
        prompt: body.prompt,
        ...apiModel.input_defaults
      };
      
      // Map control inputs to RV5.1's expected parameter names
      if (body.input) {
        // Map steps (UI uses 'steps', RV5.1 uses 'steps')
        if (body.input.steps !== undefined) {
          modelInput.steps = Math.min(Math.max(body.input.steps, 1), 100);
        }
        
        // Map guidance (UI uses 'guidance_scale', RV5.1 uses 'guidance')  
        if (body.input.guidance_scale !== undefined) {
          modelInput.guidance = Math.min(Math.max(body.input.guidance_scale, 3.5), 7);
        }
        
        // Map dimensions (UI uses 'width'/'height', RV5.1 uses 'width'/'height')
        if (body.input.width !== undefined) {
          modelInput.width = Math.min(Math.max(body.input.width, 64), 1920);
        }
        if (body.input.height !== undefined) {
          modelInput.height = Math.min(Math.max(body.input.height, 64), 1920);
        }
        
        // Map negative prompt (UI uses 'negative_prompt', RV5.1 uses 'negative_prompt')
        if (body.input.negative_prompt !== undefined) {
          modelInput.negative_prompt = body.input.negative_prompt;
        }
        
        // Map seed (UI uses 'seed', RV5.1 uses 'seed')
        if (body.input.seed !== undefined) {
          modelInput.seed = Math.min(Math.max(body.input.seed, 0), 2147483647);
        }
        
        // Map scheduler (UI uses 'scheduler', RV5.1 uses 'scheduler')
        if (body.input.scheduler !== undefined && ['EulerA', 'MultistepDPM-Solver'].includes(body.input.scheduler)) {
          modelInput.scheduler = body.input.scheduler;
        }
      }
      
      modelIdentifier = apiModel.model_key;
      if (apiModel.version) {
        modelIdentifier = `${apiModel.model_key}:${apiModel.version}`;
      }
    } else {
      console.log('🎨 Generating with fallback model configuration');
      const fallbackModel = 'lucataco/realistic-vision-v5.1';
      const fallbackVersion = '2c8e954decbf70b7607a4414e5785ef9e4de4b8c51d50fb8b8b349160e0ef6bb';
      modelIdentifier = `${fallbackModel}:${fallbackVersion}`;
      
      // Use minimal, safe input for fallback model
      modelInput = {
        prompt: body.prompt,
        steps: 20,
        guidance: 5,
        width: 1024,
        height: 1024,
        scheduler: 'EulerA'
      };
      
      // Only add negative_prompt if provided
      if (body.input?.negative_prompt) {
        modelInput.negative_prompt = body.input.negative_prompt;
      }
    }

    console.log('🔧 Model input configuration:', modelInput);

    // Create prediction with webhook
    const webhookUrl = `${supabaseUrl}/functions/v1/replicate-webhook`;
    
    console.log('🔧 Creating prediction with model:', modelIdentifier);
    console.log('🔧 Model input:', JSON.stringify(modelInput, null, 2));

    try {
      const prediction = await replicate.predictions.create({
        model: modelIdentifier,
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
      
    } catch (predictionError) {
      console.error("❌ Failed to create Replicate prediction:", predictionError);

      // Mark job as failed
      await supabase
        .from('jobs')
        .update({
          status: 'failed',
          error_message: `Prediction creation failed: ${(predictionError as any).message}`
        })
        .eq('id', jobData.id);

      return new Response(JSON.stringify({ 
        error: `Prediction creation failed: ${(predictionError as any).message}` 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
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
