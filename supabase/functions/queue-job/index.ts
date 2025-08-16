
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface JobRequest {
  prompt: string;
  job_type: 'sdxl_image_fast' | 'sdxl_image_high' | 'wan_video_fast' | 'wan_video_high';
  quality?: 'fast' | 'high';
  format?: string;
  model_type?: string;
  enhanced_prompt?: string;
  reference_image_url?: string;
  reference_strength?: number;
  seed?: number;
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

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Missing authorization', { status: 401, headers: corsHeaders })
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response('Invalid authorization', { status: 401, headers: corsHeaders })
    }

    const jobRequest: JobRequest = await req.json()

    // Validate required fields
    if (!jobRequest.prompt || !jobRequest.job_type) {
      return new Response('Missing required fields: prompt, job_type', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    // Create job record
    const { data: job, error: jobError } = await supabaseClient
      .from('jobs')
      .insert({
        user_id: user.id,
        job_type: jobRequest.job_type,
        status: 'queued',
        prompt: jobRequest.prompt,
        enhanced_prompt: jobRequest.enhanced_prompt,
        quality: jobRequest.quality || 'fast',
        format: jobRequest.format || (jobRequest.job_type.includes('image') ? 'png' : 'mp4'),
        model_type: jobRequest.model_type,
        metadata: {
          ...jobRequest.metadata,
          reference_image_url: jobRequest.reference_image_url,
          reference_strength: jobRequest.reference_strength,
          seed: jobRequest.seed
        }
      })
      .select()
      .single()

    if (jobError) {
      console.error('Failed to create job:', jobError)
      return new Response('Failed to create job', { status: 500, headers: corsHeaders })
    }

    // Determine queue based on job type
    const queueName = jobRequest.job_type.startsWith('wan') ? 'wan_queue' : 'sdxl_queue'

    // Enqueue to Redis
    const redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL')
    const redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')

    if (!redisUrl || !redisToken) {
      console.error('Redis configuration missing')
      return new Response('Queue service unavailable', { status: 503, headers: corsHeaders })
    }

    const queuePayload = {
      jobId: job.id,
      userId: user.id,
      jobType: jobRequest.job_type,
      prompt: jobRequest.prompt,
      enhancedPrompt: jobRequest.enhanced_prompt,
      quality: jobRequest.quality || 'fast',
      format: jobRequest.format || (jobRequest.job_type.includes('image') ? 'png' : 'mp4'),
      modelType: jobRequest.model_type,
      referenceImageUrl: jobRequest.reference_image_url,
      referenceStrength: jobRequest.reference_strength,
      seed: jobRequest.seed,
      metadata: jobRequest.metadata || {}
    }

    try {
      const enqueueResponse = await fetch(`${redisUrl}/rpush/${queueName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${redisToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: JSON.stringify(queuePayload) })
      })

      if (!enqueueResponse.ok) {
        throw new Error(`Redis enqueue failed: ${enqueueResponse.status}`)
      }

      console.log(`✅ Job ${job.id} enqueued to ${queueName}`)

    } catch (error) {
      console.error('Failed to enqueue job:', error)
      
      // Update job status to failed
      await supabaseClient
        .from('jobs')
        .update({ 
          status: 'failed',
          error_message: 'Failed to enqueue job'
        })
        .eq('id', job.id)

      return new Response('Failed to enqueue job', { status: 500, headers: corsHeaders })
    }

    return new Response(
      JSON.stringify({ 
        jobId: job.id,
        status: 'queued',
        queueName,
        message: 'Job successfully queued'
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      },
    )

  } catch (error) {
    console.error('Queue job error:', error)
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
