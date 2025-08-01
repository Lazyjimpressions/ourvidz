import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Add Compel configuration support to SDXL jobs
interface SDXLJobConfig {
  num_images?: number;
  seed?: number;
  compel_enabled?: boolean;
  compel_weights?: string;
  width?: number;
  height?: number;
  num_inference_steps?: number;
  guidance_scale?: number;
  scheduler?: string;
  frame_num?: number;
  enhance_prompt?: boolean;
  expected_time?: number;
  content_type?: string;
  file_extension?: string;
  reference_image_url?: string;
  reference_strength?: number;
  reference_type?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Token utility functions for preventing overflow
function countTokens(text: string): number {
  return text.trim().split(/\s+/).length;
}

function trimToMaxTokens(text: string, maxTokens = 75): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxTokens) {
    return text;
  }
  return words.slice(0, maxTokens).join(" ");
}

serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    console.log('🚀 Queue-job function called - STANDARDIZED: Worker callback parameter consistency');
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')
        }
      }
    });
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ Authentication failed:', userError?.message);
      return new Response(JSON.stringify({
        error: 'Authentication required',
        success: false,
        details: userError?.message
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 401
      });
    }
    console.log('✅ User authenticated:', user.id);
    const { 
      jobType, 
      metadata = {}, 
      projectId,
      videoId,
      imageId,
      originalPrompt,
      enhancedPrompt,
      isPromptEnhanced,
      enhancementMetadata,
      selectedPresets
    } = await req.json();
    console.log('📋 Creating job with STANDARDIZED worker parameters:', {
      jobType,
      projectId,
      videoId,
      imageId,
      userId: user.id,
      queue: metadata?.queue,
      timestamp: new Date().toISOString()
    });

    // Dynamic content tier detection using cached database templates
    async function detectContentTier(prompt: string): Promise<'sfw' | 'nsfw'> {
      try {
        // Get cached NSFW detection terms from system_config
        const { data: systemConfig } = await supabase
          .from('system_config')
          .select('config')
          .single();

        if (systemConfig?.config?.nsfwTerms && Array.isArray(systemConfig.config.nsfwTerms)) {
          const nsfwTerms = systemConfig.config.nsfwTerms;
          const lowerPrompt = prompt.toLowerCase();
          return nsfwTerms.some(term => lowerPrompt.includes(term.toLowerCase())) ? 'nsfw' : 'sfw';
        }
      } catch (error) {
        console.warn('⚠️ Failed to load NSFW terms from cache, using fallback:', error);
      }

      // Fallback NSFW detection terms
      const fallbackNsfwTerms = [
        'naked', 'nude', 'topless', 'undressed', 'nsfw', 'adult', 'erotic', 'sexual', 'sex', 
        'porn', 'xxx', 'seductive', 'intimate', 'passionate', 'explicit', 'hardcore'
      ];
      
      const lowerPrompt = prompt.toLowerCase();
      return fallbackNsfwTerms.some(term => lowerPrompt.includes(term)) ? 'nsfw' : 'sfw';
    }

    // Dynamic negative prompt generation using cached templates
    async function generateNegativePromptForSDXL(userPrompt = '', contentTier: 'sfw' | 'nsfw' = 'sfw') {
      console.log('🎨 Generating negative prompt for SDXL using cached templates');
      
      try {
        // First try to get from cache
        const { data: systemConfig } = await supabase
          .from('system_config')
          .select('config')
          .single();

        if (systemConfig?.config?.negativeCache?.sdxl?.[contentTier]) {
          const cachedNegatives = systemConfig.config.negativeCache.sdxl[contentTier];
          const combinedNegatives = cachedNegatives.join(', ');
          const trimmed = trimToMaxTokens(combinedNegatives, 75);
          
          console.log('✅ Cache negative prompt used:', {
            source: 'cache',
            count: cachedNegatives.length,
            finalTokens: countTokens(trimmed),
            contentTier
          });
          
          // Merge with user negative prompt if provided
          if (userPrompt && userPrompt.trim()) {
            const userNegatives = userPrompt.split(',').map(t => t.trim()).filter(Boolean);
            const mergedNegatives = [...cachedNegatives, ...userNegatives];
            const mergedTrimmed = trimToMaxTokens(mergedNegatives.join(', '), 75);
            
            console.log('🔄 Merged user negative prompts:', {
              userPromptsCount: userNegatives.length,
              finalTokens: countTokens(mergedTrimmed)
            });
            
            return mergedTrimmed;
          }
          
          return trimmed;
        }

        // Fallback to direct database query if cache miss
        console.warn('⚠️ Cache miss, querying database directly');
        const { data: negativePrompts, error } = await supabase
          .from('negative_prompts')
          .select('negative_prompt, priority')
          .eq('model_type', 'sdxl')
          .eq('content_mode', contentTier)
          .eq('is_active', true)
          .order('priority', { ascending: false });

        if (error || !negativePrompts || negativePrompts.length === 0) {
          console.warn('⚠️ No database negative prompts found, using fallback');
          return getFallbackNegativePrompt(contentTier);
        }

        const combinedNegatives = negativePrompts
          .map(np => np.negative_prompt)
          .join(', ');

        const trimmed = trimToMaxTokens(combinedNegatives, 75);
        
        console.log('✅ Database negative prompt generated:', {
          source: 'database_fallback',
          count: negativePrompts.length,
          finalTokens: countTokens(trimmed),
          contentTier
        });
        
        return trimmed;
      } catch (error) {
        console.error('❌ Error loading negative prompts:', error);
        return getFallbackNegativePrompt(contentTier);
      }
    }

    // Fallback negative prompts when database is unavailable
    function getFallbackNegativePrompt(contentTier: 'sfw' | 'nsfw'): string {
      console.log('🔄 Using fallback negative prompt');
      
      const baseFallback = "bad anatomy, extra limbs, deformed, missing limbs, worst quality, low quality, normal quality, lowres, deformed hands, extra fingers, deformed face, malformed, bad hands, bad fingers, missing fingers, distorted features, text, watermark, logo, signature";
      
      if (contentTier === 'nsfw') {
        return baseFallback + ", child, minor, deformed breasts, extra breasts, anatomical errors, wrong anatomy, distorted bodies, unnatural poses";
      }
      
      return baseFallback;
    }

    // Enhanced job type validation
    const validJobTypes = [
      'sdxl_image_fast',
      'sdxl_image_high',
      'image_fast',
      'image_high',
      'video_fast',
      'video_high',
      'image7b_fast_enhanced',
      'image7b_high_enhanced',
      'video7b_fast_enhanced',
      'video7b_high_enhanced'
    ];
    if (!validJobTypes.includes(jobType)) {
      console.error('❌ Invalid job type provided:', jobType);
      console.log('✅ Valid job types:', validJobTypes);
      return new Response(JSON.stringify({
        error: `Invalid job type: ${jobType}`,
        success: false,
        validJobTypes: validJobTypes
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    // Robust parsing function for all job type patterns
    function parseJobType(jobType) {
      const isSDXL = jobType.startsWith('sdxl_');
      const isEnhanced = jobType.includes('enhanced');
      let format;
      let quality;
      if (isSDXL) {
        // SDXL patterns: sdxl_image_fast, sdxl_image_high
        const parts = jobType.split('_');
        format = parts[1]; // 'image'
        quality = parts[2]; // 'fast' or 'high'
      } else if (isEnhanced) {
        // Enhanced patterns: image7b_fast_enhanced, video7b_high_enhanced
        if (jobType.startsWith('image7b_')) {
          format = 'image';
          quality = jobType.includes('_fast_') ? 'fast' : 'high';
        } else if (jobType.startsWith('video7b_')) {
          format = 'video';
          quality = jobType.includes('_fast_') ? 'fast' : 'high';
        } else {
          // Fallback for unknown enhanced patterns
          format = jobType.includes('video') ? 'video' : 'image';
          quality = jobType.includes('fast') ? 'fast' : 'high';
        }
      } else {
        // Standard patterns: image_fast, image_high, video_fast, video_high
        const parts = jobType.split('_');
        format = parts[0]; // 'image' or 'video'
        quality = parts[1]; // 'fast' or 'high'
      }
      return {
        format,
        quality,
        isSDXL,
        isEnhanced
      };
    }

    // Extract format and quality from job type
    const { format, quality, isSDXL, isEnhanced } = parseJobType(jobType);
    const modelVariant = isSDXL ? 'lustify_sdxl' : 'wan_2_1_1_3b';
    // Determine queue routing - all enhanced jobs use wan_queue
    const queueName = isSDXL ? 'sdxl_queue' : 'wan_queue';

    // Enhanced logging with format and quality detection
    console.log('🎯 FIXED job routing determined:', {
      isSDXL,
      isEnhanced,
      queueName,
      modelVariant,
      format,
      quality,
      originalJobType: jobType,
      negativePromptSupported: isSDXL,
      parsedCorrectly: true
    });

    // Validate Redis configuration
    const redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
    const redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
    if (!redisUrl || !redisToken) {
      console.error('❌ Redis configuration missing:', {
        hasUrl: !!redisUrl,
        hasToken: !!redisToken
      });
      return new Response(JSON.stringify({
        error: 'Redis configuration missing',
        success: false,
        details: 'UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not configured'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }

    // Get project details for the prompt (if projectId provided)
    let prompt = '';
    let characterId = null;
    if (projectId) {
      const { data: project, error: projectError } = await supabase.from('projects').select('enhanced_prompt, original_prompt, character_id').eq('id', projectId).single();
      if (!projectError && project) {
        prompt = project.enhanced_prompt || project.original_prompt || '';
        characterId = project.character_id;
        console.log('📄 Project prompt retrieved:', {
          projectId,
          hasPrompt: !!prompt
        });
      } else {
        console.warn('⚠️ Could not retrieve project prompt:', projectError?.message);
      }
    }

    // Use prompt from metadata if no project prompt available
    if (!prompt && metadata?.prompt) {
      prompt = metadata.prompt;
      console.log('📝 Using metadata prompt');
    }

    // Detect content tier for dynamic negative prompt selection
    const contentTier = await detectContentTier(prompt);

    // **PHASE 1 IMPLEMENTATION**: Call enhance-prompt before job submission
    let enhancementResult = null;
    // CRITICAL FIX: Preserve original prompt separately - never overwrite it
    const preservedOriginalPrompt = originalPrompt || prompt;
    let workingPrompt = enhancedPrompt || prompt; // Use enhanced if provided, fallback to original
    let enhancementStrategy = 'none';
    let enhancementTimeMs = 0;
    let qwenExpansionPercentage = null;
    let qualityImprovement = null;
    
    // Only enhance if user explicitly requested enhancement
    if (prompt && metadata?.user_requested_enhancement === true) {
      try {
        console.log('🚀 Calling enhance-prompt function for job:', jobType);
        const enhancementStartTime = Date.now();
        
        const { data: enhancementData, error: enhancementError } = await supabase.functions.invoke('enhance-prompt', {
          body: {
            prompt: preservedOriginalPrompt, // Use preserved original prompt for enhancement
            jobType: jobType,
            format: format,
            quality: quality,
            selectedModel: 'qwen_instruct',
            user_id: user.id,
            // Pass regeneration flag for cache-busting
            regeneration: metadata?.regeneration || false
          }
        });
        
        enhancementTimeMs = Date.now() - enhancementStartTime;
        
        if (enhancementError) {
          console.warn('⚠️ Enhancement failed, using original prompt:', enhancementError.message);
          enhancementStrategy = 'failed';
        } else if (enhancementData?.success && enhancementData?.enhanced_prompt) {
          enhancementResult = enhancementData;
          workingPrompt = enhancementData.enhanced_prompt;
          
          // PHASE 2 FIX: Comprehensive enhancement strategy extraction with debug logging
          console.log('🔍 Raw enhancement data for strategy extraction:', {
            hasSuccess: !!enhancementData.success,
            hasEnhancedPrompt: !!enhancementData.enhanced_prompt,
            hasEnhancementMetadata: !!enhancementData.enhancement_metadata,
            enhancementMetadataKeys: enhancementData.enhancement_metadata ? Object.keys(enhancementData.enhancement_metadata) : null,
            metadataStrategy: enhancementData.enhancement_metadata?.enhancement_strategy,
            topLevelStrategy: enhancementData.enhancement_strategy,
            hasOptimization: !!enhancementData.optimization,
            optimizationStrategy: enhancementData.optimization?.strategy_used,
            // PHASE 4 DEBUG: Complete response structure
            fullResponseKeys: Object.keys(enhancementData)
          });
          
          // PHASE 1 FIX: Extract strategy with proper priority order and analytics data
          enhancementStrategy = 
            enhancementData.enhancement_strategy ||                    // Top-level (new structure)
            enhancementData.enhancement_metadata?.enhancement_strategy || 
            enhancementData.optimization?.strategy_used || 
            enhancementData.strategy ||
            'none';
          
          // PHASE 2 FIX: Extract analytics data from enhancement response with better fallbacks
          qwenExpansionPercentage = enhancementData.enhancement_metadata?.expansion_percentage ||
                                  enhancementData.enhancement_metadata?.qwen_expansion_percentage ||
                                  enhancementData.qwen_expansion_percentage ||
                                  (enhancementData.enhanced_prompt && enhancementData.original_prompt ? 
                                    ((enhancementData.enhanced_prompt.length / enhancementData.original_prompt.length) * 100) - 100 : 
                                    enhancementData.enhanced_prompt && prompt ? 
                                      ((enhancementData.enhanced_prompt.length / prompt.length) * 100) - 100 : 0);
          
          qualityImprovement = enhancementData.enhancement_metadata?.quality_improvement ||
                             enhancementData.quality_improvement ||
                             enhancementData.optimization?.improvement_score ||
                             // Calculate improvement if we have strategy and it's not 'none'
                             (enhancementStrategy !== 'none' ? 0.15 : null);
          
          // PHASE 3 FIX: Ensure we use the enhanced prompt, not original
          if (enhancementData.enhanced_prompt && enhancementData.enhanced_prompt !== prompt) {
            workingPrompt = enhancementData.enhanced_prompt;
            console.log('✅ Using enhanced prompt (length changed):', {
              originalLength: prompt.length,
              enhancedLength: enhancementData.enhanced_prompt.length,
              isActuallyEnhanced: enhancementData.enhanced_prompt !== prompt
            });
          } else {
            console.log('⚠️ Enhanced prompt same as original or missing:', {
              originalLength: prompt.length,
              enhancedLength: enhancementData.enhanced_prompt?.length || 0,
              areSame: enhancementData.enhanced_prompt === prompt
            });
          }
          
          console.log('🎯 Enhancement strategy extracted:', {
            finalStrategy: enhancementStrategy,
            extractionSource: enhancementData.enhancement_strategy ? 'top_level' :
                             enhancementData.enhancement_metadata?.enhancement_strategy ? 'enhancement_metadata' :
                             enhancementData.optimization?.strategy_used ? 'optimization' :
                             enhancementData.strategy ? 'strategy_field' : 'fallback',
            promptChanged: workingPrompt !== prompt,
            // PHASE 4 DEBUG: Additional tracking
            fullResponseKeys: Object.keys(enhancementData)
          });
        }
      } catch (error) {
        console.error('❌ Enhancement failed:', error);
        enhancementStrategy = 'failed';
        enhancementTimeMs = Date.now() - enhancementStartTime;
      }
    }
    
    // Use enhanced prompt for job creation
    const finalPrompt = workingPrompt;

    // CRITICAL FIX: Generate negative prompt BEFORE creating job record
    let negativePrompt = '';
    let negativePromptError = null;

    if (isSDXL) {
      try {
        negativePrompt = await generateNegativePromptForSDXL(metadata?.userNegativePrompt || '', contentTier);
        console.log('🚫 Generated SDXL negative prompt:', negativePrompt);
      } catch (error) {
        negativePromptError = error.message;
        console.error('❌ Error generating negative prompt:', error);
        // Fallback to basic negative prompt
        negativePrompt = "bad anatomy, extra limbs, deformed, missing limbs, worst quality, low quality, normal quality, lowres, text, watermark, logo, signature";
      }
    } else {
      console.log('🚫 WAN job detected - NO negative prompt (not supported by WAN 2.1)');
    }

    // Create comprehensive metadata structure
    const jobMetadata = {
      ...metadata,
      model_variant: modelVariant,
      queue: queueName,
      dual_worker_routing: true,
      negative_prompt_supported: isSDXL,
      // CRITICAL FIX: Include negative_prompt in database metadata
      ...isSDXL && {
        negative_prompt: negativePrompt,
        negative_prompt_generation_error: negativePromptError
      },
      // **PHASE 1**: Include enhancement data in job metadata - FIXED
      original_prompt: preservedOriginalPrompt,  // CRITICAL FIX: Use preserved original prompt
      enhanced_prompt: workingPrompt,
      enhancement_strategy: enhancementStrategy,
      enhancement_time_ms: enhancementTimeMs,
      enhanced_tracking: true,
      // **PHASE 2**: Include analytics data in job metadata
      qwen_expansion_percentage: qwenExpansionPercentage,
      quality_improvement: qualityImprovement,
      // **NEW ARCHITECTURE**: Include enhancement metadata and presets
      enhancement_metadata: enhancementMetadata,
      selected_presets: selectedPresets,
      // PHASE 4 DEBUG: Additional tracking
      debug: {
        original_prompt_length: preservedOriginalPrompt?.length || 0,  // CRITICAL FIX: Use preserved original prompt
        working_prompt_length: workingPrompt.length,
        enhancement_strategy_source: enhancementStrategy,
        created_at: new Date().toISOString()
      },
      // Enhanced tracking fields
      prompt_length: finalPrompt.length,
      prompt_word_count: finalPrompt.split(' ').length,
      generation_timestamp: new Date().toISOString(),
      edge_function_version: '2.1.0',
      // Performance tracking
      expected_generation_time: isEnhanced ? 
        (format === 'video' ? (quality === 'high' ? 240 : 195) : (quality === 'high' ? 100 : 85)) :
        (format === 'video' ? (quality === 'high' ? 180 : 135) : (quality === 'high' ? 40 : 25)),
      // Quality settings
      sample_steps: quality === 'high' ? 50 : 25,
      sample_guide_scale: quality === 'high' ? 7.5 : 6.5,
      sample_solver: 'unipc',
      sample_shift: 5.0,
      // User-controlled batch settings
      num_images: metadata?.num_images || (isSDXL ? 1 : 1), // Default to 1, user can select 1, 3, or 6
      batch_count: metadata?.batch_count || 1,
      // Content type tracking
      content_type: format,
      file_extension: format === 'video' ? 'mp4' : 'png',
      // User context
      user_id: user.id,
      project_id: projectId,
      video_id: videoId,
      image_id: imageId,
      character_id: characterId
    };

    // Create job record with enhanced error handling - INCLUDING negative prompt in metadata
    const { data: job, error: jobError } = await supabase.from('jobs').insert({
      user_id: user.id,
      job_type: jobType,
      format: format,
      quality: quality,
      model_type: jobType,
      metadata: jobMetadata,
      project_id: projectId,
      video_id: videoId,
      image_id: imageId,
      status: 'queued',
      // **PHASE 1**: Store enhancement fields directly in jobs table - FIXED
      original_prompt: preservedOriginalPrompt,  // CRITICAL FIX: Use preserved original prompt
      enhanced_prompt: workingPrompt,
      enhancement_strategy: enhancementStrategy,
      enhancement_time_ms: enhancementTimeMs
    }).select().single();
    if (jobError) {
      console.error('❌ Error creating job in database:', {
        error: jobError,
        jobType,
        userId: user.id,
        format,
        quality
      });
      return new Response(JSON.stringify({
        error: 'Failed to create job record',
        success: false,
        details: jobError.message,
        jobType: jobType
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    console.log('✅ Job created successfully in database:', job.id);

    // Create config based on job type - FIXED: SDXL vs WAN config formats with proper parameter names
    let config: any;

    if (jobType.startsWith('sdxl_')) {
      // ✅ SDXL format: Use SDXL-specific parameter names
      config = {
        width: 1024,                                        // ✅ SDXL format
        height: 1024,                                       // ✅ SDXL format
        num_inference_steps: quality === 'high' ? 50 : 25, // ✅ SDXL parameter name
        guidance_scale: quality === 'high' ? 7.5 : 6.5,   // ✅ SDXL parameter name
        scheduler: 'unipc',                                 // ✅ SDXL parameter name
        frame_num: format === 'video' ? 83 : 1,
        enhance_prompt: isEnhanced,
        // SEED SUPPORT: Pass seed from metadata to worker config
        ...metadata?.seed && {
          seed: metadata.seed
        },
        // REFERENCE IMAGE SUPPORT: Pass reference data to worker config
        ...metadata?.reference_image && {
          reference_image_url: metadata.reference_url,
          reference_strength: metadata.reference_strength || 0.85,
          reference_type: metadata.reference_type || 'character'
        },
        // ✅ COMPEL SUPPORT: Extract Compel configuration from metadata
        compel_enabled: metadata?.compel_enabled || false,
        compel_weights: metadata?.compel_weights || undefined,
        expected_time: format === 'video' ? (quality === 'high' ? 240 : 195) : (quality === 'high' ? 100 : 85),
        content_type: format,
        file_extension: format === 'video' ? 'mp4' : 'png',
        num_images: metadata?.num_images || 1
      };
    } else {
      // ✅ WAN format: Use WAN-specific parameter names
      config = {
        size: '480*832',                                    // ✅ WAN format
        sample_steps: quality === 'high' ? 50 : 25,        // ✅ WAN parameter name
        sample_guide_scale: quality === 'high' ? 7.5 : 6.5, // ✅ WAN parameter name
        sample_solver: 'unipc',                             // ✅ WAN parameter name
        sample_shift: 5.0,                                  // ✅ WAN parameter name
        frame_num: format === 'video' ? 83 : 1,
        enhance_prompt: isEnhanced,
        // SEED SUPPORT: Pass seed from metadata to worker config
        ...metadata?.seed && {
          seed: metadata.seed
        },
        // REFERENCE IMAGE SUPPORT: Pass reference data to worker config
        ...metadata?.reference_image && {
          reference_image_url: metadata.reference_url,
          reference_strength: metadata.reference_strength || 0.85,
          reference_type: metadata.reference_type || 'character',
          // VIDEO REFERENCE SUPPORT: Add start/end frame references for video generation
          ...(format === 'video' && metadata?.start_reference_url && {
            first_frame: metadata.start_reference_url
          }),
          ...(format === 'video' && metadata?.end_reference_url && {
            last_frame: metadata.end_reference_url
          })
        },
        expected_time: isEnhanced ? (format === 'video' ? (quality === 'high' ? 240 : 195) : (quality === 'high' ? 100 : 85)) : (format === 'video' ? (quality === 'high' ? 180 : 135) : (quality === 'high' ? 40 : 25)),
        content_type: format,
        file_extension: format === 'video' ? 'mp4' : 'png',
        num_images: metadata?.num_images || 1
      };
    }

    // Format job payload for appropriate worker
    const jobPayload = {
      id: job.id,
      type: jobType,
      prompt: finalPrompt, // **PHASE 1**: Use enhanced prompt
      config,
      user_id: user.id,
      created_at: new Date().toISOString(),
      // CRITICAL FIX: Only include negative_prompt for SDXL jobs
      ...isSDXL && {
        negative_prompt: negativePrompt
      },
      // ✅ COMPEL SUPPORT: Include Compel configuration in worker payload
      ...isSDXL && {
        compel_enabled: metadata?.compel_enabled || false,
        compel_weights: metadata?.compel_weights || undefined
      },
      // Additional metadata - use same structure as database
      video_id: videoId,
      image_id: imageId,
      character_id: characterId,
      model_variant: modelVariant,
      bucket: metadata?.bucket || (isSDXL ? `sdxl_image_${quality}` : isEnhanced ? `${format}7b_${quality}_enhanced` : `${format}_${quality}`),
      metadata: jobMetadata
    };

    console.log('📤 Pushing FIXED job to Redis queue with correct SDXL parameter names:', {
      jobId: job.id,
      jobType,
      queueName,
      isSDXL,
      hasPrompt: !!prompt,
      hasNegativePrompt: isSDXL && !!negativePrompt,
      negativePromptTokens: isSDXL ? countTokens(negativePrompt) : 0,
      hasSeed: !!metadata?.seed,
      seedValue: metadata?.seed,
      hasReferenceImage: !!metadata?.reference_image,
      referenceUrl: metadata?.reference_url,
      referenceStrength: metadata?.reference_strength,
      referenceType: metadata?.reference_type,
      hasVideoReferences: format === 'video' && (!!metadata?.start_reference_url || !!metadata?.end_reference_url),
      startReferenceUrl: metadata?.start_reference_url,
      endReferenceUrl: metadata?.end_reference_url,
      // ✅ COMPEL SUPPORT: Log Compel configuration
      hasCompel: isSDXL && !!metadata?.compel_enabled,
      compelEnabled: metadata?.compel_enabled || false,
      compelWeights: metadata?.compel_weights || 'none',
      negativePromptSupported: isSDXL,
      negativePromptLength: isSDXL ? negativePrompt.length : 0,
      negativePromptWordCount: isSDXL ? negativePrompt.split(' ').length : 0,
      negativePromptError: negativePromptError,
      payloadSize: JSON.stringify(jobPayload).length,
      // ✅ PARAMETER MAPPING FIX: Log correct parameter names
      sdxlParameterNames: isSDXL ? ['width', 'height', 'num_inference_steps', 'guidance_scale', 'scheduler'] : 'N/A',
      wanParameterNames: !isSDXL ? ['size', 'sample_steps', 'sample_guide_scale', 'sample_solver', 'sample_shift'] : 'N/A'
    });

    // Use LPUSH to add job to the appropriate queue (worker uses RPOP)
    const redisResponse = await fetch(`${redisUrl}/lpush/${queueName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${redisToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(jobPayload)
    });
    if (!redisResponse.ok) {
      const redisError = await redisResponse.text();
      console.error('❌ Redis push failed:', {
        status: redisResponse.status,
        statusText: redisResponse.statusText,
        error: redisError,
        queueName,
        jobId: job.id
      });
      // Update job status to failed
      await supabase.from('jobs').update({
        status: 'failed',
        error_message: `Redis queue failed: ${redisError}`
      }).eq('id', job.id);
      return new Response(JSON.stringify({
        error: `Failed to queue job in Redis: ${redisError}`,
        success: false,
        details: {
          redisStatus: redisResponse.status,
          queueName,
          jobId: job.id
        }
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    const redisResult = await redisResponse.json();
    console.log('✅ Job queued in Redis successfully:', {
      jobId: job.id,
      queueLength: redisResult.result || 0,
      queueName,
      negativePromptIncluded: isSDXL,
      negativePromptTokenCount: isSDXL ? countTokens(negativePrompt) : 0,
      parameterMappingFixed: true
    });

    // Log usage with enhanced dual worker tracking
    const usageLogResult = await supabase.from('usage_logs').insert({
      user_id: user.id,
      action: jobType,
      format: format,
      quality: quality,
      credits_consumed: metadata.credits || 1,
      metadata: {
        job_id: job.id,
        project_id: projectId,
        image_id: imageId,
        video_id: videoId,
        model_type: jobType,
        model_variant: modelVariant,
        queue: queueName,
        dual_worker_routing: true,
        negative_prompt_supported: isSDXL,
        usage_timestamp: new Date().toISOString()
      }
    });
    if (usageLogResult.error) {
      console.warn('⚠️ Usage logging failed:', usageLogResult.error);
    } else {
      console.log('📈 Usage logged successfully');
    }
    return new Response(JSON.stringify({
      success: true,
      job,
      message: 'Job queued successfully - FIXED: Token overflow prevention implemented',
      queueLength: redisResult.result || 0,
      modelVariant: modelVariant,
      jobType: jobType,
      queue: queueName,
      isSDXL: isSDXL,
      negativePromptSupported: isSDXL,
      fixes_applied: [
        'Added token counting utility functions',
        'Implemented 75-token limit for negative prompts',
        'Added comprehensive token overflow logging',
        'Preserved priority-based negative prompt system',
        'Maintained compatibility with Compel weights'
      ],
      debug: {
        userId: user.id,
        hasPrompt: !!preservedOriginalPrompt,  // CRITICAL FIX: Use preserved original prompt
        originalPromptLength: preservedOriginalPrompt?.length || 0,
        enhancedPromptLength: workingPrompt?.length || 0,
        enhancementStrategy: enhancementStrategy,
        enhancementTimeMs: enhancementTimeMs,
        promptEnhanced: workingPrompt !== preservedOriginalPrompt,  // CRITICAL FIX: Use preserved original prompt
        promptWordCount: finalPrompt.split(' ').length,
        hasNegativePrompt: isSDXL && !!negativePrompt,
        negativePromptLength: isSDXL ? negativePrompt.length : 0,
        negativePromptWordCount: isSDXL ? negativePrompt.split(' ').length : 0,
        negativePromptTokenCount: isSDXL ? countTokens(negativePrompt) : 0,
        negativePromptError: negativePromptError,
        redisConfigured: true,
        metadataFields: Object.keys(jobMetadata).length,
        tokenOverflowPrevention: true,
        timestamp: new Date().toISOString()
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('❌ Unhandled error in queue-job function:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    return new Response(JSON.stringify({
      error: error.message,
      success: false,
      details: 'Unhandled server error',
      timestamp: new Date().toISOString()
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
