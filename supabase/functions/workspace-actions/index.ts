import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export default async function handler(req: Request) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const { action, asset_ids, collection_id, custom_title, tags } = await req.json();
    
    console.log('Workspace action:', { action, asset_ids, user_id: user.id });

    switch (action) {
      case 'save_to_library':
        return await saveToLibrary(supabase, user.id, asset_ids, { collection_id, custom_title, tags });
      
      case 'delete_assets':
        return await deleteAssets(supabase, user.id, asset_ids);
      
      case 'cleanup_expired':
        return await cleanupExpiredAssets(supabase, user.id);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: corsHeaders }
        );
    }
    
  } catch (error) {
    console.error('Workspace action error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Action failed', 
        details: error.message 
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}

async function saveToLibrary(
  supabase: any, 
  userId: string, 
  assetIds: string[], 
  options: { collection_id?: string; custom_title?: string; tags?: string[] }
) {
  try {
    // Get workspace assets
    const { data: assets, error: fetchError } = await supabase
      .from('workspace_assets')
      .select('*')
      .in('id', assetIds)
      .eq('user_id', userId);

    if (fetchError || !assets || assets.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Assets not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // TODO: Implement file copying from workspace-temp to user-library bucket
    // This requires server-side file operations that we'll implement next

    // Create library records
    const libraryAssets = assets.map((asset: any) => ({
      user_id: userId,
      asset_type: asset.asset_type,
      storage_path: `${userId}/workspace-copy/${asset.id}`, // Temporary path until copy is implemented
      file_size_bytes: asset.file_size_bytes,
      mime_type: asset.mime_type,
      duration_seconds: asset.duration_seconds,
      original_prompt: asset.original_prompt,
      model_used: asset.model_used,
      generation_seed: asset.generation_seed,
      collection_id: options.collection_id,
      custom_title: options.custom_title,
      tags: options.tags || []
    }));

    const { data: savedAssets, error: saveError } = await supabase
      .from('user_library')
      .insert(libraryAssets)
      .select();

    if (saveError) {
      return new Response(
        JSON.stringify({ error: 'Failed to save to library', details: saveError.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        saved_count: savedAssets.length,
        saved_assets: savedAssets 
      }),
      { headers: corsHeaders }
    );
    
  } catch (error) {
    console.error('Save to library error:', error);
    return new Response(
      JSON.stringify({ error: 'Save failed', details: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

async function deleteAssets(supabase: any, userId: string, assetIds: string[]) {
  try {
    // TODO: Delete files from storage bucket before deleting records
    
    const { error } = await supabase
      .from('workspace_assets')
      .delete()
      .in('id', assetIds)
      .eq('user_id', userId);

    if (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to delete assets', details: error.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: true, deleted_count: assetIds.length }),
      { headers: corsHeaders }
    );
    
  } catch (error) {
    console.error('Delete assets error:', error);
    return new Response(
      JSON.stringify({ error: 'Delete failed', details: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

async function cleanupExpiredAssets(supabase: any, userId: string) {
  try {
    const { data: expiredAssets, error: selectError } = await supabase
      .from('workspace_assets')
      .select('id, temp_storage_path')
      .eq('user_id', userId)
      .lt('expires_at', new Date().toISOString());

    if (selectError) {
      return new Response(
        JSON.stringify({ error: 'Failed to query expired assets', details: selectError.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    if (!expiredAssets || expiredAssets.length === 0) {
      return new Response(
        JSON.stringify({ success: true, cleaned_count: 0 }),
        { headers: corsHeaders }
      );
    }

    // TODO: Delete files from storage bucket

    const { error: deleteError } = await supabase
      .from('workspace_assets')
      .delete()
      .in('id', expiredAssets.map((asset: any) => asset.id));

    if (deleteError) {
      return new Response(
        JSON.stringify({ error: 'Failed to cleanup expired assets', details: deleteError.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: true, cleaned_count: expiredAssets.length }),
      { headers: corsHeaders }
    );
    
  } catch (error) {
    console.error('Cleanup expired assets error:', error);
    return new Response(
      JSON.stringify({ error: 'Cleanup failed', details: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}