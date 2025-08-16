
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CallbackPayload {
  // Legacy format support
  jobId?: string;
  userId?: string;
  status: 'completed' | 'failed' | 'processing';
  results?: {
    assets: Array<{
      assetType: 'image' | 'video';
      tempStoragePath: string;
      fileSizeBytes: number;
      mimeType: string;
      durationSeconds?: number;
      assetIndex?: number;
    }>;
  };
  errorMessage?: string;
  error_message?: string; // Alternative error key
  error?: string; // Another alternative
  completedAt?: string;
  
  // New SDXL worker format support
  job_id?: string;
  worker_id?: string;
  assets?: Array<{
    type: 'image' | 'video';
    url: string;
    metadata?: {
      width?: number;
      height?: number;
      format?: string;
      batch_size?: number;
      steps?: number;
      guidance_scale?: number;
      seed?: number;
    };
  }>;
  metadata?: {
    enhancement_source?: string;
    compel_enhancement?: boolean;
    reference_mode?: string;
    processing_time?: number;
    vram_used?: number;
    error_type?: string; // From SDXL worker logs
    [key: string]: any;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload: CallbackPayload = await req.json()
    
    // Log the incoming payload for debugging
    console.log(`🔍 Callback received for job: ${payload.job_id || payload.jobId}`, {
      status: payload.status,
      hasAssets: !!(payload.assets || payload.results?.assets),
      errorMessage: payload.errorMessage || payload.error_message || payload.error,
      metadata: payload.metadata
    })

    // Normalize payload fields (support both legacy and new formats)
    const jobId = payload.job_id || payload.jobId;
    const userId = payload.userId; // Extract from job if not provided
    
    // Normalize error message from various possible keys
    const errorMessage = payload.errorMessage || payload.error_message || payload.error || 
                        (payload.metadata?.error_type ? `${payload.metadata.error_type}: Internal processing error` : null);
    
    // Validate required fields
    if (!jobId || !payload.status) {
      return new Response('Missing required fields: job_id/jobId, status', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    // Get the job to validate and get context
    const { data: job, error: jobError } = await supabaseClient
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      console.error('Job not found:', jobError)
      return new Response('Job not found', { status: 404, headers: corsHeaders })
    }

    // Use job's user_id if not provided in payload
    const finalUserId = userId || job.user_id;

    const completedAt = payload.completedAt || new Date().toISOString()

    // Update job status
    const { error: updateError } = await supabaseClient
      .from('jobs')
      .update({
        status: payload.status,
        completed_at: completedAt,
        error_message: errorMessage,
        metadata: {
          ...job.metadata,
          ...payload.metadata,
          // Store callback details for debugging
          callback_received_at: new Date().toISOString(),
          original_error_keys: {
            errorMessage: payload.errorMessage,
            error_message: payload.error_message,
            error: payload.error
          }
        }
      })
      .eq('id', jobId)

    if (updateError) {
      console.error('Failed to update job:', updateError)
      return new Response('Failed to update job', { status: 500, headers: corsHeaders })
    }

    // If successful, create workspace assets (support both legacy and new formats)
    if (payload.status === 'completed') {
      let assetsToCreate = [];
      
      // Handle legacy format
      if (payload.results?.assets) {
        assetsToCreate = payload.results.assets.map((asset, index) => ({
          user_id: finalUserId,
          job_id: jobId,
          asset_type: asset.assetType,
          temp_storage_path: asset.tempStoragePath,
          file_size_bytes: asset.fileSizeBytes,
          mime_type: asset.mimeType,
          duration_seconds: asset.durationSeconds,
          asset_index: asset.assetIndex || index,
          generation_seed: job.metadata?.seed || Math.floor(Math.random() * 1000000),
          original_prompt: job.original_prompt || job.prompt,
          model_used: job.model_type || 'unknown',
          generation_settings: {
            quality: job.quality,
            format: job.format,
            enhanced_prompt: job.enhanced_prompt,
            reference_image_url: job.metadata?.reference_image_url,
            reference_strength: job.metadata?.reference_strength,
            ...payload.metadata
          }
        }));
      }
      
      // Handle new SDXL worker format
      if (payload.assets) {
        assetsToCreate = payload.assets.map((asset, index) => ({
          user_id: finalUserId,
          job_id: jobId,
          asset_type: asset.type,
          temp_storage_path: asset.url, // URL from new format
          file_size_bytes: 0, // Will be updated when file is processed
          mime_type: asset.type === 'image' ? 'image/png' : 'video/mp4',
          duration_seconds: asset.type === 'video' ? 5 : undefined,
          asset_index: index,
          generation_seed: asset.metadata?.seed || job.metadata?.seed || Math.floor(Math.random() * 1000000),
          original_prompt: job.original_prompt || job.prompt,
          model_used: job.model_type || 'sdxl',
          generation_settings: {
            quality: job.quality,
            format: job.format,
            enhanced_prompt: job.enhanced_prompt,
            reference_image_url: job.metadata?.reference_image_url,
            reference_strength: job.metadata?.reference_strength,
            width: asset.metadata?.width,
            height: asset.metadata?.height,
            steps: asset.metadata?.steps,
            guidance_scale: asset.metadata?.guidance_scale,
            batch_size: asset.metadata?.batch_size,
            ...payload.metadata
          }
        }));
      }

      // Create workspace assets
      for (const assetData of assetsToCreate) {
        const { error: assetError } = await supabaseClient
          .from('workspace_assets')
          .insert(assetData)

        if (assetError) {
          console.error('Failed to create workspace asset:', assetError)
          // Don't fail the entire callback, just log the error
        }
      }

      console.log(`✅ Job ${jobId} completed with ${assetsToCreate.length} assets`)
    } else if (payload.status === 'failed') {
      console.log(`❌ Job ${jobId} failed:`, {
        errorMessage: errorMessage,
        errorType: payload.metadata?.error_type,
        rawPayload: {
          errorMessage: payload.errorMessage,
          error_message: payload.error_message,
          error: payload.error
        }
      })
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        jobId: jobId,
        status: payload.status,
        message: 'Callback processed successfully'
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      },
    )

  } catch (error) {
    console.error('Job callback error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      },
    )
  }
})
