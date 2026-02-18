import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

type SuggestionType = 'traits' | 'voice' | 'appearance' | 'backstory' | 'voice_examples' | 'description' | 'all';
type ContentRating = 'sfw' | 'nsfw';

interface CharacterSuggestionRequest {
  type: SuggestionType;
  characterName?: string;
  existingDescription?: string;
  existingTraits?: string[];
  existingPersonality?: {
    emotionalBaseline?: string;
    socialStyle?: string;
    temperament?: string;
  };
  existingRole?: {
    type?: string;
    relationshipContext?: string;
  };
  existingAppearance?: string[];
  contentRating: ContentRating;
  modelId?: string;
  modelKey?: string;
}

interface ResolvedModel {
  model_key: string;
  display_name: string;
  input_defaults: {
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    stream?: boolean;
  };
  provider: {
    name: string;
    base_url: string;
    secret_name: string;
    auth_scheme: string;
    auth_header_name: string;
  };
}

interface CharacterSuggestionResponse {
  success: boolean;
  suggestions?: {
    suggestedDescription?: string;
    suggestedTraits?: string[];
    suggestedVoiceTone?: string;
    suggestedAppearance?: string[];
    suggestedBackstory?: string[];
    suggestedVoiceExamples?: string[];
    suggestedPersona?: string;
    suggestedForbiddenPhrases?: string[];
  };
  error?: string;
  model_used?: string;
  model_display_name?: string;
  processing_time_ms?: number;
}

/**
 * Resolve model + provider entirely from the database.
 * Priority: explicit modelId > explicit modelKey > default_for_tasks containing 'roleplay' > first active chat model
 */
async function resolveModel(modelId?: string, modelKey?: string): Promise<ResolvedModel> {
  const selectFields = 'model_key, display_name, input_defaults, api_providers!inner(name, base_url, secret_name, auth_scheme, auth_header_name)';

  let data: any = null;
  let error: any = null;

  // 1. Try explicit ID
  if (modelId) {
    const result = await supabase
      .from('api_models')
      .select(selectFields)
      .eq('id', modelId)
      .eq('is_active', true)
      .limit(1)
      .single();
    data = result.data;
    error = result.error;
  }

  // 2. Try explicit model_key
  if (!data && modelKey) {
    const result = await supabase
      .from('api_models')
      .select(selectFields)
      .eq('model_key', modelKey)
      .eq('is_active', true)
      .limit(1)
      .single();
    data = result.data;
    error = result.error;
  }

  // 3. Try default for roleplay task
  if (!data) {
    const result = await supabase
      .from('api_models')
      .select(selectFields)
      .eq('is_active', true)
      .contains('default_for_tasks', ['roleplay'])
      .order('priority', { ascending: true })
      .limit(1)
      .single();
    data = result.data;
    error = result.error;
  }

  // 4. Fallback: any active chat model
  if (!data) {
    const result = await supabase
      .from('api_models')
      .select(selectFields)
      .eq('is_active', true)
      .eq('modality', 'chat')
      .order('priority', { ascending: true })
      .limit(1)
      .single();
    data = result.data;
    error = result.error;
  }

  if (!data || error) {
    throw new Error(`No active chat model found in api_models table. Searched: modelId=${modelId}, modelKey=${modelKey}, default_for_tasks=roleplay, modality=chat. Error: ${error?.message}`);
  }

  const provider = (data as any).api_providers;

  console.log('✅ Resolved model:', { model_key: data.model_key, display_name: data.display_name, provider: provider.name });

  return {
    model_key: data.model_key,
    display_name: data.display_name,
    input_defaults: (data.input_defaults as ResolvedModel['input_defaults']) || {},
    provider: {
      name: provider.name,
      base_url: provider.base_url,
      secret_name: provider.secret_name,
      auth_scheme: provider.auth_scheme || 'bearer',
      auth_header_name: provider.auth_header_name || 'Authorization',
    }
  };
}

/**
 * Build the system prompt based on content rating and suggestion type.
 * @param contentRating
 * @param suggestionType
 */
