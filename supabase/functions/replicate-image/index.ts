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

    // Get dynamic model configuration with fallback
    const modelSlug = Deno.env.get('REPLICATE_MODEL_SLUG') || 'black-forest-labs/flux-schnell'
    let modelVersion = Deno.env.get('REPLICATE_MODEL_VERSION')
    let actualModelSlug = modelSlug
    let usedFallback = false
    
    // If no version specified, fetch latest from Replicate API
    if (!modelVersion) {
      console.log('🔍 Fetching latest version for model:', modelSlug)
      
      try {
        const modelResponse = await fetch(`https://api.replicate.com/v1/models/${modelSlug}`, {
          headers: {
            'Authorization': `Token ${REPLICATE_API_TOKEN}`,
          },
        })
        
        if (!modelResponse.ok) {
          const errorText = await modelResponse.text()
          console.error('❌ Failed to fetch model info:', errorText)
          
          // Fallback to flux-schnell if primary model fails
          if (modelSlug !== 'black-forest-labs/flux-schnell') {
            console.log('🔄 Falling back to flux-schnell')
            actualModelSlug = 'black-forest-labs/flux-schnell'
            usedFallback = true
            
            const fallbackResponse = await fetch(`https://api.replicate.com/v1/models/${actualModelSlug}`, {
              headers: {
                'Authorization': `Token ${REPLICATE_API_TOKEN}`,
              },
            })
            
            if (!fallbackResponse.ok) {
              throw new Error(`Both primary model ${modelSlug} and fallback failed`)
            }
            
            const fallbackInfo = await fallbackResponse.json()
            modelVersion = fallbackInfo.latest_version?.id
          } else {
            throw new Error(`Failed to fetch model ${modelSlug}: ${errorText}`)
          }
        } else {
          const modelInfo = await modelResponse.json()
          modelVersion = modelInfo.latest_version?.id
        }
        
        if (!modelVersion) {
          throw new Error(`No version found for model ${actualModelSlug}`)
        }
      } catch (error) {
        console.error('❌ Model lookup failed:', error.message)
        throw error
      }
    }
    
    console.log('🎯 Using model:', actualModelSlug, 'version:', modelVersion)
    if (usedFallback) {
      console.log('⚠️ Used fallback model due to primary model failure')
    }

    // Determine model characteristics
    const isFlux = actualModelSlug.includes('flux')
    const isRV51 = actualModelSlug.includes('realistic-vision')

    // Normalize quality and job_type for DB constraints
    const normalizedQuality = quality === 'high' ? 'high' : 'fast';
    const normalizedJobType = `image_${normalizedQuality}`;
    
    console.log('🎯 Normalized job_type:', normalizedJobType, 'quality:', normalizedQuality, 'for', isFlux ? 'FLUX' : 'RV5.1')

    // Create job record first
    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        job_type: normalizedJobType,
        format: 'image',
        quality: normalizedQuality,
        model_type: 'default',
        status: 'queued',
        original_prompt: prompt, // Store full prompt in original_prompt column
        metadata: {
          ...metadata,
          model_slug: actualModelSlug,
          model_version: modelVersion,
          model_type: isFlux ? 'replicate_flux' : 'replicate_rv51',
          provider: 'replicate',
          actual_model: isFlux ? 'flux_schnell' : 'realistic_vision_v51',
          used_fallback: usedFallback,
          original_format: format,
          original_quality: quality,
          prompt: prompt.substring(0, 500) // Truncated for backward compatibility
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

    // Prepare Replicate API request with model-appropriate parameters
    
    let replicateBody
    if (isFlux) {
      // FLUX model parameters
      replicateBody = {
        version: modelVersion,
        input: {
          prompt: prompt,
          go_fast: true,
          megapixels: "1",
          num_outputs: 1,
          aspect_ratio: "1:1",
          output_format: "webp",
          output_quality: quality === 'high' ? 90 : 80,
          num_inference_steps: quality === 'high' ? 8 : 4
        }
      }
    } else {
      // RV5.1 or other model parameters
      replicateBody = {
        version: modelVersion,
        input: {
          prompt: prompt,
          negative_prompt: metadata.negative_prompt || "(deformed iris, deformed pupils, semi-realistic, cgi, 3d, render, sketch, cartoon, drawing, anime:1.4), text, close up, cropped, out of frame, worst quality, low quality, jpeg artifacts, ugly, duplicate, morbid, mutilated, extra fingers, mutated hands, poorly drawn hands, poorly drawn face, mutation, deformed, blurry, dehydrated, bad anatomy, bad proportions, extra limbs, cloned face, disfigured, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck",
          width: 512,
          height: 728,
          num_inference_steps: quality === 'high' ? 30 : 20,
          guidance_scale: quality === 'high' ? 7 : 5,
          scheduler: "EulerA",
          seed: 0
        }
      }
    }
    
    console.log('📋 Using', isFlux ? 'FLUX' : 'RV5.1', 'parameters with keys:', Object.keys(replicateBody.input))

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
        
        // Extract image URL from various output formats
        console.log('📦 Raw output type:', typeof prediction.output, 'Preview:', 
          typeof prediction.output === 'string' 
            ? prediction.output.substring(0, 100) 
            : JSON.stringify(prediction.output).substring(0, 100))
        
        let imageUrl: string | null = null
        
        if (typeof prediction.output === 'string') {
          // Direct string URL
          imageUrl = prediction.output
        } else if (Array.isArray(prediction.output)) {
          if (prediction.output.length > 0) {
            const firstItem = prediction.output[0]
            if (typeof firstItem === 'string') {
              // Array of string URLs
              imageUrl = firstItem
            } else if (typeof firstItem === 'object' && firstItem?.url) {
              // Array of objects with url property
              imageUrl = firstItem.url
            }
          }
        } else if (typeof prediction.output === 'object' && prediction.output?.url) {
          // Single object with url property
          imageUrl = prediction.output.url
        }
        
        if (!imageUrl || !imageUrl.startsWith('http')) {
          console.error('❌ Invalid or missing image URL:', imageUrl)
          
          // Mark job as failed with download error
          await supabase
            .from('jobs')
            .update({ 
              status: 'failed',
              error_message: `Invalid image URL received from Replicate: ${imageUrl}`
            })
            .eq('id', jobId)
          
          return
        }
        
        // Download the image
        const imageResponse = await fetch(imageUrl)
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image: ${imageResponse.status}`)
        }
        
        const imageBlob = await imageResponse.blob()
        const imageBuffer = await imageBlob.arrayBuffer()
        
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

        // Determine model characteristics from job metadata
        const jobMetadata = currentJobData.metadata || {}
        const isFlux = jobMetadata.model_slug?.includes('flux') || false
        const actualModel = jobMetadata.actual_model || 'unknown_model'
        const fileExtension = isFlux ? 'webp' : 'png'
        const mimeType = isFlux ? 'image/webp' : 'image/png'
        
        // Upload to Supabase storage with user-scoped path and correct extension
        const fileName = `${userId}/${jobId}_${Date.now()}.${fileExtension}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('workspace-temp')
          .upload(fileName, imageBuffer, {
            contentType: mimeType,
            upsert: false
          })
        
        if (uploadError) {
          console.error('❌ Storage upload error:', uploadError)
          throw new Error(`Failed to upload image: ${uploadError.message}`)
        }
        
        console.log('📁 Image uploaded to storage:', uploadData.path)
        
        // Create workspace asset using fetched job data and correct model info
        const { error: assetError } = await supabase
          .from('workspace_assets')
          .insert({
            user_id: currentJobData.user_id,
            job_id: jobId,
            asset_type: 'image',
            temp_storage_path: uploadData.path,
            original_prompt: jobMetadata?.prompt || 'Generated image',
            model_used: actualModel,
            file_size_bytes: imageBuffer.byteLength,
            mime_type: mimeType,
            generation_seed: prediction.input.seed || 0,
            width: prediction.input.width || (isFlux ? 1024 : 512),
            height: prediction.input.height || (isFlux ? 1024 : 728),
            asset_index: 0,
            generation_settings: {
              model_slug: jobMetadata.model_slug,
              model_version: jobMetadata.model_version,
              model: actualModel,
              used_fallback: jobMetadata.used_fallback || false,
              ...prediction.input
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
              output_snapshot: JSON.stringify(prediction.output).substring(0, 500), // Truncated output for debugging
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