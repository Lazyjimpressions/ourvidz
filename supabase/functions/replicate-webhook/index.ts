import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Replicate from "https://esm.sh/replicate@0.25.2"

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
        console.log('✅ Using object URL output:', imageUrl?.substring(0, 100))
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

      // ✅ VALIDATION: Fetch actual prediction from Replicate to see what was actually used
      let replicateActualInput = null;
      let replicateActualOutput = null;
      let promptLength = 0;
      let promptTruncated = false;
      
      try {
        const replicateApiToken = Deno.env.get('REPLICATE_API_TOKEN');
        if (replicateApiToken) {
          const replicate = new Replicate({ token: replicateApiToken });
          const actualPrediction = await replicate.predictions.get(predictionId);
          
          console.log('🔍 VALIDATION: Fetched actual Replicate prediction:', {
            id: actualPrediction.id,
            status: actualPrediction.status,
            has_input: !!actualPrediction.input,
            has_output: !!actualPrediction.output,
            input_keys: actualPrediction.input ? Object.keys(actualPrediction.input) : []
          });
          
          replicateActualInput = actualPrediction.input;
          replicateActualOutput = actualPrediction.output;
          
          // ✅ COST TRACKING: Extract cost from prediction
          const predictionCost = actualPrediction.metrics?.cost || actualPrediction.cost || null;
          if (predictionCost !== null) {
            console.log('💰 Replicate cost extracted:', predictionCost);
            
            // Find and update the usage log with actual cost
            const { data: usageLogs } = await supabase
              .from('api_usage_logs')
              .select('id, cost_usd')
              .eq('provider_metadata->>prediction_id', predictionId)
              .order('created_at', { ascending: false })
              .limit(1);
            
            if (usageLogs && usageLogs.length > 0 && !usageLogs[0].cost_usd) {
              await supabase
                .from('api_usage_logs')
                .update({ cost_usd: predictionCost })
                .eq('id', usageLogs[0].id);
              
              console.log('✅ Updated usage log with actual cost:', predictionCost);
              
              // Also update aggregates with the cost difference
              // (This is approximate - ideally we'd recalculate aggregates)
            }
          } else {
            console.warn('⚠️ No cost found in Replicate prediction');
          }
          
          // Check prompt length
          if (actualPrediction.input?.prompt) {
            promptLength = String(actualPrediction.input.prompt).length;
            const originalPromptLength = job.original_prompt?.length || job.metadata?.prompt?.length || 0;
            promptTruncated = promptLength < originalPromptLength;
            
            console.log('📏 VALIDATION: Prompt length check:', {
              actual_length: promptLength,
              original_length: originalPromptLength,
              truncated: promptTruncated,
              actual_prompt_preview: String(actualPrediction.input.prompt).substring(0, 100) + '...'
            });
            
            if (promptTruncated) {
              console.warn('⚠️ VALIDATION: Prompt appears to have been truncated by Replicate!');
            }
          }
          
          // Log what Replicate actually used vs what we sent
          console.log('📊 VALIDATION: What we sent vs what Replicate used:', {
            sent_seed: job.metadata?.input_used?.seed,
            actual_seed: actualPrediction.input?.seed,
            sent_strength: job.metadata?.input_used?.strength || job.metadata?.input_used?.prompt_strength,
            actual_strength: actualPrediction.input?.strength || actualPrediction.input?.prompt_strength,
            sent_image: !!job.metadata?.input_used?.image,
            actual_image: !!actualPrediction.input?.image,
            sent_prompt_length: job.original_prompt?.length || job.metadata?.prompt?.length || 0,
            actual_prompt_length: promptLength
          });
        } else {
          console.warn('⚠️ REPLICATE_API_TOKEN not configured, skipping validation fetch');
        }
      } catch (validationError) {
        console.error('❌ Failed to fetch actual prediction for validation:', validationError);
        // Don't fail the webhook if validation fetch fails
      }

      // Update job to completed with validation data
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
            webhook_processed: true,
            // ✅ VALIDATION: Store what Replicate actually used
            replicate_actual_input: replicateActualInput,
            replicate_actual_output: replicateActualOutput,
            prompt_length: promptLength,
            prompt_truncated: promptTruncated
          }
        })
        .eq('id', job.id)

      console.log('✅ Job completed via webhook:', job.id)

      // ✅ FIX: Handle character portrait destination - auto-save to library
      if (job.metadata?.destination === 'character_portrait' && job.metadata?.character_id) {
        const characterId = job.metadata.character_id;
        
        if (workspaceAsset) {
          try {
            // Auto-save to user library with roleplay metadata
            let sourceKey = workspaceAsset.temp_storage_path;
            if (sourceKey.startsWith('workspace-temp/')) {
              sourceKey = sourceKey.replace('workspace-temp/', '');
            }
            
            const destKey = `${job.user_id}/${job.id}_${characterId}.png`;
            
            // Copy file to user-library
            const { data: fileData, error: downloadError } = await supabase.storage
              .from('workspace-temp')
              .download(sourceKey);

            if (!downloadError && fileData) {
              const { error: uploadError } = await supabase.storage
                .from('user-library')
                .upload(destKey, fileData, {
                  contentType: 'image/png',
                  upsert: true
                });

              if (!uploadError) {
                // Create library record with roleplay metadata
                const { data: libraryAsset, error: libraryError } = await supabase
                  .from('user_library')
                  .insert({
                    user_id: job.user_id,
                    asset_type: 'image',
                    storage_path: destKey,
                    thumbnail_path: null, // Thumbnail not generated for Replicate
                    file_size_bytes: workspaceAsset.file_size_bytes || 0,
                    mime_type: 'image/png',
                    original_prompt: workspaceAsset.original_prompt,
                    model_used: workspaceAsset.model_used,
                    generation_seed: workspaceAsset.generation_seed,
                    width: workspaceAsset.width,
                    height: workspaceAsset.height,
                    tags: ['character', 'portrait'],
                    roleplay_metadata: {
                      type: 'character_portrait',
                      character_id: characterId,
                      character_name: job.metadata.character_name,
                      consistency_method: job.metadata.consistency_method
                    },
                    content_category: 'character'
                  })
                  .select()
                  .single();

                if (!libraryError && libraryAsset) {
                  // Update character with stable storage path
                  const stableImageUrl = `user-library/${destKey}`;
                  
                  const { error: updateError } = await supabase
                    .from('characters')
                    .update({
                      image_url: stableImageUrl,
                      reference_image_url: stableImageUrl,
                      seed_locked: workspaceAsset.generation_seed,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', characterId);

                  if (!updateError) {
                    console.log(`✅ Character ${characterId} portrait saved to library and character updated`);
                  } else {
                    console.error('Failed to update character with library path:', updateError);
                  }
                } else {
                  console.error('Failed to create library record:', libraryError);
                }
              } else {
                console.error('Failed to upload character portrait to library:', uploadError);
              }
            } else {
              console.error('Failed to download character portrait from workspace:', downloadError);
            }
          } catch (error) {
            console.error('Error auto-saving character portrait:', error);
          }
        }
      }

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
      error: error instanceof Error ? error.message : String(error) 
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})