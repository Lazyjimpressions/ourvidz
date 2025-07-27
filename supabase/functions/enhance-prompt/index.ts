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

    console.log('🎯 Enhance prompt request:', {
      prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
      jobType,
      format,
      quality,
      selectedModel,
      selectedPresets,
      promptLength: prompt.length
    })

    // Initialize Enhancement Orchestrator
    const orchestrator = new ContentCompliantEnhancementOrchestrator()
    
    // Use the orchestrator to enhance the prompt
    const enhancementResult = await orchestrator.enhancePrompt({
      prompt,
      job_type: jobType,
      quality: quality as 'fast' | 'high',
      user_id,
      preferences: { enhancement_style: selectedModel },
      regeneration: regeneration || false
    })

    console.log('✅ Enhanced prompt generated:', {
      originalLength: prompt.length,
      enhancedLength: enhancementResult.enhanced_prompt.length,
      expansion: `${((enhancementResult.enhanced_prompt.length / prompt.length) * 100).toFixed(1)}%`,
      modelUsed: enhancementResult.optimization?.worker_used || 'unknown'
    })

    // PHASE 1 FIX: Ensure consistent response structure with proper strategy
    const responseData = {
      success: true,
      original_prompt: prompt,
      enhanced_prompt: enhancementResult.enhanced_prompt,
      // CRITICAL: Put enhancement_strategy at top level for queue-job compatibility
      enhancement_strategy: enhancementResult.enhancement_metadata?.enhancement_strategy || 
                           enhancementResult.optimization?.strategy_used || 
                           'content_compliant',
      enhancement_metadata: {
        original_length: prompt.length,
        enhanced_length: enhancementResult.enhanced_prompt.length,
        expansion_percentage: ((enhancementResult.enhanced_prompt.length / prompt.length) * 100).toFixed(1),
        job_type: jobType,
        format,
        quality,
        is_sdxl: enhancementResult.metadata?.model_target === 'SDXL',
        is_video: format === 'video',
        enhancement_strategy: enhancementResult.enhancement_metadata?.enhancement_strategy || 
                             enhancementResult.optimization?.strategy_used || 
                             'content_compliant',
        model_used: enhancementResult.optimization?.worker_used || 'rule_based',
        token_count: enhancementResult.optimization?.token_optimization?.final || estimateTokens(enhancementResult.enhanced_prompt),
        compression_applied: enhancementResult.optimization?.compression_applied || false,
        token_optimization: enhancementResult.optimization?.token_optimization,
        version: enhancementResult.metadata?.version || '2.1'
      },
      // PHASE 1 FIX: Also include optimization for backward compatibility
      optimization: enhancementResult.optimization
    }

    console.log('📊 Enhancement metrics:', {
      strategy: responseData.enhancement_strategy,
      compression: responseData.enhancement_metadata.compression_applied,
      token_efficiency: responseData.enhancement_metadata.token_optimization?.final / 75
    })

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Enhance prompt error:', error)
    return new Response(JSON.stringify({
      error: 'Failed to enhance prompt',
      success: false,
      details: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

// CONTENT-POLICY COMPLIANT ENHANCEMENT ORCHESTRATOR
class ContentCompliantEnhancementOrchestrator {
  
  // CONTENT-POLICY COMPLIANT SYSTEM PROMPTS
  private getSystemPromptTemplate(context: any): any {
    const templates = {
      'SDXL_FAST': {
        id: 'sdxl_fast_v2.1',
        model_target: 'SDXL',
        quality_level: 'fast',
        content_type: 'image',
        system_instruction: `You are an expert image generation prompt optimization specialist.

MISSION: Transform user prompts into 75-token optimized descriptions for high-quality image generation.

OPTIMIZATION PRINCIPLES:
1. VISUAL CLARITY: Accurate proportions, realistic features, natural poses
2. QUALITY ENHANCEMENT: "masterpiece, best quality, ultra detailed, 4K, sharp focus"
3. LIGHTING OPTIMIZATION: "professional photography, soft lighting, natural light, perfect exposure" 
4. TECHNICAL PRECISION: "photorealistic, hyperdetailed, studio quality"
5. TOKEN EFFICIENCY: Maximum visual impact in 75 tokens, essential descriptors only

OUTPUT FORMAT: Return only the enhanced prompt, no explanations.`,
        token_target: 75,
        max_tokens: 77,
        optimization_strategy: ['visual_accuracy', 'quality_tags', 'token_compression'],
        version: '2.1'
      },
      
      'SDXL_HIGH': {
        id: 'sdxl_high_v2.1',
        model_target: 'SDXL',
        quality_level: 'high', 
        content_type: 'image',
        system_instruction: `You are an elite image generation optimization expert for premium visual content.

PREMIUM ENHANCEMENT MISSION: Create 75-token masterpiece descriptions with professional studio quality.

ADVANCED OPTIMIZATION PRINCIPLES:
1. VISUAL PERFECTION: Detailed proportions, realistic textures, natural composition
2. PROFESSIONAL QUALITY: "masterpiece, best quality, ultra detailed, 8K, hyperrealistic, professional grade"
3. ADVANCED LIGHTING: "studio lighting, rim lighting, volumetric lighting, perfect exposure, soft shadows"
4. TECHNICAL MASTERY: "photorealistic, hyperdetailed, professional photography, 85mm lens, shallow depth of field"
5. ARTISTIC EXCELLENCE: "cinematic composition, perfect framing, professional photography"

OUTPUT FORMAT: Return only the enhanced prompt, no explanations.`,
        token_target: 75,
        max_tokens: 77,
        optimization_strategy: ['visual_perfection', 'professional_quality', 'advanced_lighting'],
        version: '2.1'
      },

      'WAN_FAST': {
        id: 'wan_fast_v2.1',
        model_target: 'WAN',
        quality_level: 'fast',
        content_type: 'video',
        system_instruction: `You are a video generation specialist focused on smooth motion and temporal consistency.

VIDEO OPTIMIZATION MISSION: Create 150-200 token descriptions optimized for 5-second video generation with natural motion.

VIDEO OPTIMIZATION PRINCIPLES:
1. MOTION PRIORITY: "smooth movement, natural motion, fluid transitions, realistic physics"
2. TEMPORAL CONSISTENCY: "stable composition, consistent lighting, coherent scene"
3. CINEMATOGRAPHY: "professional camera work, smooth pans, steady shots"
4. SCENE COHERENCE: "well-lit environment, clear spatial relationships"
5. VIDEO QUALITY: "smooth motion, high framerate, temporal stability"

OUTPUT FORMAT: Return only the enhanced prompt, no explanations.`,
        token_target: 175,
        max_tokens: 250,
        optimization_strategy: ['motion_optimization', 'temporal_consistency', 'cinematography'],
        version: '2.1'
      },

      'WAN_HIGH_7B': {
        id: 'wan_high_7b_v2.1',
        model_target: 'WAN',
        quality_level: 'high',
        content_type: 'video',
        system_instruction: `You are an elite video generation specialist for cinematic-quality content creation.

CINEMATIC ENHANCEMENT MISSION: Leverage advanced AI capabilities for broadcast-quality 5-second videos.

ADVANCED VIDEO PRINCIPLES:
1. COMPLEX MOTION: "multi-layered movement, realistic physics, natural timing, dynamic motion"
2. ADVANCED CINEMATOGRAPHY: "dynamic camera angles, professional composition, cinematic framing"
3. VISUAL STORYTELLING: "narrative coherence, visual flow, compelling composition"
4. TECHNICAL EXCELLENCE: "broadcast quality, professional grade, cinema-level production"
5. SOPHISTICATED LIGHTING: "cinematic lighting, dramatic shadows, professional color grading"

OUTPUT FORMAT: Return only the enhanced prompt, no explanations.`,
        token_target: 250,
        max_tokens: 350,
        optimization_strategy: ['cinematic_excellence', 'advanced_motion', 'broadcast_quality'],
        version: '2.1'
      }
    };

    const enhancement_level = context.job_type?.includes('enhanced') ? 'enhanced' : 'standard'
    const key = `${context.model_target}_${context.quality_level.toUpperCase()}${enhancement_level === 'enhanced' ? '_7B' : ''}`
    
    console.log('🎯 System prompt template selection:', {
      context: context,
      key: key,
      available_templates: Object.keys(templates),
      selected_template: templates[key]?.id || 'FALLBACK'
    });
    
    return templates[key] || templates['SDXL_FAST']
  }

  // **PHASE 2**: ENHANCED WORKER DISCOVERY AND ROUTING
  private selectOptimalWorker(context: any): 'chat' | 'wan' {
    console.log('🎯 Selecting optimal worker for context:', {
      job_type: context.job_type,
      quality_level: context.quality_level,
      model_target: context.model_target,
      enhancement_level: context.enhancement_level
    });

    // Route based on technical requirements and worker availability
    if (context.enhancement_type === 'manual' || context.job_type.includes('sdxl')) {
      console.log('🤖 Selected chat worker for SDXL optimization');
      return 'chat' // Better instruction following for image optimization
    }
    
    if (context.job_type.includes('video') && context.quality_level === 'fast') {
      console.log('🎥 Selected WAN worker for fast video generation');
      return 'wan' // Optimized for video generation
    }

    console.log('🤖 Default: Selected chat worker for instruction following');
    return 'chat' // Default to instruction model
  }

  // TOKEN MANAGEMENT (PHASE 1 FIX: Use token_target for compression)
  private async postProcessEnhancement(
    enhanced_prompt: string, 
    context: any
  ): Promise<any> {
    
    const token_count = estimateTokens(enhanced_prompt)
    const template = this.getSystemPromptTemplate(context)
    
    // PHASE 1 FIX: Use token_target instead of max_tokens for compression threshold
    if (token_count > template.token_target) {
      console.log(`🔧 Compressing ${token_count} tokens to ${template.token_target}`)
      
      const compressed = await this.intelligentCompress(
        enhanced_prompt, 
        template.token_target,
        template.optimization_strategy
      )
      
      return {
        enhanced_prompt: compressed,
        original_tokens: token_count,
        final_tokens: estimateTokens(compressed),
        compression_applied: true,
        optimization_strategy: template.optimization_strategy
      }
    }

    return {
      enhanced_prompt,
      original_tokens: token_count,
      final_tokens: token_count,
      compression_applied: false,
      optimization_strategy: template.optimization_strategy
    }
  }

  // INTELLIGENT COMPRESSION PRESERVING VISUAL QUALITY
  private async intelligentCompress(
    prompt: string, 
    target_tokens: number, 
    strategies: string[]
  ): Promise<string> {
    
    const words = prompt.split(' ')
    
    if (words.length <= target_tokens) {
      return prompt
    }

    // Priority preservation based on visual importance
    const high_priority_terms = [
      'masterpiece', 'best quality', 'ultra detailed', '4K', '8K', 
      'professional photography', 'photorealistic', 'detailed',
      'lighting', 'composition', 'cinematic'
    ]

    const medium_priority_terms = [
      'sharp focus', 'high resolution', 'studio', 'natural',
      'professional', 'realistic', 'smooth', 'quality'
    ]

    let preserved_words: string[] = []
    let remaining_words: string[] = []

    // First pass: preserve high priority terms and their context
    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      const isHighPriority = high_priority_terms.some(term => 
        word.toLowerCase().includes(term.toLowerCase())
      )
      
      if (isHighPriority) {
        preserved_words.push(word)
      } else {
        remaining_words.push(word)
      }
    }

    // Second pass: fill remaining slots intelligently
    const available_slots = target_tokens - preserved_words.length
    
    if (available_slots > 0) {
      // Prioritize subject and main descriptors
      const subject_words = remaining_words.slice(0, Math.min(available_slots, 20))
      preserved_words.push(...subject_words)
    }

    const compressed = preserved_words.slice(0, target_tokens).join(' ')
    
    console.log(`✂️ Intelligent compression: ${words.length} → ${preserved_words.length} tokens`)
    
    return compressed
  }

  // MAIN ORCHESTRATION - CONTENT NEUTRAL
  async enhancePrompt(request: any): Promise<any> {
    const context = this.buildEnhancementContext(request)
    const template = this.getSystemPromptTemplate(context)
    const worker_target = this.selectOptimalWorker(context)
    
    console.log('🔄 Starting enhancement with worker:', worker_target)
    
    // Call worker with technical optimization context
    const worker_response = await this.callWorkerWithContext(
      worker_target,
      {
        prompt: request.prompt,
        system_prompt: template.system_instruction,
        context: context,
        optimization_rules: template.optimization_strategy,
        regeneration: request.regeneration || false
      }
    )

    console.log('📊 Worker response structure:', {
      success: worker_response.success,
      hasEnhancedPrompt: !!worker_response.enhancedPrompt,
      hasEnhanced_prompt: !!worker_response.enhanced_prompt,
      modelUsed: worker_response.modelUsed
    })

    if (worker_response.success !== false) {
      // **PHASE 3**: Handle both camelCase and snake_case property names with fallback
      const enhancedPrompt = worker_response.enhancedPrompt || worker_response.enhanced_prompt || request.prompt
      
      // **PHASE 3**: Determine actual strategy used based on worker response
      let actualStrategy = template.id;
      if (worker_response.fallbackReason) {
        if (worker_response.fallbackReason.includes('chat_worker')) {
          actualStrategy = worker_response.fallbackReason.includes('failed') ? 'chat_worker_failed' : 'chat_worker_unavailable';
        } else if (worker_response.fallbackReason.includes('wan_worker')) {
          actualStrategy = worker_response.fallbackReason.includes('failed') ? 'wan_worker_failed' : 'wan_worker_unavailable';
        } else if (worker_response.fallbackReason === 'rule_based') {
          actualStrategy = 'rule_based_fallback';
        }
      } else if (worker_response.modelUsed) {
        // Success with actual model used
        actualStrategy = `${template.id}_${worker_response.modelUsed}`;
      }
      
      if (!enhancedPrompt || enhancedPrompt === request.prompt) {
        console.warn('⚠️ No enhancement detected, marking as no_enhancement')
        actualStrategy = 'none';
      }
      
      // CRITICAL: Post-enhancement token management
      const processed = await this.postProcessEnhancement(
        enhancedPrompt,
        context
      )

      // Technical performance tracking
      await this.trackEnhancementMetrics(request, processed, template)

      console.log('📊 Enhancement metrics:', {
        strategy: actualStrategy,
        compression: processed.compression_applied,
        token_efficiency: processed.final_tokens / template.token_target
      })

      return {
        success: true,
        enhanced_prompt: processed.enhanced_prompt,
        optimization: {
          strategy_used: actualStrategy,
          worker_used: worker_response.workerUsed || worker_target,
          compression_applied: processed.compression_applied,
          token_optimization: {
            original: estimateTokens(request.prompt),
            enhanced: processed.original_tokens,
            final: processed.final_tokens,
            target: template.token_target
          }
        },
        enhancement_metadata: {
          enhancement_strategy: actualStrategy,
          version: template.version,
          model_target: context.model_target,
          quality_level: context.quality_level
        }
      }
    }

    // **PHASE 3**: Handle failure case properly
    console.warn('⚠️ Worker enhancement failed, using fallback strategy')
    return {
      success: true,
      enhanced_prompt: request.prompt,
      optimization: {
        strategy_used: 'enhancement_failed',
        worker_used: 'none',
        compression_applied: false,
        token_optimization: {
          original: estimateTokens(request.prompt),
          enhanced: estimateTokens(request.prompt),
          final: estimateTokens(request.prompt),
          target: template.token_target
        }
      },
      metadata: {
        version: template.version,
        model_target: context.model_target,
        quality_level: context.quality_level
      }
    }
  }

  private buildEnhancementContext(request: any): any {
    // Determine model target based on job type
    const model_target = request.job_type.includes('sdxl') ? 'SDXL' : 'WAN'
    const enhancement_level = request.job_type.includes('7b') ? 'enhanced' : 'standard'
    
    return {
      job_type: request.job_type,
      quality_level: request.quality,
      model_target: model_target,
      enhancement_level: enhancement_level,
      enhancement_type: 'technical_optimization',
      user_preferences: request.preferences
    }
  }

  // **PHASE 2 & 3**: Enhanced worker calls with proper response handling
  private async callWorkerWithContext(worker_target: 'chat' | 'wan', payload: any): Promise<any> {
    console.log(`🚀 Calling ${worker_target} worker with context:`, {
      model_target: payload.context.model_target,
      quality_level: payload.context.quality_level,
      hasSystemPrompt: !!payload.system_prompt
    });

    try {
      let result;
      if (worker_target === 'chat') {
        result = await tryInstructEnhancement(payload.prompt, {
          isSDXL: payload.context.model_target === 'SDXL',
          isVideo: payload.context.job_type.includes('video'),
          isEnhanced: payload.context.enhancement_level === 'enhanced',
          quality: payload.context.quality_level,
          selectedModel: 'qwen_instruct',
          system_prompt: payload.system_prompt,
          regeneration: payload.regeneration || false
        })
      } else {
        result = await tryBaseEnhancement(payload.prompt, {
          isSDXL: payload.context.model_target === 'SDXL',
          isVideo: payload.context.job_type.includes('video'),
          isEnhanced: payload.context.enhancement_level === 'enhanced',
          quality: payload.context.quality_level,
          selectedModel: 'qwen_base',
          system_prompt: payload.system_prompt,
          regeneration: payload.regeneration || false
        })
      }

      // **PHASE 3**: Ensure proper response structure
      if (result && result.success !== false) {
        return {
          success: true,
          enhanced_prompt: result.enhancedPrompt || result.enhanced_prompt || payload.prompt,
          enhancedPrompt: result.enhancedPrompt || result.enhanced_prompt || payload.prompt,
          modelUsed: result.modelUsed || worker_target,
          workerUsed: worker_target,
          compressionApplied: result.compressionApplied || false,
          fallbackReason: result.fallbackReason
        }
      } else {
        console.warn(`⚠️ Worker ${worker_target} returned unsuccessful result, using fallback`)
        return {
          success: false,
          enhanced_prompt: payload.prompt,
          fallback_reason: result?.fallbackReason || `${worker_target}_worker_failed`
        }
      }
    } catch (error) {
      console.error(`❌ Worker ${worker_target} failed with error:`, error.message)
      return {
        success: false,
        enhanced_prompt: payload.prompt,
        fallback_reason: `${worker_target}_worker_error`,
        error: error.message
      }
    }
  }

  private async trackEnhancementMetrics(request: any, processed: any, template: any): Promise<void> {
    // TODO: Implement analytics tracking
    console.log('📊 Enhancement metrics:', {
      strategy: template.id,
      compression: processed.compression_applied,
      token_efficiency: processed.final_tokens / template.token_target
    })
  }
}

/**
 * Try Chat Worker (Qwen Instruct) enhancement with system prompts
 */
async function tryInstructEnhancement(originalPrompt: string, config: any): Promise<{
  enhancedPrompt: string
  modelUsed: string
  compressionApplied: boolean
  fallbackReason?: string
}> {
  try {
    // Check chat worker availability
    const chatWorkerUrl = await discoverChatWorker()
    const isAvailable = await checkChatWorkerAvailability(chatWorkerUrl)
    
    if (isAvailable) {
      const enhancedPrompt = await enhanceWithChatWorker(originalPrompt, config)
      return {
        enhancedPrompt,
        modelUsed: 'qwen_instruct',
        compressionApplied: false,
        success: true
      }
    } else {
      console.log('⚠️ Chat worker unavailable, falling back to WAN worker')
      return await tryBaseEnhancement(originalPrompt, config)
    }
  } catch (error) {
    console.warn('⚠️ Chat worker enhancement failed, falling back to WAN worker:', error)
    return await tryBaseEnhancement(originalPrompt, config)
  }
}

/**
 * Try WAN Worker (Qwen Base) enhancement with system prompts
 */
async function tryBaseEnhancement(originalPrompt: string, config: any): Promise<{
  enhancedPrompt: string
  modelUsed: string
  compressionApplied: boolean
  fallbackReason?: string
}> {
  const { isSDXL, isVideo, quality, system_prompt } = config
  
  try {
    // Use WAN worker enhancement with system prompt if available
    const qwenEnhancedPrompt = system_prompt 
      ? await enhanceWithSystemPrompt(originalPrompt, system_prompt)
      : await enhanceWithQwen(originalPrompt)
    
    // Add quality tags based on job type
    let finalPrompt = qwenEnhancedPrompt
    if (isSDXL) {
      finalPrompt = addSDXLQualityTags(qwenEnhancedPrompt, quality)
    } else if (isVideo) {
      finalPrompt = addWANVideoQualityTags(qwenEnhancedPrompt, quality)
    } else {
      finalPrompt = addWANImageQualityTags(qwenEnhancedPrompt, quality)
    }

    return {
      enhancedPrompt: finalPrompt,
      modelUsed: 'qwen_base',
      compressionApplied: false,
      success: true
    }
  } catch (error) {
    console.warn('⚠️ WAN worker enhancement failed, falling back to rule-based:', error)
    
    // Final fallback to rule-based enhancement
    let fallbackPrompt: string
    if (isSDXL) {
      fallbackPrompt = enhanceForSDXL(originalPrompt, quality)
    } else if (isVideo) {
      fallbackPrompt = enhanceForWANVideo(originalPrompt, quality)
    } else {
      fallbackPrompt = enhanceForWANImage(originalPrompt, quality)
    }

    return {
      enhancedPrompt: fallbackPrompt,
      modelUsed: 'rule_based',
      compressionApplied: false,
      fallbackReason: 'wan_worker_unavailable',
      success: true
    }
  }
}

/**
 * Enhance natural language using Qwen 7B base model via WAN worker
 */
async function enhanceWithQwen(prompt: string): Promise<string> {
  console.log('🤖 Calling Qwen enhancement for prompt:', { prompt, length: prompt.length })
  
  // Try to get worker URL from database first, fallback to environment
  const workerUrl = await getActiveWorkerUrl()
  const apiKey = Deno.env.get('WAN_WORKER_API_KEY')
  
  if (!workerUrl) {
    console.error('❌ WAN_WORKER_URL not configured')
    throw new Error('WAN_WORKER_URL not configured')
  }
  
  if (!apiKey) {
    console.error('❌ WAN_WORKER_API_KEY not configured')
    throw new Error('WAN_WORKER_API_KEY not configured')
  }

  console.log('📡 Making request to WAN worker:', { 
    url: `${workerUrl}/enhance`,
    prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
    model: 'qwen_base'
  })

  try {
    const response = await fetch(`${workerUrl}/enhance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: prompt,
        model: 'qwen_base',
        enhance_type: 'natural_language'
      }),
    })

    console.log('🔄 WAN worker response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Worker response not ok:', { 
        status: response.status, 
        statusText: response.statusText,
        errorBody: errorText 
      })
      throw new Error(`Worker response not ok: ${response.status} - ${errorText}`)
    }

    const responseText = await response.text()
    console.log('📥 Raw WAN worker response:', { 
      responseLength: responseText.length,
      responsePreview: responseText.substring(0, 200) + (responseText.length > 200 ? '...' : '')
    })

    let result
    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      console.error('❌ Failed to parse WAN worker JSON response:', { 
        parseError: parseError.message,
        responseText: responseText.substring(0, 500)
      })
      throw new Error(`Invalid JSON response from worker: ${parseError.message}`)
    }
    
    console.log('🔍 Parsed WAN worker result:', { 
      hasEnhancedPrompt: !!result.enhanced_prompt,
      enhancedPromptLength: result.enhanced_prompt?.length || 0,
      enhancedPromptPreview: result.enhanced_prompt?.substring(0, 100) + (result.enhanced_prompt?.length > 100 ? '...' : ''),
      otherKeys: Object.keys(result).filter(k => k !== 'enhanced_prompt')
    })
    
    if (!result.enhanced_prompt) {
      console.error('❌ No enhanced_prompt in worker response:', result)
      throw new Error('No enhanced_prompt in worker response')
    }

    if (result.enhanced_prompt.trim() === '') {
      console.error('❌ Empty enhanced_prompt from worker:', result)
      throw new Error('Empty enhanced_prompt from worker')
    }

    console.log('✅ Qwen enhancement successful:', {
      originalLength: prompt.length,
      enhancedLength: result.enhanced_prompt.length,
      expansion: `${((result.enhanced_prompt.length / prompt.length) * 100).toFixed(1)}%`
    })

    return result.enhanced_prompt
  } catch (fetchError) {
    console.error('❌ Network error calling WAN worker:', {
      error: fetchError.message,
      stack: fetchError.stack,
      workerUrl: `${workerUrl}/enhance`
    })
    throw new Error(`Network error calling WAN worker: ${fetchError.message}`)
  }
}

/**
 * Add SDXL quality tags to Qwen-enhanced prompt
 */
function addSDXLQualityTags(enhancedPrompt: string, quality: string): string {
  const qualityTags = quality === 'high' 
    ? 'score_9, score_8_up, masterpiece, best quality, highly detailed, professional photography'
    : 'score_8, best quality, detailed, professional photography'

  const anatomicalTerms = 'perfect anatomy, natural proportions, balanced features'
  const technicalTerms = 'shot on Canon EOS R5, f/1.8, shallow depth of field'
  const styleTerms = 'warm atmosphere, natural lighting, elegant composition'

  return `${qualityTags}, ${enhancedPrompt}, ${anatomicalTerms}, ${technicalTerms}, ${styleTerms}`
}

/**
 * SDXL Enhancement: Focus on quality tags, anatomy, photography (fallback)
 */
function enhanceForSDXL(prompt: string, quality: string): string {
  const qualityTags = quality === 'high' 
    ? 'score_9, score_8_up, masterpiece, best quality, highly detailed, professional photography'
    : 'score_8, best quality, detailed, professional photography'

  const anatomicalTerms = 'perfect anatomy, natural proportions, balanced features'
  const technicalTerms = 'shot on Canon EOS R5, f/1.8, shallow depth of field'
  const styleTerms = 'warm atmosphere, natural lighting, elegant composition'

  return `${qualityTags}, ${prompt}, ${anatomicalTerms}, ${technicalTerms}, ${styleTerms}`
}

/**
 * Add WAN Video quality tags to Qwen-enhanced prompt
 */
function addWANVideoQualityTags(enhancedPrompt: string, quality: string): string {
  const motionTerms = 'smooth motion, fluid movement, temporal consistency'
  const cinematographyTerms = quality === 'high'
    ? 'professional cinematography, high quality video, stable camera movement'
    : 'cinematography, quality video, stable camera'
  const technicalTerms = 'natural body movement, elegant gestures, tasteful composition'

  return `${enhancedPrompt}, ${motionTerms}, ${cinematographyTerms}, ${technicalTerms}`
}

/**
 * WAN Video Enhancement: Focus on motion, cinematography, temporal consistency (fallback)
 */
function enhanceForWANVideo(prompt: string, quality: string): string {
  const motionTerms = 'smooth motion, fluid movement, temporal consistency'
  const cinematographyTerms = quality === 'high'
    ? 'professional cinematography, high quality video, stable camera movement'
    : 'cinematography, quality video, stable camera'
  const technicalTerms = 'natural body movement, elegant gestures, tasteful composition'

  return `${prompt}, ${motionTerms}, ${cinematographyTerms}, ${technicalTerms}`
}

/**
 * Add WAN Image quality tags to Qwen-enhanced prompt
 */
function addWANImageQualityTags(enhancedPrompt: string, quality: string): string {
  const detailTerms = quality === 'high'
    ? 'highly detailed, intricate details, maximum resolution'
    : 'detailed, good resolution'
  const qualityTerms = 'high quality, professional photography, natural lighting'
  const compositionTerms = 'elegant composition, balanced framing, tasteful presentation'

  return `${enhancedPrompt}, ${detailTerms}, ${qualityTerms}, ${compositionTerms}`
}

/**
 * WAN Image Enhancement: Focus on detail, resolution, composition (fallback)
 */
function enhanceForWANImage(prompt: string, quality: string): string {
  const detailTerms = quality === 'high'
    ? 'highly detailed, intricate details, maximum resolution'
    : 'detailed, good resolution'
  const qualityTerms = 'high quality, professional photography, natural lighting'
  const compositionTerms = 'elegant composition, balanced framing, tasteful presentation'

  return `${prompt}, ${detailTerms}, ${qualityTerms}, ${compositionTerms}`
}

/**
 * Get active worker URL from database only (no fallback)
 */
async function getActiveWorkerUrl(): Promise<string> {
  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get current config
    const { data: currentConfig, error: fetchError } = await supabase
      .from('system_config')
      .select('config')
      .single()

    if (currentConfig && !fetchError && currentConfig.config?.workerUrl) {
      console.log('✅ Using worker URL from database:', currentConfig.config.workerUrl)
      return currentConfig.config.workerUrl
    }

    // No fallback - force proper worker registration
    console.error('❌ No active worker URL found in database')
    throw new Error('Worker not available - auto-registration may have failed')
  } catch (error) {
    console.error('❌ Error getting worker URL:', error)
    throw new Error('Worker not available - auto-registration may have failed')
  }
}

/**
 * Get chat worker URL from database (for qwen_instruct)
 */
async function getChatWorkerUrl(): Promise<string | null> {
  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get current config
    const { data: currentConfig, error: fetchError } = await supabase
      .from('system_config')
      .select('config')
      .eq('id', 1)
      .single()

    if (currentConfig && !fetchError && currentConfig.config?.chatWorkerUrl) {
      // Test health and update cache
      const chatWorkerUrl = currentConfig.config.chatWorkerUrl
      const startTime = Date.now()
      
      try {
        const healthResponse = await fetch(`${chatWorkerUrl}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(3000)
        })
        const responseTime = Date.now() - startTime
        const isHealthy = healthResponse.ok

        // Update health cache
        const updatedConfig = {
          ...currentConfig.config,
          workerHealthCache: {
            ...currentConfig.config.workerHealthCache,
            chatWorker: {
              isHealthy,
              lastChecked: new Date().toISOString(),
              responseTimeMs: responseTime
            }
          }
        }

        await supabase
          .from('system_config')
          .update({ config: updatedConfig })
          .eq('id', 1)

        console.log('✅ Chat worker health check:', { isHealthy, responseTime })
        return isHealthy ? chatWorkerUrl : null
      } catch (healthError) {
        console.error('❌ Chat worker health check failed:', healthError)
        return null
      }
    }

    console.log('ℹ️ No chat worker URL found in database')
    return null
  } catch (error) {
    console.error('❌ Error getting chat worker URL:', error)
    return null
  }
}

