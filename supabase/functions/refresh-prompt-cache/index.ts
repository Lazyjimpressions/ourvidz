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
      chat: { 
        sfw: {
          general: null,
          admin: null,
          creative: null
        }, 
        nsfw: {
          general: null,
          roleplay: null,
          creative: null,
          sdxl_conversion: null
        }
      },
      enhancement: {
        sdxl: { sfw: null, nsfw: null },
        wan: { sfw: null, nsfw: null },
        qwen_base: { sfw: null, nsfw: null },
        qwen_instruct: { sfw: null, nsfw: null }
      }
    };

    const nsfwTerms = [];

    // Populate template cache
    templates.forEach(template => {
      // Chat templates - new structure with specific use cases
      if (template.use_case.startsWith('chat_')) {
        const chatType = template.use_case.replace('chat_', ''); // Remove 'chat_' prefix
        if (templateCache.chat[template.content_mode] && templateCache.chat[template.content_mode][chatType] !== undefined) {
          templateCache.chat[template.content_mode][chatType] = template.system_prompt;
        }
      }
      
      // Enhancement templates by model  
      else if (template.use_case === 'enhancement' && templateCache.enhancement[template.model_type]) {
        templateCache.enhancement[template.model_type][template.content_mode] = template.system_prompt;
      }

      // Extract NSFW terms from content detection templates
      if (template.content_mode === 'nsfw' && template.use_case === 'content_detection') {
        const terms = template.system_prompt.toLowerCase().match(/\b[\w']+\b/g) || [];
        nsfwTerms.push(...terms.filter(term => 
          term.length > 3 && 
          !['this', 'that', 'with', 'from', 'they', 'them', 'your', 'their'].includes(term)
        ));
      }
    });

    // Add fallback NSFW terms if none found
    if (nsfwTerms.length === 0) {
      nsfwTerms.push(
        'naked', 'nude', 'topless', 'undressed', 'nsfw', 'adult', 'erotic', 'sexual', 'sex', 'porn', 'xxx',
        'seductive', 'intimate', 'passionate', 'explicit', 'hardcore', 'extreme', 'roleplay', 'fantasy'
      );
    }

    // 4. Organize negative prompts by model and content mode
    const negativeCache = {
      sdxl: { sfw: [], nsfw: [] },
      wan: { sfw: [], nsfw: [] }
    };

    negativePrompts.forEach(negative => {
      if (negativeCache[negative.model_type]) {
        negativeCache[negative.model_type][negative.content_mode].push(negative.negative_prompt);
      }
    });

    // 5. Create cache data structure
    const cacheData = {
      templateCache,
      negativeCache,
      nsfwTerms: [...new Set(nsfwTerms)], // Remove duplicates
      metadata: {
        refreshed_at: new Date().toISOString(),
        template_count: templates.length,
        negative_prompt_count: negativePrompts.length,
        nsfw_terms_count: nsfwTerms.length,
        cache_version: '2.0',
        integrity_hash: generateHash(JSON.stringify({ templateCache, negativeCache, nsfwTerms }))
      }
    };

    // 6. Update system config with cached data
    const { error: updateError } = await supabase
      .from('system_config')
      .upsert({
        id: 1, // Single row for system config
        config: cacheData,
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