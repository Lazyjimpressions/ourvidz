import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Storyboard AI Assistant Edge Function
 *
 * Provides AI-powered assistance for storyboard creation:
 * - story_plan: Generate story beats and scene breakdown from project description
 * - suggest_prompts: Suggest motion prompts for clips based on scene context
 * - recommend_clip_type: Recommend clip type based on position and context
 * - enhance_prompt: Enhance user prompt for video generation
 *
 * Uses OpenRouter API with dynamically resolved models from api_models table.
 */

// ============================================================================
// TYPES
// ============================================================================

interface StoryPlanRequest {
  action: 'story_plan';
  projectDescription: string;
  targetDuration: number; // seconds
  characterIds?: string[];
  contentMode: 'sfw' | 'nsfw';
}

interface SuggestPromptsRequest {
  action: 'suggest_prompts';
  sceneId: string;
  sceneMood?: string;
  sceneSetting?: string;
  previousClipPrompt?: string;
  clipType: string;
  contentMode: 'sfw' | 'nsfw';
}

interface RecommendClipTypeRequest {
  action: 'recommend_clip_type';
  position: 'first' | 'middle' | 'last';
  previousClipType?: string;
  sceneMood?: string;
  hasMotionPreset: boolean;
}

interface EnhancePromptRequest {
  action: 'enhance_prompt';
  prompt: string;
  clipType: string;
  templateId?: string;
  contentMode: 'sfw' | 'nsfw';
}

type AIAssistRequest =
  | StoryPlanRequest
  | SuggestPromptsRequest
  | RecommendClipTypeRequest
  | EnhancePromptRequest;

interface StoryBeat {
  beatNumber: number;
  description: string;
  suggestedDuration: number;
  mood: string;
  suggestedClipType: string;
}

interface SceneBreakdown {
  sceneNumber: number;
  title: string;
  description: string;
  beats: number[];
  targetDuration: number;
}

interface StoryPlanResponse {
  success: boolean;
  storyBeats: StoryBeat[];
  sceneBreakdown: SceneBreakdown[];
  generatedAt: string;
  modelUsed: string;
}

// ============================================================================
// SYSTEM PROMPTS
// ============================================================================

const STORY_PLAN_SYSTEM_PROMPT = `You are an expert video storyteller and director. Given a project description and target duration, create a structured story plan with beats and scenes.

IMPORTANT: Your response must be valid JSON with exactly this structure:
{
  "storyBeats": [
    {
      "beatNumber": 1,
      "description": "Opening shot establishing the character and setting",
      "suggestedDuration": 5,
      "mood": "peaceful",
      "suggestedClipType": "quick"
    }
  ],
  "sceneBreakdown": [
    {
      "sceneNumber": 1,
      "title": "Scene Title",
      "description": "Brief scene description",
      "beats": [1, 2],
      "targetDuration": 10
    }
  ]
}

Guidelines:
- Each beat is 3-10 seconds of video
- Beats should flow naturally into each other
- suggestedClipType must be one of: "quick", "extended", "controlled", "long", "keyframed"
- "quick" (5s): For establishing shots, simple motion
- "extended" (10s): For continuing motion from previous clip
- "controlled" (5s): When specific motion style is needed
- "long" (15s): For complex action sequences
- "keyframed" (5s): When specific start/end poses are needed
- Scenes group related beats together
- Total duration should match target duration (within 10%)`;

const PROMPT_SUGGESTIONS_SYSTEM_PROMPT = `You are an expert at writing motion prompts for AI video generation. Given scene context and previous clip information, suggest 3 motion prompts.

IMPORTANT: Your response must be valid JSON with exactly this structure:
{
  "suggestions": [
    {
      "prompt": "The motion prompt text",
      "intensity": "subtle",
      "description": "Brief explanation of why this works"
    }
  ]
}

Guidelines for motion prompts:
- Keep prompts under 100 words
- Focus on MOTION, not character description (the model already has the reference image)
- Use continuity phrases: "same character", "continuing motion", "same scene"
- Intensity levels: "subtle" (breathing, small gestures), "medium" (turns, steps), "dynamic" (walking, large movements)
- Avoid re-describing character appearance
- Consider scene mood and setting
- Build on previous clip if provided`;

