/**
 * Shared cache utilities for edge functions
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface CacheData {
  templateCache: {
    chat: {
      sfw: Record<string, string>;
      nsfw: Record<string, string>;
    };
    enhancement: Record<string, Record<string, any>>;
  };
  negativeCache: Record<string, Record<string, string[]>>;
  nsfwTerms: string[];
  metadata: {
    refreshed_at: string;
    template_count: number;
    negative_prompt_count: number;
    cache_version: string;
    integrity_hash: string;
  };
}

/**
 * Get cached data from system_config with validation
 */
export async function getCachedData(): Promise<CacheData | null> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { data, error } = await supabase
      .from('system_config')
      .select('config')
      .eq('id', 1)
      .single();

    if (error || !data?.config) {
      console.warn('⚠️ No cached data available');
      return null;
    }

    // Validate cache structure
    const cache = data.config as CacheData;
    if (!cache.templateCache || !cache.negativeCache || !cache.metadata) {
      console.warn('⚠️ Invalid cache structure');
      return null;
    }

    // Check cache freshness (warn if older than 24 hours)
    const refreshTime = new Date(cache.metadata.refreshed_at);
    const ageHours = (Date.now() - refreshTime.getTime()) / (1000 * 60 * 60);
    
    if (ageHours > 24) {
      console.warn(`⚠️ Cache is ${ageHours.toFixed(1)} hours old - consider refreshing`);
    }

    console.log('✅ Cache loaded:', {
      templateCount: cache.metadata.template_count,
      negativePromptCount: cache.metadata.negative_prompt_count,
      nsfwTermCount: cache.nsfwTerms?.length || 0,
      ageHours: ageHours.toFixed(1)
    });

    return cache;
  } catch (error) {
    console.error('❌ Failed to load cache:', error);
    return null;
  }
}

/**
 * Get specific template from cache
 */
export function getTemplateFromCache(
  cache: CacheData | null,
  modelType: string,
  useCase: string,
  contentMode: string
): any {
  if (!cache) return null;

  // Handle chat templates with new structure
  if (useCase.startsWith('chat_')) {
    const chatType = useCase.replace('chat_', '');
    const chatTemplate = cache.templateCache.chat?.[contentMode]?.[chatType];
    
    if (!chatTemplate) {
      console.warn(`⚠️ Chat template not found in cache: chat.${contentMode}.${chatType}`);
      return null;
    }
    
    console.log(`✅ Chat template found in cache: chat.${contentMode}.${chatType}`);
    return { system_prompt: chatTemplate };
  }

  // Handle enhancement templates (existing logic with new structure)
  const enhancementTemplate = cache.templateCache.enhancement?.[modelType]?.[contentMode];
  
  if (!enhancementTemplate) {
    console.warn(`⚠️ Enhancement template not found in cache: enhancement.${modelType}.${contentMode}`);
    return null;
  }

  console.log(`✅ Enhancement template found in cache: enhancement.${modelType}.${contentMode}`);
  return enhancementTemplate;
}

/**
 * Get negative prompts from cache with merging
 */
export function getNegativePromptsFromCache(
  cache: CacheData | null,
  modelType: string,
  contentMode: string,
  userNegativePrompt?: string
): string {
  if (!cache) {
    console.warn('⚠️ No cache available for negative prompts');
    return userNegativePrompt || '';
  }

  // Get negative prompts using new cache structure
  let negativePrompts: string[] = [];
  
  if (cache.negativeCache?.[modelType]?.[contentMode]) {
    negativePrompts = cache.negativeCache[modelType][contentMode];
  }

  const negativePrompt = negativePrompts.join(', ');

  // Merge with user negative prompt
  let finalPrompt = negativePrompt;
  if (userNegativePrompt && userNegativePrompt.trim()) {
    finalPrompt = userNegativePrompt + (negativePrompt ? `, ${negativePrompt}` : '');
  }

  console.log(`✅ Negative prompt generated for ${modelType}_${contentMode}:`, {
    hasSystemPrompts: negativePrompts.length > 0,
    hasUserPrompt: !!userNegativePrompt,
    finalLength: finalPrompt.length
  });

  return finalPrompt;
}

/**
 * Detect SFW/NSFW content using cached terms
 */
export function detectContentTier(prompt: string, cache: CacheData | null): 'sfw' | 'nsfw' {
  const lowerPrompt = prompt.toLowerCase();
  
  // Use cached NSFW terms if available
  let nsfwTerms = cache?.nsfwTerms || [];
  
  // Fallback to hardcoded terms if cache is empty
  if (nsfwTerms.length === 0) {
    nsfwTerms = [
      'nude', 'naked', 'topless', 'nsfw', 'adult', 'erotic', 'sexual', 'sex', 
      'porn', 'xxx', 'breasts', 'nipples', 'pussy', 'vagina', 'penis', 'cock', 
      'dick', 'ass', 'butt', 'hardcore', 'explicit', 'uncensored', 'intimate', 'sexy'
    ];
    console.warn('⚠️ Using fallback NSFW terms');
  }
  
  const hasNsfwContent = nsfwTerms.some(term => lowerPrompt.includes(term));
  const result = hasNsfwContent ? 'nsfw' : 'sfw';
  
  console.log(`🔍 Content detection: "${prompt.substring(0, 50)}..." -> ${result}`, {
    nsfwTermsCount: nsfwTerms.length,
    matchedTerms: nsfwTerms.filter(term => lowerPrompt.includes(term))
  });
  
  return result;
}

