
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
            template_name: payload.metadata?.template_name || job.template_name || job.metadata?.enhancement_metadata?.template_name,
            reference_image_url: job.metadata?.reference_image_url,
            reference_strength: job.metadata?.reference_strength,
            ...payload.metadata
          }
        }));
      }
      
      // Handle new SDXL worker format
      if (payload.assets) {
        assetsToCreate = payload.assets.map((asset, index) => {
          const thumbUrl = (asset as any).thumbnail_url || null;

          // Normalize storage paths (strip 'workspace-temp/' if present)
          const normalize = (p: string) => p?.startsWith('workspace-temp/') ? p.replace('workspace-temp/', '') : p;

          // Determine asset type and mime type with robust detection
          let assetType = asset.type;
          let mimeType = asset.type === 'image' ? 'image/png' : 'video/mp4';
          
          // Normalize asset type based on URL extension (defensive fix for incorrect worker output)
          const normalizedPath = normalize(asset.url);
          if (normalizedPath?.match(/\.(mp4|avi|mov|wmv|webm|m4v)$/i)) {
            assetType = 'video';
            mimeType = 'video/mp4';
          } else if (normalizedPath?.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)) {
            assetType = 'image';
            mimeType = normalizedPath.match(/\.png$/i) ? 'image/png' : 'image/jpeg';
          }
          
          // For video assets, ensure proper setup
          if (assetType === 'video') {
            mimeType = 'video/mp4';
          }

          console.log('🖼️ Workspace asset write', {
            jobId,
            idx: index,
            hasThumb: !!thumbUrl,
            path: normalize(asset.url),
            thumb: thumbUrl ? normalize(thumbUrl) : null
          });

          return {
            user_id: finalUserId,
            job_id: jobId,
            asset_type: assetType,
            temp_storage_path: normalize(asset.url),
            thumbnail_path: thumbUrl ? normalize(thumbUrl) : null, // NEW
            file_size_bytes: 0, // Will be updated when file is processed
            mime_type: mimeType,
            duration_seconds: assetType === 'video' ? (payload.metadata?.frame_num ? Math.ceil(payload.metadata.frame_num / 16) : 5) : undefined,
            asset_index: index,
            generation_seed: asset.metadata?.seed || job.metadata?.seed || Math.floor(Math.random() * 1000000),
            original_prompt: job.original_prompt || job.prompt,
            model_used: job.model_type || (assetType === 'video' ? 'wan' : 'sdxl'),
            generation_settings: {
              quality: job.quality,
              format: job.format,
              enhanced_prompt: job.enhanced_prompt,
              template_name: payload.metadata?.template_name || job.template_name || job.metadata?.enhancement_metadata?.template_name,
              reference_image_url: job.metadata?.reference_image_url,
              reference_strength: job.metadata?.reference_strength, // legacy
               denoise_strength: asset.metadata?.denoise_strength ?? payload.metadata?.denoise_strength ?? job.metadata?.denoise_strength ?? null, // NEW
               guidance_scale: asset.metadata?.guidance_scale ?? payload.metadata?.guidance_scale ?? job.metadata?.guidance_scale ?? null, // NEW
               steps: asset.metadata?.steps ?? payload.metadata?.steps ?? job.metadata?.steps ?? null, // NEW
               // Also store worker-reported values for auditing
               worker_reported_steps: asset.metadata?.num_inference_steps ?? payload.metadata?.num_inference_steps ?? null,
               worker_reported_guidance_scale: asset.metadata?.guidance_scale ?? payload.metadata?.guidance_scale ?? null,
              width: asset.metadata?.width,
              height: asset.metadata?.height,
              frame_num: payload.metadata?.frame_num,
              reference_mode: payload.metadata?.reference_mode,
              exact_copy_mode: payload.metadata?.exact_copy_mode ?? job.metadata?.exact_copy_mode ?? false,
              ...payload.metadata
            }
          };
        });
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

      // ✅ FIX: Handle roleplay_scene destination - link images to character_scenes
      if (job.metadata?.destination === 'roleplay_scene') {
        const sceneId = job.metadata.scene_id;
        const characterId = job.metadata.character_id;
        const firstImageAsset = assetsToCreate.find(asset => asset.asset_type === 'image');
        
        if (sceneId && firstImageAsset) {
          try {
            // Update character_scenes record with image URL
            const imageUrl = firstImageAsset.temp_storage_path;
            const { error: sceneUpdateError } = await supabaseClient
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
        } else if (characterId && firstImageAsset && !sceneId) {
          // Fallback: If no scene_id but we have character_id, try to find or create scene
          console.log('⚠️ No scene_id in metadata, attempting to find scene by character_id and conversation_id');
          const conversationId = job.metadata.conversation_id;
          
          if (conversationId) {
            // Try to find existing scene for this conversation
            const { data: existingScene, error: findError } = await supabaseClient
              .from('character_scenes')
              .select('id')
              .eq('character_id', characterId)
              .eq('conversation_id', conversationId)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (!findError && existingScene) {
              const imageUrl = firstImageAsset.temp_storage_path;
              const { error: sceneUpdateError } = await supabaseClient
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

      // Auto-save character portraits to library and update character
      if (job.metadata?.destination === 'character_portrait') {
        const characterId = job.metadata.character_id;
        const firstImageAsset = assetsToCreate.find(asset => asset.asset_type === 'image');
        
        if (characterId && firstImageAsset) {
          try {
            // Auto-save to user library with roleplay metadata
            let sourceKey = firstImageAsset.temp_storage_path;
            if (sourceKey.startsWith('workspace-temp/')) {
              sourceKey = sourceKey.replace('workspace-temp/', '');
            }
            
            const destKey = `${finalUserId}/${jobId}_${characterId}.${firstImageAsset.mime_type.split('/')[1]}`;
            
            // Copy file to user-library
            const { data: fileData, error: downloadError } = await supabaseClient.storage
              .from('workspace-temp')
              .download(sourceKey);

            if (!downloadError && fileData) {
              const { error: uploadError } = await supabaseClient.storage
                .from('user-library')
                .upload(destKey, fileData, {
                  contentType: firstImageAsset.mime_type,
                  upsert: true
                });

              if (!uploadError) {
                // Handle thumbnail copy
                let libraryThumbPath: string | null = null;
                let thumbSrc = firstImageAsset.thumbnail_path;
                if (!thumbSrc) {
                  const base = firstImageAsset.temp_storage_path.replace(/\.(png|jpg|jpeg)$/i, '');
                  thumbSrc = `${base}.thumb.webp`;
                }
                
                if (thumbSrc && thumbSrc.startsWith('workspace-temp/')) {
                  thumbSrc = thumbSrc.replace('workspace-temp/', '');
                }
                
                if (thumbSrc) {
                  const { data: thumbData } = await supabaseClient.storage
                    .from('workspace-temp')
                    .download(thumbSrc);
                  
                  if (thumbData) {
                    const thumbDest = `${finalUserId}/${jobId}_${characterId}.thumb.webp`;
                    const { error: upThumbErr } = await supabaseClient.storage
                      .from('user-library')
                      .upload(thumbDest, thumbData, {
                        contentType: 'image/webp',
                        upsert: true
                      });
                    if (!upThumbErr) {
                      libraryThumbPath = thumbDest;
                    }
                  }
                }

                // Create library record with roleplay metadata
                const { data: libraryAsset, error: libraryError } = await supabaseClient
                  .from('user_library')
                  .insert({
                    user_id: finalUserId,
                    asset_type: firstImageAsset.asset_type,
                    storage_path: destKey,
                    thumbnail_path: libraryThumbPath,
                    file_size_bytes: firstImageAsset.file_size_bytes || 0,
                    mime_type: firstImageAsset.mime_type,
                    original_prompt: firstImageAsset.original_prompt,
                    model_used: firstImageAsset.model_used,
                    generation_seed: firstImageAsset.generation_seed,
                    width: firstImageAsset.generation_settings?.width,
                    height: firstImageAsset.generation_settings?.height,
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
                  // Update character with stable storage path instead of signed URL
                  const stableImageUrl = `user-library/${destKey}`;
                  
                  const { error: updateError } = await supabaseClient
                    .from('characters')
                    .update({
                      image_url: stableImageUrl,
                      reference_image_url: stableImageUrl,
                      seed_locked: firstImageAsset.generation_seed,
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
