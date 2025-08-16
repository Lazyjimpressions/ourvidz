
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CallbackPayload {
  jobId: string;
  userId: string;
  status: 'completed' | 'failed';
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
  completedAt?: string;
  metadata?: any;
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

    // Validate required fields
    if (!payload.jobId || !payload.userId || !payload.status) {
      return new Response('Missing required fields: jobId, userId, status', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    // Get the job to validate and get context
    const { data: job, error: jobError } = await supabaseClient
      .from('jobs')
      .select('*')
      .eq('id', payload.jobId)
      .eq('user_id', payload.userId)
      .single()

    if (jobError || !job) {
      console.error('Job not found:', jobError)
      return new Response('Job not found', { status: 404, headers: corsHeaders })
    }

    const completedAt = payload.completedAt || new Date().toISOString()

    // Update job status
    const { error: updateError } = await supabaseClient
      .from('jobs')
      .update({
        status: payload.status,
        completed_at: completedAt,
        error_message: payload.errorMessage,
        metadata: {
          ...job.metadata,
          ...payload.metadata
        }
      })
      .eq('id', payload.jobId)

    if (updateError) {
      console.error('Failed to update job:', updateError)
      return new Response('Failed to update job', { status: 500, headers: corsHeaders })
    }

    // If successful, create workspace assets
    if (payload.status === 'completed' && payload.results?.assets) {
      for (const asset of payload.results.assets) {
        const { error: assetError } = await supabaseClient
          .from('workspace_assets')
          .insert({
            user_id: payload.userId,
            job_id: payload.jobId,
            asset_type: asset.assetType,
            temp_storage_path: asset.tempStoragePath,
            file_size_bytes: asset.fileSizeBytes,
            mime_type: asset.mimeType,
            duration_seconds: asset.durationSeconds,
            asset_index: asset.assetIndex || 0,
            generation_seed: job.metadata?.seed || Math.floor(Math.random() * 1000000),
            original_prompt: job.prompt,
            model_used: job.model_type || 'unknown',
            generation_settings: {
              quality: job.quality,
              format: job.format,
              enhanced_prompt: job.enhanced_prompt,
              reference_image_url: job.metadata?.reference_image_url,
              reference_strength: job.metadata?.reference_strength,
              ...payload.metadata
            }
          })

        if (assetError) {
          console.error('Failed to create workspace asset:', assetError)
          // Don't fail the entire callback, just log the error
        }
      }

      console.log(`✅ Job ${payload.jobId} completed with ${payload.results.assets.length} assets`)
    } else if (payload.status === 'failed') {
      console.log(`❌ Job ${payload.jobId} failed: ${payload.errorMessage}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        jobId: payload.jobId,
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