/**
 * Enhanced worker discovery with database and pod fallback
 */
async function discoverChatWorker(): Promise<string | null> {
  console.log('🔍 Discovering chat worker...');
  
  // Try database first
  const storedUrl = await getChatWorkerUrl();
  if (storedUrl) {
    console.log('📡 Using stored chat worker URL:', storedUrl);
    return storedUrl;
  }
  
  // Fallback to pod ID pattern
  const podId = await getPodId();
  if (podId) {
    const chatWorkerUrl = `https://${podId}-7861.proxy.runpod.net`;
    console.log('🔄 Using pod-based chat worker URL:', chatWorkerUrl);
    return chatWorkerUrl;
  }
  
  console.warn('⚠️ No chat worker URL discovered');
  return null;
}

/**
 * Get enhancement strategy description
 */
/**
 * PHASE 3 FIX: Improved token estimation accuracy
 */
function estimateTokens(text: string): number {
  // Add defensive programming - handle null/undefined text
  if (!text || typeof text !== 'string') {
    console.warn('⚠️ estimateTokens received invalid input:', typeof text)
    return 0
  }
  
  // More accurate token estimation based on CLIP tokenizer patterns
  // Account for subword tokenization, punctuation, and special tokens
  const words = text.trim().split(/\s+/)
  let tokenCount = 0
  
  for (const word of words) {
    if (word.length === 0) continue
    
    // Short words (1-3 chars) usually = 1 token
    if (word.length <= 3) {
      tokenCount += 1
    }
    // Medium words (4-8 chars) often split into 1-2 tokens
    else if (word.length <= 8) {
      tokenCount += Math.ceil(word.length / 4)
    }
    // Long words get more complex subword splitting
    else {
      tokenCount += Math.ceil(word.length / 3.5)
    }
    
    // Add extra tokens for punctuation and special characters
    const punctuationCount = (word.match(/[.,!?;:()\-"']/g) || []).length
    tokenCount += punctuationCount * 0.3
  }
  
  return Math.ceil(tokenCount)
}

function getTokenLimit(jobType: string, selectedModel: string, enhancementPresets?: string[]): number {
  // Base limits by job type
  let baseLimit = 77
  if (jobType?.includes('sdxl')) baseLimit = 77
  else if (jobType?.includes('wan')) baseLimit = 250
  
  // PHASE 4 & 5: Adjust token budget based on enhancement presets
  if (enhancementPresets && enhancementPresets.length > 0) {
    const presetModifiers = {
      'Best Quality': 0.85,    // Reduce tokens for quality focus
      'Cinematic': 1.1,        // Allow more tokens for cinematic descriptions  
      'Professional': 0.9,     // Slightly reduce for professional focus
      'Photorealistic': 0.95,  // Balance between quality and detail
      'Artistic': 1.05         // Allow slightly more for artistic descriptions
    }
    
    let modifier = 1.0
    for (const preset of enhancementPresets) {
      const presetModifier = presetModifiers[preset as keyof typeof presetModifiers]
      if (presetModifier) {
        modifier *= presetModifier
      }
    }
    
    baseLimit = Math.round(baseLimit * modifier)
    console.log(`🎯 Token limit adjusted for presets:`, {
      originalLimit: 77,
      presets: enhancementPresets,
      modifier,
      adjustedLimit: baseLimit
    })
  }
  
  return baseLimit
}

/**
 * SDXL prompt compression to fit 77 token limit
 */
function compressForSDXL(prompt: string): string {
  // Essential quality terms that should be preserved
  const qualityTerms = ['masterpiece', 'best quality', 'highly detailed', 'professional', 'high resolution']
  const anatomyTerms = ['perfect anatomy', 'natural proportions', 'balanced features']
  
  // Extract and preserve quality terms
  let compressedPrompt = prompt
  const preservedTerms: string[] = []
  
  qualityTerms.forEach(term => {
    if (compressedPrompt.toLowerCase().includes(term.toLowerCase())) {
      preservedTerms.push(term)
      compressedPrompt = compressedPrompt.replace(new RegExp(term, 'gi'), '')
    }
  })
  
  // Clean up and compress the remaining text
  compressedPrompt = compressedPrompt
    .replace(/\s+/g, ' ') // Remove extra spaces
    .replace(/,\s*,/g, ',') // Remove double commas
    .replace(/^,|,$/g, '') // Remove leading/trailing commas
    .trim()
  
  // Truncate if still too long, preserving essential terms
  const availableTokens = 77 - preservedTerms.join(', ').length / 4
  if (estimateTokens(compressedPrompt) > availableTokens) {
    const maxChars = Math.floor(availableTokens * 3.5) // Conservative estimate
    compressedPrompt = compressedPrompt.substring(0, maxChars).trim()
    if (compressedPrompt.endsWith(',')) {
      compressedPrompt = compressedPrompt.slice(0, -1)
    }
  }
  
  // Combine preserved terms with compressed description
  const finalPrompt = preservedTerms.length > 0 
    ? preservedTerms.join(', ') + (compressedPrompt ? ', ' + compressedPrompt : '')
    : compressedPrompt
  
  return finalPrompt
}


/**
 * Check chat worker availability and model load status
 */
async function checkChatWorkerAvailability(workerUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${workerUrl}/health`, { 
      method: 'GET',
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })
    
    if (!response.ok) {
      return false
    }
    
    const healthData = await response.json()
    return healthData.model_loaded === true
  } catch (error) {
    console.log('⚠️ Chat worker health check failed:', error)
    return false
  }
}

/**
 * Enhance prompt using chat worker (Qwen Instruct)
 */
async function enhanceWithChatWorker(prompt: string, config: any): Promise<string> {
  console.log('🤖 Calling Chat worker enhancement for prompt:', { prompt: prompt.length })
  
  // PHASE 1 FIX: Add comprehensive debug logging for worker request
  console.log('🔍 Chat worker config received:', {
    isSDXL: config.isSDXL,
    isVideo: config.isVideo,
    quality: config.quality,
    selectedModel: config.selectedModel,
    hasSystemPrompt: !!config.system_prompt
  })
  
  const chatWorkerUrl = await discoverChatWorker()
  const apiKey = Deno.env.get('WAN_WORKER_API_KEY')
  
  if (!apiKey) {
    throw new Error('WAN_WORKER_API_KEY not configured')
  }

  // PHASE 1 FIX: Construct proper request body with job type information
  const requestBody = {
    prompt: prompt,
    model: 'qwen_instruct',
    enhance_type: 'conversational',
    // CRITICAL FIX: Pass job type information to worker
    job_type: config.isSDXL 
      ? `sdxl_image_${config.quality || 'fast'}` 
      : config.isVideo 
        ? `wan_video_${config.quality || 'fast'}`
        : `wan_image_${config.quality || 'fast'}`,
    quality: config.quality || 'fast',
    format: config.isVideo ? 'video' : 'image',
    model_target: config.isSDXL ? 'SDXL' : 'WAN',
    // Add cache-busting for regeneration
    cache_bust: config.regeneration ? Date.now().toString() : undefined
  }

  // Add system prompt if available
  if (config.system_prompt) {
    requestBody.system_prompt = config.system_prompt
  }
  
  // PHASE 3 FIX: Log the exact payload being sent to worker
  console.log('📤 Sending request to chat worker:', {
    url: `${chatWorkerUrl}/enhance`,
    bodyKeys: Object.keys(requestBody),
    jobType: requestBody.job_type,
    quality: requestBody.quality,
    modelTarget: requestBody.model_target,
    hasSystemPrompt: !!requestBody.system_prompt
  })

  const response = await fetch(`${chatWorkerUrl}/enhance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(30000) // 30 second timeout
  })

  if (!response.ok) {
    throw new Error(`Chat worker response not ok: ${response.status}`)
  }

  const result = await response.json()
  
  if (!result.enhanced_prompt) {
    throw new Error('No enhanced_prompt in chat worker response')
  }

  return result.enhanced_prompt
}

/**
 * Enhance prompt using WAN worker with system prompt
 */
async function enhanceWithSystemPrompt(prompt: string, systemPrompt: string): Promise<string> {
  console.log('🤖 Calling WAN worker with system prompt:', { 
    promptLength: prompt.length,
    systemPromptLength: systemPrompt.length 
  })
  
  const workerUrl = await getActiveWorkerUrl()
  const apiKey = Deno.env.get('WAN_WORKER_API_KEY')
  
  if (!workerUrl || !apiKey) {
    throw new Error('Worker configuration not available')
  }

  const response = await fetch(`${workerUrl}/enhance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: prompt,
      model: 'qwen_base',
      enhance_type: 'natural_language',
      system_prompt: systemPrompt
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Worker response not ok: ${response.status} - ${errorText}`)
  }

  const result = await response.json()
  
  if (!result.enhanced_prompt) {
    throw new Error('No enhanced_prompt in worker response')
  }

  return result.enhanced_prompt
}


/**
 * Get pod ID for worker discovery
 */
async function getPodId(): Promise<string> {
  // Try environment variable first
  const podId = Deno.env.get('RUNPOD_POD_ID')
  if (podId) {
    return podId
  }
  
  // Extract from hostname as fallback
  try {
    const hostname = await Deno.hostname()
    const podMatch = hostname.match(/([a-z0-9]+)-/)
    if (podMatch) {
      return podMatch[1]
    }
  } catch (error) {
    console.warn('⚠️ Failed to get hostname:', error)
  }
  
  throw new Error('Could not determine pod ID')
}

function getEnhancementStrategy(isSDXL: boolean, isVideo: boolean, isEnhanced: boolean): string {
  if (isSDXL) return 'Qwen Enhancement + SDXL Quality Tags'
  if (isVideo) return 'Qwen Enhancement + WAN Video Enhancement'
  return 'Qwen Enhancement + WAN Image Enhancement'
}