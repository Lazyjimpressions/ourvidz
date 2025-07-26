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
    const { prompt, jobType, format, quality } = await req.json()

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
      promptLength: prompt.length
    })

    // Determine enhancement strategy based on job type
    const isSDXL = jobType?.includes('sdxl')
    const isVideo = format === 'video'
    const isEnhanced = jobType?.includes('enhanced')

    // Generate enhanced prompt using Qwen logic
    const enhancedPrompt = await generateEnhancedPrompt(prompt, {
      isSDXL,
      isVideo,
      isEnhanced,
      quality
    })

    console.log('✅ Enhanced prompt generated:', {
      originalLength: prompt.length,
      enhancedLength: enhancedPrompt.length,
      expansion: `${((enhancedPrompt.length / prompt.length) * 100).toFixed(1)}%`
    })

    return new Response(JSON.stringify({
      success: true,
      original_prompt: prompt,
      enhanced_prompt: enhancedPrompt,
      enhancement_metadata: {
        original_length: prompt.length,
        enhanced_length: enhancedPrompt.length,
        expansion_percentage: ((enhancedPrompt.length / prompt.length) * 100).toFixed(1),
        job_type: jobType,
        format,
        quality,
        is_sdxl: isSDXL,
        is_video: isVideo,
        enhancement_strategy: getEnhancementStrategy(isSDXL, isVideo, isEnhanced)
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
 * Generate enhanced prompt using Qwen 7B base model via WAN worker
 */
async function generateEnhancedPrompt(originalPrompt: string, config: {
  isSDXL: boolean
  isVideo: boolean
  isEnhanced: boolean
  quality: string
}): Promise<string> {
  const { isSDXL, isVideo, isEnhanced, quality } = config

  try {
    // First, enhance the natural language using Qwen 7B base model
    const qwenEnhancedPrompt = await enhanceWithQwen(originalPrompt)
    
    // Then add quality tags based on job type
    let finalPrompt = qwenEnhancedPrompt

    // SDXL Enhancement Strategy
    if (isSDXL) {
      finalPrompt = addSDXLQualityTags(qwenEnhancedPrompt, quality)
    }
    // WAN Video Enhancement Strategy
    else if (isVideo) {
      finalPrompt = addWANVideoQualityTags(qwenEnhancedPrompt, quality)
    }
    // WAN Image Enhancement Strategy
    else {
      finalPrompt = addWANImageQualityTags(qwenEnhancedPrompt, quality)
    }

    return finalPrompt
  } catch (error) {
    console.warn('⚠️ Qwen enhancement failed, falling back to rule-based:', error)
    
    // Fallback to rule-based enhancement
    if (isSDXL) {
      return enhanceForSDXL(originalPrompt, quality)
    } else if (isVideo) {
      return enhanceForWANVideo(originalPrompt, quality)
    } else {
      return enhanceForWANImage(originalPrompt, quality)
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
 * Get enhancement strategy description
 */
function getEnhancementStrategy(isSDXL: boolean, isVideo: boolean, isEnhanced: boolean): string {
  if (isSDXL) return 'Qwen 7B Natural Language + SDXL Quality Tags'
  if (isVideo) return 'Qwen 7B Natural Language + WAN Video Enhancement'
  return 'Qwen 7B Natural Language + WAN Image Enhancement'
}