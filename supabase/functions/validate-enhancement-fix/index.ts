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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Test the enhancement pipeline with a sample prompt
    const testPrompt = "three coworkers in a long meeting"
    
    console.log('🧪 Testing enhancement pipeline fix...')
    
    // Step 1: Test enhance-prompt function
    const { data: enhancementData, error: enhancementError } = await supabase.functions.invoke('enhance-prompt', {
      body: {
        prompt: testPrompt,
        jobType: 'sdxl_image_high',
        format: 'image',
        quality: 'high',
        selectedModel: 'qwen_instruct'
      }
    })

    if (enhancementError) {
      throw new Error(`Enhancement failed: ${enhancementError.message}`)
    }

    console.log('✅ Enhancement response structure:', {
      success: enhancementData.success,
      hasEnhancedPrompt: !!enhancementData.enhanced_prompt,
      hasTopLevelStrategy: !!enhancementData.enhancement_strategy,
      hasMetadataStrategy: !!enhancementData.enhancement_metadata?.enhancement_strategy,
      topLevelStrategy: enhancementData.enhancement_strategy,
      metadataStrategy: enhancementData.enhancement_metadata?.enhancement_strategy,
      promptsAreDifferent: enhancementData.enhanced_prompt !== enhancementData.original_prompt
    })

    // Step 2: Validate recent jobs with correct strategies
    const { data: recentJobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, job_type, enhancement_strategy, original_prompt, enhanced_prompt, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (jobsError) {
      throw new Error(`Jobs query failed: ${jobsError.message}`)
    }

    const validationResults = {
      enhancement_test: {
        success: enhancementData.success,
        strategy_at_top_level: !!enhancementData.enhancement_strategy,
        strategy_value: enhancementData.enhancement_strategy,
        prompts_different: enhancementData.enhanced_prompt !== enhancementData.original_prompt
      },
      recent_jobs_analysis: recentJobs.map(job => ({
        id: job.id,
        job_type: job.job_type,
        enhancement_strategy: job.enhancement_strategy,
        has_strategy: !!job.enhancement_strategy && job.enhancement_strategy !== 'none',
        prompts_different: job.original_prompt !== job.enhanced_prompt,
        created_at: job.created_at
      })),
      summary: {
        total_jobs_checked: recentJobs.length,
        jobs_with_valid_strategy: recentJobs.filter(j => j.enhancement_strategy && j.enhancement_strategy !== 'none').length,
        jobs_with_different_prompts: recentJobs.filter(j => j.original_prompt !== j.enhanced_prompt).length,
        fix_success_rate: recentJobs.length > 0 ? 
          (recentJobs.filter(j => j.enhancement_strategy && j.enhancement_strategy !== 'none').length / recentJobs.length * 100).toFixed(1) + '%' 
          : 'N/A'
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Enhancement pipeline validation completed',
      validation_results: validationResults,
      recommendations: validationResults.summary.fix_success_rate === '100.0%' ? 
        ['✅ All fixes working correctly'] : 
        ['⚠️ Some jobs still have invalid strategies', '🔧 Monitor next generation to confirm fix']
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Validation error:', error)
    return new Response(JSON.stringify({
      error: 'Validation failed',
      success: false,
      details: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})