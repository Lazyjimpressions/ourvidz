import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { item_id, user_id } = await req.json();

    if (!item_id || !user_id) {
      throw new Error('item_id and user_id are required');
    }

    console.log('🗑️ WORKSPACE DELETE: Starting deletion process:', {
      item_id,
      user_id,
      timestamp: new Date().toISOString()
    });

    // Get workspace item details
    const { data: item, error: fetchError } = await supabase
      .from('workspace_items')
      .select('*')
      .eq('id', item_id)
      .eq('user_id', user_id)
      .single();
      
    if (fetchError || !item) {
      console.error('❌ WORKSPACE DELETE: Item not found:', fetchError);
      throw new Error('Workspace item not found or access denied');
    }

    console.log('✅ WORKSPACE DELETE: Item found:', {
      id: item.id,
      storage_path: item.storage_path,
      bucket_name: item.bucket_name,
      content_type: item.content_type
    });

    // Delete from storage bucket if file exists
    if (item.storage_path && item.bucket_name) {
      console.log('🗑️ WORKSPACE DELETE: Deleting from storage:', {
        bucket: item.bucket_name,
        path: item.storage_path
      });

      const { error: storageError } = await supabase.storage
        .from(item.bucket_name)
        .remove([item.storage_path]);
        
      if (storageError) {
        console.error('❌ WORKSPACE DELETE: Storage delete failed:', storageError);
        // Continue with database deletion even if storage delete fails
      } else {
        console.log('✅ WORKSPACE DELETE: Storage file deleted successfully');
      }
    }

    // Delete workspace item record
    const { error: deleteError } = await supabase
      .from('workspace_items')
      .delete()
      .eq('id', item_id)
      .eq('user_id', user_id);
      
    if (deleteError) {
      console.error('❌ WORKSPACE DELETE: Database delete failed:', deleteError);
      throw new Error('Failed to delete workspace item from database');
    }

    console.log('✅ WORKSPACE DELETE: Item deleted successfully:', {
      item_id,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted_item_id: item_id,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ WORKSPACE DELETE: Error in delete function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});