function buildSystemPrompt(contentRating: ContentRating, suggestionType: SuggestionType): string {
  const basePrompt = `You are an expert character designer for AI roleplay. Generate creative, engaging suggestions that make characters feel alive and distinct.

IMPORTANT RULES:
- All characters are explicitly ADULTS (18+)
- Suggestions should enhance immersion and character consistency
- Be creative but avoid clichés
- Keep suggestions concise and actionable`;

  const nsfwAddendum = contentRating === 'nsfw'
    ? `\n\nCONTENT CONTEXT: This is for adult roleplay. Suggestions can include sensual, romantic, and explicit themes. Voice examples can reference intimate scenarios.`
    : `\n\nCONTENT CONTEXT: Keep suggestions appropriate for general audiences. Focus on personality, adventure, and drama without explicit content.`;

  const typeGuidance: Record<string, string> = {
    traits: `\n\nFOCUS: Generate 3-5 personality traits that work well together. Traits should be specific enough to guide behavior but not contradictory.`,
    voice: `\n\nFOCUS: Suggest a voice tone and communication style. Consider how they speak, their verbosity, humor usage, and emotional openness.`,
    appearance: `\n\nFOCUS: Suggest 4-6 visual appearance tags. Include hair, clothing style, body type hints, and distinctive features. Keep tags suitable for image generation.`,
    backstory: `\n\nFOCUS: Generate 3-5 backstory points as bullet points. Focus on motivations and values, not lengthy history.`,
    voice_examples: `\n\nFOCUS: Generate 2-3 example lines the character might say. These should capture their voice, personality, and speaking style.`,
    description: `\n\nFOCUS: Write a compelling 2-4 sentence character description that captures their essence, personality, appearance, and role. Make it vivid and engaging for roleplay.`,
    all: `\n\nFOCUS: Generate a complete character suggestion package including description, traits, voice tone, appearance, backstory, and example dialogue.`
  };

  return basePrompt + nsfwAddendum + (typeGuidance[suggestionType] || typeGuidance.all);
}

/**
 * Build the user prompt based on the request.
 * @param request
 */
function buildUserPrompt(request: CharacterSuggestionRequest): string {
  const parts: string[] = [];

  if (request.characterName) {
    parts.push(`Character Name: ${request.characterName}`);
  }
  if (request.existingDescription) {
    parts.push(`Existing Description: ${request.existingDescription}`);
  }
  if (request.existingTraits && request.existingTraits.length > 0) {
    parts.push(`Existing Traits: ${request.existingTraits.join(', ')}`);
  }
  if (request.existingPersonality) {
    const personalityParts: string[] = [];
    if (request.existingPersonality.emotionalBaseline) personalityParts.push(`emotional baseline: ${request.existingPersonality.emotionalBaseline}`);
    if (request.existingPersonality.socialStyle) personalityParts.push(`social style: ${request.existingPersonality.socialStyle}`);
    if (request.existingPersonality.temperament) personalityParts.push(`temperament: ${request.existingPersonality.temperament}`);
    if (personalityParts.length > 0) parts.push(`Personality: ${personalityParts.join(', ')}`);
  }
  if (request.existingRole) {
    const roleParts: string[] = [];
    if (request.existingRole.type) roleParts.push(`role: ${request.existingRole.type}`);
    if (request.existingRole.relationshipContext) roleParts.push(`relationship: ${request.existingRole.relationshipContext}`);
    if (roleParts.length > 0) parts.push(`Role: ${roleParts.join(', ')}`);
  }
  if (request.existingAppearance && request.existingAppearance.length > 0) {
    parts.push(`Existing Appearance: ${request.existingAppearance.join(', ')}`);
  }

  const context = parts.length > 0
    ? `Based on the following character context:\n${parts.join('\n')}\n\n`
    : 'Create suggestions for a new character.\n\n';

  const typeInstructions: Record<string, string> = {
    traits: `Generate 3-5 personality traits. Return as JSON: { "suggestedTraits": ["trait1", "trait2", ...] }`,
    voice: `Suggest voice characteristics. Return as JSON: { "suggestedVoiceTone": "tone", "suggestedPersona": "brief persona description" }`,
    appearance: `Generate 4-6 appearance tags. Return as JSON: { "suggestedAppearance": ["tag1", "tag2", ...] }`,
    backstory: `Generate 3-5 backstory bullet points. Return as JSON: { "suggestedBackstory": ["point1", "point2", ...] }`,
    voice_examples: `Generate 2-3 example dialogue lines. Return as JSON: { "suggestedVoiceExamples": ["example1", "example2", ...] }`,
    description: `Write a compelling 2-4 sentence character description. Return as JSON: { "suggestedDescription": "Your vivid character description here..." }`,
    all: `Generate complete suggestions. Return as JSON: {
      "suggestedDescription": "2-4 sentence character description",
      "suggestedTraits": ["trait1", "trait2", ...],
      "suggestedVoiceTone": "tone",
      "suggestedAppearance": ["tag1", "tag2", ...],
      "suggestedBackstory": ["point1", "point2", ...],
      "suggestedVoiceExamples": ["example1", "example2"],
      "suggestedPersona": "brief persona",
      "suggestedForbiddenPhrases": ["phrase1", ...]
    }`
  };

  return context + (typeInstructions[request.type] || typeInstructions.all) + '\n\nRespond with ONLY valid JSON, no additional text.';
}

