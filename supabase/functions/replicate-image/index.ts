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

    // Accept both job_type and format, with safe default
    const jobType = body.job_type ?? format ?? 'replicate_rv51_fast';
    console.log('🎯 Using job_type:', jobType, 'from format:', format)

    // Create job record first
    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        job_type: jobType,
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
      }
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
        status: 'processing',
        metadata: {
          ...jobData.metadata,
          prediction_id: prediction.id,
          replicate_status: prediction.status
        }
      })
      .eq('id', jobId)

    // Start background polling task with user ID
    EdgeRuntime.waitUntil(pollReplicateCompletion(prediction.id, jobId, user.id, supabase, REPLICATE_API_TOKEN))

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

async function pollReplicateCompletion(predictionId: string, jobId: string, userId: string, supabase: any, apiToken: string) {
  console.log('🔄 Starting background polling for prediction:', predictionId)
  
  const maxRetries = 60 // 5 minutes max (5s intervals)
  let retries = 0
  
  while (retries < maxRetries) {
    await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
    retries++
    
    try {
      // Check prediction status
      const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: {
          'Authorization': `Token ${apiToken}`,
        },
      })
      
      if (!response.ok) {
        console.error('❌ Failed to check prediction status:', response.status)
        continue
      }
      
      const prediction = await response.json()
      console.log(`🔄 Prediction status (attempt ${retries}):`, prediction.status)
      
      if (prediction.status === 'succeeded') {
        console.log('✅ Prediction completed successfully')
        
        // Download and store the image
        const imageUrl = prediction.output[0]
        if (!imageUrl) {
          throw new Error('No image URL in prediction output')
        }
        
        // Download the image
        const imageResponse = await fetch(imageUrl)
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image: ${imageResponse.status}`)
        }
        
        const imageBlob = await imageResponse.blob()
        const imageBuffer = await imageBlob.arrayBuffer()
        
        // Upload to Supabase storage with user-scoped path
        const fileName = `${userId}/${jobId}_${Date.now()}.png`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('workspace-temp')
          .upload(fileName, imageBuffer, {
            contentType: 'image/png',
            upsert: false
          })
        
        if (uploadError) {
          console.error('❌ Storage upload error:', uploadError)
          throw new Error(`Failed to upload image: ${uploadError.message}`)
        }
        
        console.log('📁 Image uploaded to storage:', uploadData.path)
        
        // Get fresh job data for workspace asset creation
        const { data: currentJobData, error: jobFetchError } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .single()
        
        if (jobFetchError || !currentJobData) {
          console.error('❌ Failed to fetch job data:', jobFetchError)
          throw new Error(`Failed to fetch job data: ${jobFetchError?.message}`)
        }
        
        // Create workspace asset using fetched job data
        const { error: assetError } = await supabase
          .from('workspace_assets')
          .insert({
            user_id: currentJobData.user_id,
            job_id: jobId,
            asset_type: 'image',
            temp_storage_path: uploadData.path,
            original_prompt: currentJobData.metadata?.prompt || 'Generated image',
            model_used: 'realistic_vision_v51',
            file_size_bytes: imageBuffer.byteLength,
            mime_type: 'image/png',
            generation_seed: 0,
            width: 512,
            height: 728,
            asset_index: 0,
            generation_settings: {
              model: 'realistic_vision_v51',
              steps: prediction.input.steps,
              guidance: prediction.input.guidance,
              scheduler: prediction.input.scheduler
            }
          })
        
        if (assetError) {
          console.error('❌ Failed to create workspace asset:', assetError)
          throw new Error(`Failed to create workspace asset: ${assetError.message}`)
        }
        
        // Update job status to completed using fresh job data
        await supabase
          .from('jobs')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
            metadata: {
              ...currentJobData.metadata,
              prediction_id: predictionId,
              replicate_status: 'succeeded',
              output_url: imageUrl,
              storage_path: uploadData.path
            }
          })
          .eq('id', jobId)
        
        console.log('✅ Job completed successfully:', jobId)
        return
        
      } else if (prediction.status === 'failed') {
        console.error('❌ Prediction failed:', prediction.error)
        
        // Get current job data for metadata
        const { data: failedJobData } = await supabase
          .from('jobs')
          .select('metadata')
          .eq('id', jobId)
          .single()
        
        // Update job status to failed
        await supabase
          .from('jobs')
          .update({ 
            status: 'failed',
            error_message: `Replicate prediction failed: ${prediction.error || 'Unknown error'}`,
            metadata: {
              ...(failedJobData?.metadata || {}),
              prediction_id: predictionId,
              replicate_status: 'failed'
            }
          })
          .eq('id', jobId)
        
        return
      }
      
      // Update job with current status (get fresh job data first)
      const { data: currentJobData } = await supabase
        .from('jobs')
        .select('metadata')
        .eq('id', jobId)
        .single()
      
      await supabase
        .from('jobs')
        .update({ 
          metadata: {
            ...(currentJobData?.metadata || {}),
            prediction_id: predictionId,
            replicate_status: prediction.status
          }
        })
        .eq('id', jobId)
      
    } catch (error) {
      console.error('❌ Error in polling loop:', error)
      // Continue polling unless we've exceeded max retries
    }
  }
  
  // If we get here, we've exceeded max retries
  console.error('❌ Polling timeout exceeded for prediction:', predictionId)
  await supabase
    .from('jobs')
    .update({ 
      status: 'failed',
      error_message: 'Generation timed out after 5 minutes'
    })
    .eq('id', jobId)
}