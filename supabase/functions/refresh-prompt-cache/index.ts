import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    console.log('🔄 Cache refresh function called');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header provided');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Check if user is admin
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (roleError || !userRoles?.some(r => r.role === 'admin')) {
      throw new Error('Admin access required');
    }

    const { force_refresh = false } = await req.json();

    console.log('✅ Admin authenticated, starting cache refresh...');

    // 1. Load all active prompt templates
    const { data: templates, error: templatesError } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (templatesError) {
      throw new Error(`Failed to load templates: ${templatesError.message}`);
    }

    // 2. Load all active negative prompts
    const { data: negativePrompts, error: negativesError } = await supabase
      .from('negative_prompts')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (negativesError) {
      throw new Error(`Failed to load negative prompts: ${negativesError.message}`);
    }

    // 3. Organize templates by model and use case
    const templateCache = {
      sdxl: {
        enhancement: { sfw: null, nsfw: null },
        chat: { sfw: null, nsfw: null },
        conversion: { sfw: null, nsfw: null },
        optimization: { sfw: null, nsfw: null }
      },
      wan: {
        enhancement: { sfw: null, nsfw: null },
        chat: { sfw: null, nsfw: null },
        conversion: { sfw: null, nsfw: null },
        optimization: { sfw: null, nsfw: null }
      },
      qwen_base: {
        enhancement: { sfw: null, nsfw: null },
        chat: { sfw: null, nsfw: null },
        conversion: { sfw: null, nsfw: null },
        optimization: { sfw: null, nsfw: null }
      },
      qwen_instruct: {
        enhancement: { sfw: null, nsfw: null },
        chat: { sfw: null, nsfw: null },
        conversion: { sfw: null, nsfw: null },
        optimization: { sfw: null, nsfw: null }
      }
    };

    // Populate template cache
    templates.forEach(template => {
      if (templateCache[template.model_type] && templateCache[template.model_type][template.use_case]) {
        templateCache[template.model_type][template.use_case][template.content_mode] = {
          id: template.id,
          template_name: template.template_name,
          system_prompt: template.system_prompt,
          token_limit: template.token_limit,
          version: template.version,
          metadata: template.metadata,
          updated_at: template.updated_at
        };
      }
    });

    // 4. Organize negative prompts by model and content mode
    const negativeCache = {
      sdxl: { sfw: [], nsfw: [] },
      wan: { sfw: [], nsfw: [] }
    };

    negativePrompts.forEach(negative => {
      if (negativeCache[negative.model_type]) {
        negativeCache[negative.model_type][negative.content_mode].push({
          id: negative.id,
          negative_prompt: negative.negative_prompt,
          description: negative.description,
          priority: negative.priority,
          updated_at: negative.updated_at
        });
      }
    });

    // 5. Create cache data structure
    const cacheData = {
      templates: templateCache,
      negatives: negativeCache,
      metadata: {
        last_updated: new Date().toISOString(),
        template_count: templates.length,
        negative_count: negativePrompts.length,
        force_refresh: force_refresh,
        version: '1.0'
      },
      // Add cache validation for integrity checking
      cache_integrity: {
        template_hash: generateHash(JSON.stringify(templateCache)),
        negative_hash: generateHash(JSON.stringify(negativeCache)),
        combined_hash: generateHash(JSON.stringify({ templateCache, negativeCache }))
      }
    };

    // 6. Update system config with cached data
    const { error: updateError } = await supabase
      .from('system_config')
      .upsert({
        id: 1, // Single row for system config
        config: {
          ...cacheData,
          prompt_cache_enabled: true,
          cache_ttl_hours: 24
        },
        updated_at: new Date().toISOString()
      });

    if (updateError) {
      throw new Error(`Failed to update cache: ${updateError.message}`);
    }

    // 7. Log the cache refresh activity
    await supabase
      .from('user_activity_log')
      .insert({
        user_id: user.id,
        action: 'refresh_prompt_cache',
        resource_type: 'system_config',
        resource_id: 'prompt_cache',
        metadata: {
          template_count: templates.length,
          negative_count: negativePrompts.length,
          force_refresh: force_refresh,
          cache_size_bytes: JSON.stringify(cacheData).length,
          timestamp: new Date().toISOString()
        }
      });

    console.log('✅ Cache refresh completed:', {
      templates: templates.length,
      negatives: negativePrompts.length,
      cache_size: JSON.stringify(cacheData).length,
      force_refresh
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Prompt cache refreshed successfully',
        cache_stats: {
          template_count: templates.length,
          negative_count: negativePrompts.length,
          cache_size_bytes: JSON.stringify(cacheData).length,
          last_updated: cacheData.metadata.last_updated
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Error refreshing cache:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Simple hash function for cache integrity checking
function generateHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}