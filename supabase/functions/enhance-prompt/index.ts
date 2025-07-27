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
    const { prompt, jobType, format, quality, selectedModel = 'qwen_base' } = await req.json()

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
      prompt,
      jobType,
      format,
      quality,
      selectedModel,
      promptLength: prompt.length
    })

    // Validate token limits first
    const tokenCount = estimateTokens(prompt)
    const tokenLimit = getTokenLimit(jobType, selectedModel)
    
    if (tokenCount > tokenLimit) {
      return new Response(JSON.stringify({
        error: `Prompt (${tokenCount} tokens) exceeds limit (${tokenLimit})`,
        success: false,
        token_limit_exceeded: true,
        token_count: tokenCount,
        token_limit: tokenLimit
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // Determine enhancement strategy based on job type
    const isSDXL = jobType?.includes('sdxl')
    const isVideo = format === 'video'
    const isEnhanced = jobType?.includes('enhanced')

    // Generate enhanced prompt using dual model routing
    const enhancementResult = await generateEnhancedPrompt(prompt, {
      isSDXL,
      isVideo,
      isEnhanced,
      quality,
      selectedModel
    })

    console.log('✅ Enhanced prompt generated:', {
      originalLength: prompt.length,
      enhancedLength: enhancementResult.enhancedPrompt.length,
      expansion: `${((enhancementResult.enhancedPrompt.length / prompt.length) * 100).toFixed(1)}%`,
      modelUsed: enhancementResult.modelUsed
    })

    return new Response(JSON.stringify({
      success: true,
      original_prompt: prompt,
      enhanced_prompt: enhancementResult.enhancedPrompt,
      enhancement_metadata: {
        original_length: prompt.length,
        enhanced_length: enhancementResult.enhancedPrompt.length,
        expansion_percentage: ((enhancementResult.enhancedPrompt.length / prompt.length) * 100).toFixed(1),
        job_type: jobType,
        format,
        quality,
        is_sdxl: isSDXL,
        is_video: isVideo,
        enhancement_strategy: getEnhancementStrategy(isSDXL, isVideo, isEnhanced),
        model_used: enhancementResult.modelUsed,
        token_count: estimateTokens(enhancementResult.enhancedPrompt),
        compression_applied: enhancementResult.compressionApplied,
        fallback_reason: enhancementResult.fallbackReason
      }
    }), {
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

/**
 * Generate enhanced prompt using dual model routing
 */
async function generateEnhancedPrompt(originalPrompt: string, config: {
  isSDXL: boolean
  isVideo: boolean
  isEnhanced: boolean
  quality: string
  selectedModel: string
}): Promise<{
  enhancedPrompt: string
  modelUsed: string
  compressionApplied: boolean
  fallbackReason?: string
}> {
  const { isSDXL, isVideo, isEnhanced, quality, selectedModel } = config

  // Handle SDXL token compression first
  if (isSDXL) {
    const tokenCount = estimateTokens(originalPrompt)
    if (tokenCount > 77) {
      const compressed = compressForSDXL(originalPrompt)
      console.log('🔧 SDXL prompt compressed:', {
        originalLength: tokenCount,
        compressedLength: estimateTokens(compressed),
        original: originalPrompt.substring(0, 100) + '...',
        compressed: compressed.substring(0, 100) + '...'
      })
      
      const enhancedPrompt = addSDXLQualityTags(compressed, quality)
      return {
        enhancedPrompt,
        modelUsed: 'rule_based_with_compression',
        compressionApplied: true,
        fallbackReason: 'sdxl_token_limit_exceeded'
      }
    }
  }

  // Route based on selected model
  if (selectedModel === 'qwen_instruct') {
    return await tryInstructEnhancement(originalPrompt, config)
  } else {
    return await tryBaseEnhancement(originalPrompt, config)
  }
}

/**
 * Try Chat Worker (Qwen Instruct) enhancement with fallback
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
        compressionApplied: false
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
 * Try WAN Worker (Qwen Base) enhancement with fallback
 */
async function tryBaseEnhancement(originalPrompt: string, config: any): Promise<{
  enhancedPrompt: string
  modelUsed: string
  compressionApplied: boolean
  fallbackReason?: string
}> {
  const { isSDXL, isVideo, quality } = config
  
  try {
    // Use existing WAN worker enhancement
    const qwenEnhancedPrompt = await enhanceWithQwen(originalPrompt)
    
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
      compressionApplied: false
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
      fallbackReason: 'wan_worker_unavailable'
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
      .single()

    if (currentConfig && !fetchError && currentConfig.config?.chatWorkerUrl) {
      console.log('✅ Using chat worker URL from database:', currentConfig.config.chatWorkerUrl)
      return currentConfig.config.chatWorkerUrl
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
 * Token estimation and limits
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4) // Rough estimation: 4 chars ≈ 1 token
}

function getTokenLimit(jobType: string, selectedModel: string): number {
  // SDXL has hard CLIP encoder limit
  if (jobType?.includes('sdxl')) return 77
  
  // Qwen model limits
  if (selectedModel === 'qwen_instruct') return 5000 // Chat template overhead
  if (selectedModel === 'qwen_base') return 6000 // Conservative for expansion
  
  // Default fallback
  return 6000
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
  
  const chatWorkerUrl = await discoverChatWorker()
  const apiKey = Deno.env.get('WAN_WORKER_API_KEY')
  
  if (!apiKey) {
    throw new Error('WAN_WORKER_API_KEY not configured')
  }

  const response = await fetch(`${chatWorkerUrl}/enhance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: prompt,
      model: 'qwen_instruct',
      enhance_type: 'conversational'
    }),
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