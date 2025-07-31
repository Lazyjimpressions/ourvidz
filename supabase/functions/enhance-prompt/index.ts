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
            enhancementResult = await this.enhanceWithHardcodedFallback(request, modelType, contentMode)
            enhancementResult.fallback_level = 3
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
   * Extract model type from job type
   */
  private getModelTypeFromJobType(jobType: string): string {
    if (jobType?.includes('sdxl')) return 'sdxl'
    if (jobType?.includes('wan') || jobType?.includes('video')) return 'wan'
    if (jobType?.includes('qwen_instruct')) return 'qwen_instruct'
    if (jobType?.includes('qwen_base')) return 'qwen_base'
    return 'sdxl' // Default fallback
  }

  /**
   * Get dynamic template from database with better fallback logic
   */
  private async getDynamicTemplate(modelType: string, useCase: string, contentMode: string) {
    const template = await getDatabaseTemplate(modelType, useCase, contentMode)
    if (!template) {
      throw new Error(`No template found for ${modelType}/${useCase}/${contentMode}`)
    }
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
   * Enhance using template (database or cached)
   */
  private async enhanceWithTemplate(request: any, template: any, contentMode: string) {
    const workerType = this.selectWorkerType(template.model_type, request.preferences?.enhancement_style)
    
    try {
      let result
      if (workerType === 'chat') {
        result = await this.enhanceWithChatWorker(request, template)
      } else {
        result = await this.enhanceWithWanWorker(request, template)
      }

      // Apply token optimization
      const optimized = this.optimizeTokens(result.enhanced_prompt, template.token_limit || 512)

      return {
        enhanced_prompt: optimized.enhanced_prompt,
        strategy: `dynamic_${template.model_type}_${workerType}`,
        template_name: template.template_name || 'dynamic',
        model_used: workerType === 'chat' ? 'qwen_instruct' : 'qwen_base',
        token_count: optimized.token_count,
        compressed: optimized.compressed
      }

    } catch (workerError) {
      console.log('⚠️ Worker failed, using rule-based enhancement:', workerError.message)
      return this.enhanceWithRules(request, template.model_type, contentMode)
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
   * Select worker type based on model and user preference
   */
  private selectWorkerType(modelType: string, userPreference?: string): 'chat' | 'wan' {
    if (userPreference === 'qwen_instruct') return 'chat'
    if (userPreference === 'qwen_base') return 'wan'
    
    // Default logic
    if (modelType === 'qwen_instruct') return 'chat'
    if (modelType === 'qwen_base') return 'wan'
    if (modelType === 'sdxl') return 'chat' // Better instruction following for images
    if (modelType === 'wan') return 'wan' // Optimized for video
    
    return 'chat' // Default fallback
  }

  /**
   * Enhance with chat worker (Qwen Instruct)
   */
  private async enhanceWithChatWorker(request: any, template: any) {
    const chatWorkerUrl = await this.getChatWorkerUrl()
    if (!chatWorkerUrl) {
      throw new Error('No chat worker available')
    }

    const payload = {
      model: "Qwen/Qwen2.5-7B-Instruct",
      messages: [
        { role: "system", content: template.system_prompt },
        { role: "user", content: `Content Mode: ${template.content_mode || 'nsfw'}\nOriginal prompt: ${request.prompt}` }
      ],
      max_tokens: template.token_limit || 256,
      temperature: 0.7,
      top_p: 0.9,
      stream: false
    }

    const response = await fetch(`${chatWorkerUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('WAN_WORKER_API_KEY')}`
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`Chat worker failed: ${response.status}`)
    }

    const result = await response.json()
    return {
      enhanced_prompt: result.choices?.[0]?.message?.content?.trim() || request.prompt
    }
  }

  /**
   * Enhance with WAN worker (Qwen Base)
   */
  private async enhanceWithWanWorker(request: any, template: any) {
    const wanWorkerUrl = await this.getWanWorkerUrl()
    if (!wanWorkerUrl) {
      throw new Error('No WAN worker available')
    }

    const payload = {
      inputs: `${template.system_prompt}\n\nOriginal prompt: ${request.prompt}`,
      parameters: {
        max_new_tokens: template.token_limit || 150,
        temperature: 0.7,
        top_p: 0.9,
        do_sample: true,
        return_full_text: false
      }
    }

    const response = await fetch(`${wanWorkerUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('WAN_WORKER_API_KEY')}`
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`WAN worker failed: ${response.status}`)
    }

    const result = await response.json()
    return {
      enhanced_prompt: result.generated_text?.trim() || request.prompt
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

      return data?.worker_url || null
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

      return data?.worker_url || null
    } catch (error) {
      console.error('Failed to get WAN worker URL:', error)
      return null
    }
  }

  /**
   * Optimize tokens if over limit
   */
  private optimizeTokens(prompt: string, tokenLimit: number) {
    const tokenCount = this.estimateTokens(prompt)
    
    if (tokenCount <= tokenLimit) {
      return {
        enhanced_prompt: prompt,
        token_count: tokenCount,
        compressed: false
      }
    }

    // Simple compression: remove redundant words and trim
    let compressed = prompt
      .replace(/\b(\w+)\s+\1\b/gi, '$1') // Remove repeated words
      .replace(/,\s*,/g, ',') // Remove double commas
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim()

    // If still too long, truncate intelligently
    if (this.estimateTokens(compressed) > tokenLimit) {
      const words = compressed.split(' ')
      const targetWords = Math.floor(tokenLimit * 0.75) // Conservative estimate
      compressed = words.slice(0, targetWords).join(' ')
    }

    return {
      enhanced_prompt: compressed,
      token_count: this.estimateTokens(compressed),
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