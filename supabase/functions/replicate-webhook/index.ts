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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const WEBHOOK_SECRET = Deno.env.get('REPLICATE_WEBHOOK_SECRET')
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Verify webhook signature if secret is configured
    if (WEBHOOK_SECRET) {
      // Check for both possible signature header names
      const signature = req.headers.get('X-Replicate-Signature') || req.headers.get('Replicate-Signature')
      if (!signature) {
        console.error('❌ Missing webhook signature header (checked X-Replicate-Signature and Replicate-Signature)')
        return new Response('Unauthorized: Missing signature', { status: 401, headers: corsHeaders })
      }

      // Read raw body for signature verification
      const rawBody = await req.clone().arrayBuffer()
      const rawBodyString = new TextDecoder().decode(rawBody)
      
      // Verify HMAC signature using Replicate's format
      const encoder = new TextEncoder()
      const keyData = encoder.encode(WEBHOOK_SECRET)
      const messageData = encoder.encode(rawBodyString)
      
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      )
      
      const signatureBytes = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
      const expectedSignature = 'sha256=' + Array.from(new Uint8Array(signatureBytes))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      
      if (signature !== expectedSignature) {
        console.error('❌ Signature verification failed')
        return new Response('Unauthorized: Invalid signature', { status: 401, headers: corsHeaders })
      }
      
      console.log('✅ Webhook signature verified')
    } else {
      console.log('⚠️ Webhook verification disabled (no secret configured)')
    }

    const webhookPayload = await req.json()
    console.log('🔔 Replicate webhook received:', {
      id: webhookPayload.id,
      status: webhookPayload.status,
      hasOutput: !!webhookPayload.output
    })

    const predictionId = webhookPayload.id
    const status = webhookPayload.status

    if (!predictionId) {
      console.error('❌ Missing prediction ID in webhook')
      return new Response('Missing prediction ID', { status: 400, headers: corsHeaders })
    }

    // Find the job associated with this prediction
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('metadata->>prediction_id', predictionId)
      .single()

    if (jobError || !job) {
      console.error('❌ Job not found for prediction:', predictionId, jobError)
      return new Response('Job not found', { status: 404, headers: corsHeaders })
    }

    console.log('✅ Found job for webhook:', job.id)

    if (status === 'succeeded' && webhookPayload.output) {
      console.log('🎉 Prediction succeeded, processing output')
      console.log('📋 Full webhook output structure:', JSON.stringify(webhookPayload.output, null, 2))

      // Extract image URL from webhook output with improved logic to avoid composite grids
      let imageUrl: string | null = null
      
      if (typeof webhookPayload.output === 'string') {
        imageUrl = webhookPayload.output
        console.log('✅ Using single string output:', imageUrl.substring(0, 100))
      } else if (Array.isArray(webhookPayload.output)) {
        console.log('📊 Processing array output with', webhookPayload.output.length, 'items')
        
        // Look for individual image URLs, avoid composite grids
        const individualImages = webhookPayload.output.filter((item: any) => {
          if (typeof item === 'string') {
            // Avoid URLs that suggest composite/grid images
            return !item.includes('output.png') && !item.includes('grid') && !item.includes('combined')
          }
          if (typeof item === 'object' && item?.url) {
            return !item.url.includes('output.png') && !item.url.includes('grid') && !item.url.includes('combined')
          }
          return false
        })
        
        if (individualImages.length > 0) {
          const selectedItem = individualImages[0]
          if (typeof selectedItem === 'string') {
            imageUrl = selectedItem
          } else if (typeof selectedItem === 'object' && selectedItem?.url) {
            imageUrl = selectedItem.url
          }
          console.log('✅ Selected individual image from', individualImages.length, 'candidates:', imageUrl?.substring(0, 100))
        } else {
          // Fallback to first item if no individual images found
          const firstItem = webhookPayload.output[0]
          if (typeof firstItem === 'string') {
            imageUrl = firstItem
          } else if (typeof firstItem === 'object' && firstItem?.url) {
            imageUrl = firstItem.url
          }
          console.log('⚠️ No individual images found, using first item as fallback:', imageUrl?.substring(0, 100))
        }
      } else if (typeof webhookPayload.output === 'object' && webhookPayload.output?.url) {
        imageUrl = webhookPayload.output.url
        console.log('✅ Using object URL output:', imageUrl.substring(0, 100))
      }

      if (!imageUrl || !imageUrl.startsWith('http')) {
        console.error('❌ Invalid image URL from webhook:', imageUrl)
        
        await supabase
          .from('jobs')
          .update({ 
            status: 'failed',
            error_message: `Invalid image URL from webhook: ${imageUrl}`
          })
          .eq('id', job.id)

        return new Response('Invalid image URL', { status: 400, headers: corsHeaders })
      }

      console.log('📥 Downloading image from webhook:', imageUrl.substring(0, 100))

      // Download the image
      const imageResponse = await fetch(imageUrl)
      if (!imageResponse.ok) {
        console.error('❌ Failed to download image:', imageResponse.status)
        
        await supabase
          .from('jobs')
          .update({ 
            status: 'failed',
            error_message: `Failed to download image: ${imageResponse.status}`
          })
          .eq('id', job.id)

        return new Response('Failed to download image', { status: 500, headers: corsHeaders })
      }

      const imageBlob = await imageResponse.blob()
      const imageBuffer = await imageBlob.arrayBuffer()
      console.log('📦 Image downloaded:', imageBuffer.byteLength, 'bytes')

      // Generate storage path
      const timestamp = Date.now()
      const storagePath = `${job.user_id}/${job.id}_${timestamp}.png`

      console.log('📁 Uploading to storage:', storagePath)

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('workspace-temp')
        .upload(storagePath, imageBuffer, {
          contentType: 'image/png',
          duplex: 'half'
        })

      if (uploadError) {
        console.error('❌ Upload failed:', uploadError)
        
        await supabase
          .from('jobs')
          .update({ 
            status: 'failed',
            error_message: `Upload failed: ${uploadError.message}`
          })
          .eq('id', job.id)

        return new Response('Upload failed', { status: 500, headers: corsHeaders })
      }

      console.log('📁 Image uploaded to storage:', uploadData.path)

      // Create workspace asset
      const { data: workspaceAsset, error: assetError } = await supabase
        .from('workspace_assets')
        .insert({
          user_id: job.user_id,
          job_id: job.id,
          asset_type: 'image',
          temp_storage_path: uploadData.path,
          file_size_bytes: imageBuffer.byteLength,
          mime_type: 'image/png',
          width: null, // Could extract from image if needed
          height: null,
          original_prompt: job.original_prompt || job.metadata?.prompt || '',
          model_used: job.metadata?.actual_model || 'unknown',
          generation_seed: Math.floor(Math.random() * 1000000),
          generation_settings: {
            model_type: job.metadata?.model_type,
            quality: job.quality,
            provider: 'replicate'
          }
        })
        .select()
        .single()

      if (assetError) {
        console.error('❌ Failed to create workspace asset:', assetError)
        
        await supabase
          .from('jobs')
          .update({ 
            status: 'failed',
            error_message: `Failed to create asset: ${assetError.message}`
          })
          .eq('id', job.id)

        return new Response('Failed to create asset', { status: 500, headers: corsHeaders })
      }

      console.log('🎨 Workspace asset created:', workspaceAsset.id)

      // Update job to completed
      await supabase
        .from('jobs')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          metadata: {
            ...job.metadata,
            replicate_status: 'succeeded',
            output_url: imageUrl,
            output_snapshot: JSON.stringify(webhookPayload.output).substring(0, 500),
            storage_path: uploadData.path,
            webhook_processed: true
          }
        })
        .eq('id', job.id)

      console.log('✅ Job completed via webhook:', job.id)

      // ✅ FIX: Handle roleplay_scene destination - link images to character_scenes
      if (job.metadata?.destination === 'roleplay_scene') {
        const sceneId = job.metadata.scene_id;
        const characterId = job.metadata.character_id;
        
        if (sceneId && workspaceAsset) {
          try {
            // Update character_scenes record with image URL
            const imageUrl = workspaceAsset.temp_storage_path;
            const { error: sceneUpdateError } = await supabase
              .from('character_scenes')
              .update({
                image_url: imageUrl,
                updated_at: new Date().toISOString()
              })
              .eq('id', sceneId);

            if (!sceneUpdateError) {
              console.log(`✅ Scene ${sceneId} updated with image URL: ${imageUrl}`);
            } else {
              console.error('Failed to update scene with image URL:', sceneUpdateError);
            }
          } catch (error) {
            console.error('Error updating roleplay scene:', error);
          }
        } else if (characterId && workspaceAsset && !sceneId) {
          // Fallback: If no scene_id but we have character_id, try to find scene
          console.log('⚠️ No scene_id in metadata, attempting to find scene by character_id and conversation_id');
          const conversationId = job.metadata.conversation_id;
          
          if (conversationId) {
            // Try to find existing scene for this conversation
            const { data: existingScene, error: findError } = await supabase
              .from('character_scenes')
              .select('id')
              .eq('character_id', characterId)
              .eq('conversation_id', conversationId)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (!findError && existingScene) {
              const imageUrl = workspaceAsset.temp_storage_path;
              const { error: sceneUpdateError } = await supabase
                .from('character_scenes')
                .update({
                  image_url: imageUrl,
                  updated_at: new Date().toISOString()
                })
                .eq('id', existingScene.id);

              if (!sceneUpdateError) {
                console.log(`✅ Found and updated scene ${existingScene.id} with image URL`);
              }
            }
          }
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        jobId: job.id,
        assetId: workspaceAsset.id 
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })

    } else if (status === 'failed') {
      console.log('❌ Prediction failed via webhook')
      
      await supabase
        .from('jobs')
        .update({ 
          status: 'failed',
          error_message: webhookPayload.error || 'Prediction failed',
          metadata: {
            ...job.metadata,
            replicate_status: 'failed',
            webhook_processed: true
          }
        })
        .eq('id', job.id)

      return new Response(JSON.stringify({ 
        success: true, 
        jobId: job.id,
        status: 'failed'
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })

    } else {
      console.log('🔄 Webhook status update:', status)
      
      // Update job status for other statuses (starting, processing, etc.)
      await supabase
        .from('jobs')
        .update({ 
          status: status === 'starting' ? 'processing' : status,
          metadata: {
            ...job.metadata,
            replicate_status: status,
            webhook_processed: true
          }
        })
        .eq('id', job.id)

      return new Response(JSON.stringify({ 
        success: true, 
        jobId: job.id,
        status: status
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    return new Response(JSON.stringify({ 
      error: error.message 
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})