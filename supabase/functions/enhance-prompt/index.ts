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
 * Generate enhanced prompt using Qwen-style logic
 * This replicates the enhancement logic from the WAN worker
 */
async function generateEnhancedPrompt(originalPrompt: string, config: {
  isSDXL: boolean
  isVideo: boolean
  isEnhanced: boolean
  quality: string
}): Promise<string> {
  const { isSDXL, isVideo, isEnhanced, quality } = config

  // For now, we'll use a rule-based enhancement system
  // In the future, this could call the actual Qwen model
  let enhancedPrompt = originalPrompt

  // SDXL Enhancement Strategy
  if (isSDXL) {
    enhancedPrompt = enhanceForSDXL(originalPrompt, quality)
  }
  // WAN Video Enhancement Strategy
  else if (isVideo) {
    enhancedPrompt = enhanceForWANVideo(originalPrompt, quality)
  }
  // WAN Image Enhancement Strategy
  else {
    enhancedPrompt = enhanceForWANImage(originalPrompt, quality)
  }

  return enhancedPrompt
}

/**
 * SDXL Enhancement: Focus on quality tags, anatomy, photography
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
 * WAN Video Enhancement: Focus on motion, cinematography, temporal consistency
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
 * WAN Image Enhancement: Focus on detail, resolution, composition
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
 * Get enhancement strategy description
 */
function getEnhancementStrategy(isSDXL: boolean, isVideo: boolean, isEnhanced: boolean): string {
  if (isSDXL) return 'SDXL Quality & Anatomy Focus'
  if (isVideo) return 'WAN Video Motion & Cinematography'
  return 'WAN Image Detail & Composition'
} 