/**
 * Get chat template from cache with context detection
 */
export function getChatTemplateFromCache(
  cache: CacheData | null,
  contextType: string,
  contentTier: 'sfw' | 'nsfw'
): string | null {
  if (!cache?.templateCache?.chat?.[contentTier]) {
    console.warn(`⚠️ No chat templates available for ${contentTier} content`);
    return null;
  }

  // Map context types to chat template types
  let chatType: string;
  
  // Check for SDXL conversion request first
  if (contextType.includes('sdxl') || contextType.includes('conversion')) {
    chatType = 'sdxl_conversion';
  }
  // Map context types to template types
  else if (contextType === 'story_development' || contextType === 'creative') {
    chatType = 'creative';
  }
  else if (contextType === 'roleplay') {
    chatType = 'roleplay'; 
  }
  else if (contextType === 'admin') {
    chatType = 'admin';
  }
  else {
    chatType = 'general'; // Default fallback
  }

  const template = cache.templateCache.chat[contentTier][chatType];
  
  if (!template) {
    // Fallback to general template if specific one not found
    const fallbackTemplate = cache.templateCache.chat[contentTier]['general'];
    if (fallbackTemplate) {
      console.log(`✅ Using fallback general chat template for ${contextType} (${contentTier})`);
      return fallbackTemplate;
    }
    
    console.warn(`⚠️ No chat template found for ${contextType} (${contentTier})`);
    return null;
  }

  console.log(`✅ Chat template found: ${chatType} (${contentTier})`);
  return template;
}

/**
 * Fallback to database if cache fails
 */
export async function getDatabaseTemplate(
  targetModel: string,
  enhancerModel: string,
  jobType: string,
  useCase: string,
  contentMode: string
): Promise<any> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  console.log(`🔄 Fetching template from database:`, {
    targetModel,
    enhancerModel,
    jobType,
    useCase,
    contentMode
  });

  // Build query with all 5 criteria
  let query = supabase
    .from('prompt_templates')
    .select('*')
    .eq('target_model', targetModel)
    .eq('enhancer_model', enhancerModel)
    .eq('job_type', jobType)
    .eq('use_case', useCase)
    .eq('content_mode', contentMode)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1);

  let { data, error } = await query.single();

  // Fallback 1: Try different enhancer model
  if (error || !data) {
    console.log(`⚠️ Exact match failed, trying enhancer fallback...`);
    const fallbackEnhancer = enhancerModel === 'qwen_instruct' ? 'qwen_base' : 'qwen_instruct';
    
    ({ data, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('target_model', targetModel)
      .eq('enhancer_model', fallbackEnhancer)
      .eq('job_type', jobType)
      .eq('use_case', useCase)
      .eq('content_mode', contentMode)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single());
  }

  // Fallback 2: Try different content mode
  if (error || !data) {
    console.log(`⚠️ Enhancer fallback failed, trying content mode fallback...`);
    const fallbackContent = contentMode === 'sfw' ? 'nsfw' : 'sfw';
    
    ({ data, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('target_model', targetModel)
      .eq('enhancer_model', enhancerModel)
      .eq('job_type', jobType)
      .eq('use_case', useCase)
      .eq('content_mode', fallbackContent)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single());
  }

  if (error || !data) {
    console.log(`❌ Database template lookup failed:`, { 
      targetModel,
      enhancerModel,
      jobType,
      useCase,
      contentMode,
      error: error?.message || 'No data returned'
    });
    throw new Error(`No template found in database for ${targetModel}/${enhancerModel}/${jobType}/${useCase}/${contentMode}`);
  }

  console.log(`✅ Database template loaded: "${data.template_name}" (ID: ${data.id})`);
  return data;
}

/**
 * Get database negative prompts
 */
export async function getDatabaseNegativePrompts(
  modelType: string,
  contentMode: string
): Promise<string> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data, error } = await supabase
    .from('negative_prompts')
    .select('prompt_text')
    .eq('model_type', modelType)
    .eq('content_mode', contentMode)
    .eq('is_active', true)
    .order('priority', { ascending: true });

  if (error || !data || data.length === 0) {
    console.warn(`⚠️ No negative prompts found for ${modelType}_${contentMode}`);
    return '';
  }

  const combined = data.map(d => d.prompt_text).join(', ');
  console.log(`✅ Database negative prompts loaded for ${modelType}_${contentMode}`);
  
  return combined;
}