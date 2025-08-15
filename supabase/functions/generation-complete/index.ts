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
    const { job_id, status, assets, user_id, prompt, model_used, generation_settings } = await req.json();
    
    console.log('Generation complete callback:', { job_id, status, assets_count: assets?.length });
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (status === 'completed' && assets && assets.length > 0) {
      // Insert each asset into workspace_assets table
      const workspaceAssets = assets.map((asset: any, index: number) => ({
        user_id: user_id,
        asset_type: asset.mime_type?.includes('video') ? 'video' : 'image',
        temp_storage_path: asset.temp_storage_path || asset.storage_path,
        file_size_bytes: asset.file_size_bytes || 0,
        mime_type: asset.mime_type || 'image/png',
        duration_seconds: asset.duration_seconds,
        job_id: job_id,
        asset_index: index,
        generation_seed: asset.generation_seed || Math.floor(Math.random() * 1000000),
        original_prompt: prompt || 'Generated content',
        model_used: model_used || 'unknown',
        generation_settings: generation_settings || {}
      }));

      const { error: insertError } = await supabase
        .from('workspace_assets')
        .upsert(workspaceAssets, { 
          onConflict: 'job_id,asset_index',
          ignoreDuplicates: true 
        });

      if (insertError) {
        console.error('Failed to insert workspace assets:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to save assets', details: insertError.message }),
          { status: 500, headers: corsHeaders }
        );
      }

      console.log(`Successfully inserted ${workspaceAssets.length} workspace assets`);
    }

    // Update job status
    const { error: jobError } = await supabase
      .from('jobs')
      .update({ 
        status: status,
        completed_at: status === 'completed' ? new Date().toISOString() : null
      })
      .eq('id', job_id);

    if (jobError) {
      console.error('Failed to update job status:', jobError);
    }

    return new Response(
      JSON.stringify({ success: true, job_id }),
      { headers: corsHeaders }
    );
    
  } catch (error) {
    console.error('Generation complete error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Processing failed', 
        details: error.message 
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}