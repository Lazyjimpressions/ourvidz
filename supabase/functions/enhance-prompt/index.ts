import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { EdgeFunctionMonitor, performanceTest, testContentDetection } from '../_shared/monitoring.ts'
import { getCachedData, getTemplateFromCache, detectContentTier, getDatabaseTemplate } from '../_shared/cache-utils.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  const monitor = new EdgeFunctionMonitor('enhance-prompt')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Run content detection tests on startup (development only)
    if (Deno.env.get('ENVIRONMENT') === 'development') {
      testContentDetection()
    }
    const { prompt, jobType, format, quality, selectedModel = 'qwen_instruct', user_id, regeneration, selectedPresets = [] } = await req.json()

    if (!prompt) {
      return new Response(JSON.stringify({
        error: 'Prompt is required',
        success: false
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    console.log('🎯 Dynamic enhance prompt request:', {
      prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
      jobType,
      format,
      quality,
      selectedModel,
      promptLength: prompt.length
    })

    // Initialize Dynamic Enhancement Orchestrator
    const orchestrator = new DynamicEnhancementOrchestrator()
    
    // Use the orchestrator to enhance the prompt
    const enhancementResult = await orchestrator.enhancePrompt({
      prompt,
      job_type: jobType,
      quality: quality as 'fast' | 'high',
      user_id,
      selectedModel: selectedModel, // Pass selectedModel directly
      preferences: { enhancement_style: selectedModel },
      regeneration: regeneration || false
    })

    console.log('✅ Dynamic enhanced prompt generated:', {
      originalLength: prompt.length,
      enhancedLength: enhancementResult.enhanced_prompt.length,
      strategy: enhancementResult.strategy,
      contentMode: enhancementResult.content_mode
    })

    // Finalize monitoring
    const metrics = monitor.finalize()
    
    return new Response(JSON.stringify({
      success: true,
      original_prompt: prompt,
      enhanced_prompt: enhancementResult.enhanced_prompt,
      enhancement_strategy: enhancementResult.strategy,
      enhancement_metadata: {
        original_length: prompt.length,
        enhanced_length: enhancementResult.enhanced_prompt.length,
        expansion_percentage: ((enhancementResult.enhanced_prompt.length / prompt.length) * 100).toFixed(1),
        job_type: jobType,
        format,
        quality,
        content_mode: enhancementResult.content_mode,
        template_used: enhancementResult.template_name,
        model_used: enhancementResult.model_used,
        token_count: enhancementResult.token_count,
        compression_applied: enhancementResult.compressed,
        fallback_level: enhancementResult.fallback_level,
        execution_time_ms: metrics.executionTime,
        cache_hit: metrics.cacheHit
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    monitor.recordError(error, { prompt: prompt?.substring(0, 100) })
    console.error('❌ Dynamic enhance prompt error:', error)
    return new Response(JSON.stringify({
      error: 'Failed to enhance prompt',
      success: false,
      details: error.message,
      execution_time_ms: monitor.finalize().executionTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

/**
 * Dynamic Enhancement Orchestrator using database-driven prompts
 */
class DynamicEnhancementOrchestrator {
  
  /**
   * Main enhancement method with SFW/NSFW detection and fallback system
   */
  async enhancePrompt(request: any) {
    const startTime = Date.now()
    
    try {
      // Detect content mode (simplified from 3-tier to SFW/NSFW)
      const contentMode = await this.detectContentMode(request.prompt)
      console.log('🔍 Content mode detected:', contentMode)

      // Get model type from job type
      const modelType = this.getModelTypeFromJobType(request.job_type)
      console.log('🤖 Model type selected:', modelType)

      // Try to get dynamic template from database first
      let enhancementResult
      try {
        const template = await this.getDynamicTemplate(modelType, 'enhancement', contentMode)
        enhancementResult = await this.enhanceWithTemplate(request, template, contentMode)
        enhancementResult.fallback_level = 0
      } catch (dbError) {
        console.log('⚠️ Database template failed, trying cache:', dbError.message)
        
        try {
          const cachedTemplate = await this.getCachedTemplate(modelType, 'enhancement', contentMode)
          enhancementResult = await this.enhanceWithTemplate(request, cachedTemplate, contentMode)
          enhancementResult.fallback_level = 1
        } catch (cacheError) {
          console.log('⚠️ Cache failed, using database-driven template fallback:', cacheError.message)
          
          // Use database templates even without workers
          try {
            const dbTemplate = await this.getDynamicTemplate(modelType, 'enhancement', contentMode)
            enhancementResult = await this.enhanceWithRules(request, modelType, contentMode, dbTemplate)
            enhancementResult.fallback_level = 2
          } catch (dbTemplateError) {
            console.log('⚠️ Database template fallback failed, using hardcoded:', dbTemplateError.message)
            console.log('💥 Template lookup criteria:', { modelType, useCase: 'enhancement', contentMode })
            enhancementResult = await this.enhanceWithHardcodedFallback(request, modelType, contentMode)
            enhancementResult.fallback_level = 3
            enhancementResult.template_name = 'hardcoded_fallback'
          }
        }
      }

      return {
        enhanced_prompt: enhancementResult.enhanced_prompt,
        strategy: enhancementResult.strategy,
        content_mode: contentMode,
        template_name: enhancementResult.template_name,
        model_used: enhancementResult.model_used,
        token_count: enhancementResult.token_count,
        compressed: enhancementResult.compressed,
        enhancement_time_ms: Date.now() - startTime,
        fallback_level: enhancementResult.fallback_level
      }

    } catch (error) {
      console.error('💥 Enhancement failed completely:', error)
      return {
        enhanced_prompt: request.prompt,
        strategy: 'error_fallback',
        content_mode: 'nsfw',
        template_name: 'error',
        model_used: 'none',
        token_count: this.estimateTokens(request.prompt),
        compressed: false,
        enhancement_time_ms: Date.now() - startTime,
        fallback_level: 3
      }
    }
  }

  /**
   * Simplified content detection using cached terms
   */
  private async detectContentMode(prompt: string): Promise<'sfw' | 'nsfw'> {
    const cache = await getCachedData()
    return detectContentTier(prompt, cache)
  }

  /**
   * Extract model type from job type (PHASE 2 FIX)
   */
  private getModelTypeFromJobType(jobType: string): string {
    // PHASE 2 FIX: Handle full job_type patterns correctly
    if (jobType?.includes('sdxl')) return 'sdxl'
    if (jobType?.includes('wan') || jobType?.includes('video')) return 'wan'
    if (jobType?.includes('qwen_instruct')) return 'qwen_instruct'
    if (jobType?.includes('qwen_base')) return 'qwen_base'
    
    // PHASE 2 FIX: Return actual job_type for template lookup
    console.log('🔧 Model type mapping:', { jobType, mappedType: jobType })
    return jobType || 'sdxl'
  }

  /**
   * Get dynamic template from database (PHASE 2 FIX)
   */
  private async getDynamicTemplate(modelType: string, useCase: string, contentMode: string) {
    // PHASE 2 FIX: Map job_type to correct enhancer_model for template lookup
    let lookupEnhancerModel = modelType
    if (modelType === 'sdxl_image_high' || modelType === 'sdxl_image_fast' || modelType === 'sdxl') {
      lookupEnhancerModel = 'qwen_instruct' // Default enhancer for SDXL
    }
    
    console.log('🔍 Template lookup:', { 
      originalModelType: modelType, 
      lookupEnhancerModel, 
      useCase, 
      contentMode 
    })
    
    const template = await getDatabaseTemplate(lookupEnhancerModel, useCase, contentMode)
    if (!template) {
      throw new Error(`No template found for enhancer_model=${lookupEnhancerModel}/${useCase}/${contentMode}`)
    }
    
    console.log('✅ Template found:', { 
      template_name: template.template_name,
      enhancer_model: template.enhancer_model,
      id: template.id
    })
    
    return template
  }

  /**
   * Get cached template from system_config using shared utilities
   */
  private async getCachedTemplate(modelType: string, useCase: string, contentMode: string) {
    const cache = await getCachedData()
    const template = getTemplateFromCache(cache, modelType, useCase, contentMode)
    
    if (!template) {
      throw new Error(`Cached template not found: ${modelType}/${useCase}/${contentMode}`)
    }

    return template
  }

  /**
   * Enhance using template (database or cached) - FIXED worker selection
   */
  private async enhanceWithTemplate(request: any, template: any, contentMode: string) {
    // Use selectedModel directly from request, fallback to preferences
    const selectedModel = request.selectedModel || request.preferences?.enhancement_style
    const workerType = this.selectWorkerType(template.enhancer_model || template.model_type, selectedModel)
    
    console.log('🚀 Enhancing with template:', {
      template: template.template_name || 'unnamed_template',
      enhancerModel: template.enhancer_model,
      modelType: template.model_type,
      selectedModel,
      workerType,
      contentMode
    })
    
    try {
      let result
      if (workerType === 'chat') {
        console.log('💬 Using chat worker for enhancement')
        result = await this.enhanceWithChatWorker(request, template)
      } else {
        console.log('🎬 Using WAN worker for enhancement')
        result = await this.enhanceWithWanWorker(request, template)
      }

      // Apply model-specific token optimization with visibility limits
      const modelType = this.getModelTypeFromJobType(request.job_type)
      const optimized = this.optimizeTokens(result.enhanced_prompt, modelType)

      return {
        enhanced_prompt: optimized.enhanced_prompt,
        strategy: `${template.template_name}_${workerType}`, // PHASE 4 FIX: Better strategy naming
        template_name: template.template_name || 'dynamic',
        model_used: workerType === 'chat' ? 'qwen_instruct' : 'qwen_base',
        token_count: optimized.token_count,
        compressed: optimized.compressed
      }

    } catch (workerError) {
      console.log('⚠️ Worker failed, using rule-based enhancement:', workerError.message)
      return this.enhanceWithRules(request, template.model_type, contentMode, template)
    }
  }

  /**
   * Hardcoded fallback templates (same as current system)
   */
  private async enhanceWithHardcodedFallback(request: any, modelType: string, contentMode: string) {
    const fallbackTemplates = {
      'sdxl': {
        'nsfw': {
          system_prompt: 'You are an expert prompt engineer specializing in adult content generation. Transform the user prompt into a detailed, explicit description that captures sensual details, intimate scenarios, and adult themes. Focus on visual elements, emotions, and explicit content while maintaining artistic quality.',
          token_limit: 150
        },
        'sfw': {
          system_prompt: 'You are an expert prompt engineer. Transform the user prompt into a detailed, family-friendly description that captures visual elements, emotions, and artistic quality. Focus on composition, lighting, mood, and aesthetic details while keeping all content appropriate for general audiences.',
          token_limit: 150
        }
      },
      'wan': {
        'nsfw': {
          system_prompt: 'Enhance for adult video generation with explicit scenarios, intimate actions, and sensual details:',
          token_limit: 200
        },
        'sfw': {
          system_prompt: 'Enhance for family-friendly video generation with detailed scenes and appropriate content:',
          token_limit: 200
        }
      },
      'qwen_instruct': {
        'nsfw': {
          system_prompt: 'You are an expert prompt engineer specializing in adult content generation. Transform the user prompt into a detailed, explicit description that captures sensual details, intimate scenarios, and adult themes.',
          token_limit: 256
        },
        'sfw': {
          system_prompt: 'You are an expert prompt engineer. Transform the user prompt into a detailed, family-friendly description that captures visual elements and artistic quality.',
          token_limit: 256
        }
      },
      'qwen_base': {
        'nsfw': {
          system_prompt: 'Enhance this prompt for adult content generation with explicit visual details and intimate scenarios:',
          token_limit: 150
        },
        'sfw': {
          system_prompt: 'Enhance this prompt for artistic content generation with detailed visual and aesthetic elements:',
          token_limit: 150
        }
      }
    }

    const template = fallbackTemplates[modelType]?.[contentMode] || fallbackTemplates['sdxl']['nsfw']
    
    return this.enhanceWithTemplate(request, {
      model_type: modelType,
      system_prompt: template.system_prompt,
      token_limit: template.token_limit,
      template_name: 'hardcoded_fallback'
    }, contentMode)
  }

  /**
   * Rule-based enhancement when workers fail - now uses database templates when available
   */
  private enhanceWithRules(request: any, modelType: string, contentMode: string, template?: any) {
    const { prompt } = request
    let enhanced = prompt

    if (template?.system_prompt) {
      // Use the database template's system prompt as guidance for rule-based enhancement
      const systemPrompt = template.system_prompt.toLowerCase()
      
      if (systemPrompt.includes('explicit') || systemPrompt.includes('adult') || systemPrompt.includes('sensual')) {
        enhanced = `${template.system_prompt.split('.')[0]}: ${enhanced}`
      } else if (systemPrompt.includes('artistic') || systemPrompt.includes('professional') || systemPrompt.includes('detailed')) {
        enhanced = `${template.system_prompt.split('.')[0]}: ${enhanced}`
      } else {
        // Generic template enhancement
        enhanced = `Enhanced prompt following template guidelines: ${enhanced}`
      }
    } else {
      // Original fallback logic
      if (contentMode === 'nsfw') {
        enhanced = `Detailed explicit scene: ${enhanced}, sensual lighting, intimate atmosphere, adult themes`
      } else {
        enhanced = `Artistic composition: ${enhanced}, professional lighting, high composition quality`
      }
    }

    // Add model-specific quality tags
    if (modelType === 'sdxl') {
      enhanced += contentMode === 'nsfw' 
        ? ', masterpiece, best quality, detailed, sensual, intimate'
        : ', masterpiece, best quality, detailed, artistic, professional'
    } else if (modelType === 'wan') {
      enhanced += contentMode === 'nsfw'
        ? ', smooth motion, intimate video, sensual movement'
        : ', smooth motion, cinematic, professional video'
    }

    return {
      enhanced_prompt: enhanced,
      strategy: template ? `template_rule_based_${modelType}_${contentMode}` : `rule_based_${modelType}_${contentMode}`,
      template_name: template?.template_name || 'rule_based',
      model_used: 'rule_based',
      token_count: this.estimateTokens(enhanced),
      compressed: false
    }
  }

  /**
   * Select worker type based on model and user preference - FIXED LOGIC
   */
  private selectWorkerType(modelType: string, userPreference?: string): 'chat' | 'wan' {
    console.log('🔧 Worker selection:', { modelType, userPreference })
    
    // Priority 1: User preference is the definitive source
    if (userPreference === 'qwen_instruct') {
      console.log('👤 User selected qwen_instruct -> chat worker')
      return 'chat'
    }
    if (userPreference === 'qwen_base') {
      console.log('👤 User selected qwen_base -> wan worker')  
      return 'wan'
    }
    
    // Priority 2: Model type fallback (when no explicit user preference)
    if (modelType === 'sdxl') {
      console.log('🤖 Model sdxl -> default qwen_instruct -> chat worker')
      return 'chat'
    }
    if (modelType === 'wan' || modelType === 'video') {
      console.log('🤖 Model wan/video -> default qwen_base -> wan worker')
      return 'wan'
    }
    
    // Priority 3: Final fallback based on efficiency
    console.log('🔄 Default fallback -> chat worker (qwen_instruct)')
    return 'chat'
  }

  /**
   * Enhance with chat worker (Qwen Instruct)
   */
  private async enhanceWithChatWorker(request: any, template: any) {
    const chatWorkerUrl = await this.getChatWorkerUrl()
    if (!chatWorkerUrl) {
      throw new Error('No chat worker available')
    }

    // Use the chat worker's expected payload format
    const payload = {
      prompt: request.prompt,
      job_type: request.job_type,
      system_prompt: template.system_prompt,
      model: "Qwen/Qwen2.5-7B-Instruct",
      max_tokens: template.token_limit || 256,
      temperature: 0.7
    }

    console.log('🔧 Chat worker payload:', JSON.stringify(payload, null, 2))

    // Use the correct /enhance endpoint without authentication
    const response = await fetch(`${chatWorkerUrl}/enhance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`⚠️ Chat worker error (${response.status}): ${errorText}`)
      throw new Error(`Chat worker failed: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('✅ Chat worker response:', JSON.stringify(result, null, 2))
    
    // Handle the chat worker's response format
    return {
      enhanced_prompt: result.enhanced_prompt || result.result || result.response || request.prompt
    }
  }

  /**
   * Enhance with WAN worker (Qwen Base) - FIXED: Preserve original prompt
   */
  private async enhanceWithWanWorker(request: any, template: any) {
    const wanWorkerUrl = await this.getWanWorkerUrl()
    if (!wanWorkerUrl) {
      throw new Error('No WAN worker available')
    }

    // CRITICAL FIX: Structure payload to separate original prompt from system context
    const payload = {
      inputs: `${template.system_prompt}\n\nEnhance this prompt: "${request.prompt}"\n\nEnhanced version:`,
      parameters: {
        max_new_tokens: template.token_limit || 150,
        temperature: 0.7,
        top_p: 0.9,
        do_sample: true,
        return_full_text: false
      }
    }

    console.log('🔧 WAN worker payload:', {
      originalPrompt: request.prompt,
      systemPrompt: template.system_prompt,
      inputStructure: 'separated_context',
      tokenLimit: template.token_limit || 150
    })

    const response = await fetch(`${wanWorkerUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('WAN_WORKER_API_KEY')}`
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`⚠️ WAN worker error (${response.status}): ${errorText}`)
      throw new Error(`WAN worker failed: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    
    // CRITICAL FIX: Clean and validate the response to ensure we only get the enhanced portion
    let enhancedText = result.generated_text?.trim() || request.prompt
    
    // Remove any residual system prompt or original prompt from the response
    if (enhancedText.includes('Enhanced version:')) {
      enhancedText = enhancedText.split('Enhanced version:').pop()?.trim() || enhancedText
    }
    
    // Remove quotes if the model wrapped the response
    if (enhancedText.startsWith('"') && enhancedText.endsWith('"')) {
      enhancedText = enhancedText.slice(1, -1)
    }
    
    // Fallback to original if enhancement is empty or too similar
    if (!enhancedText || enhancedText.length < 10 || enhancedText === request.prompt) {
      enhancedText = request.prompt
    }

    console.log('✅ WAN worker response processed:', {
      originalPrompt: request.prompt,
      enhancedPrompt: enhancedText,
      responseLength: enhancedText.length,
      expansionRatio: (enhancedText.length / request.prompt.length).toFixed(2)
    })
    
    return {
      enhanced_prompt: enhancedText
    }
  }

  /**
   * Get chat worker URL
   */
  private async getChatWorkerUrl(): Promise<string | null> {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      const { data, error } = await supabase.functions.invoke('get-active-worker-url', {
        body: { worker_type: 'chat' }
      })

      if (error) {
        console.error('❌ Failed to get chat worker URL:', error)
        return null
      }

      return data?.worker_url || data?.workerUrl || null
    } catch (error) {
      console.error('Failed to get chat worker URL:', error)
      return null
    }
  }

  /**
   * Get WAN worker URL
   */
  private async getWanWorkerUrl(): Promise<string | null> {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      const { data, error } = await supabase.functions.invoke('get-active-worker-url', {
        body: { worker_type: 'wan' }
      })

      if (error) {
        console.error('❌ Failed to get WAN worker URL:', error)
        return null
      }

      return data?.worker_url || data?.workerUrl || null
    } catch (error) {
      console.error('Failed to get WAN worker URL:', error)
      return null
    }
  }

  /**
   * Optimize prompt for token limits with model-specific limits for visibility
   */
  private optimizeTokens(prompt: string, modelType: string = 'sdxl', tokenLimit?: number): { enhanced_prompt: string, token_count: number, compressed: boolean } {
    // Set model-specific token limits for visibility (90 for SDXL, 150 for WAN)
    if (!tokenLimit) {
      tokenLimit = modelType.includes('wan') || modelType.includes('image7b') ? 150 : 90;
    }
    
    console.log(`🎯 Token optimization: ${modelType} limit=${tokenLimit}, original=${this.estimateTokens(prompt)} tokens`);
    const estimatedTokens = this.estimateTokens(prompt)
    
    if (estimatedTokens <= tokenLimit) {
      return {
        enhanced_prompt: prompt,
        token_count: estimatedTokens,
        compressed: false
      }
    }

    // PHASE 3 FIX: Aggressive compression for CLIP 77-token limit
    let compressed = prompt
      .replace(/\b(very|really|quite|rather|extremely|incredibly|absolutely|highly|ultra|super)\s+/gi, '')
      .replace(/\b(the|a|an|this|that|these|those)\s+/gi, ' ')
      .replace(/\b(and|or|but|so|yet|for|nor)\s+/gi, ', ')
      .replace(/\s+/g, ' ')
      .replace(/[,]{2,}/g, ',')
      .trim()

    const compressedTokens = this.estimateTokens(compressed)
    
    if (compressedTokens <= tokenLimit) {
      console.log(`📝 PHASE 3: Compressed from ${estimatedTokens} to ${compressedTokens} tokens`)
      return {
        enhanced_prompt: compressed,
        token_count: compressedTokens,
        compressed: true
      }
    }

    // PHASE 3 FIX: Hard truncation for CLIP compliance
    const wordsPerToken = 0.75
    const maxWords = Math.floor(tokenLimit * wordsPerToken)
    const words = compressed.split(' ')
    
    if (words.length > maxWords) {
      compressed = words.slice(0, maxWords).join(' ')
      console.log(`✂️ PHASE 3: Hard truncated to ${maxWords} words for CLIP compliance`)
    }

    return {
      enhanced_prompt: compressed,
      token_count: Math.min(this.estimateTokens(compressed), tokenLimit),
      compressed: true
    }
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }
}

/**
 * Standalone token estimation function
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}