import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export default async function handler(req: Request) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const { 
      prompt, 
      model, 
      quantity = 1, 
      enhance_prompt = false,
      quality = 'fast',
      reference_images = [],
      generation_settings = {}
    } = await req.json();

    console.log('Generate content request:', { 
      user_id: user.id, 
      model, 
      quantity, 
      enhance_prompt,
      prompt_length: prompt?.length 
    });

    // Validate input
    if (!prompt || !model) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: prompt, model' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Enhance prompt if requested
    let finalPrompt = prompt;
    if (enhance_prompt) {
      try {
        finalPrompt = await enhancePromptWithChatWorker(prompt, model);
        console.log('Prompt enhanced successfully');
      } catch (enhanceError) {
        console.error('Prompt enhancement failed:', enhanceError);
        // Continue with original prompt if enhancement fails
      }
    }

    // 2. Create job record
    const jobId = crypto.randomUUID();
    const { error: jobError } = await supabase
      .from('jobs')
      .insert({
        id: jobId,
        user_id: user.id,
        job_type: model.includes('video') ? 'video_generation' : 'image_generation',
        status: 'queued',
        original_prompt: prompt,
        enhanced_prompt: finalPrompt,
        model_type: model,
        quality: quality,
        destination: 'workspace',
        metadata: {
          quantity,
          reference_images,
          generation_settings
        }
      });

    if (jobError) {
      console.error('Failed to create job:', jobError);
      return new Response(
        JSON.stringify({ error: 'Failed to create job', details: jobError.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    // 3. Send to appropriate worker
    const workerUrl = await getWorkerUrl(model);
    if (!workerUrl) {
      return new Response(
        JSON.stringify({ error: 'No available worker for model: ' + model }),
        { status: 503, headers: corsHeaders }
      );
    }

    const workerPayload = {
      job_id: jobId,
      user_id: user.id,
      prompt: finalPrompt,
      model: model,
      quantity: quantity,
      quality: quality,
      reference_images: reference_images,
      generation_settings: generation_settings,
      callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/generation-complete`
    };

    try {
      const workerResponse = await fetch(`${workerUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('WAN_WORKER_API_KEY')}`
        },
        body: JSON.stringify(workerPayload)
      });

      if (!workerResponse.ok) {
        throw new Error(`Worker responded with status: ${workerResponse.status}`);
      }

      console.log('Job sent to worker successfully');
      
    } catch (workerError) {
      console.error('Failed to send job to worker:', workerError);
      
      // Update job status to failed
      await supabase
        .from('jobs')
        .update({ 
          status: 'failed',
          error_message: workerError.message 
        })
        .eq('id', jobId);

      return new Response(
        JSON.stringify({ error: 'Failed to queue job', details: workerError.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        job_id: jobId,
        status: 'queued',
        enhanced_prompt: enhance_prompt ? finalPrompt : undefined
      }),
      { headers: corsHeaders }
    );
    
  } catch (error) {
    console.error('Generate content error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Generation failed', 
        details: error.message 
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}

async function enhancePromptWithChatWorker(prompt: string, model: string): Promise<string> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { data, error } = await supabase.functions.invoke('enhance-prompt', {
      body: { 
        prompt: prompt,
        model: model,
        use_case: 'generation'
      }
    });

    if (error) throw error;
    return data?.enhanced_prompt || prompt;
    
  } catch (error) {
    console.error('Prompt enhancement error:', error);
    return prompt; // Return original on failure
  }
}

async function getWorkerUrl(model: string): Promise<string | null> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { data, error } = await supabase.functions.invoke('get-active-worker-url', {
      body: { model_type: model }
    });

    if (error) throw error;
    return data?.worker_url || null;
    
  } catch (error) {
    console.error('Failed to get worker URL:', error);
    return null;
  }
}