/**
 * Call a chat provider dynamically using resolved model config.
 * Supports OpenRouter-compatible APIs (OpenAI chat/completions format).
 * Retries once on 429 with backoff before trying a fallback model.
 */
async function callChatProvider(
  systemPrompt: string,
  userPrompt: string,
  model: ResolvedModel,
  retryCount = 0
): Promise<{ content: string; model: string; display_name: string }> {
  const apiKey = Deno.env.get(model.provider.secret_name);
  if (!apiKey) {
    throw new Error(`API key secret "${model.provider.secret_name}" not configured for provider "${model.provider.name}"`);
  }

  const defaults = model.input_defaults;
  const payload = {
    model: model.model_key,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: defaults.max_tokens || 500,
    temperature: defaults.temperature || 0.8,
    top_p: defaults.top_p || 0.9,
    stream: false
  };

  const apiUrl = `${model.provider.base_url}/chat/completions`;
  const authValue = model.provider.auth_scheme === 'bearer' ? `Bearer ${apiKey}` : apiKey;

  console.log('📤 Calling chat provider:', {
    provider: model.provider.name,
    model: payload.model,
    url: apiUrl,
    attempt: retryCount + 1,
    settings: { max_tokens: payload.max_tokens, temperature: payload.temperature }
  });

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      [model.provider.auth_header_name]: authValue,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();

    // Retry once on 429 with backoff
    if (response.status === 429 && retryCount < 1) {
      const retryAfter = parseInt(response.headers.get('retry-after') || '3', 10);
      const waitMs = Math.min(retryAfter * 1000, 5000);
      console.warn(`⚠️ 429 rate limited, retrying in ${waitMs}ms...`);
      await new Promise(r => setTimeout(r, waitMs));
      return callChatProvider(systemPrompt, userPrompt, model, retryCount + 1);
    }

    // On 429 after retry, try a different model from the table
    if (response.status === 429) {
      console.warn('⚠️ Still rate limited after retry, trying alternate model...');
      const alternate = await resolveAlternateModel(model.model_key);
      if (alternate) {
        console.log('🔄 Falling back to:', alternate.model_key);
        return callChatProvider(systemPrompt, userPrompt, alternate, 0);
      }
    }

    console.error(`❌ Provider error ${response.status}:`, errorText);
    throw new Error(`${model.provider.name} error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  console.log('✅ Response received:', {
    contentLength: content.length,
    model: model.model_key,
    preview: content.substring(0, 100) + '...'
  });

  return { content, model: model.model_key, display_name: model.display_name };
}

/**
 * Find an alternate active chat model (different from the one that failed).
 */
async function resolveAlternateModel(excludeModelKey: string): Promise<ResolvedModel | null> {
  const selectFields = 'model_key, display_name, input_defaults, api_providers!inner(name, base_url, secret_name, auth_scheme, auth_header_name)';

  const { data, error } = await supabase
    .from('api_models')
    .select(selectFields)
    .eq('is_active', true)
    .in('modality', ['chat', 'roleplay'])
    .neq('model_key', excludeModelKey)
    .order('priority', { ascending: true })
    .limit(1)
    .single();

  if (!data || error) return null;

  const provider = (data as any).api_providers;
  return {
    model_key: data.model_key,
    display_name: data.display_name,
    input_defaults: (data.input_defaults as ResolvedModel['input_defaults']) || {},
    provider: {
      name: provider.name,
      base_url: provider.base_url,
      secret_name: provider.secret_name,
      auth_scheme: provider.auth_scheme || 'bearer',
      auth_header_name: provider.auth_header_name || 'Authorization',
    }
  };
}

/**
 * Attempt to parse AI suggestions from a string.
 * Handles common formatting issues and extracts key fields.
 * @param content
 */
function parseAISuggestions(content: string): Record<string, unknown> {
  let jsonStr = content.trim();
  if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
  else if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
  if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
  jsonStr = jsonStr.trim();

  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) jsonStr = jsonMatch[0];

  try {
    const parsed = JSON.parse(jsonStr);
    if (Object.keys(parsed).length > 0) {
      console.log('✅ JSON parsed successfully:', Object.keys(parsed));
      return parsed;
    }
  } catch (e) {
    console.warn('⚠️ Failed to parse JSON, attempting key-based extraction:', e);
  }

  const suggestions: Record<string, unknown> = {};

  const descMatch = content.match(/"suggestedDescription"\s*:\s*"([\s\S]*?)(?:"\s*[,}]|"$)/);
  if (descMatch?.[1] && descMatch[1].length > 10) {
    suggestions.suggestedDescription = descMatch[1].replace(/\n/g, ' ').replace(/\\"/g, '"').replace(/\s+/g, ' ').trim();
  }

  const traitsMatch = content.match(/"suggestedTraits"\s*:\s*\[([\s\S]*?)\]/);
  if (traitsMatch?.[1]) {
    const items = traitsMatch[1].match(/"([^"]+)"/g);
    if (items?.length) suggestions.suggestedTraits = items.map(t => t.replace(/"/g, '').trim()).filter(t => t.length > 0);
  }

  const voiceToneMatch = content.match(/"suggestedVoiceTone"\s*:\s*"([^"]+)"/);
  if (voiceToneMatch?.[1] && voiceToneMatch[1].length > 2) suggestions.suggestedVoiceTone = voiceToneMatch[1].trim();

  const appearanceMatch = content.match(/"suggestedAppearance"\s*:\s*\[([\s\S]*?)\]/);
  if (appearanceMatch?.[1]) {
    const items = appearanceMatch[1].match(/"([^"]+)"/g);
    if (items?.length) suggestions.suggestedAppearance = items.map(t => t.replace(/"/g, '').trim()).filter(t => t.length > 0);
  }

  const personaMatch = content.match(/"suggestedPersona"\s*:\s*"([^"]+)"/);
  if (personaMatch?.[1] && personaMatch[1].length > 5) suggestions.suggestedPersona = personaMatch[1].trim();

  const backstoryMatch = content.match(/"suggestedBackstory"\s*:\s*\[([\s\S]*?)\]/);
  if (backstoryMatch?.[1]) {
    const items = backstoryMatch[1].match(/"([^"]+)"/g);
    if (items?.length) suggestions.suggestedBackstory = items.map(t => t.replace(/"/g, '').trim()).filter(t => t.length > 0);
  }

  const voiceExMatch = content.match(/"suggestedVoiceExamples"\s*:\s*\[([\s\S]*?)\]/);
  if (voiceExMatch?.[1]) {
    const items = voiceExMatch[1].match(/"([^"]+)"/g);
    if (items?.length) suggestions.suggestedVoiceExamples = items.map(t => t.replace(/"/g, '').trim()).filter(t => t.length > 0);
  }

  console.log('📋 Key-based extraction result:', Object.keys(suggestions));
  if (Object.keys(suggestions).length === 0) throw new Error('Could not parse AI suggestions - no valid fields extracted');
  return suggestions;
}

serve(async (req) => {
  const startTime = Date.now();

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestBody: CharacterSuggestionRequest = await req.json();

    if (!requestBody.type) {
      return new Response(JSON.stringify({ success: false, error: 'Suggestion type is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    const contentRating = requestBody.contentRating || 'nsfw';

    console.log('🎭 Character suggestion request:', {
      type: requestBody.type,
      characterName: requestBody.characterName,
      contentRating,
      hasExistingTraits: !!(requestBody.existingTraits?.length),
      hasExistingPersonality: !!requestBody.existingPersonality,
      hasExistingRole: !!requestBody.existingRole
    });

    const systemPrompt = buildSystemPrompt(contentRating, requestBody.type);
    const userPrompt = buildUserPrompt(requestBody);

    // Fully dynamic model resolution from api_models + api_providers
    const resolvedModel = await resolveModel(requestBody.modelId, requestBody.modelKey);

    console.log('🎭 Using model for suggestions:', {
      model_key: resolvedModel.model_key,
      display_name: resolvedModel.display_name,
      provider: resolvedModel.provider.name
    });

    const { content, model, display_name } = await callChatProvider(systemPrompt, userPrompt, resolvedModel);

    const suggestions = parseAISuggestions(content);

    const response: CharacterSuggestionResponse = {
      success: true,
      suggestions: suggestions as CharacterSuggestionResponse['suggestions'],
      model_used: model,
      model_display_name: display_name,
      processing_time_ms: Date.now() - startTime
    };

    console.log('✅ Character suggestions generated:', {
      type: requestBody.type,
      suggestionsKeys: Object.keys(suggestions),
      processingTime: response.processing_time_ms
    });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Character suggestion error:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate suggestions',
      processing_time_ms: Date.now() - startTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