const ENHANCE_PROMPT_SYSTEM_PROMPT = `You are an expert at optimizing motion prompts for AI video generation. Take the user's prompt and enhance it for better video generation results.

Guidelines:
- Keep the enhanced prompt under 150 words
- Preserve the user's intent
- Add motion-specific details
- Include temporal flow (start → middle → end)
- Avoid character description if it's a chain clip
- Use comma-separated phrases
- Add subtle camera or lighting suggestions if appropriate

Return ONLY the enhanced prompt text, no JSON or explanation.`;

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const requestBody: AIAssistRequest = await req.json();
    const { action } = requestBody;

    console.log('🎬 [storyboard-ai-assist] Action:', action);

    // Actions that need OpenRouter: fail fast with a clear message if key is missing
    const needsOpenRouter = ['story_plan', 'suggest_prompts', 'enhance_prompt'].includes(action);
    if (needsOpenRouter) {
      const openRouterKey =
        Deno.env.get('OpenRouter_Roleplay_API_KEY') ??
        Deno.env.get('OPENROUTER_API_KEY');
      if (!openRouterKey) {
        console.error('❌ OpenRouter API key not configured');
        return new Response(
          JSON.stringify({
            success: false,
            error:
              'Storyboard AI is not configured. Add OpenRouter_Roleplay_API_KEY (or OPENROUTER_API_KEY) in Supabase Edge Function secrets.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Resolve default roleplay model from api_models (dynamic, no provider filter)
    const resolvedModel = await resolveAIModel(supabase);
    console.log('🤖 Using AI model:', resolvedModel.modelKey);

    // Route to appropriate handler
    let response: Response;

    switch (action) {
      case 'story_plan':
        response = await handleStoryPlan(requestBody as StoryPlanRequest, resolvedModel, supabase);
        break;

      case 'suggest_prompts':
        response = await handleSuggestPrompts(requestBody as SuggestPromptsRequest, resolvedModel, supabase);
        break;

      case 'recommend_clip_type':
        response = await handleRecommendClipType(requestBody as RecommendClipTypeRequest);
        break;

      case 'enhance_prompt':
        response = await handleEnhancePrompt(requestBody as EnhancePromptRequest, resolvedModel, supabase);
        break;

      default:
        response = new Response(
          JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }

    const processingTime = Date.now() - startTime;
    console.log('✅ [storyboard-ai-assist] Completed in', processingTime, 'ms');

    return response;

  } catch (error) {
    console.error('❌ [storyboard-ai-assist] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// ============================================================================
// MODEL RESOLUTION (dynamic from api_models, never hardcoded by provider)
// ============================================================================

/** Resolved default roleplay model and its provider secret for API key */
interface ResolvedAIModel {
  modelKey: string;
  secretName: string | null;
}

/**
 * Resolve the default roleplay model from api_models.
 * Uses default_for_tasks containing 'roleplay'; no provider filter.
 * Returns model_key and provider secret_name for dynamic API key lookup.
 */
async function resolveAIModel(supabase: any): Promise<ResolvedAIModel> {
  try {
    const { data } = await supabase
      .from('api_models')
      .select('model_key, api_providers!inner(secret_name)')
      .eq('modality', 'chat')
      .eq('is_active', true)
      .contains('default_for_tasks', ['roleplay'])
      .order('priority', { ascending: false })
      .limit(1)
      .single();

    if (data?.model_key) {
      const secretName = (data.api_providers as { secret_name?: string } | null)?.secret_name ?? null;
      console.log('🤖 Resolved default roleplay model:', data.model_key, 'secret:', secretName || 'default');
      return { modelKey: data.model_key, secretName };
    }
  } catch (err) {
    console.warn('⚠️ No default roleplay model in api_models:', err);
  }

  // Fallback when no roleplay default is assigned (use default secret)
  return {
    modelKey: 'mistralai/mistral-small-3.1-24b-instruct:free',
    secretName: 'OpenRouter_Roleplay_API_KEY',
  };
}

// ============================================================================
// HANDLERS
// ============================================================================

async function handleStoryPlan(
  request: StoryPlanRequest,
  resolved: ResolvedAIModel,
  supabase: any
): Promise<Response> {
  const { projectDescription, targetDuration, characterIds, contentMode } = request;

  // Fetch character names if IDs provided
  let characterNames: string[] = [];
  if (characterIds && characterIds.length > 0) {
    const { data: characters } = await supabase
      .from('characters')
      .select('name')
      .in('id', characterIds);

    if (characters) {
      characterNames = characters.map((c: any) => c.name);
    }
  }

  const userPrompt = `Project Description: ${projectDescription}
Target Duration: ${targetDuration} seconds
Characters: ${characterNames.length > 0 ? characterNames.join(', ') : 'Not specified'}
Content Mode: ${contentMode}

Generate a story plan with beats and scenes that total approximately ${targetDuration} seconds.`;

  console.log('🎬 Generating story plan for:', projectDescription.substring(0, 50) + '...');

  const result = await callOpenRouter(
    resolved.modelKey,
    STORY_PLAN_SYSTEM_PROMPT,
    userPrompt,
    resolved.secretName
  );

  if (!result.success) {
    return new Response(
      JSON.stringify({ success: false, error: result.error }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }

  // Parse JSON response
  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const planData = JSON.parse(jsonMatch[0]);

      return new Response(
        JSON.stringify({
          success: true,
          storyBeats: planData.storyBeats || [],
          sceneBreakdown: planData.sceneBreakdown || [],
          generatedAt: new Date().toISOString(),
          modelUsed: resolved.modelKey,
        } as StoryPlanResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    throw new Error('No JSON found in response');
  } catch (parseError) {
    console.error('❌ Failed to parse story plan:', parseError);

    // Return a basic fallback plan
    const clipCount = Math.ceil(targetDuration / 5);
    const fallbackBeats: StoryBeat[] = [];
    for (let i = 1; i <= clipCount; i++) {
      fallbackBeats.push({
        beatNumber: i,
        description: `Beat ${i} of ${clipCount}`,
        suggestedDuration: 5,
        mood: 'neutral',
        suggestedClipType: i === 1 ? 'quick' : 'extended',
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        storyBeats: fallbackBeats,
        sceneBreakdown: [{
          sceneNumber: 1,
          title: 'Main Scene',
          description: projectDescription,
          beats: fallbackBeats.map((b) => b.beatNumber),
          targetDuration,
        }],
        generatedAt: new Date().toISOString(),
        modelUsed: 'fallback',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleSuggestPrompts(
  request: SuggestPromptsRequest,
  resolved: ResolvedAIModel,
  supabase: any
): Promise<Response> {
  const { sceneMood, sceneSetting, previousClipPrompt, clipType, contentMode } = request;

  const userPrompt = `Scene Context:
- Mood: ${sceneMood || 'unspecified'}
- Setting: ${sceneSetting || 'unspecified'}
- Clip Type: ${clipType}
- Content Mode: ${contentMode}
${previousClipPrompt ? `- Previous Clip Prompt: "${previousClipPrompt}"` : '- This is the first clip'}

Generate 3 motion prompt suggestions for this context.`;

  const result = await callOpenRouter(
    resolved.modelKey,
    PROMPT_SUGGESTIONS_SYSTEM_PROMPT,
    userPrompt,
    resolved.secretName
  );

  if (!result.success) {
    return new Response(
      JSON.stringify({ success: false, error: result.error }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }

  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const suggestionsData = JSON.parse(jsonMatch[0]);

      return new Response(
        JSON.stringify({
          success: true,
          suggestions: suggestionsData.suggestions || [],
          modelUsed: resolved.modelKey,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    throw new Error('No JSON found');
  } catch {
    // Fallback suggestions
    return new Response(
      JSON.stringify({
        success: true,
        suggestions: [
          { prompt: 'subtle breathing, gentle natural movement', intensity: 'subtle', description: 'Safe default for any scene' },
          { prompt: 'slowly turns head, soft expression change', intensity: 'medium', description: 'Adds visual interest' },
          { prompt: 'takes a step forward, confident movement', intensity: 'dynamic', description: 'For action-oriented scenes' },
        ],
        modelUsed: 'fallback',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleRecommendClipType(
  request: RecommendClipTypeRequest
): Promise<Response> {
  const { position, previousClipType, hasMotionPreset } = request;

  // Logic-based recommendation (no AI needed)
  let recommended: string;
  let reason: string;

  if (position === 'first') {
    recommended = 'quick';
    reason = 'First clip should establish the character with a simple I2V generation';
  } else if (hasMotionPreset) {
    recommended = 'controlled';
    reason = 'Motion preset selected - controlled clip type applies the motion reference';
  } else if (previousClipType === 'quick') {
    recommended = 'extended';
    reason = 'Extended clip provides smooth continuity from the previous quick clip';
  } else if (position === 'last') {
    recommended = 'quick';
    reason = 'Final clip works well as a distinct ending shot';
  } else {
    recommended = 'extended';
    reason = 'Extended clips maintain continuity in the middle of sequences';
  }

  return new Response(
    JSON.stringify({
      success: true,
      recommended,
      reason,
      alternatives: getAlternativeClipTypes(recommended),
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleEnhancePrompt(
  request: EnhancePromptRequest,
  resolved: ResolvedAIModel,
  supabase: any
): Promise<Response> {
  const { prompt, clipType, templateId, contentMode } = request;

  // If templateId provided, try to use it
  let systemPrompt = ENHANCE_PROMPT_SYSTEM_PROMPT;

  if (templateId) {
    const { data: template } = await supabase
      .from('prompt_templates')
      .select('system_prompt')
      .eq('id', templateId)
      .single();

    if (template?.system_prompt) {
      systemPrompt = template.system_prompt;
      console.log('📝 Using template for enhancement');
    }
  }

  const userPrompt = `Clip Type: ${clipType}
Content Mode: ${contentMode}
Original Prompt: ${prompt}

Enhance this prompt for video generation.`;

  const result = await callOpenRouter(
    resolved.modelKey,
    systemPrompt,
    userPrompt,
    resolved.secretName
  );

  if (!result.success) {
    return new Response(
      JSON.stringify({
        success: true,
        enhancedPrompt: prompt, // Return original on failure
        modelUsed: 'fallback',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Clean up the response (remove any markdown formatting)
  let enhancedPrompt = result.content.trim();
  enhancedPrompt = enhancedPrompt.replace(/^```[\s\S]*?```$/gm, '').trim();
  enhancedPrompt = enhancedPrompt.replace(/^["']|["']$/g, '').trim();

  return new Response(
    JSON.stringify({
      success: true,
      enhancedPrompt,
      originalPrompt: prompt,
      modelUsed: resolved.modelKey,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============================================================================
// OPENROUTER HELPER (uses provider secret_name from api_models when provided)
// ============================================================================

async function callOpenRouter(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  secretName?: string | null
): Promise<{ success: boolean; content: string; error?: string }> {
  const envKey =
    (secretName && Deno.env.get(secretName)) ??
    Deno.env.get('OpenRouter_Roleplay_API_KEY') ??
    Deno.env.get('OPENROUTER_API_KEY');

  if (!envKey) {
    console.error('❌ OpenRouter API key not configured');
    return { success: false, content: '', error: 'OpenRouter API key not configured' };
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${envKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ulmdmzhcdwfadbvfpckt.supabase.co',
        'X-Title': 'OurVidz Storyboard AI',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 2000,
        temperature: 0.7,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenRouter error:', response.status, errorText);
      return { success: false, content: '', error: `OpenRouter error: ${response.status}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return { success: false, content: '', error: 'Empty response from OpenRouter' };
    }

    console.log('✅ OpenRouter response:', content.substring(0, 100) + '...');
    return { success: true, content };

  } catch (error) {
    console.error('❌ OpenRouter request failed:', error);
    return {
      success: false,
      content: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function getAlternativeClipTypes(recommended: string): Array<{ type: string; description: string }> {
  const allTypes = [
    { type: 'quick', description: 'Fast I2V from keyframe (5s)' },
    { type: 'extended', description: 'Continue from previous (10s)' },
    { type: 'controlled', description: 'With motion preset (5s)' },
    { type: 'long', description: 'Auto-orchestrated (15s)' },
    { type: 'keyframed', description: 'Start/end defined (5s)' },
  ];

  return allTypes.filter((t) => t.type !== recommended);
}
