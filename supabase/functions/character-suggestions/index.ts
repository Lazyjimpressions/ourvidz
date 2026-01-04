import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * AI Suggestion types for character creation "sprinkle" feature
 */
type SuggestionType = 'traits' | 'voice' | 'appearance' | 'backstory' | 'voice_examples' | 'all';
type ContentRating = 'sfw' | 'nsfw';

interface CharacterSuggestionRequest {
  type: SuggestionType;
  characterName?: string;
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
}

interface CharacterSuggestionResponse {
  success: boolean;
  suggestions?: {
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
  processing_time_ms?: number;
}

/**
 * Build the system prompt based on content rating and suggestion type
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

  const typeGuidance = {
    traits: `\n\nFOCUS: Generate 3-5 personality traits that work well together. Traits should be specific enough to guide behavior but not contradictory.`,
    voice: `\n\nFOCUS: Suggest a voice tone and communication style. Consider how they speak, their verbosity, humor usage, and emotional openness.`,
    appearance: `\n\nFOCUS: Suggest 4-6 visual appearance tags. Include hair, clothing style, body type hints, and distinctive features. Keep tags suitable for image generation.`,
    backstory: `\n\nFOCUS: Generate 3-5 backstory points as bullet points. Focus on motivations and values, not lengthy history.`,
    voice_examples: `\n\nFOCUS: Generate 2-3 example lines the character might say. These should capture their voice, personality, and speaking style.`,
    all: `\n\nFOCUS: Generate a complete character suggestion package including traits, voice tone, appearance, backstory, and example dialogue.`
  };

  return basePrompt + nsfwAddendum + (typeGuidance[suggestionType] || typeGuidance.all);
}

/**
 * Build the user prompt with existing character context
 */
function buildUserPrompt(request: CharacterSuggestionRequest): string {
  const parts: string[] = [];

  if (request.characterName) {
    parts.push(`Character Name: ${request.characterName}`);
  }

  if (request.existingTraits && request.existingTraits.length > 0) {
    parts.push(`Existing Traits: ${request.existingTraits.join(', ')}`);
  }

  if (request.existingPersonality) {
    const personalityParts: string[] = [];
    if (request.existingPersonality.emotionalBaseline) {
      personalityParts.push(`emotional baseline: ${request.existingPersonality.emotionalBaseline}`);
    }
    if (request.existingPersonality.socialStyle) {
      personalityParts.push(`social style: ${request.existingPersonality.socialStyle}`);
    }
    if (request.existingPersonality.temperament) {
      personalityParts.push(`temperament: ${request.existingPersonality.temperament}`);
    }
    if (personalityParts.length > 0) {
      parts.push(`Personality: ${personalityParts.join(', ')}`);
    }
  }

  if (request.existingRole) {
    const roleParts: string[] = [];
    if (request.existingRole.type) {
      roleParts.push(`role: ${request.existingRole.type}`);
    }
    if (request.existingRole.relationshipContext) {
      roleParts.push(`relationship: ${request.existingRole.relationshipContext}`);
    }
    if (roleParts.length > 0) {
      parts.push(`Role: ${roleParts.join(', ')}`);
    }
  }

  if (request.existingAppearance && request.existingAppearance.length > 0) {
    parts.push(`Existing Appearance: ${request.existingAppearance.join(', ')}`);
  }

  const context = parts.length > 0
    ? `Based on the following character context:\n${parts.join('\n')}\n\n`
    : 'Create suggestions for a new character.\n\n';

  const typeInstructions = {
    traits: `Generate 3-5 personality traits. Return as JSON: { "suggestedTraits": ["trait1", "trait2", ...] }`,
    voice: `Suggest voice characteristics. Return as JSON: { "suggestedVoiceTone": "tone", "suggestedPersona": "brief persona description" }`,
    appearance: `Generate 4-6 appearance tags. Return as JSON: { "suggestedAppearance": ["tag1", "tag2", ...] }`,
    backstory: `Generate 3-5 backstory bullet points. Return as JSON: { "suggestedBackstory": ["point1", "point2", ...] }`,
    voice_examples: `Generate 2-3 example dialogue lines. Return as JSON: { "suggestedVoiceExamples": ["example1", "example2", ...] }`,
    all: `Generate complete suggestions. Return as JSON: {
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
 * Call OpenRouter API for suggestions
 */
async function callOpenRouter(
  systemPrompt: string,
  userPrompt: string
): Promise<{ content: string; model: string }> {
  const openRouterKey = Deno.env.get('OpenRouter_Roleplay_API_KEY');
  if (!openRouterKey) {
    throw new Error('OpenRouter API key not configured');
  }

  const payload = {
    model: 'cognitivecomputations/dolphin3.0-r1-mistral-24b:free',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: 500,
    temperature: 0.8,
    top_p: 0.9
  };

  console.log('📤 Sending to OpenRouter for character suggestions:', {
    model: payload.model,
    systemPromptLength: systemPrompt.length,
    userPromptLength: userPrompt.length
  });

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ OpenRouter error ${response.status}:`, errorText);
    throw new Error(`OpenRouter error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  console.log('✅ OpenRouter response received:', {
    contentLength: content.length,
    preview: content.substring(0, 100) + '...'
  });

  return {
    content,
    model: payload.model
  };
}

/**
 * Parse the AI response as JSON
 */
function parseAISuggestions(content: string): Record<string, unknown> {
  // Try to extract JSON from the response
  let jsonStr = content.trim();

  // Handle markdown code blocks
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3);
  }
  jsonStr = jsonStr.trim();

  // Try to find JSON object in the response
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    console.warn('⚠️ Failed to parse AI response as JSON, attempting extraction:', error);

    // Fallback: try to extract common patterns
    const suggestions: Record<string, unknown> = {};

    // Extract traits
    const traitsMatch = content.match(/traits?[:\s]*\[([^\]]+)\]/i);
    if (traitsMatch) {
      suggestions.suggestedTraits = traitsMatch[1].split(',').map(t => t.trim().replace(/"/g, ''));
    }

    // Extract appearance
    const appearanceMatch = content.match(/appearance[:\s]*\[([^\]]+)\]/i);
    if (appearanceMatch) {
      suggestions.suggestedAppearance = appearanceMatch[1].split(',').map(t => t.trim().replace(/"/g, ''));
    }

    // Extract voice tone
    const voiceMatch = content.match(/voice\s*tone[:\s]*["']?([^"'\n,]+)/i);
    if (voiceMatch) {
      suggestions.suggestedVoiceTone = voiceMatch[1].trim();
    }

    if (Object.keys(suggestions).length === 0) {
      throw new Error('Could not parse AI suggestions');
    }

    return suggestions;
  }
}

serve(async (req) => {
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestBody: CharacterSuggestionRequest = await req.json();

    // Validate request
    if (!requestBody.type) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Suggestion type is required'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // Default to NSFW content rating
    const contentRating = requestBody.contentRating || 'nsfw';

    console.log('🎭 Character suggestion request:', {
      type: requestBody.type,
      characterName: requestBody.characterName,
      contentRating,
      hasExistingTraits: !!(requestBody.existingTraits?.length),
      hasExistingPersonality: !!requestBody.existingPersonality,
      hasExistingRole: !!requestBody.existingRole
    });

    // Build prompts
    const systemPrompt = buildSystemPrompt(contentRating, requestBody.type);
    const userPrompt = buildUserPrompt(requestBody);

    // Call OpenRouter
    const { content, model } = await callOpenRouter(systemPrompt, userPrompt);

    // Parse response
    const suggestions = parseAISuggestions(content);

    const response: CharacterSuggestionResponse = {
      success: true,
      suggestions: suggestions as CharacterSuggestionResponse['suggestions'],
      model_used: model,
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
      error: error.message || 'Failed to generate suggestions',
      processing_time_ms: Date.now() - startTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
