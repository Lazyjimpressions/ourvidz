import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

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
    // Use SERVICE_ROLE_KEY from environment (already set in Edge Functions)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const { query, action = 'schema' } = await req.json();

    if (action === 'schema') {
      // Fetch all tables and their columns
      const { data: tables } = await supabase
        .rpc('json_build_object', {
          'tables': `(
            SELECT json_object_agg(
              table_name,
              (
                SELECT json_agg(json_build_object(
                  'column_name', column_name,
                  'data_type', data_type,
                  'is_nullable', is_nullable,
                  'column_default', column_default
                ) ORDER BY ordinal_position)
                FROM information_schema.columns c
                WHERE c.table_schema = t.table_schema 
                AND c.table_name = t.table_name
              )
            )
            FROM information_schema.tables t
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
          )`
        });

      // Get storage buckets
      const { data: buckets } = await supabase.storage.listBuckets();

      // Get Edge Functions list (hardcoded since we can't query filesystem)
      const edgeFunctions = [
        'enhance-prompt',
        'generate-content',
        'queue-job',
        'job-callback',
        'generate-admin-image',
        'get-active-worker-url',
        'playground-chat',
        'get-schema-info',
        // Add others as needed
      ];

      return new Response(
        JSON.stringify({
          tables,
          buckets,
          edgeFunctions,
          timestamp: new Date().toISOString()
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    if (action === 'query' && query) {
      // Execute a specific query (be careful with this!)
      // Only allow SELECT queries for safety
      if (!query.trim().toUpperCase().startsWith('SELECT')) {
        throw new Error('Only SELECT queries are allowed');
      }

      const { data, error } = await supabase.rpc('execute_sql', { sql: query });
      
      if (error) throw error;

      return new Response(
        JSON.stringify({ data, timestamp: new Date().toISOString() }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    throw new Error('Invalid action or missing parameters');

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});