import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔄 Starting prompt cache refresh...')

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({
        error: 'Authorization required',
        success: false
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      })
    }

    // Verify admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(JSON.stringify({
        error: 'Invalid authentication',
        success: false
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      })
    }

    // Check if user has admin role
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (roleError || !userRole) {
      return new Response(JSON.stringify({
        error: 'Admin access required',
        success: false
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403
      })
    }

    // Parse request body for force_refresh flag
    const { force_refresh = false } = await req.json().catch(() => ({}))
    console.log('🔧 Force refresh requested:', force_refresh)

    // Fetch active prompt templates
    const { data: promptTemplates, error: templatesError } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('is_active', true)
      .order('enhancer_model', { ascending: true })
      .order('use_case', { ascending: true })
      .order('content_mode', { ascending: true })

    if (templatesError) {
      console.error('❌ Failed to fetch prompt templates:', templatesError)
      return new Response(JSON.stringify({
        error: 'Failed to fetch prompt templates',
        success: false,
        details: templatesError.message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    // Fetch active negative prompts
    const { data: negativePrompts, error: negativeError } = await supabase
      .from('negative_prompts')
      .select('*')
      .eq('is_active', true)
      .order('model_type', { ascending: true })
      .order('content_mode', { ascending: true })
      .order('priority', { ascending: false })

    if (negativeError) {
      console.error('❌ Failed to fetch negative prompts:', negativeError)
      return new Response(JSON.stringify({
        error: 'Failed to fetch negative prompts',
        success: false,
        details: negativeError.message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    // Build 5-tuple cache structure: enhancement[target_model][enhancer_model][job_type][use_case][content_mode]
    const templateCache: any = {
      enhancement: {},
      chat: {}
    }

    // Group templates by 5-tuple for enhancement and content_mode for chat
    for (const template of promptTemplates || []) {
      const { target_model, enhancer_model, job_type, use_case, content_mode } = template
      
      if (job_type === 'chat') {
        // Map database use_case values to cache keys for chat templates
        let mappedUseCase = use_case;
        if (use_case === 'roleplay') {
          mappedUseCase = 'roleplay';
        } else if (use_case === 'chat_admin') {
          mappedUseCase = 'admin';
        } else if (use_case === 'chat_creative') {
          mappedUseCase = 'creative';
        } else if (use_case === 'chat_general') {
          mappedUseCase = 'general';
        }
        
        // Organize chat templates under chat[content_mode][mapped_use_case]
        if (!templateCache.chat[content_mode]) {
          templateCache.chat[content_mode] = {}
        }
        templateCache.chat[content_mode][mappedUseCase] = template;
      } else {
        // Build 5-tuple cache structure for enhancement templates
        if (!templateCache.enhancement[target_model]) {
          templateCache.enhancement[target_model] = {}
        }
        if (!templateCache.enhancement[target_model][enhancer_model]) {
          templateCache.enhancement[target_model][enhancer_model] = {}
        }
        if (!templateCache.enhancement[target_model][enhancer_model][job_type]) {
          templateCache.enhancement[target_model][enhancer_model][job_type] = {}
        }
        if (!templateCache.enhancement[target_model][enhancer_model][job_type][use_case]) {
          templateCache.enhancement[target_model][enhancer_model][job_type][use_case] = {}
        }
        templateCache.enhancement[target_model][enhancer_model][job_type][use_case][content_mode] = template
      }
    }

    // Organize negative prompts into cache structure
    const negativeCache: any = {}
    for (const negPrompt of negativePrompts || []) {
      const { model_type, content_mode } = negPrompt
      
      if (!negativeCache[model_type]) {
        negativeCache[model_type] = {}
      }
      if (!negativeCache[model_type][content_mode]) {
        negativeCache[model_type][content_mode] = []
      }
      
      negativeCache[model_type][content_mode].push(negPrompt.negative_prompt)
    }

    // Extract NSFW terms from prompt templates for content detection
    const nsfwTerms = new Set<string>()
    const commonNSFWTerms = [
      'nsfw', 'nude', 'naked', 'sex', 'sexual', 'erotic', 'adult', 'explicit',
      'porn', 'intimate', 'sensual', 'arousing', 'seductive', 'provocative'
    ]
    
    // Add common terms
    commonNSFWTerms.forEach(term => nsfwTerms.add(term))
    
    // Extract from template system prompts
    for (const template of promptTemplates || []) {
      if (template.content_mode === 'nsfw' && template.system_prompt) {
        const words = template.system_prompt.toLowerCase().match(/\b\w+\b/g) || []
        words.forEach(word => {
          if (word.length > 3 && (
            word.includes('sex') || word.includes('adult') || 
            word.includes('explicit') || word.includes('intimate')
          )) {
            nsfwTerms.add(word)
          }
        })
      }
    }

    // Create the complete cache structure
    const cacheData = {
      templateCache,
      negativeCache,
      nsfwTerms: Array.from(nsfwTerms).filter(term => term.length > 2),
      metadata: {
        lastUpdated: new Date().toISOString(),
        templateCount: promptTemplates?.length || 0,
        negativePromptCount: negativePrompts?.length || 0,
        nsfwTermCount: nsfwTerms.size,
        version: '2.1.0',
        integrityHash: generateHash(JSON.stringify({ templateCache, negativeCache }))
      }
    }

    console.log('📊 Cache data prepared:', {
      templateCount: cacheData.metadata.templateCount,
      negativePromptCount: cacheData.metadata.negativePromptCount,
      nsfwTermCount: cacheData.metadata.nsfwTermCount
    })

    // Get existing config to preserve other settings
    const { data: existingConfig } = await supabase
      .from('system_config')
      .select('config')
      .eq('id', 1)
      .single()

    // Update system_config with the new cache
    const { error: updateError } = await supabase
      .from('system_config')
      .upsert({
        id: 1,
        config: {
          ...existingConfig?.config || {},
          promptCache: cacheData,
          cacheLastRefreshed: new Date().toISOString(),
          cacheVersion: '2.1.0'
        }
      })

    if (updateError) {
      console.error('❌ Failed to update system config:', updateError)
      return new Response(JSON.stringify({
        error: 'Failed to update cache',
        success: false,
        details: updateError.message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    // Log the cache refresh activity
    await supabase
      .from('user_activity_log')
      .insert({
        user_id: user.id,
        action: 'refresh_prompt_cache',
        resource_type: 'system_config',
        resource_id: '1',
        metadata: {
          templateCount: cacheData.metadata.templateCount,
          negativePromptCount: cacheData.metadata.negativePromptCount,
          nsfwTermCount: cacheData.metadata.nsfwTermCount,
          forceRefresh: force_refresh,
          integrityHash: cacheData.metadata.integrityHash
        }
      })

    console.log('✅ Prompt cache refreshed successfully')

    return new Response(JSON.stringify({
      success: true,
      message: 'Prompt cache refreshed successfully',
      cache_stats: cacheData.metadata,
      cached_data: {
        template_categories: Object.keys(templateCache),
        model_types: Object.keys(templateCache.enhancement || {}),
        negative_prompt_categories: Object.keys(negativeCache)
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Cache refresh error:', error)
    return new Response(JSON.stringify({
      error: 'Failed to refresh cache',
      success: false,
      details: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

/**
 * Simple hash function for integrity checking
 */
function generateHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16)
}