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

type WorkspaceActionRequest = SaveToLibraryRequest | DiscardAssetRequest;

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
      const sourceKey = asset.temp_storage_path
      const destKey = `${user.id}/${asset.id}.${asset.mime_type.split('/')[1]}`

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

    } else if (actionRequest.action === 'discard_asset') {
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

      // Remove from storage
      const { error: storageError } = await supabaseClient.storage
        .from('workspace-temp')
        .remove([asset.temp_storage_path])

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
