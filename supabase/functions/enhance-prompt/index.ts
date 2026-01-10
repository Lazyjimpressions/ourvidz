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
  let prompt: string = '' // Declare at function scope
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Run content detection tests on startup (development only)
    if (Deno.env.get('ENVIRONMENT') === 'development') {
      testContentDetection()
    }
    
    const requestBody = await req.json()
    prompt = requestBody.prompt // Assign to function-scoped variable
    const jobType = requestBody.jobType
    const format = requestBody.format
    const quality = requestBody.quality
    const selectedModel = requestBody.selectedModel || 'qwen_instruct'
    const user_id = requestBody.user_id
    const regeneration = requestBody.regeneration
    const selectedPresets = requestBody.selectedPresets || []
    const contentType = requestBody.contentType // Extract contentType from request
    const exactCopyMode = requestBody.metadata?.exact_copy_mode || false

    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({
        error: 'Prompt is required and must be a string',
        success: false
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // Early exit for promptless uploaded exact copy only
    const hasOriginalEnhancedPrompt = !!(requestBody.metadata?.originalEnhancedPrompt && requestBody.metadata.originalEnhancedPrompt.trim());
    const isPromptlessUploadedExactCopy = exactCopyMode && !hasOriginalEnhancedPrompt && (!requestBody.prompt || !requestBody.prompt.trim());
    const referenceMode = requestBody.metadata?.reference_mode;

    // Early exit for promptless exact copy: skip enhancement completely
    if (isPromptlessUploadedExactCopy) {
      return new Response(JSON.stringify({
        success: true,
        original_prompt: requestBody.prompt || '',
        enhanced_prompt: requestBody.prompt || '',       // worker will ignore anyway in copy mode
        enhancement_strategy: 'skip_for_exact_copy',
        enhancement_metadata: { exact_copy_mode: true, template_name: 'skip', token_count: 0 }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle scene_creation content type - returns structured JSON for scene templates
    if (contentType === 'scene_creation') {
      console.log('🎬 Processing scene_creation content type');
      const contentRating = requestBody.contentRating || 'nsfw';

      const sceneCreationSystemPrompt = `You are an expert at creating roleplay scene templates. Given a user's scene description, create optimized content for both chat roleplay and image generation.

IMPORTANT: Your response must be valid JSON with exactly this structure:
{
  "enhanced_description": "A vivid, detailed scene description optimized for roleplay chat context. Include atmosphere, mood, setting details, and sensory elements. 2-4 sentences.",
  "scene_prompt": "An optimized prompt for SDXL image generation. Focus on visual elements: lighting, composition, colors, environment. Use comma-separated descriptive tags. Do NOT include character names or specific people - keep it location/atmosphere focused.",
  "suggested_tags": ["tag1", "tag2", "tag3"],
  "suggested_scenario_type": "stranger|relationship|power_dynamic|fantasy|slow_burn"
}

Content rating: ${contentRating}
${contentRating === 'nsfw' ? 'The scene can include adult themes, intimate settings, and suggestive atmospheres.' : 'Keep the scene appropriate for general audiences.'}

Focus on:
- Visual elements for image generation (lighting, setting, mood)
- Atmospheric details for immersive roleplay
- Character-agnostic descriptions (no specific names or identities)
- Tags that help with discovery (3-5 relevant tags)`;

      // Helper function to parse scene creation response
      const parseSceneResponse = (responseText: string, fallbackPrompt: string): any => {
        try {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
          throw new Error('No JSON found in response');
        } catch (parseError) {
          console.error('❌ Failed to parse scene creation response:', parseError);
          return {
            enhanced_description: fallbackPrompt,
            scene_prompt: fallbackPrompt,
            suggested_tags: [],
            suggested_scenario_type: null
          };
        }
      };

      // Helper function to build success response
      const buildSceneResponse = (sceneData: any, strategy: string, modelUsed: string) => {
        const validScenarioTypes = ['stranger', 'relationship', 'power_dynamic', 'fantasy', 'slow_burn'];
        const normalizedScenarioType = validScenarioTypes.includes(sceneData.suggested_scenario_type)
          ? sceneData.suggested_scenario_type
          : null;

        console.log('✅ Scene creation enhancement complete:', {
          descriptionLength: sceneData.enhanced_description?.length || 0,
          promptLength: sceneData.scene_prompt?.length || 0,
          tagsCount: sceneData.suggested_tags?.length || 0,
          scenarioType: normalizedScenarioType,
          strategy,
          modelUsed
        });

        return new Response(JSON.stringify({
          success: true,
          original_prompt: prompt,
          enhanced_description: sceneData.enhanced_description || prompt,
          scene_prompt: sceneData.scene_prompt || prompt,
          suggested_tags: Array.isArray(sceneData.suggested_tags) ? sceneData.suggested_tags : [],
          suggested_scenario_type: normalizedScenarioType,
          enhancement_strategy: strategy,
          enhancement_metadata: {
            content_type: 'scene_creation',
            content_rating: contentRating,
            template_name: 'scene_creation_template',
            model_used: modelUsed
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      };

      // Try local chat worker first
      let chatWorkerAvailable = false;
      let chatWorkerUrl = '';

      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { data: workerData, error: workerError } = await supabase.functions.invoke('get-active-worker-url', {
          body: { worker_type: 'chat' }
        });

        if (!workerError && workerData?.worker_url) {
          chatWorkerUrl = workerData.worker_url;
          chatWorkerAvailable = true;
          console.log('✅ Chat worker available for scene_creation:', chatWorkerUrl);
        } else {
          console.log('⚠️ Chat worker unavailable, will try OpenRouter fallback');
        }
      } catch (workerCheckError) {
        console.log('⚠️ Failed to check chat worker availability:', workerCheckError);
      }

      // Attempt 1: Try local chat worker
      if (chatWorkerAvailable) {
        try {
          const payload = {
            messages: [
              { role: "system", content: sceneCreationSystemPrompt },
              { role: "user", content: prompt }
            ],
            max_tokens: 500,
            temperature: 0.7,
            top_p: 0.9
          };

          const response = await fetch(`${chatWorkerUrl}/enhance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success && result.enhanced_prompt) {
              const sceneData = parseSceneResponse(result.enhanced_prompt, prompt);
              return buildSceneResponse(sceneData, 'scene_creation_local', 'qwen_instruct');
            }
          }
          console.log('⚠️ Chat worker response invalid, trying OpenRouter fallback');
        } catch (chatWorkerError) {
          console.log('⚠️ Chat worker failed:', chatWorkerError instanceof Error ? chatWorkerError.message : String(chatWorkerError));
        }
      }

      // Attempt 2: Try OpenRouter as fallback
      const openRouterKey = Deno.env.get('OpenRouter_Roleplay_API_KEY');
      if (openRouterKey) {
        try {
          console.log('🔄 Attempting OpenRouter fallback for scene_creation');

          const openRouterPayload = {
            model: 'mistralai/mistral-small-3.1-24b-instruct:free', // Free tier model
            messages: [
              { role: "system", content: sceneCreationSystemPrompt },
              { role: "user", content: prompt }
            ],
            max_tokens: 500,
            temperature: 0.7,
            top_p: 0.9
          };

          const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openRouterKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://ulmdmzhcdwfadbvfpckt.supabase.co',
              'X-Title': 'OurVidz Scene Creation'
            },
            body: JSON.stringify(openRouterPayload)
          });

          if (openRouterResponse.ok) {
            const openRouterData = await openRouterResponse.json();
            const responseText = openRouterData.choices?.[0]?.message?.content;

            if (responseText) {
              console.log('✅ OpenRouter scene_creation response received');
              const sceneData = parseSceneResponse(responseText, prompt);
              return buildSceneResponse(sceneData, 'scene_creation_openrouter', 'mistral-small-3.1-24b');
            }
          } else {
            const errorText = await openRouterResponse.text();
            console.error('❌ OpenRouter error:', openRouterResponse.status, errorText);
          }
        } catch (openRouterError) {
          console.error('❌ OpenRouter fallback failed:', openRouterError instanceof Error ? openRouterError.message : String(openRouterError));
        }
      } else {
        console.log('⚠️ OpenRouter API key not configured, skipping fallback');
      }

      // Final fallback: Return original prompt with no enhancement
      console.log('⚠️ All enhancement methods failed, returning original prompt');
      return new Response(JSON.stringify({
        success: true,
        original_prompt: prompt,
        enhanced_description: prompt,
        scene_prompt: prompt,
        suggested_tags: [],
        suggested_scenario_type: null,
        enhancement_strategy: 'scene_creation_fallback',
        enhancement_metadata: {
          content_type: 'scene_creation',
          content_rating: contentRating,
          error: 'All enhancement methods unavailable'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle scene_starters content type - generates conversation starters for scenes
    if (contentType === 'scene_starters') {
      console.log('💬 Processing scene_starters content type');
      const contentRating = requestBody.contentRating || 'nsfw';
      const generateCount = requestBody.metadata?.generate_count || 3;

      const startersSystemPrompt = `You are an expert roleplay scene writer. Given a scene description, generate ${generateCount} conversation starters that could begin a roleplay in this scene.

IMPORTANT: Your response must be valid JSON with exactly this structure:
{
  "starters": [
    "*First conversation starter with action and atmosphere...*",
    "*Second conversation starter with different opening...*",
    "*Third conversation starter with unique approach...*"
  ]
}

Guidelines:
- Each starter should be 1-2 sentences
- Use asterisks for actions/narration (e.g., *She walks in slowly...*)
- Set the scene and create atmosphere
- Be character-agnostic (don't use specific names)
- Content rating: ${contentRating}
${contentRating === 'nsfw' ? '- Can include suggestive or intimate scenarios' : '- Keep content appropriate for general audiences'}`;

      // Try OpenRouter for starters (simpler, more reliable)
      const openRouterKey = Deno.env.get('OpenRouter_Roleplay_API_KEY');
      if (openRouterKey) {
        try {
          const openRouterPayload = {
            model: 'mistralai/mistral-small-3.1-24b-instruct:free',
            messages: [
              { role: "system", content: startersSystemPrompt },
              { role: "user", content: prompt }
            ],
            max_tokens: 400,
            temperature: 0.8,
            top_p: 0.9
          };

          const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openRouterKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://ulmdmzhcdwfadbvfpckt.supabase.co',
              'X-Title': 'OurVidz Scene Starters'
            },
            body: JSON.stringify(openRouterPayload)
          });

          if (openRouterResponse.ok) {
            const openRouterData = await openRouterResponse.json();
            const responseText = openRouterData.choices?.[0]?.message?.content;

            if (responseText) {
              try {
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  const startersData = JSON.parse(jsonMatch[0]);
                  if (Array.isArray(startersData.starters)) {
                    console.log('✅ Starters generated:', startersData.starters.length);
                    return new Response(JSON.stringify({
                      success: true,
                      starters: startersData.starters,
                      enhancement_strategy: 'scene_starters_openrouter'
                    }), {
                      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                  }
                }
              } catch (parseError) {
                console.log('⚠️ Failed to parse starters JSON, using text fallback');
              }

              // Fallback: return enhanced_prompt for manual parsing
              return new Response(JSON.stringify({
                success: true,
                enhanced_prompt: responseText,
                enhancement_strategy: 'scene_starters_text'
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
          }
        } catch (error) {
          console.error('❌ Starters generation failed:', error);
        }
      }

      // Final fallback
      return new Response(JSON.stringify({
        success: true,
        starters: [
          '*The scene begins as you enter...*',
          '*A moment of anticipation hangs in the air...*',
          '*The atmosphere shifts as everything comes into focus...*'
        ],
        enhancement_strategy: 'scene_starters_fallback'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle modify flows (reference_mode: 'modify')
    if (referenceMode === 'modify') {
      console.log('🔄 Processing modify flow - reference_mode: modify');
      const userMod = (requestBody.prompt || '').trim();
      const base = requestBody.metadata?.originalEnhancedPrompt || '';
      
      let enhanced: string;
      if (userMod && base) {
        // User typed modification with existing base prompt
        enhanced = `maintain the same subject; ${userMod}`;
      } else if (userMod) {
        // User typed modification without base prompt
        enhanced = `maintain the same subject; ${userMod}`;
      } else if (base) {
        // No user modification, use base
        enhanced = base;
      } else {
        // Fallback
        enhanced = requestBody.prompt || '';
      }

      return new Response(JSON.stringify({
        success: true,
        original_prompt: requestBody.prompt || '',
        enhanced_prompt: enhanced,
        enhancement_strategy: userMod ? 'reference_modify_with_prompt' : 'reference_modify_base_only',
        enhancement_metadata: { 
          exact_copy_mode: false, 
          reference_mode: 'modify',
          template_name: 'modify_flow', 
          token_count: Math.ceil(enhanced.length / 4) 
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🎯 ENHANCE-PROMPT DEBUG:', {
      prompt: prompt.length > 100 ? prompt.substring(0, 100) + '...' : prompt,
      jobType,
      format,
      quality,
      contentType,
      exactCopyMode,
      promptLength: prompt.length,
      hasExactCopyMode: !!exactCopyMode,
      exactCopyModeValue: exactCopyMode,
      modificationKeywords: ['change', 'modify', 'replace', 'swap', 'add', 'remove', 'alter', 'different', 'new', 'wearing', 'in', 'to'],
      isModificationPrompt: exactCopyMode ? prompt.toLowerCase().includes('change') || prompt.toLowerCase().includes('modify') || prompt.toLowerCase().includes('replace') : 'N/A'
    })

    // Legacy exact copy handling removed - now handled by reference_mode logic above

    // Initialize Dynamic Enhancement Orchestrator
    const orchestrator = new DynamicEnhancementOrchestrator()
    
    // Use the orchestrator to enhance the prompt
    const enhancementResult = await orchestrator.enhancePrompt({
      prompt,
      job_type: jobType,
      quality: quality as 'fast' | 'high',
      user_id,
      selectedModel: selectedModel,
      contentType: contentType,
      preferences: { enhancement_style: selectedModel },
      regeneration: regeneration || false
    })

    console.log('✅ Dynamic enhanced prompt generated:', {
      originalLength: prompt.length,
      enhancedLength: enhancementResult.enhanced_prompt.length,
      strategy: enhancementResult.strategy,
      contentMode: enhancementResult.content_mode,
      fallbackLevel: enhancementResult.fallback_level
    })

    // FIXED: Add explicit enhanced prompt logging
    console.log('🎯 ENHANCED PROMPT GENERATED:', {
      originalPrompt: prompt.length > 200 ? prompt.substring(0, 200) + '...' : prompt,
      enhancedPrompt: enhancementResult.enhanced_prompt,
      templateUsed: enhancementResult.template_name,
      strategy: enhancementResult.strategy
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
        template_name: enhancementResult.template_name, // FIXED: Consistent field name
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
    const errorPrompt = typeof prompt === 'string' ? prompt.substring(0, 100) : 'unknown prompt'
    monitor.recordError(error instanceof Error ? error : new Error(String(error)), { prompt: errorPrompt })
    console.error('❌ Dynamic enhance prompt error:', error)
    return new Response(JSON.stringify({
      error: 'Failed to enhance prompt',
      success: false,
      details: error instanceof Error ? error.message : String(error),
      execution_time_ms: monitor.finalize().executionTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

/**
 * Dynamic Enhancement Orchestrator using database-driven prompts
 * COMPLETE IMPLEMENTATION with all required methods
 */
class DynamicEnhancementOrchestrator {
  
  /**
   * Main enhancement method with SFW/NSFW detection and fallback system
   */
  async enhancePrompt(request: any) {
    const startTime = Date.now()
    
    try {
      // Use provided contentType or fallback to auto-detection
      const contentMode = request.contentType || await this.detectContentMode(request.prompt)
      console.log('🔍 Content mode:', request.contentType ? `user-provided: ${contentMode}` : `auto-detected: ${contentMode}`)

      // Get model type from job type
      const modelType = this.getModelTypeFromJobType(request.job_type)
      console.log('🤖 Model type selected:', modelType)

      // Try cache first, then database fallback using 5-tuple
      let enhancementResult
      try {
        const jobTypeCategory = this.mapJobTypeToCategory(request.job_type)
        const enhancerModel = request.selectedModel || 'qwen_instruct'
        
        console.log('🔍 Template lookup parameters:', {
          targetModel: modelType,
          enhancerModel,
          jobType: jobTypeCategory,
          useCase: 'enhancement',
          contentMode
        })
        
        const cache = await getCachedData()
        const cachedTemplate = getTemplateFromCache(
          cache,
          modelType,           // targetModel
          enhancerModel,       // enhancerModel  
          jobTypeCategory,     // jobType
          'enhancement',       // useCase
          contentMode         // contentMode
        )
        
        if (cachedTemplate) {
          enhancementResult = await this.enhanceWithTemplate(request, cachedTemplate, contentMode)
          enhancementResult.fallback_level = 0
          console.log('✅ Using cached template:', cachedTemplate.template_name || 'unnamed')
        } else {
          throw new Error('No cached template found')
        }
      } catch (cacheError) {
        console.log('⚠️ Cache failed, trying database:', cacheError instanceof Error ? cacheError.message : String(cacheError))
        
        try {
          const jobTypeCategory = this.mapJobTypeToCategory(request.job_type)
          const enhancerModel = request.selectedModel || 'qwen_instruct'
          
          const template = await getDatabaseTemplate(
            modelType,           // targetModel
            enhancerModel,       // enhancerModel
            jobTypeCategory,     // jobType  
            'enhancement',       // useCase
            contentMode         // contentMode
          )
          enhancementResult = await this.enhanceWithTemplate(request, template, contentMode)
          enhancementResult.fallback_level = 1
          console.log('✅ Using database template:', template.template_name || 'unnamed')
        } catch (dbError) {
          console.log('⚠️ Database template failed, using hardcoded fallback:', dbError instanceof Error ? dbError.message : String(dbError))
          enhancementResult = await this.enhanceWithHardcodedFallback(request, modelType, contentMode)
          enhancementResult.fallback_level = 2
          enhancementResult.template_name = 'hardcoded_fallback'
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
      console.error('💥 Enhancement failed completely:', error instanceof Error ? error.message : String(error))
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
   * Enhance using template (database or cached) - FIXED for pure inference worker
   */
  private async enhanceWithTemplate(request: any, template: any, contentMode: string) {
    // Calculate UI control token usage from metadata
    const uiControlTokens = this.calculateUIControlTokens(request.metadata);
    const adjustedTokenLimit = (template.token_limit || 75) - uiControlTokens;
    
    console.log('🎯 Template enhancement with UI control consideration:', {
      templateName: template.template_name,
      originalTokenLimit: template.token_limit || 75,
      uiControlTokens,
      adjustedTokenLimit
    });
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
        console.log('💬 Using chat worker for pure inference enhancement')
        result = await this.enhanceWithChatWorker(request, template)
      } else {
        console.log('🎬 Using WAN worker for enhancement')
        result = await this.enhanceWithWanWorker(request, template)
      }

      // Apply model-specific token optimization with UI control consideration
      const modelType = this.getModelTypeFromJobType(request.job_type)
      const optimized = this.optimizeTokens(result.enhanced_prompt, modelType, adjustedTokenLimit)

      return {
        enhanced_prompt: optimized.enhanced_prompt,
        strategy: template.template_name, // Store original template name, not with _chat suffix
        template_name: template.template_name || 'dynamic',
        model_used: workerType === 'chat' ? 'qwen_instruct' : 'qwen_base',
        token_count: optimized.token_count,
        compressed: optimized.compressed
      }

    } catch (workerError) {
      console.log('⚠️ Worker failed, using rule-based enhancement:', workerError instanceof Error ? workerError.message : String(workerError))
      return this.enhanceWithRules(request, template.model_type, contentMode, template)
    }
  }

  /**
   * FIXED: Enhance with chat worker (Qwen Instruct) using pure inference API
   */
  private async enhanceWithChatWorker(request: any, template: any) {
    const chatWorkerUrl = await this.getChatWorkerUrl()
    if (!chatWorkerUrl) {
      throw new Error('No chat worker available')
    }

    // Build messages array using database template - THIS IS THE KEY FIX
    const messages = [
      {
        role: "system",
        content: template.system_prompt
      },
      {
        role: "user", 
        content: request.prompt
      }
    ];

    // Calculate UI control token usage and adjust max_tokens
    const uiControlTokens = this.calculateUIControlTokens(request.metadata);
    const adjustedMaxTokens = Math.max(50, (template.token_limit || 200) - uiControlTokens);

    const payload = {
      messages: messages,
      max_tokens: adjustedMaxTokens,
      temperature: 0.7,
      top_p: 0.9
    };

    console.log('💬 Chat worker payload (pure inference):', {
      messagesCount: messages.length,
      systemPromptLength: template.system_prompt.length,
      userPromptLength: request.prompt.length,
      maxTokens: payload.max_tokens,
      originalTokenLimit: template.token_limit || 200,
      uiControlTokens,
      templateName: template.template_name || 'unnamed'
    });

    try {
      // Use the pure inference enhancement endpoint
      const response = await fetch(`${chatWorkerUrl}/enhance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ Chat worker error (${response.status}): ${errorText}`);
        throw new Error(`Chat worker failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Chat worker response (pure inference):', {
        success: result.success,
        responseLength: result.enhanced_prompt?.length || 0,
        generationTime: result.generation_time,
        tokensGenerated: result.tokens_generated
      });
      
      // Validate response format
      if (!result.success || !result.enhanced_prompt) {
        console.warn('⚠️ Invalid chat worker response, using original prompt');
        return {
          enhanced_prompt: request.prompt,
          strategy: 'chat_worker_fallback',
          model_used: 'qwen_instruct'
        };
      }

      return {
        enhanced_prompt: result.enhanced_prompt,
        strategy: 'chat_worker_template',
        model_used: 'qwen_instruct',
        generation_time: result.generation_time,
        tokens_generated: result.tokens_generated
      };

    } catch (error) {
      console.error('❌ Chat worker request failed:', error instanceof Error ? error.message : String(error));
      throw new Error(`Chat worker communication failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Enhance with WAN worker (Qwen Base) - maintains legacy format for now
   */
  private async enhanceWithWanWorker(request: any, template: any) {
    const wanWorkerUrl = await this.getWanWorkerUrl();
    if (!wanWorkerUrl) {
      throw new Error('No WAN worker available');
    }

    // Maintain existing WAN worker format for backward compatibility
    const payload = {
      inputs: `${template.system_prompt}\n\nEnhance this prompt: "${request.prompt}"\n\nEnhanced version:`,
      parameters: {
        max_new_tokens: template.token_limit || 150,
        temperature: 0.7,
        top_p: 0.9,
        do_sample: true,
        return_full_text: false
      }
    };

    console.log('🎬 WAN worker payload (legacy):', {
      originalPrompt: request.prompt,
      systemPrompt: template.system_prompt,
      tokenLimit: template.token_limit || 150
    });

    const response = await fetch(`${wanWorkerUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WAN worker failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    // Clean and validate the response
    let enhancedText = result.generated_text?.trim() || request.prompt;
    
    // Remove any residual system prompt or original prompt from the response
    if (enhancedText.includes('Enhanced version:')) {
      enhancedText = enhancedText.split('Enhanced version:').pop()?.trim() || enhancedText;
    }
    
    // Remove quotes if the model wrapped the response
    if (enhancedText.startsWith('"') && enhancedText.endsWith('"')) {
      enhancedText = enhancedText.slice(1, -1);
    }
    
    // Fallback to original if enhancement is empty or too similar
    if (!enhancedText || enhancedText.length < 10 || enhancedText === request.prompt) {
      enhancedText = request.prompt;
    }

    return {
      enhanced_prompt: enhancedText,
      strategy: 'wan_worker_legacy',
      model_used: 'qwen_base'
    };
  }

  /**
   * Rule-based enhancement fallback when workers are unavailable
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
   * Hardcoded fallback templates when database and cache fail
   */
  private enhanceWithHardcodedFallback(request: any, modelType: string, contentMode: string) {
    const fallbackTemplates = {
      'sdxl': {
        'nsfw': {
          system_prompt: 'You are an expert prompt engineer specializing in adult content generation. Transform the user prompt into a detailed, explicit description that captures sensual details, intimate scenarios, and adult themes. Focus on visual elements, emotions, and explicit content while maintaining artistic quality.',
          token_limit: 75
        },
        'sfw': {
          system_prompt: 'You are an expert prompt engineer specializing in artistic image generation. Transform the user prompt into a detailed, professional description that captures visual composition, lighting, and artistic elements. Focus on aesthetic quality and technical excellence.',
          token_limit: 75
        }
      },
      'wan': {
        'nsfw': {
          system_prompt: 'You are an expert prompt engineer specializing in adult video content. Transform the user prompt into a detailed description of motion, intimate actions, and explicit visual elements. Focus on movement, cinematography, and adult themes for video generation.',
          token_limit: 100
        },
        'sfw': {
          system_prompt: 'You are an expert prompt engineer specializing in cinematic video generation. Transform the user prompt into a detailed description of motion, camera work, and visual storytelling. Focus on professional cinematography and artistic movement.',
          token_limit: 100
        }
      }
    };

    const template = fallbackTemplates[modelType]?.[contentMode] || fallbackTemplates['sdxl']['nsfw'];
    
    // Apply simple rule-based enhancement using hardcoded template
    let enhanced = request.prompt;
    
    if (contentMode === 'nsfw') {
      enhanced = `${enhanced}, detailed explicit content, sensual lighting, intimate atmosphere, adult themes, masterpiece quality`;
    } else {
      enhanced = `${enhanced}, professional composition, artistic lighting, high quality, detailed, masterpiece`;
    }

    // Add model-specific tags
    if (modelType === 'sdxl') {
      enhanced += ', photorealistic, sharp focus, 8k resolution';
    } else if (modelType === 'wan') {
      enhanced += ', smooth motion, cinematic quality, professional video';
    }

    return {
      enhanced_prompt: enhanced,
      strategy: `hardcoded_fallback_${modelType}_${contentMode}`,
      template_name: 'hardcoded_fallback',
      model_used: 'hardcoded',
      token_count: this.estimateTokens(enhanced),
      compressed: false
    };
  }

  /**
   * Enhanced SDXL NSFW enhancement with male character guidance
   */
  async enhanceSDXLNSFW(request: any, template: any, contentMode: string) {
    console.log('🎭 Enhanced SDXL NSFW enhancement for male character generation')
    
    try {
      // Check if prompt contains male character indicators
      const prompt = request.prompt.toLowerCase()
      const isMaleCharacter = prompt.includes('male') || 
                             prompt.includes('man') || 
                             prompt.includes('guy') || 
                             prompt.includes('boy') ||
                             prompt.includes('he ') ||
                             prompt.includes('his ')
      
      if (isMaleCharacter) {
        console.log('👨 Detected male character - applying enhanced guidance')
        
        // Enhanced system prompt for male characters
        const enhancedSystemPrompt = `${template.system_prompt}

CRITICAL FOR MALE CHARACTERS:
- Emphasize masculine features: broad shoulders, defined jawline, muscular build
- Include specific male anatomy details: chest, arms, hands, facial features
- Avoid floating body parts - ensure complete character representation
- Use descriptive terms: "handsome man", "masculine figure", "male character"
- Include clothing details that emphasize male form
- Reference male-specific poses and expressions`
        
        const enhancedPrompt = await this.callEnhancementAPI(request.prompt, {
          ...template,
          system_prompt: enhancedSystemPrompt
        }, contentMode)
        
        return {
          enhanced_prompt: enhancedPrompt,
          strategy: 'enhanced_sdxl_nsfw_male',
          template_name: template.template_name || 'unnamed',
          model_used: template.enhancer_model || 'unknown',
          token_count: this.estimateTokens(enhancedPrompt),
          compressed: false
        }
      }
      
      // Standard SDXL NSFW enhancement for non-male characters
      const enhancedPrompt = await this.callEnhancementAPI(request.prompt, template, contentMode)
      
      return {
        enhanced_prompt: enhancedPrompt,
        strategy: 'template_enhancement',
        template_name: template.template_name || 'unnamed',
        model_used: template.enhancer_model || 'unknown',
        token_count: this.estimateTokens(enhancedPrompt),
        compressed: false
      }
    } catch (error) {
      console.error('❌ Enhanced SDXL NSFW enhancement failed:', error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  /**
   * Call the enhancement API with the given template
   */
  async callEnhancementAPI(prompt: string, template: any, contentMode: string): Promise<string> {
    try {
      // For now, use a simple enhancement approach
      // In production, this would call the actual enhancement API
      const enhancedPrompt = this.applyTemplateEnhancement(prompt, template, contentMode)
      return enhancedPrompt
    } catch (error) {
      console.error('❌ Enhancement API call failed:', error instanceof Error ? error.message : String(error))
      // Fallback to basic enhancement
      return this.applyBasicEnhancement(prompt, contentMode)
    }
  }

  /**
   * Apply template-based enhancement
   */
  applyTemplateEnhancement(prompt: string, template: any, contentMode: string): string {
    if (!template.system_prompt) {
      return this.applyBasicEnhancement(prompt, contentMode)
    }

    // Simple template application - in production this would use the actual API
    let enhanced = prompt
    
    // Add content mode specific enhancements
    if (contentMode === 'nsfw') {
      enhanced = `NSFW, ${enhanced}, detailed anatomy, explicit content`
    } else {
      enhanced = `SFW, ${enhanced}, family-friendly, appropriate content`
    }
    
    // Add model-specific enhancements
    if (template.target_model === 'sdxl') {
      enhanced = `${enhanced}, high quality, detailed, SDXL optimized`
    }
    
    return enhanced
  }

  /**
   * Apply basic enhancement as fallback
   */
  applyBasicEnhancement(prompt: string, contentMode: string): string {
    let enhanced = prompt
    
    if (contentMode === 'nsfw') {
      enhanced = `NSFW, ${enhanced}, detailed, explicit`
    } else {
      enhanced = `SFW, ${enhanced}, family-friendly, appropriate`
    }
    
    return enhanced
  }

  /**
   * Calculate UI control token usage from metadata - FIXED to include default style tokens
   */
  private calculateUIControlTokens(metadata: any): number {
    if (!metadata) {
      // FIXED: Include default style tokens when no metadata provided
      return this.estimateTokens("cinematic lighting, film grain, dramatic composition");
    }
    
    let tokenCount = 0;
    
    // Shot type (if not default 'wide')
    if (metadata.shot_type && metadata.shot_type !== 'wide' && metadata.shot_type !== 'none') {
      tokenCount += 1; // e.g., "medium", "close"
    }
    
    // Camera angle (if not default 'eye_level')  
    if (metadata.camera_angle && metadata.camera_angle !== 'eye_level' && metadata.camera_angle !== 'none') {
      tokenCount += metadata.camera_angle.replace('_', ' ').split(' ').length; // e.g., "low angle" = 2 tokens
    }
    
    // Style tokens - FIXED: Always include default if no custom style
    const styleTokens = metadata.style && metadata.style.trim() 
      ? this.estimateTokens(metadata.style)
      : this.estimateTokens("cinematic lighting, film grain, dramatic composition"); // Default: ~6 tokens
    tokenCount += styleTokens;
    
    console.log('🎨 UI Control tokens calculated:', {
      shotType: metadata.shot_type,
      cameraAngle: metadata.camera_angle,
      style: metadata.style || 'default_style',
      styleTokens,
      totalTokens: tokenCount
    });
    
    return tokenCount;
  }

  /**
   * Token optimization for different model types with UI control consideration
   */
  private optimizeTokens(prompt: string, modelType: string, customLimit?: number) {
    let optimized = prompt;
    let compressed = false;
    
    // Get target token limits based on model type
    const limits = {
      'sdxl': 75,
      'wan': 100,
      'qwen_instruct': 200,
      'qwen_base': 150
    };
    
    const targetLimit = customLimit || limits[modelType] || 75;
    const estimatedTokens = this.estimateTokens(prompt);
    
    console.log('🔧 Token optimization:', {
      modelType,
      originalTokens: estimatedTokens,
      targetLimit,
      customLimitUsed: !!customLimit,
      needsOptimization: estimatedTokens > targetLimit
    });
    
    if (estimatedTokens > targetLimit) {
      // Improved token optimization - character-based truncation with meaning preservation
      const avgCharsPerToken = 4; // More accurate than word-based estimation
      const targetChars = Math.floor(targetLimit * avgCharsPerToken);
      
      if (prompt.length > targetChars) {
        // Find last complete sentence or phrase before limit
        let cutoff = targetChars;
        const lastComma = prompt.lastIndexOf(',', cutoff);
        const lastPeriod = prompt.lastIndexOf('.', cutoff);
        const lastSpace = prompt.lastIndexOf(' ', cutoff);
        
        // Prefer natural break points
        if (lastComma > cutoff * 0.8) {
          cutoff = lastComma;
        } else if (lastPeriod > cutoff * 0.8) {
          cutoff = lastPeriod + 1;
        } else if (lastSpace > cutoff * 0.9) {
          cutoff = lastSpace;
        }
        
        optimized = prompt.substring(0, cutoff).trim();
        compressed = true;
        
        console.log('✂️ Token optimization applied:', {
          originalLength: prompt.length,
          optimizedLength: optimized.length,
          cutoffPosition: cutoff,
          preservedMeaning: cutoff > targetChars * 0.8
        });
      }
    }
    
    return {
      enhanced_prompt: optimized,
      token_count: this.estimateTokens(optimized),
      compressed: compressed,
      original_tokens: estimatedTokens,
      target_limit: targetLimit
    };
  }

  /**
   * Estimate token count from text - IMPROVED character-based approximation
   */
  private estimateTokens(text: string): number {
    if (!text || typeof text !== 'string') return 0;
    
    // Character-based estimation more accurate for CLIP tokenizer
    // Average: 4.2 characters per token (accounts for punctuation and special chars)
    return Math.ceil(text.length / 4.2);
  }

  /**
   * Map job type to category for database lookup
   */
  private mapJobTypeToCategory(jobType: string): string {
    if (!jobType || typeof jobType !== 'string') {
      console.warn('⚠️ Invalid job type provided:', jobType)
      return 'image'
    }
    
    if (jobType.includes('video')) {
      return 'video'
    } else if (jobType.includes('image') || jobType.includes('sdxl')) {
      return 'image'
    }
    
    console.log('🔄 Job type mapping:', { originalJobType: jobType, mappedCategory: 'image' })
    return 'image' // Default fallback
  }

  /**
   * Get model type from job type with enhanced mapping
   */
  private getModelTypeFromJobType(jobType: string): string {
    if (jobType?.includes('sdxl')) return 'sdxl';
    if (jobType?.includes('wan') || jobType?.includes('video')) return 'wan';
    if (jobType?.includes('qwen_instruct')) return 'qwen_instruct';
    if (jobType?.includes('qwen_base')) return 'qwen_base';
    
    // Default fallback
    return 'sdxl';
  }

  /**
   * Simplified content detection using cached terms
   */
  private async detectContentMode(prompt: string): Promise<'sfw' | 'nsfw'> {
    // Simple keyword-based detection
    const nsfwKeywords = [
      'nude', 'naked', 'explicit', 'sexual', 'adult', 'intimate', 'erotic', 
      'sensual', 'topless', 'lingerie', 'underwear', 'seductive', 'provocative'
    ];
    
    const promptLower = prompt.toLowerCase();
    const hasNsfwContent = nsfwKeywords.some(keyword => promptLower.includes(keyword));
    
    return hasNsfwContent ? 'nsfw' : 'sfw';
  }

  // Removed getDynamicTemplate and getCachedTemplate methods
  // These are now handled by getDatabaseTemplate and getTemplateFromCache from cache-utils

  /**
   * Select worker type based on model and user preference
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
   * FIXED: Get chat worker URL with enhanced error handling
   */
  private async getChatWorkerUrl(): Promise<string | null> {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { data, error } = await supabase.functions.invoke('get-active-worker-url', {
        body: { worker_type: 'chat' }
      });

      if (error) {
        console.error('❌ Failed to get chat worker URL:', error);
        return null;
      }

      const workerUrl = data?.worker_url || data?.workerUrl;
      
      if (!workerUrl) {
        console.error('❌ No chat worker URL returned from get-active-worker-url');
        return null;
      }

      console.log('✅ Chat worker URL retrieved:', workerUrl);
      return workerUrl;

    } catch (error) {
      console.error('❌ Exception getting chat worker URL:', error);
      return null;
    }
  }

  /**
   * Get WAN worker URL with enhanced error handling
   */
  private async getWanWorkerUrl(): Promise<string | null> {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { data, error } = await supabase.functions.invoke('get-active-worker-url', {
        body: { worker_type: 'wan' }
      });

      if (error) {
        console.error('❌ Failed to get WAN worker URL:', error);
        return null;
      }

      const workerUrl = data?.worker_url || data?.workerUrl;
      
      if (!workerUrl) {
        console.error('❌ No WAN worker URL returned from get-active-worker-url');
        return null;
      }

      console.log('✅ WAN worker URL retrieved:', workerUrl);
      return workerUrl;

    } catch (error) {
      console.error('❌ Exception getting WAN worker URL:', error);
      return null;
    }
  }
}