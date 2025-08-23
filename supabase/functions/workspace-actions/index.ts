import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SaveToLibraryRequest {
  action: 'save_to_library';
  assetId: string;
  customTitle?: string;
  collectionId?: string;
  tags?: string[];
}

interface DiscardAssetRequest {
  action: 'discard_asset';
  assetId: string;
}

interface ClearAssetRequest {
  action: 'clear_asset';
  assetId: string;
  customTitle?: string;
  collectionId?: string;
  tags?: string[];
}

interface ClearJobRequest {
  action: 'clear_job';
  jobId: string;
}

interface ClearWorkspaceRequest {
  action: 'clear_workspace';
}

interface CopyToWorkspaceRequest {
  action: 'copy_to_workspace';
  libraryAssetId: string;
}

type WorkspaceActionRequest = SaveToLibraryRequest | DiscardAssetRequest | ClearAssetRequest | ClearJobRequest | ClearWorkspaceRequest | CopyToWorkspaceRequest;

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

    const actionRequest: WorkspaceActionRequest = await req.json()

    if (actionRequest.action === 'save_to_library') {
      // Get workspace asset
      const { data: asset, error: assetError } = await supabaseClient
        .from('workspace_assets')
        .select('*')
        .eq('id', actionRequest.assetId)
        .eq('user_id', user.id)
        .single()

      if (assetError || !asset) {
        return new Response('Asset not found', { status: 404, headers: corsHeaders })
      }

      // Copy file from workspace-temp to user-library bucket
      let sourceKey = asset.temp_storage_path
      
      // Normalize source key - strip workspace-temp prefix if present
      if (sourceKey.startsWith('workspace-temp/')) {
        sourceKey = sourceKey.replace('workspace-temp/', '');
      }
      
      const destKey = `${user.id}/${asset.id}.${asset.mime_type.split('/')[1]}`

      console.log('📁 Copying file:', { sourceKey, destKey, bucket: 'workspace-temp' });

      // Get file from workspace-temp
      const { data: fileData, error: downloadError } = await supabaseClient.storage
        .from('workspace-temp')
        .download(sourceKey)

      if (downloadError) {
        console.error('Failed to download from workspace-temp:', downloadError)
        return new Response('Failed to access source file', { status: 500, headers: corsHeaders })
      }

      // Upload to user-library
      const { error: uploadError } = await supabaseClient.storage
        .from('user-library')
        .upload(destKey, fileData, {
          contentType: asset.mime_type,
          upsert: true
        })

      if (uploadError) {
        console.error('Failed to upload to user-library:', uploadError)
        return new Response('Failed to save to library', { status: 500, headers: corsHeaders })
      }

      // Handle thumbnail copy
      let thumbSrc = asset.thumbnail_path || null;
      if (!thumbSrc) {
        // Fallback naming based on temp_storage_path
        const base = asset.temp_storage_path.replace(/\.(png|jpg|jpeg|mp4)$/i, '');
        thumbSrc = `${base}.thumb.webp`;
      }

      // Try to download thumbnail (best-effort)
      let libraryThumbPath: string | null = null;
      if (thumbSrc) {
        const { data: thumbData } = await supabaseClient.storage
          .from('workspace-temp')
          .download(thumbSrc);
        
        if (thumbData) {
          const thumbDest = `${user.id}/${asset.id}.thumb.webp`;
          const { error: upThumbErr } = await supabaseClient.storage
            .from('user-library')
            .upload(thumbDest, thumbData, {
              contentType: 'image/webp',
              upsert: true
            });
          if (!upThumbErr) {
            libraryThumbPath = thumbDest;
            console.log('📁 Copying thumbnail:', { thumbSrc, thumbDest });
          }
        }
      }

      // Create library record with thumbnail_path
      const { data: libraryAsset, error: libraryError } = await supabaseClient
        .from('user_library')
        .insert({
          user_id: user.id,
          asset_type: asset.asset_type,
          storage_path: destKey,
          thumbnail_path: libraryThumbPath,
          file_size_bytes: asset.file_size_bytes,
          mime_type: asset.mime_type,
          duration_seconds: asset.duration_seconds,
          original_prompt: asset.original_prompt,
          model_used: asset.model_used,
          generation_seed: asset.generation_seed,
          collection_id: actionRequest.collectionId,
          custom_title: actionRequest.customTitle,
          tags: actionRequest.tags || []
        })
        .select()
        .single()

      if (libraryError) {
        console.error('Failed to create library record:', libraryError)
        return new Response('Failed to create library record', { status: 500, headers: corsHeaders })
      }

      // Optionally remove from workspace-temp (keep for now for debugging)
      // await supabaseClient.storage.from('workspace-temp').remove([sourceKey])

      console.log(`✅ Asset ${actionRequest.assetId} saved to library as ${libraryAsset.id}`)

      return new Response(
        JSON.stringify({ 
          success: true,
          libraryAssetId: libraryAsset.id,
          message: 'Asset saved to library'
        }),
        {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        },
      )

    } else if (actionRequest.action === 'clear_asset') {
      // Clear asset: save to library if not already saved, then remove from workspace
      const { data: asset, error: assetError } = await supabaseClient
        .from('workspace_assets')
        .select('*')
        .eq('id', actionRequest.assetId)
        .eq('user_id', user.id)
        .single()

      if (assetError || !asset) {
        return new Response('Asset not found', { status: 404, headers: corsHeaders })
      }

      // Check if already saved to library
      const { data: existingLibraryAsset } = await supabaseClient
        .from('user_library')
        .select('id')
        .eq('user_id', user.id)
        .eq('original_prompt', asset.original_prompt)
        .eq('generation_seed', asset.generation_seed)
        .eq('model_used', asset.model_used)
        .maybeSingle()

      let libraryAssetId = existingLibraryAsset?.id;

      // Save to library if not already saved
      if (!existingLibraryAsset) {
        let sourceKey = asset.temp_storage_path
        
        // Normalize source key - strip workspace-temp prefix if present
        if (sourceKey.startsWith('workspace-temp/')) {
          sourceKey = sourceKey.replace('workspace-temp/', '');
        }
        
        const destKey = `${user.id}/${asset.id}.${asset.mime_type.split('/')[1]}`

        console.log('📁 Copying file for clear:', { sourceKey, destKey, bucket: 'workspace-temp' });

        // Copy file from workspace-temp to user-library bucket
        const { data: fileData, error: downloadError } = await supabaseClient.storage
          .from('workspace-temp')
          .download(sourceKey)

        if (downloadError) {
          console.error('Failed to download from workspace-temp:', downloadError)
          return new Response('Failed to access source file', { status: 500, headers: corsHeaders })
        }

        const { error: uploadError } = await supabaseClient.storage
          .from('user-library')
          .upload(destKey, fileData, {
            contentType: asset.mime_type,
            upsert: true
          })

        if (uploadError) {
          console.error('Failed to upload to user-library:', uploadError)
          return new Response('Failed to save to library', { status: 500, headers: corsHeaders })
        }

        // Create library record
        const { data: libraryAsset, error: libraryError } = await supabaseClient
          .from('user_library')
          .insert({
            user_id: user.id,
            asset_type: asset.asset_type,
            storage_path: destKey,
            file_size_bytes: asset.file_size_bytes,
            mime_type: asset.mime_type,
            duration_seconds: asset.duration_seconds,
            original_prompt: asset.original_prompt,
            model_used: asset.model_used,
            generation_seed: asset.generation_seed,
            collection_id: actionRequest.collectionId,
            custom_title: actionRequest.customTitle,
            tags: actionRequest.tags || []
          })
          .select()
          .single()

        if (libraryError) {
          console.error('Failed to create library record:', libraryError)
          return new Response('Failed to create library record', { status: 500, headers: corsHeaders })
        }

        libraryAssetId = libraryAsset.id
      }

      // Remove from workspace (but keep temp file for now)
      const { error: deleteError } = await supabaseClient
        .from('workspace_assets')
        .delete()
        .eq('id', actionRequest.assetId)
        .eq('user_id', user.id)

      if (deleteError) {
        console.error('Failed to clear workspace asset:', deleteError)
        return new Response('Failed to clear asset', { status: 500, headers: corsHeaders })
      }

      console.log(`✅ Asset ${actionRequest.assetId} cleared from workspace${libraryAssetId ? ' and saved to library' : ''}`)

      return new Response(
        JSON.stringify({ 
          success: true,
          libraryAssetId,
          message: 'Asset cleared from workspace'
        }),
        {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        },
      )

    } else if (actionRequest.action === 'clear_job') {
      // Clear all assets from a job
      const { data: assets, error: assetsError } = await supabaseClient
        .from('workspace_assets')
        .select('*')
        .eq('job_id', actionRequest.jobId)
        .eq('user_id', user.id)

      if (assetsError) {
        console.error('Failed to fetch job assets:', assetsError)
        return new Response('Failed to fetch job assets', { status: 500, headers: corsHeaders })
      }

      if (!assets || assets.length === 0) {
        return new Response('No assets found for job', { status: 404, headers: corsHeaders })
      }

      let savedCount = 0
      const errors: string[] = []

      // Process each asset
      for (const asset of assets) {
        try {
          // Check if already saved to library
          const { data: existingLibraryAsset } = await supabaseClient
            .from('user_library')
            .select('id')
            .eq('user_id', user.id)
            .eq('original_prompt', asset.original_prompt)
            .eq('generation_seed', asset.generation_seed)
            .eq('model_used', asset.model_used)
            .maybeSingle()

          // Save to library if not already saved
          if (!existingLibraryAsset) {
            let sourceKey = asset.temp_storage_path
            
            // Normalize source key - strip workspace-temp prefix if present
            if (sourceKey.startsWith('workspace-temp/')) {
              sourceKey = sourceKey.replace('workspace-temp/', '');
            }
            
            const destKey = `${user.id}/${asset.id}.${asset.mime_type.split('/')[1]}`

            const { data: fileData, error: downloadError } = await supabaseClient.storage
              .from('workspace-temp')
              .download(sourceKey)

            if (!downloadError) {
              const { error: uploadError } = await supabaseClient.storage
                .from('user-library')
                .upload(destKey, fileData, {
                  contentType: asset.mime_type,
                  upsert: true
                })

              if (!uploadError) {
                const { error: libraryError } = await supabaseClient
                  .from('user_library')
                  .insert({
                    user_id: user.id,
                    asset_type: asset.asset_type,
                    storage_path: destKey,
                    file_size_bytes: asset.file_size_bytes,
                    mime_type: asset.mime_type,
                    duration_seconds: asset.duration_seconds,
                    original_prompt: asset.original_prompt,
                    model_used: asset.model_used,
                    generation_seed: asset.generation_seed
                  })

                if (!libraryError) {
                  savedCount++
                }
              }
            }
          }

          // Remove from workspace
          await supabaseClient
            .from('workspace_assets')
            .delete()
            .eq('id', asset.id)
            .eq('user_id', user.id)

        } catch (error) {
          errors.push(`Asset ${asset.id}: ${error.message}`)
        }
      }

      console.log(`✅ Job ${actionRequest.jobId} cleared: ${assets.length} assets processed, ${savedCount} new saves`)

      return new Response(
        JSON.stringify({ 
          success: true,
          assetsProcessed: assets.length,
          newSaves: savedCount,
          errors: errors.length > 0 ? errors : undefined,
          message: `Job cleared: ${assets.length} assets processed`
        }),
        {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        },
      )

    } else if (actionRequest.action === 'clear_workspace') {
      // Clear all workspace assets for the user
      const { data: assets, error: assetsError } = await supabaseClient
        .from('workspace_assets')
        .select('*')
        .eq('user_id', user.id)

      if (assetsError) {
        console.error('Failed to fetch workspace assets:', assetsError)
        return new Response('Failed to fetch workspace assets', { status: 500, headers: corsHeaders })
      }

      if (!assets || assets.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: true,
            assetsProcessed: 0,
            newSaves: 0,
            message: 'No assets to clear'
          }),
          {
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            },
          },
        )
      }

      let savedCount = 0
      const errors: string[] = []

      // Process each asset
      for (const asset of assets) {
        try {
          // Check if already saved to library
          const { data: existingLibraryAsset } = await supabaseClient
            .from('user_library')
            .select('id')
            .eq('user_id', user.id)
            .eq('original_prompt', asset.original_prompt)
            .eq('generation_seed', asset.generation_seed)
            .eq('model_used', asset.model_used)
            .maybeSingle()

          // Save to library if not already saved
          if (!existingLibraryAsset) {
            let sourceKey = asset.temp_storage_path
            
            // Normalize source key - strip workspace-temp prefix if present
            if (sourceKey.startsWith('workspace-temp/')) {
              sourceKey = sourceKey.replace('workspace-temp/', '');
            }
            
            const destKey = `${user.id}/${asset.id}.${asset.mime_type.split('/')[1]}`

            const { data: fileData, error: downloadError } = await supabaseClient.storage
              .from('workspace-temp')
              .download(sourceKey)

            if (!downloadError) {
              const { error: uploadError } = await supabaseClient.storage
                .from('user-library')
                .upload(destKey, fileData, {
                  contentType: asset.mime_type,
                  upsert: true
                })

              if (!uploadError) {
                const { error: libraryError } = await supabaseClient
                  .from('user_library')
                  .insert({
                    user_id: user.id,
                    asset_type: asset.asset_type,
                    storage_path: destKey,
                    file_size_bytes: asset.file_size_bytes,
                    mime_type: asset.mime_type,
                    duration_seconds: asset.duration_seconds,
                    original_prompt: asset.original_prompt,
                    model_used: asset.model_used,
                    generation_seed: asset.generation_seed
                  })

                if (!libraryError) {
                  savedCount++
                }
              }
            }
          }
        } catch (error) {
          errors.push(`Asset ${asset.id}: ${error.message}`)
        }
      }

      // Remove all workspace assets
      const { error: deleteError } = await supabaseClient
        .from('workspace_assets')
        .delete()
        .eq('user_id', user.id)

      if (deleteError) {
        console.error('Failed to clear workspace:', deleteError)
        return new Response('Failed to clear workspace', { status: 500, headers: corsHeaders })
      }

      console.log(`✅ Workspace cleared: ${assets.length} assets processed, ${savedCount} new saves`)

      return new Response(
        JSON.stringify({ 
          success: true,
          assetsProcessed: assets.length,
          newSaves: savedCount,
          errors: errors.length > 0 ? errors : undefined,
          message: `Workspace cleared: ${assets.length} assets processed`
        }),
        {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        },
      )

    } else if (actionRequest.action === 'discard_asset') {
      // Get workspace asset
      const { data: asset, error: assetError } = await supabaseClient
        .from('workspace_assets')
        .select('*')
        .eq('id', actionRequest.assetId)
        .eq('user_id', user.id)
        .single()

      if (assetError || !asset) {
        // Make function idempotent - if asset is already gone, return success
        console.log(`🗑️ Asset ${actionRequest.assetId} already removed or not found`)
        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Asset already removed'
          }),
          {
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            },
          },
        )
      }

      // Remove from storage
      let sourceKey = asset.temp_storage_path
      
      // Normalize source key - strip workspace-temp prefix if present
      if (sourceKey.startsWith('workspace-temp/')) {
        sourceKey = sourceKey.replace('workspace-temp/', '');
      }
      
      const { error: storageError } = await supabaseClient.storage
        .from('workspace-temp')
        .remove([sourceKey])

      if (storageError) {
        console.warn('Failed to remove from storage:', storageError)
        // Continue anyway, database cleanup is more important
      }

      // Remove from database
      const { error: deleteError } = await supabaseClient
        .from('workspace_assets')
        .delete()
        .eq('id', actionRequest.assetId)
        .eq('user_id', user.id)

      if (deleteError) {
        console.error('Failed to delete workspace asset:', deleteError)
        return new Response('Failed to discard asset', { status: 500, headers: corsHeaders })
      }

      console.log(`✅ Asset ${actionRequest.assetId} discarded`)

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Asset discarded'
        }),
        {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        },
      )
    
    } else if (actionRequest.action === 'copy_to_workspace') {
      // Copy library asset to workspace
      const { data: libraryAsset, error: libraryError } = await supabaseClient
        .from('user_library')
        .select('*')
        .eq('id', actionRequest.libraryAssetId)
        .eq('user_id', user.id)
        .single()

      if (libraryError || !libraryAsset) {
        return new Response('Library asset not found', { status: 404, headers: corsHeaders })
      }

      // Check if asset already exists in workspace
      const { data: existingWorkspaceAsset } = await supabaseClient
        .from('workspace_assets')
        .select('id')
        .eq('user_id', user.id)
        .eq('original_prompt', libraryAsset.original_prompt)
        .eq('generation_seed', libraryAsset.generation_seed)
        .eq('model_used', libraryAsset.model_used)
        .maybeSingle()

      if (existingWorkspaceAsset) {
        return new Response(
          JSON.stringify({ 
            success: true,
            workspaceAssetId: existingWorkspaceAsset.id,
            message: 'Asset already exists in workspace'
          }),
          {
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            },
          },
        )
      }

      // Copy file from user-library to workspace-temp bucket
      let sourceKey = libraryAsset.storage_path
      
      // Normalize source key
      if (sourceKey.startsWith('user-library/')) {
        sourceKey = sourceKey.replace('user-library/', '');
      }

      // Generate unique workspace path
      const workspaceAssetId = crypto.randomUUID()
      const destKey = `${user.id}/${workspaceAssetId}.${libraryAsset.mime_type.split('/')[1]}`

      console.log('📁 Copying file from library to workspace:', { sourceKey, destKey });

      // Get file from user-library
      const { data: fileData, error: downloadError } = await supabaseClient.storage
        .from('user-library')
        .download(sourceKey)

      if (downloadError) {
        console.error('Failed to download from user-library:', downloadError)
        return new Response('Failed to access library file', { status: 500, headers: corsHeaders })
      }

      // Upload to workspace-temp
      const { error: uploadError } = await supabaseClient.storage
        .from('workspace-temp')
        .upload(destKey, fileData, {
          contentType: libraryAsset.mime_type,
          upsert: true
        })

      if (uploadError) {
        console.error('Failed to upload to workspace-temp:', uploadError)
        return new Response('Failed to copy to workspace', { status: 500, headers: corsHeaders })
      }

      // Handle thumbnail copy
      let workspaceThumbPath: string | null = null;
      if (libraryAsset.thumbnail_path) {
        let thumbSrc = libraryAsset.thumbnail_path;
        if (thumbSrc.startsWith('user-library/')) {
          thumbSrc = thumbSrc.replace('user-library/', '');
        }

        const { data: thumbData } = await supabaseClient.storage
          .from('user-library')
          .download(thumbSrc);
        
        if (thumbData) {
          const thumbDest = `${user.id}/${workspaceAssetId}.thumb.webp`;
          const { error: upThumbErr } = await supabaseClient.storage
            .from('workspace-temp')
            .upload(thumbDest, thumbData, {
              contentType: 'image/webp',
              upsert: true
            });
          if (!upThumbErr) {
            workspaceThumbPath = thumbDest;
            console.log('📁 Copying thumbnail to workspace:', { thumbSrc, thumbDest });
          }
        }
      }

      // Create a job record first (required for workspace_assets.job_id)
      const jobId = crypto.randomUUID()
      const { data: job, error: jobError } = await supabaseClient
        .from('jobs')
        .insert({
          id: jobId,
          user_id: user.id,
          job_type: `${libraryAsset.asset_type}_library_copy`,
          status: 'completed',
          destination: 'workspace',
          completed_at: new Date().toISOString(),
          original_prompt: libraryAsset.original_prompt,
          model_type: libraryAsset.model_used,
          quality: 'high',
          metadata: {
            source: 'library_copy',
            library_asset_id: libraryAsset.id
          }
        })
        .select()
        .single()

      if (jobError) {
        console.error('Failed to create job record:', jobError)
        return new Response('Failed to create job record', { status: 500, headers: corsHeaders })
      }

      // Create workspace record
      const { data: workspaceAsset, error: workspaceError } = await supabaseClient
        .from('workspace_assets')
        .insert({
          id: workspaceAssetId,
          user_id: user.id,
          job_id: jobId,
          asset_type: libraryAsset.asset_type,
          temp_storage_path: destKey,
          thumbnail_path: workspaceThumbPath,
          file_size_bytes: libraryAsset.file_size_bytes,
          mime_type: libraryAsset.mime_type,
          duration_seconds: libraryAsset.duration_seconds,
          original_prompt: libraryAsset.original_prompt,
          model_used: libraryAsset.model_used,
          generation_seed: libraryAsset.generation_seed,
          // Copy generation settings if available
          generation_settings: {
            source: 'library_copy',
            library_asset_id: libraryAsset.id,
            ...(libraryAsset.tags && { tags: libraryAsset.tags })
          }
        })
        .select()
        .single()

      if (workspaceError) {
        console.error('Failed to create workspace record:', workspaceError)
        return new Response('Failed to create workspace record', { status: 500, headers: corsHeaders })
      }

      console.log(`✅ Library asset ${actionRequest.libraryAssetId} copied to workspace as ${workspaceAsset.id}`)

      return new Response(
        JSON.stringify({ 
          success: true,
          workspaceAssetId: workspaceAsset.id,
          message: 'Asset copied to workspace'
        }),
        {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        },
      )
    }

    return new Response('Invalid action', { status: 400, headers: corsHeaders })

  } catch (error) {
    console.error('Workspace action error:', error)
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
