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
      enhancement_only = false,
      quality = 'fast',
      reference_images = [],
      generation_settings = {},
      // Enhancement-specific parameters
      jobType,
      format,
      selectedModel = 'qwen_base',
      selectedPresets = []
    } = await req.json();

    console.log('Generate content request:', { 
      user_id: user.id, 
      model, 
      quantity, 
      enhance_prompt,
      prompt_length: prompt?.length 
    });

    // Validate input
    if (!prompt || (!enhancement_only && !model)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: prompt' + (enhancement_only ? '' : ', model') }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Handle enhancement-only mode
    if (enhancement_only) {
      try {
        const enhancementResult = await enhancePromptDirect(prompt, {
          jobType,
          format,
          quality,
          selectedModel,
          selectedPresets
        });
        
        return new Response(
          JSON.stringify(enhancementResult),
          { headers: corsHeaders }
        );
      } catch (enhanceError) {
        console.error('Enhancement-only mode failed:', enhanceError);
        return new Response(
          JSON.stringify({ 
            error: 'Enhancement failed', 
            details: enhanceError.message 
          }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // 2. Enhance prompt if requested for generation
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

    // 3. Create job record
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

    // 4. Send to appropriate worker with correct worker_type
    const workerType = await mapModelToWorkerType(model, false);
    const workerUrl = await getWorkerUrl(workerType);
    if (!workerUrl) {
      return new Response(
        JSON.stringify({ error: `No available worker for type: ${workerType}` }),
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
  // Direct enhancement without calling external edge function
  return await enhancePromptDirect(prompt, {
    jobType: model.includes('video') ? 'video_fast' : 'image_fast',
    format: model.includes('video') ? 'video' : 'image',
    quality: 'fast',
    selectedModel: 'qwen_base'
  });
}

async function mapModelToWorkerType(model: string, enhancementOnly: boolean): Promise<string> {
  if (enhancementOnly) return 'chat';
  if (model.includes('sdxl')) return 'sdxl';
  return 'wan';
}

async function enhancePromptDirect(prompt: string, params: {
  jobType?: string;
  format?: string;
  quality?: string;
  selectedModel?: string;
  selectedPresets?: string[];
}): Promise<any> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    // Get active chat worker URL with correct worker_type
    const { data: workerData, error: workerError } = await supabase.functions.invoke('get-active-worker-url', {
      body: { worker_type: 'chat' }
    });

    if (workerError || !workerData?.worker_url) {
      throw new Error('No chat worker available for enhancement');
    }

    const workerUrl = workerData.worker_url;
    
    // Prepare enhancement payload
    const enhancementPayload = {
      prompt: prompt.trim(),
      job_type: params.jobType || 'image_fast',
      format: params.format || 'image',
      quality: params.quality || 'fast',
      selected_model: params.selectedModel || 'qwen_base',
      selected_presets: params.selectedPresets || [],
      enhancement_only: true
    };

    console.log('Direct enhancement request:', { workerUrl, prompt: prompt.substring(0, 50) + '...', params });

    // Call chat worker directly for enhancement
    const workerResponse = await fetch(`${workerUrl}/enhance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('CHAT_WORKER_API_KEY')}`
      },
      body: JSON.stringify(enhancementPayload)
    });

    if (!workerResponse.ok) {
      throw new Error(`Worker responded with status: ${workerResponse.status}`);
    }

    const result = await workerResponse.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Enhancement failed');
    }

    return {
      success: true,
      original_prompt: prompt,
      enhanced_prompt: result.enhanced_prompt || result.enhancedPrompt,
      enhancement_metadata: result.enhancement_metadata || {
        original_length: prompt.length,
        enhanced_length: (result.enhanced_prompt || result.enhancedPrompt || '').length,
        expansion_percentage: Math.round(((result.enhanced_prompt || result.enhancedPrompt || '').length / prompt.length) * 100).toString(),
        job_type: params.jobType || 'image_fast',
        format: params.format || 'image',
        quality: params.quality || 'fast',
        is_sdxl: (params.jobType || '').includes('sdxl'),
        is_video: (params.format || '').includes('video'),
        enhancement_strategy: 'unified_system',
        model_used: params.selectedModel || 'qwen_base',
        token_count: Math.ceil(prompt.split(/\s+/).length * 0.75),
        compression_applied: false,
        version: '3.0'
      }
    };
    
  } catch (error) {
    console.error('Direct enhancement error:', error);
    throw error;
  }
}

async function getWorkerUrl(workerType: string): Promise<string | null> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { data, error } = await supabase.functions.invoke('get-active-worker-url', {
      body: { worker_type: workerType }
    });

    if (error) throw error;
    return data?.worker_url || null;
    
  } catch (error) {
    console.error('Failed to get worker URL:', error);
    return null;
  }
}