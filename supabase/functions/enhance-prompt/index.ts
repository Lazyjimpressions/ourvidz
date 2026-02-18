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
  let prompt: string = ''
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (Deno.env.get('ENVIRONMENT') === 'development') {
      testContentDetection()
    }
    
    const requestBody = await req.json()
    
    // ===== Extract all fields with backwards compatibility =====
    prompt = requestBody.prompt || requestBody.original_prompt || ''
    const jobType = requestBody.jobType || requestBody.job_type
    const format = requestBody.format
    const quality = requestBody.quality
    const selectedModel = requestBody.selectedModel || requestBody.enhancement_model
    const enhancement_model = requestBody.enhancement_model
    const user_id = requestBody.user_id
    const regeneration = requestBody.regeneration
    const selectedPresets = requestBody.selectedPresets || []
    const contentType = requestBody.contentType
    const exactCopyMode = requestBody.metadata?.exact_copy_mode || false
    // NEW: Extract model_id (the image/video model UUID sent by the sparkle button)
    const model_id = requestBody.model_id

    console.log('📥 enhance-prompt received:', {
      hasPrompt: !!prompt,
      promptLength: prompt?.length || 0,
      jobType,
      selectedModel,
      contentType,
      model_id: model_id || 'not provided',
      usedLegacyFields: !!(requestBody.original_prompt || requestBody.job_type || requestBody.enhancement_model)
    });

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

    if (isPromptlessUploadedExactCopy) {
      return new Response(JSON.stringify({
        success: true,
        original_prompt: requestBody.prompt || '',
        enhanced_prompt: requestBody.prompt || '',
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
      const userSelectedModel = requestBody.selectedModel || requestBody.chatModel || '';

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

      const isLocalModel = userSelectedModel === 'qwen_instruct' ||
                          userSelectedModel === 'qwen-local' ||
                          userSelectedModel === 'qwen_local';

      console.log('🎯 Model selection:', { userSelectedModel, isLocalModel });

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      if (isLocalModel) {
        console.log('👤 User selected local model, using chat worker');
        try {
          const { data: workerData, error: workerError } = await supabase.functions.invoke('get-active-worker-url', {
            body: { worker_type: 'chat' }
          });

          if (!workerError && workerData?.worker_url) {
            const payload = {
              messages: [
                { role: "system", content: sceneCreationSystemPrompt },
                { role: "user", content: prompt }
              ],
              max_tokens: 500,
              temperature: 0.7,
              top_p: 0.9
            };

            const response = await fetch(`${workerData.worker_url}/enhance`, {
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
          }
          console.error('❌ Local chat worker unavailable but user selected it');
          return new Response(JSON.stringify({
            success: false,
            error: 'Local chat worker is unavailable. Please select a different model.',
            enhancement_strategy: 'scene_creation_error'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 503
          });
        } catch (localError) {
          console.error('❌ Local chat worker error:', localError);
          return new Response(JSON.stringify({
            success: false,
            error: 'Local chat worker failed. Please select a different model.',
            enhancement_strategy: 'scene_creation_error'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 503
          });
        }
      }

      // Use OpenRouter for scene creation
      const openRouterKey = Deno.env.get('OpenRouter_Roleplay_API_KEY');
      if (openRouterKey) {
        try {
          let openRouterModel = 'mistralai/mistral-small-3.1-24b-instruct:free';

          if (userSelectedModel && !isLocalModel) {
            const { data: modelData } = await supabase
              .from('api_models')
              .select('model_key')
              .eq('model_key', userSelectedModel)
              .single();

            if (modelData?.model_key) {
              openRouterModel = modelData.model_key;
              console.log('🎯 Using user-selected API model:', openRouterModel);
            }
          }

          console.log('🌐 Using OpenRouter for scene_creation:', openRouterModel);

          const openRouterPayload = {
            model: openRouterModel,
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
              return buildSceneResponse(sceneData, 'scene_creation_openrouter', openRouterModel);
            }
          } else {
            const errorText = await openRouterResponse.text();
            console.error('❌ OpenRouter error:', openRouterResponse.status, errorText);
          }
        } catch (openRouterError) {
          console.error('❌ OpenRouter error:', openRouterError instanceof Error ? openRouterError.message : String(openRouterError));
        }
      } else {
        console.log('⚠️ OpenRouter API key not configured');
      }

      // Final fallback
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
          error: 'Enhancement unavailable'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle scene_starters content type
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
        enhanced = `maintain the same subject; ${userMod}`;
      } else if (userMod) {
        enhanced = `maintain the same subject; ${userMod}`;
      } else if (base) {
        enhanced = base;
      } else {
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

    console.log('🎯 ENHANCE-PROMPT: Starting table-driven enhancement:', {
      prompt: prompt.length > 100 ? prompt.substring(0, 100) + '...' : prompt,
      jobType,
      contentType,
      model_id: model_id || 'none',
      promptLength: prompt.length
    })

    // Initialize orchestrator and enhance
    const orchestrator = new TableDrivenEnhancementOrchestrator()
    
    const enhancementResult = await orchestrator.enhancePrompt({
      prompt,
      job_type: jobType,
      quality: quality as 'fast' | 'high',
      user_id,
      selectedModel: selectedModel,
      model_id: model_id,
      enhancement_model: enhancement_model,
      contentType: contentType,
      preferences: { enhancement_style: selectedModel },
      regeneration: regeneration || false,
      metadata: requestBody.metadata
    })

    console.log('✅ Enhancement complete:', {
      originalLength: prompt.length,
      enhancedLength: enhancementResult.enhanced_prompt.length,
      strategy: enhancementResult.strategy,
      contentMode: enhancementResult.content_mode,
      templateUsed: enhancementResult.template_name
    })

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
        template_name: enhancementResult.template_name,
        model_used: enhancementResult.model_used,
        token_count: enhancementResult.token_count,
        compression_applied: enhancementResult.compressed,
        execution_time_ms: metrics.executionTime,
        cache_hit: metrics.cacheHit
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    const errorPrompt = typeof prompt === 'string' ? prompt.substring(0, 100) : 'unknown prompt'
    monitor.recordError(error instanceof Error ? error : new Error(String(error)), { prompt: errorPrompt })
    console.error('❌ enhance-prompt error:', error)
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

// =============================================================================
// TABLE-DRIVEN ENHANCEMENT ORCHESTRATOR
// All enhancement logic is driven by prompt_templates + OpenRouter API.
// No hardcoded prompt manipulation. No local worker routing.
// =============================================================================

class TableDrivenEnhancementOrchestrator {
  
  /**
   * Main enhancement entry point.
   * 1. Resolve content mode (from request or auto-detect)
   * 2. Resolve target model key (from model_id UUID -> api_models.model_key)
   * 3. Look up enhancement template from prompt_templates
   * 4. Call OpenRouter with template's system_prompt + user prompt
   * 5. Return enhanced prompt (or original if no template/API available)
   */
  async enhancePrompt(request: any) {
    const startTime = Date.now()
    
    try {
      // Step 1: Resolve content mode
      const contentMode = request.contentType || this.detectContentMode(request.prompt)
      console.log('🔍 Content mode:', request.contentType ? `user-provided: ${contentMode}` : `auto-detected: ${contentMode}`)

      // Step 2: Resolve model key from model_id
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      let modelKey: string | null = null;
      
      if (request.model_id) {
        try {
          const { data: modelData, error: modelError } = await supabase
            .from('api_models')
            .select('model_key')
            .eq('id', request.model_id)
            .single();
          if (!modelError && modelData?.model_key) {
            modelKey = modelData.model_key;
            console.log('✅ Resolved model_key from model_id:', modelKey);
          }
        } catch (err) {
          console.warn('⚠️ Could not resolve model_key from model_id:', err instanceof Error ? err.message : String(err));
        }
      }
      
      // Fallback: map job_type to a generic model key
      const targetModel = modelKey || this.fallbackModelKey(request.job_type);
      console.log('🎯 Target model for template lookup:', targetModel, modelKey ? '(from model_id)' : '(from job_type fallback)')

      // Step 3: Find enhancement template (4-tuple, no enhancerModel)
      const jobTypeCategory = this.mapJobTypeToCategory(request.job_type)
      
      console.log('🔍 Template lookup:', {
        targetModel,
        jobType: jobTypeCategory,
        useCase: 'enhancement',
        contentMode
      })
      
      let template: any = null;
      let cacheHit = false;
      
      // Try cache first
      try {
        const cache = await getCachedData()
        const cachedTemplate = getTemplateFromCache(
          cache,
          targetModel,
          jobTypeCategory,
          'enhancement',
          contentMode
        )
        if (cachedTemplate) {
          template = cachedTemplate;
          cacheHit = true;
          console.log('✅ Cache hit:', template.template_name || 'unnamed')
        }
      } catch (cacheError) {
        console.log('⚠️ Cache miss:', cacheError instanceof Error ? cacheError.message : String(cacheError))
      }
      
      // Try database if cache missed
      if (!template) {
        try {
          template = await getDatabaseTemplate(
            targetModel,
            jobTypeCategory,
            'enhancement',
            contentMode
          )
          console.log('✅ Database hit:', template.template_name || 'unnamed')
        } catch (dbError) {
          console.log('⚠️ No template found in database:', dbError instanceof Error ? dbError.message : String(dbError))
        }
      }

      // Step 4: Enhance with template via OpenRouter, or return original
      if (!template) {
        console.log('📋 No enhancement template for target_model:', targetModel, '— returning original prompt unchanged')
        return {
          enhanced_prompt: request.prompt,
          strategy: 'no_template_available',
          content_mode: contentMode,
          template_name: 'none',
          model_used: 'none',
          token_count: this.estimateTokens(request.prompt),
          compressed: false,
          enhancement_time_ms: Date.now() - startTime
        }
      }

      // Resolve the enhancer model dynamically
      const resolvedEnhancer = await this.resolveEnhancerModel(request.enhancement_model, supabase);
      
      // Call OpenRouter with the template
      const result = await this.enhanceViaOpenRouter(request.prompt, template, contentMode, resolvedEnhancer)
      
      // Apply token optimization using template's token_limit
      const tokenLimit = template.token_limit || 2000;
      const optimized = this.optimizeTokens(result.enhanced_prompt, tokenLimit)

      return {
        enhanced_prompt: optimized.text,
        strategy: `template_${cacheHit ? 'cached' : 'db'}`,
        content_mode: contentMode,
        template_name: template.template_name || 'unnamed',
        model_used: result.model_used,
        token_count: optimized.token_count,
        compressed: optimized.compressed,
        enhancement_time_ms: Date.now() - startTime
      }

    } catch (error) {
      console.error('💥 Enhancement failed:', error instanceof Error ? error.message : String(error))
      return {
        enhanced_prompt: request.prompt,
        strategy: 'error_fallback',
        content_mode: 'nsfw',
        template_name: 'error',
        model_used: 'none',
        token_count: this.estimateTokens(request.prompt),
        compressed: false,
        enhancement_time_ms: Date.now() - startTime
      }
    }
  }

  /**
   * Resolve the enhancement model dynamically.
   * Priority: user choice -> DB default -> last-resort fallback
   */
  private async resolveEnhancerModel(userChoice: string | undefined, supabase: any): Promise<string> {
    if (userChoice) {
      console.log('🎯 Using user-selected enhancement model:', userChoice);
      return userChoice;
    }

    try {
      const { data, error } = await supabase
        .from('api_models')
        .select('model_key')
        .eq('modality', 'chat')
        .eq('is_active', true)
        .contains('default_for_tasks', ['enhancement'])
        .limit(1)
        .single();

      if (!error && data?.model_key) {
        console.log('✅ Resolved default enhancement model from DB:', data.model_key);
        return data.model_key;
      }
    } catch (err) {
      console.warn('⚠️ Failed to resolve enhancement model from DB:', err instanceof Error ? err.message : String(err));
    }

    console.log('⚠️ Using last-resort fallback enhancement model');
    return 'gryphe/mythomax-l2-13b';
  }

  /**
   * Call OpenRouter with the template's system_prompt and user prompt.
   * Uses the resolved enhancer model key.
   */
  private async enhanceViaOpenRouter(
    userPrompt: string,
    template: any,
    contentMode: string,
    resolvedEnhancer: string
  ): Promise<{ enhanced_prompt: string; model_used: string }> {
    const openRouterKey = Deno.env.get('OpenRouter_Roleplay_API_KEY');
    
    if (!openRouterKey) {
      console.warn('⚠️ OpenRouter API key not configured — returning original prompt');
      return { enhanced_prompt: userPrompt, model_used: 'none' };
    }

    const modelToCall = resolvedEnhancer;
    
    console.log('🌐 Calling OpenRouter for enhancement:', {
      model: modelToCall,
      templateName: template.template_name,
      systemPromptLength: template.system_prompt?.length || 0,
      tokenLimit: template.token_limit || 2000
    });

    try {
      const payload = {
        model: modelToCall,
        messages: [
          { role: "system", content: template.system_prompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: template.token_limit || 2000,
        temperature: 0.7,
        top_p: 0.9
      };

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ulmdmzhcdwfadbvfpckt.supabase.co',
          'X-Title': 'OurVidz Prompt Enhancement'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ OpenRouter error:', response.status, errorText);
        return { enhanced_prompt: userPrompt, model_used: 'none' };
      }

      const data = await response.json();
      const enhancedText = data.choices?.[0]?.message?.content?.trim();

      if (enhancedText) {
        console.log('✅ OpenRouter enhancement success:', {
          model: modelToCall,
          inputLength: userPrompt.length,
          outputLength: enhancedText.length
        });
        return { enhanced_prompt: enhancedText, model_used: modelToCall };
      }

      console.warn('⚠️ OpenRouter returned empty content — returning original');
      return { enhanced_prompt: userPrompt, model_used: 'none' };

    } catch (error) {
      console.error('❌ OpenRouter call failed:', error instanceof Error ? error.message : String(error));
      return { enhanced_prompt: userPrompt, model_used: 'none' };
    }
  }

  /**
   * Token optimization using template's token_limit (no hardcoded limits map).
   */
  private optimizeTokens(prompt: string, tokenLimit: number): { text: string; token_count: number; compressed: boolean } {
    const estimatedTokens = this.estimateTokens(prompt);
    
    if (estimatedTokens <= tokenLimit) {
      return { text: prompt, token_count: estimatedTokens, compressed: false };
    }

    // Truncate at natural break points
    const avgCharsPerToken = 4;
    const targetChars = Math.floor(tokenLimit * avgCharsPerToken);
    
    if (prompt.length <= targetChars) {
      return { text: prompt, token_count: estimatedTokens, compressed: false };
    }

    let cutoff = targetChars;
    const lastComma = prompt.lastIndexOf(',', cutoff);
    const lastPeriod = prompt.lastIndexOf('.', cutoff);
    const lastSpace = prompt.lastIndexOf(' ', cutoff);
    
    if (lastComma > cutoff * 0.8) {
      cutoff = lastComma;
    } else if (lastPeriod > cutoff * 0.8) {
      cutoff = lastPeriod + 1;
    } else if (lastSpace > cutoff * 0.9) {
      cutoff = lastSpace;
    }

    const optimized = prompt.substring(0, cutoff).trim();
    console.log('✂️ Token optimization applied:', {
      originalTokens: estimatedTokens,
      targetLimit: tokenLimit,
      originalLength: prompt.length,
      optimizedLength: optimized.length
    });

    return {
      text: optimized,
      token_count: this.estimateTokens(optimized),
      compressed: true
    };
  }

  /**
   * Estimate token count (character-based approximation).
   */
  private estimateTokens(text: string): number {
    if (!text || typeof text !== 'string') return 0;
    return Math.ceil(text.length / 4.2);
  }

  /**
   * Map job type to category for template lookup.
   */
  private mapJobTypeToCategory(jobType: string): string {
    if (!jobType || typeof jobType !== 'string') return 'image';
    if (jobType.includes('video')) return 'video';
    if (jobType.includes('image') || jobType.includes('sdxl')) return 'image';
    return 'image';
  }

  /**
   * Fallback model key when model_id is not provided.
   * Maps generic job types to a default target_model for template lookup.
   */
  private fallbackModelKey(jobType: string): string {
    if (jobType?.includes('video') || jobType?.includes('wan')) return 'wan';
    if (jobType?.includes('sdxl')) return 'sdxl';
    // Default: generic sdxl for image jobs
    return 'sdxl';
  }

  /**
   * Simple keyword-based content mode detection.
   */
  private detectContentMode(prompt: string): 'sfw' | 'nsfw' {
    const nsfwKeywords = [
      'nude', 'naked', 'explicit', 'sexual', 'adult', 'intimate', 'erotic',
      'sensual', 'topless', 'lingerie', 'underwear', 'seductive', 'provocative'
    ];
    
    const promptLower = prompt.toLowerCase();
    return nsfwKeywords.some(keyword => promptLower.includes(keyword)) ? 'nsfw' : 'sfw';
  }
}
