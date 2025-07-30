/**
 * Shared cache utilities for edge functions
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface CacheData {
  prompt_templates: Record<string, any>;
  negative_prompts: Record<string, any>;
  nsfw_terms: string[];
  metadata: {
    refreshed_at: string;
    template_count: number;
    negative_prompt_count: number;
    hash: string;
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
    if (!cache.prompt_templates || !cache.negative_prompts || !cache.metadata) {
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
      templateCount: Object.keys(cache.prompt_templates).length,
      negativePromptCount: Object.keys(cache.negative_prompts).length,
      nsfwTermCount: cache.nsfw_terms?.length || 0,
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

  const templateKey = `${modelType}_${useCase}_${contentMode}`;
  const template = cache.prompt_templates[templateKey];
  
  if (!template) {
    console.warn(`⚠️ Template not found in cache: ${templateKey}`);
    return null;
  }

  console.log(`✅ Template found in cache: ${templateKey}`);
  return template;
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

  // Try specific negative prompt first
  const specificKey = `${modelType}_${contentMode}`;
  let negativePrompt = cache.negative_prompts[specificKey];
  
  // Fallback to model-specific or general
  if (!negativePrompt) {
    negativePrompt = cache.negative_prompts[modelType] || cache.negative_prompts['general'] || '';
  }

  // Merge with user negative prompt
  if (userNegativePrompt && userNegativePrompt.trim()) {
    negativePrompt = userNegativePrompt + (negativePrompt ? `, ${negativePrompt}` : '');
  }

  console.log(`✅ Negative prompt generated for ${specificKey}:`, {
    hasSystemPrompt: !!cache.negative_prompts[specificKey],
    hasUserPrompt: !!userNegativePrompt,
    finalLength: negativePrompt.length
  });

  return negativePrompt;
}

/**
 * Detect SFW/NSFW content using cached terms
 */
export function detectContentTier(prompt: string, cache: CacheData | null): 'sfw' | 'nsfw' {
  const lowerPrompt = prompt.toLowerCase();
  
  // Use cached NSFW terms if available
  let nsfwTerms = cache?.nsfw_terms || [];
  
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
 * Fallback to database if cache fails
 */
export async function getDatabaseTemplate(
  modelType: string,
  useCase: string,
  contentMode: string
): Promise<any> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  console.log(`🔄 Fetching template from database: ${modelType}_${useCase}_${contentMode}`);

  const { data, error } = await supabase
    .from('prompt_templates')
    .select('*')
    .eq('model_type', modelType)
    .eq('use_case', useCase)
    .eq('content_mode', contentMode)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error(`No template found in database for ${modelType}/${useCase}/${contentMode}`);
  }

  console.log(`✅ Database template loaded: ${data.template_name}`);
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