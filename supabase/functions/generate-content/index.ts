import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  console.log(`🔥 Generate-content: ${req.method} ${req.url}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight handled');
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

    // 3. Create job record with format-based job_type
    const jobId = crypto.randomUUID();
    
    // Map format to proper job_type
    let mappedJobType = 'image_generation';
    if (format === 'video') {
      mappedJobType = quality === 'high' ? 'video_high' : 'video_fast';
    } else if (format === 'image') {
      if (model.includes('sdxl')) {
        mappedJobType = quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast';
      } else {
        mappedJobType = quality === 'high' ? 'image_high' : 'image_fast';
      }
    }
    
    const { error: jobError } = await supabase
      .from('jobs')
      .insert({
        id: jobId,
        user_id: user.id,
        job_type: mappedJobType,
        status: 'queued',
        original_prompt: prompt,
        enhanced_prompt: finalPrompt,
        model_type: model,
        quality: quality,
        format: format,
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

    // 4. Get worker info with capabilities
    const workerType = await mapModelToWorkerType(model, false);
    const workerInfo = await getWorkerInfo(workerType);
    
    // If no dedicated worker available, try fallback
    if (!workerInfo && workerType !== 'wan') {
      console.log(`⚠️ No ${workerType} worker available, falling back to wan worker`);
      const fallbackInfo = await getWorkerInfo('wan');
      if (fallbackInfo) {
        workerInfo = fallbackInfo;
      }
    }
    
    if (!workerInfo) {
      throw new Error(`No active worker available (tried: ${workerType}${workerType !== 'wan' ? ', wan' : ''})`);
    }
    
    console.log(`✅ Using ${workerType} worker: ${workerInfo.worker_url}`);
    console.log(`🔧 Worker capabilities:`, workerInfo.workerCapabilities || {});
    console.log(`📍 Supported endpoints:`, workerInfo.supportedEndpoints || []);

    const workerPayload = {
      job_id: jobId,
      user_id: user.id,
      prompt: finalPrompt,
      model: model,
      format: format,
      quality: quality,
      quantity: quantity,
      reference_images: reference_images,
      generation_settings: generation_settings,
      callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/generation-complete`
    };

    try {
      const success = await dispatchToWorker(workerInfo, workerPayload);
      
      if (!success) {
        throw new Error('All worker endpoints failed');
      }

      console.log('✅ Worker dispatch successful');
      
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
        JSON.stringify({ 
          error: 'Failed to queue job', 
          details: workerError.message,
          worker_type: workerType,
          worker_url: workerInfo?.worker_url 
        }),
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
});

async function enhancePromptWithChatWorker(prompt: string, model: string): Promise<string> {
  // Direct enhancement without calling external edge function
  return await enhancePromptDirect(prompt, {
    jobType: model.includes('video') ? 'video_fast' : 'image_fast',
    format: model.includes('video') ? 'video' : 'image',
    quality: 'fast',
    selectedModel: 'qwen_base'
  });
}

// Helper function to map models to worker types
const mapModelToWorkerType = async (model: string, enhancementOnly: boolean): Promise<string> => {
  if (enhancementOnly) return 'chat';
  
  // Route both SDXL and WAN models to 'wan' for now until distinct SDXL worker is configured
  switch (model.toLowerCase()) {
    case 'sdxl':
    case 'wan':
    default:
      return 'wan';
  }
};

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
    
    // Prepare enhancement payload in messages format (required by chat worker)
    const enhancementPayload = {
      messages: [
        {
          role: 'system',
          content: 'You are a prompt enhancement assistant. Enhance the given prompt for image generation.'
        },
        {
          role: 'user',
          content: prompt.trim()
        }
      ],
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
      const errorText = await workerResponse.text().catch(() => 'No error details');
      console.error(`❌ Chat worker enhancement failed: ${workerResponse.status} ${workerResponse.statusText}`, errorText);
      throw new Error(`Worker responded with status: ${workerResponse.status}${errorText ? ` - ${errorText}` : ''}`);
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

// Helper function to get worker info with capabilities
async function getWorkerInfo(workerType: string): Promise<any | null> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { data, error } = await supabase.functions.invoke('get-active-worker-url', {
      body: { worker_type: workerType }
    });

    if (error || !data?.success) {
      console.error(`Failed to get ${workerType} worker info:`, error);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`Error getting ${workerType} worker info:`, error);
    return null;
  }
}

// Robust worker dispatch with endpoint fallbacks
async function dispatchToWorker(workerInfo: any, payload: any): Promise<boolean> {
  const { worker_url, supportedEndpoints = [] } = workerInfo;
  
  // Define fallback endpoints in order of preference
  const fallbackEndpoints = supportedEndpoints.length > 0 
    ? supportedEndpoints 
    : ['/generate', '/api/generate', '/v1/generate'];
  
  for (const endpoint of fallbackEndpoints) {
    const fullUrl = `${worker_url}${endpoint}`;
    console.log(`🔄 Trying worker endpoint: ${fullUrl}`);
    
    try {
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('WAN_WORKER_API_KEY')}`
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Success on ${endpoint}:`, result);
        return true;
      } else {
        const errorText = await response.text().catch(() => 'No error details');
        console.error(`❌ Worker dispatch failed on ${endpoint}: ${response.status} ${response.statusText}`, errorText);
        
        // If it's a 404, try next endpoint
        if (response.status === 404) {
          console.log(`⚠️ 404 on ${endpoint}, trying next endpoint...`);
          continue;
        } else {
          // For other errors, don't continue trying
          break;
        }
      }
    } catch (fetchError) {
      console.error(`❌ Network error on ${endpoint}:`, fetchError.message);
      continue;
    }
  }
  
  return false;
}