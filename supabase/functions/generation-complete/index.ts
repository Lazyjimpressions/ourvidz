import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  console.log(`🔥 Generation-complete: ${req.method} ${req.url}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight handled');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawPayload = await req.json();
    console.log('Raw generation complete payload:', rawPayload);
    
    // Handle multiple payload formats (legacy and new)
    const {
      job_id,
      status,
      assets,
      user_id,
      prompt,
      model_used,
      generation_settings,
      // Legacy format fields
      jobId,
      userId,
      results,
      images,
      videos
    } = rawPayload;
    
    // Normalize the payload
    const normalizedJobId = job_id || jobId;
    const normalizedUserId = user_id || userId;
    const normalizedAssets = assets || results || images || videos || [];
    
    console.log('Generation complete callback:', { 
      job_id: normalizedJobId, 
      status, 
      assets_count: normalizedAssets?.length,
      user_id: normalizedUserId
    });
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (status === 'completed' && normalizedAssets && normalizedAssets.length > 0) {
      // Insert each asset into workspace_assets table with flexible field mapping
      const workspaceAssets = normalizedAssets.map((asset: any, index: number) => ({
        user_id: normalizedUserId,
        asset_type: (asset.mime_type || asset.type || '').includes('video') ? 'video' : 'image',
        temp_storage_path: asset.temp_storage_path || asset.storage_path || asset.url || asset.path,
        file_size_bytes: asset.file_size_bytes || asset.size || 0,
        mime_type: asset.mime_type || asset.type || 'image/png',
        duration_seconds: asset.duration_seconds || asset.duration,
        job_id: normalizedJobId,
        asset_index: index,
        generation_seed: asset.generation_seed || asset.seed || Math.floor(Math.random() * 1000000),
        original_prompt: prompt || asset.prompt || 'Generated content',
        model_used: model_used || asset.model || 'unknown',
        generation_settings: generation_settings || asset.settings || {}
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
      .eq('id', normalizedJobId);

    if (jobError) {
      console.error('Failed to update job status:', jobError);
    }

    return new Response(
      JSON.stringify({ success: true, job_id: normalizedJobId }),
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
});