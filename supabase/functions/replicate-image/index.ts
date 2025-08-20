import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const REPLICATE_API_TOKEN = Deno.env.get('REPLICATE_API_TOKEN')
    if (!REPLICATE_API_TOKEN) {
      throw new Error('REPLICATE_API_TOKEN is not set')
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const body = await req.json()
    const { prompt, format, quality, metadata = {} } = body

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Missing required field: prompt" }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Authorization header required')
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) {
      throw new Error('Authentication failed')
    }

    console.log('🔥 Replicate generation request:', { 
      userId: user.id, 
      format, 
      quality,
      promptLength: prompt.length 
    })

    // Create job record first
    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        job_type: format,
        status: 'queued',
        metadata: {
          ...metadata,
          model_type: 'realistic_vision_v51',
          provider: 'replicate',
          format,
          quality,
          prompt: prompt.substring(0, 500) // Truncate for storage
        }
      })
      .select()
      .single()

    if (jobError) {
      console.error('❌ Job creation error:', jobError)
      throw new Error(`Failed to create job record: ${jobError.message}`)
    }

    const jobId = jobData.id
    console.log('✅ Job created:', jobId)

    // Prepare Replicate API request
    const replicateBody = {
      version: "cd1b02cfc27b86fa88b9e63a5b34ed88e49a3e6b8e98e3b2edea5c9c6e40b0ce",
      input: {
        prompt: prompt,
        negative_prompt: metadata.negative_prompt || "(deformed iris, deformed pupils, semi-realistic, cgi, 3d, render, sketch, cartoon, drawing, anime:1.4), text, close up, cropped, out of frame, worst quality, low quality, jpeg artifacts, ugly, duplicate, morbid, mutilated, extra fingers, mutated hands, poorly drawn hands, poorly drawn face, mutation, deformed, blurry, dehydrated, bad anatomy, bad proportions, extra limbs, cloned face, disfigured, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck",
        width: 512,
        height: 728,
        steps: quality === 'high' ? 30 : 20,
        guidance: quality === 'high' ? 7 : 5,
        scheduler: "EulerA",
        seed: 0
      },
      webhook: `${SUPABASE_URL}/functions/v1/replicate-callback`,
      webhook_events_filter: ["completed", "failed"]
    }

    console.log('📤 Calling Replicate API...')
    const replicateResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(replicateBody)
    })

    if (!replicateResponse.ok) {
      const errorText = await replicateResponse.text()
      console.error('❌ Replicate API error:', errorText)
      
      // Update job status to failed
      await supabase
        .from('jobs')
        .update({ 
          status: 'failed',
          error_message: `Replicate API error: ${errorText}`
        })
        .eq('id', jobId)

      throw new Error(`Replicate API error: ${errorText}`)
    }

    const prediction = await replicateResponse.json()
    console.log('✅ Replicate prediction created:', prediction.id)

    // Update job with prediction ID
    await supabase
      .from('jobs')
      .update({ 
        external_id: prediction.id,
        status: 'processing',
        metadata: {
          ...jobData.metadata,
          prediction_id: prediction.id,
          replicate_status: prediction.status
        }
      })
      .eq('id', jobId)

    return new Response(
      JSON.stringify({ 
        jobId: jobId,
        predictionId: prediction.id,
        status: 'processing'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error("❌ Error in replicate-image function:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})